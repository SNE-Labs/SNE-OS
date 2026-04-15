"""
Passport identity service.
Owns the wallet graph, identity checkpoint logic, and profile layer for SNE OS.
"""

from __future__ import annotations

from datetime import datetime, timedelta
import re
import secrets
from typing import Any, Dict
from urllib.parse import urlparse

from eth_account import Account
from eth_account.messages import encode_defunct

from .extensions import db
from .models import (
    PassportIdentity,
    PassportIdentityEvent,
    PassportIdentityLinkRequest,
    PassportIdentityProfile,
    PassportIdentityWallet,
)
from .networks import normalize_evm_address

DEFAULT_ACCENT_COLOR = "#ff8c42"
HANDLE_PATTERN = re.compile(r"^[a-z0-9](?:[a-z0-9_-]{1,30}[a-z0-9])?$")
HEX_COLOR_PATTERN = re.compile(r"^#[0-9a-fA-F]{6}$")
PROFILE_SOCIAL_KEYS = ("x", "telegram", "github")


def normalize_passport_address(address: str) -> str:
    return normalize_evm_address(address).lower()


def _utcnow() -> datetime:
    return datetime.utcnow()


def _wallet_label(address: str) -> str:
    return f"{address[:6]}...{address[-4:]}"


def _event(
    identity_id: str,
    event_type: str,
    actor_address: str | None,
    target_address: str | None,
    payload: Dict[str, Any] | None = None,
) -> PassportIdentityEvent:
    event = PassportIdentityEvent(
        identity_id=identity_id,
        event_type=event_type,
        actor_address=actor_address,
        target_address=target_address,
        event_payload=payload or {},
    )
    db.session.add(event)
    return event


def _identity_wallets(identity: PassportIdentity) -> list[PassportIdentityWallet]:
    return PassportIdentityWallet.query.filter_by(identity_id=identity.id).order_by(
        PassportIdentityWallet.is_primary.desc(),
        PassportIdentityWallet.added_at.asc(),
    ).all()


def _recent_events(identity: PassportIdentity) -> list[PassportIdentityEvent]:
    return PassportIdentityEvent.query.filter_by(identity_id=identity.id).order_by(
        PassportIdentityEvent.created_at.desc()
    ).limit(10).all()


def _primary_wallet_from_wallets(wallets: list[PassportIdentityWallet]) -> PassportIdentityWallet | None:
    return next((wallet for wallet in wallets if wallet.is_primary), wallets[0] if wallets else None)


def _identity_profile_record(identity: PassportIdentity) -> PassportIdentityProfile | None:
    return PassportIdentityProfile.query.filter_by(identity_id=identity.id).first()


def _default_display_name(identity: PassportIdentity, primary_wallet: PassportIdentityWallet | None) -> str:
    if primary_wallet and primary_wallet.label and primary_wallet.label not in {"Carteira inicial", "Carteira vinculada"}:
        return primary_wallet.label
    if primary_wallet:
        return _wallet_label(primary_wallet.address)
    return identity.id


def _profile_completion(profile: PassportIdentityProfile | None, social_links: Dict[str, str]) -> int:
    if not profile:
        return 0

    completed_fields = 0
    possible_fields = 7

    if profile.display_name:
        completed_fields += 1
    if profile.handle:
        completed_fields += 1
    if profile.bio:
        completed_fields += 1
    if profile.location:
        completed_fields += 1
    if profile.website_url:
        completed_fields += 1
    if profile.avatar_url:
        completed_fields += 1
    if any(social_links.values()):
        completed_fields += 1

    return round((completed_fields / possible_fields) * 100)


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


def serialize_identity_profile(
    identity: PassportIdentity,
    profile: PassportIdentityProfile | None,
    primary_wallet: PassportIdentityWallet | None,
) -> Dict[str, Any]:
    social_links = {
        key: value
        for key, value in ((profile.social_links or {}).items() if profile and profile.social_links else [])
        if key in PROFILE_SOCIAL_KEYS and isinstance(value, str) and value.strip()
    }

    return {
        "identity_id": identity.id,
        "display_name": profile.display_name if profile and profile.display_name else _default_display_name(identity, primary_wallet),
        "handle": profile.handle if profile else None,
        "bio": profile.bio if profile and profile.bio else "",
        "location": profile.location if profile and profile.location else "",
        "website_url": profile.website_url if profile else None,
        "avatar_url": profile.avatar_url if profile else None,
        "banner_url": profile.banner_url if profile else None,
        "accent_color": profile.accent_color if profile and profile.accent_color else DEFAULT_ACCENT_COLOR,
        "social_links": social_links,
        "completion": _profile_completion(profile, social_links),
        "is_default": profile is None,
        "created_at": profile.created_at.isoformat() if profile and profile.created_at else None,
        "updated_at": profile.updated_at.isoformat() if profile and profile.updated_at else None,
    }


