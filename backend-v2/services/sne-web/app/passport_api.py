"""
Passport API - SNE Scroll Passport
Wallet balance, transactions, and watchlist for Scroll Network
"""
from flask import Blueprint, request, session, jsonify
from functools import wraps
import logging

logger = logging.getLogger(__name__)

# Local helpers to avoid import issues
def ok(data=None, **meta):
    """Standard success response"""
    payload = {"ok": True, "data": data}
    if meta: payload["meta"] = meta
    return jsonify(payload), 200

def fail(code: str, message: str, status: int = 400, **details):
    """Standard error response"""
    payload = {"ok": False, "error": {"code": code, "message": message, "details": details or None}}
    return jsonify(payload), status

def require_session(fn):
    """Decorator to require authenticated session"""
    @wraps(fn)
    def wrapper(*args, **kwargs):
        addr = session.get("siwe_address")
        if not addr:
            return fail("UNAUTHENTICATED", "Connect wallet required", 401)
        return fn(*args, **kwargs)
    return wrapper

passport_bp = Blueprint("passport", __name__)

@passport_bp.get("/balance")
@require_session
def balance():
    """
    Get ETH balance on Scroll Network
    GET /api/passport/balance
    """
    from web3 import Web3
    from app.utils.redis_safe import SafeRedis
    import os
    import time
    import json

    addr = session["siwe_address"]
    redis_client = SafeRedis()

    # Cache key para balance (30s TTL)
    cache_key = f"passport:balance:{addr}"

    # Verificar cache primeiro
    cached_data = redis_client.get(cache_key)
    if cached_data:
        return ok(json.loads(cached_data))

    # Conectar ao Scroll RPC
    scroll_rpc = os.getenv("SCROLL_RPC_URL", "https://rpc.scroll.io")
    w3 = Web3(Web3.HTTPProvider(scroll_rpc))

    if not w3.is_connected():
        logger.error("Scroll RPC not connected")
        return fail("RPC_ERROR", "Scroll network unavailable", 503)

    # Buscar balance ETH
    try:
        balance_wei = w3.eth.get_balance(addr)
        balance_eth = w3.from_wei(balance_wei, 'ether')

        # TODO: Implementar conversão USD (CoinGecko, etc.)
        # Por enquanto, placeholder
        usd_price = 2500  # Placeholder
        balance_usd = float(balance_eth) * usd_price

        balance_data = {
            "address": addr,
            "chain": "scroll",
            "network": "scroll-mainnet",
            "balanceEth": str(balance_eth),
            "balanceUsd": f"{balance_usd:.2f}",
            "tokens": [
                {
                    "symbol": "ETH",
                    "balance": str(balance_eth),
                    "usdValue": f"{balance_usd:.2f}",
                    "contractAddress": None  # ETH nativo
                }
            ],
            "lastUpdated": redis_client.get(f"passport:balance:updated:{addr}") or None
        }

        # Cache por 30 segundos
        redis_client.set(cache_key, json.dumps(balance_data), ex=30)
        redis_client.set(f"passport:balance:updated:{addr}", str(int(time.time())), ex=30)

        logger.info(f"Balance fetched for {addr}: {balance_eth} ETH")
        return ok(balance_data)

    except Exception as e:
        logger.error(f"Web3 balance error for {addr}: {e}")
        return fail("RPC_ERROR", "Failed to query Scroll network", 500)

    except Exception as e:
        logger.error(f"Balance error: {e}")
        return fail("INTERNAL_ERROR", "Failed to fetch balance", 500)

@passport_bp.get("/transactions")
@require_session
def transactions():
    """
    Get transaction history on Scroll Network
    GET /api/passport/transactions?page=1&limit=20
    """
    try:
        addr = session["siwe_address"]
        page = int(request.args.get('page', 1))
        limit = int(request.args.get('limit', 20))

        # TODO: Integrate with Scroll indexer or Covalent API
        # TODO: Add pagination and filtering

        transactions_data = {
            "address": addr,
            "page": page,
            "limit": limit,
            "total": 0,
            "items": []  # Stub - empty transactions list
        }

        return ok(transactions_data)

    except Exception as e:
        logger.error(f"Transactions error: {e}")
        return fail("INTERNAL_ERROR", "Failed to fetch transactions", 500)

@passport_bp.post("/watchlist")
@require_session
def watchlist():
    """
    Manage user watchlist (addresses/tokens to monitor)
    POST /api/passport/watchlist
    Body: { "action": "add|remove", "address": "0x...", "label": "My Wallet" }
    """
    from app.models import WatchlistItem
    from app import db

    try:
        body = request.get_json(silent=True) or {}
        action = body.get("action")  # add/remove
        target_address = body.get("address")
        label = body.get("label", "")

        if action not in ("add", "remove") or not target_address:
            return fail("BAD_REQUEST", "Invalid action or missing address", 400)

        addr = session["siwe_address"]
        tier = session.get("tier", "free")

        # Validar formato do endereço (simples)
        if not target_address.startswith("0x") or len(target_address) != 42:
            return fail("BAD_REQUEST", "Invalid address format", 400)

        # Limites por tier
        max_items = {"free": 3, "premium": 10, "pro": 50}.get(tier, 3)

        if action == "add":
            # Verificar limite
            current_count = WatchlistItem.query.filter_by(
                user_address=addr,
                list_type="passport"
            ).count()

            if current_count >= max_items:
                return fail("LIMIT_EXCEEDED", f"Maximum {max_items} watchlist items allowed", 400)

            # Verificar se já existe
            existing = WatchlistItem.query.filter_by(
                user_address=addr,
                target_address=target_address,
                list_type="passport"
            ).first()

            if existing:
                return fail("ALREADY_EXISTS", "Address already in watchlist", 400)

            # Adicionar
            item = WatchlistItem(
                user_address=addr,
                target_address=target_address,
                label=label or f"Wallet {target_address[:6]}...{target_address[-4:]}",
                list_type="passport"
            )
            db.session.add(item)

        elif action == "remove":
            # Remover
            WatchlistItem.query.filter_by(
                user_address=addr,
                target_address=target_address,
                list_type="passport"
            ).delete()

        db.session.commit()

        result = {
            "user": addr,
            "action": action,
            "address": target_address,
            "label": label,
            "status": "success",
            "tier": tier,
            "maxItems": max_items
        }

        logger.info(f"Passport watchlist {action} for user {addr}: {target_address}")
        return ok(result)

    except Exception as e:
        logger.error(f"Watchlist error: {e}")
        db.session.rollback()
        return fail("INTERNAL_ERROR", "Failed to update watchlist", 500)

@passport_bp.get("/watchlist")
@require_session
def get_watchlist():
    """
    Get user's watchlist
    GET /api/passport/watchlist
    """
    from app.models import WatchlistItem

    try:
        addr = session["siwe_address"]

        # Query database
        items = WatchlistItem.query.filter_by(
            user_address=addr,
            list_type="passport"
        ).order_by(WatchlistItem.created_at.desc()).all()

        watchlist_items = []
        for item in items:
            watchlist_items.append({
                "id": item.id,
                "address": item.target_address,
                "label": item.label,
                "addedAt": item.created_at.isoformat() + "Z",
                "type": "address"
            })

        watchlist_data = {
            "user": addr,
            "items": watchlist_items,
            "count": len(watchlist_items),
            "tier": session.get("tier", "free")
        }

        return ok(watchlist_data)

    except Exception as e:
        logger.error(f"Get watchlist error: {e}")
        return fail("INTERNAL_ERROR", "Failed to fetch watchlist", 500)
