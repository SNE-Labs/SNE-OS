"""
Home API for SNE OS.
Aggregates the start-page payload into a single endpoint for the frontend.
"""

from datetime import datetime
import logging

from flask import Blueprint, jsonify, request, session

from .collector_client import get_live_market_snapshot
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
from .passport_service import build_passport_overview
from .secrets_service import build_secrets_overview
from .status_api import get_dashboard_payload
from .vault_service import build_vault_overview

logger = logging.getLogger(__name__)

home_bp = Blueprint("home", __name__)


def _get_market_payload() -> dict:
    try:
        return {
            "top_movers": get_live_market_snapshot(limit=3),
            "last_updated": datetime.utcnow().isoformat(),
        }
    except Exception as exc:
        logger.warning(f"Home market payload failed: {exc}")
        return {
            "top_movers": [],
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


@home_bp.get("/home")
def home():
    network_key = request.args.get("network")
    session_data = {
        "authenticated": bool(session.get("siwe_address")),
        "address": session.get("siwe_address"),
    }
    dashboard = get_dashboard_payload()
    market = _get_market_payload()
    intel = _get_intel_payload()
    wallet = get_wallet_state(session_data["address"], network_key)
    passport_overview = build_passport_overview(session_data["address"], network_key)
    vault_overview = build_vault_overview(session_data["address"], network_key)
    secrets_overview = build_secrets_overview(session_data["address"], session_data["authenticated"])
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
