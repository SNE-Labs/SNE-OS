"""
Passport identity service.
Owns the wallet graph and identity checkpoint logic for SNE OS.
"""

from __future__ import annotations

from datetime import datetime, timedelta
import secrets
from typing import Any, Dict

from eth_account import Account
from eth_account.messages import encode_defunct

from .extensions import db
from .models import (
    PassportIdentity,
    PassportIdentityEvent,
    PassportIdentityLinkRequest,
    PassportIdentityWallet,
)
from .networks import normalize_evm_address


def normalize_passport_address(address: str) -> str:
    return normalize_evm_address(address).lower()


def _utcnow() -> datetime:
    return datetime.utcnow()


def _wallet_label(address: str) -> str:
    return f"{address[:6]}...{address[-4:]}"


def _event(identity_id: str, event_type: str, actor_address: str | None, target_address: str | None, payload: Dict[str, Any] | None = None) -> PassportIdentityEvent:
    event = PassportIdentityEvent(
        identity_id=identity_id,
        event_type=event_type,
        actor_address=actor_address,
        target_address=target_address,
        event_payload=payload or {},
    )
    db.session.add(event)
    return event


def serialize_identity_wallet(wallet: PassportIdentityWallet) -> Dict[str, Any]:
    return {
        "id": wallet.id,
        "address": wallet.address,
        "chain_family": wallet.chain_family,
        "wallet_type": wallet.wallet_type,
        "label": wallet.label or _wallet_label(wallet.address),
        "status": wallet.status,
        "is_primary": wallet.is_primary,
        "added_at": wallet.added_at.isoformat() if wallet.added_at else None,
        "last_login_at": wallet.last_login_at.isoformat() if wallet.last_login_at else None,
    }


def serialize_identity(identity: PassportIdentity) -> Dict[str, Any]:
    wallets = PassportIdentityWallet.query.filter_by(identity_id=identity.id).order_by(
        PassportIdentityWallet.is_primary.desc(),
        PassportIdentityWallet.added_at.asc(),
    ).all()
    primary_wallet = next((wallet for wallet in wallets if wallet.is_primary), None)
    recent_events = PassportIdentityEvent.query.filter_by(identity_id=identity.id).order_by(
        PassportIdentityEvent.created_at.desc()
    ).limit(10).all()

    active_wallets = sum(1 for wallet in wallets if wallet.status == "active")
    pending_wallets = sum(1 for wallet in wallets if wallet.status == "pending")
    revoked_wallets = sum(1 for wallet in wallets if wallet.status == "revoked")

    return {
        "identity": {
            "id": identity.id,
            "anchor_address": identity.anchor_address,
            "status": identity.status,
            "created_at": identity.created_at.isoformat() if identity.created_at else None,
            "updated_at": identity.updated_at.isoformat() if identity.updated_at else None,
        },
        "primary_wallet": serialize_identity_wallet(primary_wallet) if primary_wallet else None,
        "wallets": [serialize_identity_wallet(wallet) for wallet in wallets],
        "events": [
            {
                "id": event.id,
                "type": event.event_type,
                "actor_address": event.actor_address,
                "target_address": event.target_address,
                "payload": event.event_payload or {},
                "created_at": event.created_at.isoformat() if event.created_at else None,
            }
            for event in recent_events
        ],
        "stats": {
            "wallets_total": len(wallets),
            "active_wallets": active_wallets,
            "pending_wallets": pending_wallets,
            "revoked_wallets": revoked_wallets,
        },
    }


def get_identity_by_id(identity_id: str) -> PassportIdentity | None:
    return PassportIdentity.query.filter_by(id=identity_id).first()


def get_identity_by_address(address: str) -> PassportIdentity | None:
    normalized = normalize_passport_address(address)
    wallet = PassportIdentityWallet.query.filter_by(address=normalized).first()
    if not wallet:
        return None
    return PassportIdentity.query.filter_by(id=wallet.identity_id).first()


def get_or_create_identity_for_address(address: str) -> PassportIdentity:
    normalized = normalize_passport_address(address)
    existing = get_identity_by_address(normalized)
    if existing:
        wallet = PassportIdentityWallet.query.filter_by(address=normalized).first()
        if wallet:
            wallet.last_login_at = _utcnow()
            db.session.commit()
        return existing

    identity = PassportIdentity(anchor_address=normalized, status="active")
    db.session.add(identity)
    db.session.flush()

    wallet = PassportIdentityWallet(
        identity_id=identity.id,
        address=normalized,
        chain_family="evm",
        wallet_type="wallet",
        label="Carteira inicial",
        status="active",
        is_primary=True,
        added_at=_utcnow(),
        last_login_at=_utcnow(),
    )
    db.session.add(wallet)
    db.session.flush()

    identity.primary_wallet_id = wallet.id
    identity.updated_at = _utcnow()

    _event(
        identity.id,
        "identity_created",
        actor_address=normalized,
        target_address=normalized,
        payload={"primary_wallet_id": wallet.id},
    )
    db.session.commit()
    return identity


def build_identity_checkpoint(address: str) -> Dict[str, Any]:
    identity = get_or_create_identity_for_address(address)
    return serialize_identity(identity)