def serialize_identity(identity: PassportIdentity, include_events: bool = True) -> Dict[str, Any]:
    wallets = _identity_wallets(identity)
    primary_wallet = _primary_wallet_from_wallets(wallets)
    recent_events = _recent_events(identity) if include_events else []
    profile = serialize_identity_profile(identity, _identity_profile_record(identity), primary_wallet)

    active_wallets = sum(1 for wallet in wallets if wallet.status == "active")
    pending_wallets = sum(1 for wallet in wallets if wallet.status == "pending")
    revoked_wallets = sum(1 for wallet in wallets if wallet.status == "revoked")

    return {
        "identity_id": identity.id,
        "identity": {
            "id": identity.id,
            "anchor_address": identity.anchor_address,
            "status": identity.status,
            "created_at": identity.created_at.isoformat() if identity.created_at else None,
            "updated_at": identity.updated_at.isoformat() if identity.updated_at else None,
        },
        "profile": profile,
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


def _sanitize_optional_text(value: Any, max_length: int, field_name: str, multiline: bool = False) -> str | None:
    if value is None:
        return None
    if not isinstance(value, str):
        raise ValueError(f"{field_name} precisa ser texto.")

    text = value.strip()
    if not multiline:
        text = " ".join(text.split())
    if not text:
        return None
    if len(text) > max_length:
        raise ValueError(f"{field_name} excede o limite de {max_length} caracteres.")
    return text


def _normalize_handle(value: Any) -> str | None:
    if value is None:
        return None
    if not isinstance(value, str):
        raise ValueError("Handle precisa ser texto.")

    handle = value.strip().lower().lstrip("@")
    if not handle:
        return None
    if not HANDLE_PATTERN.fullmatch(handle):
        raise ValueError("Handle invalido. Use apenas letras minusculas, numeros, _ ou -.")
    return handle


def _normalize_url(value: Any, field_name: str) -> str | None:
    if value is None:
        return None
    if not isinstance(value, str):
        raise ValueError(f"{field_name} precisa ser texto.")

    url = value.strip()
    if not url:
        return None
    if not url.startswith(("http://", "https://")):
        url = f"https://{url}"

    parsed = urlparse(url)
    if parsed.scheme not in {"http", "https"} or not parsed.netloc:
        raise ValueError(f"{field_name} precisa ser uma URL valida.")
    if len(url) > 512:
        raise ValueError(f"{field_name} excede o limite suportado.")
    return url


def _normalize_accent_color(value: Any) -> str:
    if value is None:
        return DEFAULT_ACCENT_COLOR
    if not isinstance(value, str):
        raise ValueError("Accent color precisa ser texto.")

    color = value.strip()
    if not color:
        return DEFAULT_ACCENT_COLOR
    if not HEX_COLOR_PATTERN.fullmatch(color):
        raise ValueError("Accent color precisa estar em formato hexadecimal, ex: #ff8c42.")
    return color.lower()


def _normalize_social_links(value: Any) -> Dict[str, str]:
    if value is None:
        return {}
    if not isinstance(value, dict):
        raise ValueError("Social links precisa ser um objeto.")

    sanitized: Dict[str, str] = {}
    for key in PROFILE_SOCIAL_KEYS:
        raw_value = value.get(key)
        normalized = _sanitize_optional_text(raw_value, 80, f"{key} handle")
        if normalized:
            sanitized[key] = normalized.lstrip("@")
    return sanitized


def update_identity_profile(identity: PassportIdentity, actor_address: str, payload: Dict[str, Any] | None) -> Dict[str, Any]:
    profile = _identity_profile_record(identity)
    if profile is None:
        profile = PassportIdentityProfile(identity_id=identity.id)
        db.session.add(profile)
        db.session.flush()

    handle = _normalize_handle((payload or {}).get("handle"))
    if handle:
        existing = PassportIdentityProfile.query.filter_by(handle=handle).first()
        if existing and existing.identity_id != identity.id:
            raise ValueError("Este handle ja esta em uso por outro checkpoint.")

    profile.display_name = _sanitize_optional_text((payload or {}).get("display_name"), 80, "Display name") or None
    profile.handle = handle
    profile.bio = _sanitize_optional_text((payload or {}).get("bio"), 280, "Bio", multiline=True) or None
    profile.location = _sanitize_optional_text((payload or {}).get("location"), 80, "Location") or None
    profile.website_url = _normalize_url((payload or {}).get("website_url"), "Website URL")
    profile.avatar_url = _normalize_url((payload or {}).get("avatar_url"), "Avatar URL")
    profile.banner_url = _normalize_url((payload or {}).get("banner_url"), "Banner URL")
    profile.accent_color = _normalize_accent_color((payload or {}).get("accent_color"))
    profile.social_links = _normalize_social_links((payload or {}).get("social_links"))
    profile.updated_at = _utcnow()

    normalized_actor = normalize_passport_address(actor_address)
    identity.updated_at = _utcnow()
    _event(
        identity.id,
        "profile_updated",
        actor_address=normalized_actor,
        target_address=identity.anchor_address,
        payload={
            "updated_fields": sorted((payload or {}).keys()),
            "handle": profile.handle,
        },
    )
    db.session.commit()
    return serialize_identity(identity)


def get_public_profile_checkpoint(identity_id: str) -> Dict[str, Any] | None:
    identity = get_identity_by_id(identity_id)
    if not identity:
        return None
    return serialize_identity(identity, include_events=False)


def build_link_messages(
    identity: PassportIdentity,
    requester_address: str,
    candidate_address: str,
    nonce: str,
    expires_at: datetime,
) -> Dict[str, str]:
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

    messages = build_link_messages(
        identity,
        request.requested_by_address,
        request.candidate_address,
        request.nonce,
        request.expires_at,
    )
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
