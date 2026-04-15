"""
Home API for SNE OS.
Aggregates the start-page payload into a single endpoint for the frontend.
"""

from datetime import datetime
import logging

from flask import Blueprint, jsonify, request, session
import jwt

from .auth_siwe import JWT_ALGORITHM, JWT_SECRET

from .home_service import (
    build_capital_snapshot,
    build_brief,
    build_brief_signals,
    build_home_networks,
    build_identity_snapshot,
    build_module_states,
    build_secrets_snapshot,
    build_system_surface,
    get_wallet_state,
)
from .intel_api import fetch_intel_items
from .market_service import build_home_market_payload
from .passport_service import build_passport_overview
from .secrets_service import build_secrets_overview
from .status_api import get_dashboard_payload
from .vault_service import build_vault_overview

logger = logging.getLogger(__name__)

home_bp = Blueprint("home", __name__)


def _resolve_auth_context() -> dict:
    auth_header = request.headers.get("Authorization", "")
    if auth_header.startswith("Bearer "):
        token = auth_header.replace("Bearer ", "", 1).strip()
        if token:
            try:
                payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
                exp = payload.get("exp")
                if exp and datetime.fromtimestamp(exp) > datetime.utcnow():
                    address = payload.get("address")
                    if address:
                        return {
                            "authenticated": True,
                            "address": address.lower(),
                            "identity_id": payload.get("identity_id"),
                            "source": "jwt",
                        }
            except jwt.ExpiredSignatureError:
                logger.info("Home auth context received expired JWT")
            except jwt.InvalidTokenError:
                logger.info("Home auth context received invalid JWT")
            except Exception as exc:
                logger.warning(f"Home auth context failed to decode JWT: {exc}")

    session_address = session.get("siwe_address")
    return {
        "authenticated": bool(session_address),
        "address": session_address,
        "identity_id": session.get("identity_id"),
        "source": "session" if session_address else "anonymous",
    }


def _get_market_payload() -> dict:
    try:
        return build_home_market_payload()
    except Exception as exc:
        logger.warning(f"Home market payload failed: {exc}")
        return {
            "top_movers": [],
            "top_losers": [],
            "volume_leaders": [],
            "regime": {"label": "sem dados", "tone": "pending", "avg_change_24h": 0.0},
            "editorial": {
                "status": "failed",
                "headline": "",
                "summary_pt": "",
                "watch_items": [],
                "highlights": [],
                "generated_at": None,
            },
            "last_updated": datetime.utcnow().isoformat(),
        }


def _get_intel_payload() -> dict:
    try:
        return {
            "items": fetch_intel_items(limit=6),
            "last_updated": datetime.utcnow().isoformat(),
        }
    except Exception as exc:
        logger.warning(f"Home intel payload failed: {exc}")
        return {
            "items": [],
            "last_updated": datetime.utcnow().isoformat(),
        }


def _safe_passport_overview(address: str | None, network_key: str | None) -> dict:
    try:
        return build_passport_overview(address, network_key)
    except Exception as exc:
        logger.warning(f"Home passport overview failed: {exc}")
        return build_passport_overview(None, network_key)


def _safe_vault_overview(address: str | None, network_key: str | None) -> dict:
    try:
        return build_vault_overview(address, network_key)
    except Exception as exc:
        logger.warning(f"Home vault overview failed: {exc}")
        return build_vault_overview(None, network_key)


def _safe_secrets_overview(address: str | None, authenticated: bool, identity_id: str | None) -> dict:
    try:
        return build_secrets_overview(address, authenticated, identity_id or address)
    except Exception as exc:
        logger.warning(f"Home secrets overview failed: {exc}")
        return build_secrets_overview(None, False, None)


@home_bp.get("/home")
def home():
    network_key = request.args.get("network")
    session_data = _resolve_auth_context()
    dashboard = get_dashboard_payload()
    market = _get_market_payload()
    intel = _get_intel_payload()
    wallet = get_wallet_state(session_data["address"], network_key)
    passport_overview = _safe_passport_overview(session_data["address"], network_key)
    vault_overview = _safe_vault_overview(session_data["address"], network_key)
    secrets_overview = _safe_secrets_overview(
        session_data["address"],
        session_data["authenticated"],
        session_data.get("identity_id"),
    )
    identity = build_identity_snapshot(passport_overview)
    capital = build_capital_snapshot(vault_overview)
    secrets = build_secrets_snapshot(secrets_overview)

    return jsonify({
        "session": session_data,
        "networks": build_home_networks(),
        "wallet": wallet,
        "identity": identity,
        "capital": capital,
        "secrets": secrets,
        "brief": build_brief(session_data, wallet, dashboard, market, identity, capital),
        "brief_signals": build_brief_signals(session_data, wallet, market, identity, capital),
        "modules": build_module_states(session_data, wallet, market),
        "system": build_system_surface(dashboard),
        "dashboard": dashboard,
        "market": market,
        "intel": intel,
        "last_updated": datetime.utcnow().isoformat(),
    }), 200