def build_link_messages(identity: PassportIdentity, requester_address: str, candidate_address: str, nonce: str, expires_at: datetime) -> Dict[str, str]:
    expires_text = expires_at.isoformat() + "Z"
    current_wallet_message = (
        "SNE Passport Wallet Link Approval\n"
        f"Identity ID: {identity.id}\n"
        f"Current Wallet: {requester_address}\n"
        f"Candidate Wallet: {candidate_address}\n"
        f"Nonce: {nonce}\n"
        f"Expires At: {expires_text}"
    )
    candidate_wallet_message = (
        "SNE Passport Wallet Link Confirmation\n"
        f"Identity ID: {identity.id}\n"
        f"Candidate Wallet: {candidate_address}\n"
        f"Approved By: {requester_address}\n"
        f"Nonce: {nonce}\n"
        f"Expires At: {expires_text}"
    )
    return {
        "current_wallet_message": current_wallet_message,
        "candidate_wallet_message": candidate_wallet_message,
    }


def create_link_request(identity: PassportIdentity, requester_address: str, candidate_address: str) -> Dict[str, Any]:
    requester = normalize_passport_address(requester_address)
    candidate = normalize_passport_address(candidate_address)

    if requester == candidate:
        raise ValueError("A carteira candidata deve ser diferente da carteira atual.")

    existing_wallet = PassportIdentityWallet.query.filter_by(address=candidate).first()
    if existing_wallet and existing_wallet.identity_id == identity.id and existing_wallet.status != "revoked":
        raise ValueError("Esta carteira ja esta vinculada a esta identidade.")
    if existing_wallet and existing_wallet.identity_id != identity.id and existing_wallet.status != "revoked":
        raise ValueError("Esta carteira ja pertence a outra identidade Passport.")

    PassportIdentityLinkRequest.query.filter_by(
        identity_id=identity.id,
        candidate_address=candidate,
        status="pending",
    ).update({"status": "expired", "completed_at": _utcnow()})

    nonce = secrets.token_hex(16)
    expires_at = _utcnow() + timedelta(minutes=10)
    request = PassportIdentityLinkRequest(
        identity_id=identity.id,
        requested_by_address=requester,
        candidate_address=candidate,
        nonce=nonce,
        status="pending",
        expires_at=expires_at,
    )
    db.session.add(request)
    db.session.flush()

    _event(
        identity.id,
        "wallet_link_requested",
        actor_address=requester,
        target_address=candidate,
        payload={"request_id": request.id},
    )
    db.session.commit()

    return {
        "request_id": request.id,
        "identity_id": identity.id,
        "candidate_address": candidate,
        "requested_by_address": requester,
        "expires_at": expires_at.isoformat() + "Z",
        **build_link_messages(identity, requester, candidate, nonce, expires_at),
    }


def _recover_signer(message: str, signature: str) -> str:
    recovered = Account.recover_message(encode_defunct(text=message), signature=signature)
    return normalize_passport_address(recovered)


def confirm_link_request(
    identity: PassportIdentity,
    request_id: str,
    current_wallet_signature: str,
    candidate_wallet_signature: str,
) -> Dict[str, Any]:
    request = PassportIdentityLinkRequest.query.filter_by(id=request_id, identity_id=identity.id).first()
    if not request:
        raise ValueError("Pedido de vinculo nao encontrado.")
    if request.status != "pending":
        raise ValueError("Este pedido de vinculo nao esta mais pendente.")
    if request.expires_at < _utcnow():
        request.status = "expired"
        request.completed_at = _utcnow()
        db.session.commit()
        raise ValueError("Este pedido de vinculo expirou.")

    messages = build_link_messages(identity, request.requested_by_address, request.candidate_address, request.nonce, request.expires_at)
    current_signer = _recover_signer(messages["current_wallet_message"], current_wallet_signature)
    candidate_signer = _recover_signer(messages["candidate_wallet_message"], candidate_wallet_signature)

    if current_signer != request.requested_by_address:
        raise ValueError("A assinatura da carteira atual nao corresponde ao aprovador.")
    if candidate_signer != request.candidate_address:
        raise ValueError("A assinatura da carteira candidata nao corresponde ao endereco informado.")

    existing_wallet = PassportIdentityWallet.query.filter_by(address=request.candidate_address).first()
    if existing_wallet and existing_wallet.identity_id != identity.id and existing_wallet.status != "revoked":
        raise ValueError("Esta carteira ja pertence a outra identidade Passport.")

    if existing_wallet and existing_wallet.identity_id == identity.id:
        existing_wallet.status = "active"
        existing_wallet.last_login_at = _utcnow()
    else:
        db.session.add(PassportIdentityWallet(
            identity_id=identity.id,
            address=request.candidate_address,
            chain_family="evm",
            wallet_type="wallet",
            label="Carteira vinculada",
            status="active",
            is_primary=False,
            added_at=_utcnow(),
        ))

    identity.updated_at = _utcnow()
    request.status = "completed"
    request.completed_at = _utcnow()

    _event(
        identity.id,
        "wallet_linked",
        actor_address=request.requested_by_address,
        target_address=request.candidate_address,
        payload={"request_id": request.id},
    )
    db.session.commit()
    return serialize_identity(identity)
