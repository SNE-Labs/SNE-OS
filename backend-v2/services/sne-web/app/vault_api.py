"""
Vault API - SNE Products and Licensing
Products, checkout, and license management for SNE OS
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

vault_bp = Blueprint("vault", __name__)

# Public products (no wallet required)
@vault_bp.get("/products")
def products():
    """
    Get available SNE products from database
    GET /api/vault/products
    """
    from app.models import Product
    from app.utils.redis_safe import SafeRedis
    import json

    try:
        redis_client = SafeRedis()

        # Cache produtos (5min - mudam raramente)
        cache_key = "vault:products"

        cached_products = redis_client.get(cache_key)
        if cached_products:
            return ok(json.loads(cached_products))

        # Query database
        db_products = Product.query.filter_by(active=True).all()

        items = []
        for p in db_products:
            items.append({
                "sku": p.sku,
                "name": p.name,
                "description": p.description or f"Licença {p.name}",
                "priceUsd": float(p.price_usd),
                "tier": getattr(p, 'tier', 'basic'),
                "active": p.active,
                "category": getattr(p, 'category', 'license')
            })

        # Fallback se DB estiver vazia
        if not items:
            logger.warning("No products in database, using fallback")
            items = [
                {
                    "sku": "sne_box",
                    "name": "SNE Box",
                    "description": "Hardware completo com ASIC PoU e Secure Element",
                    "priceUsd": 999.0,
                    "tier": "premium",
                    "active": True,
                    "category": "hardware"
                },
                {
                    "sku": "sne_key_pro",
                    "name": "SNE Key Pro",
                    "description": "Licença profissional para acesso completo ao Radar",
                    "priceUsd": 199.0,
                    "tier": "pro",
                    "active": True,
                    "category": "license"
                },
                {
                    "sku": "sne_license_basic",
                    "name": "SNE License Basic",
                    "description": "Licença básica para exploração do ecossistema",
                    "priceUsd": 49.0,
                    "tier": "basic",
                    "active": True,
                    "category": "license"
                }
            ]

        # Cache por 5 minutos
        redis_client.set(cache_key, json.dumps(items), ex=300)

        return ok(items)

    except Exception as e:
        logger.error(f"Products query error: {e}")
        return fail("INTERNAL_ERROR", "Failed to fetch products", 500)

@vault_bp.post("/checkout")
@require_session
def checkout():
    """
    Create checkout intent for product purchase
    POST /api/vault/checkout
    Body: { "sku": "sne_box", "paymentMethod": "crypto|stripe" }
    """
    try:
        body = request.get_json(silent=True) or {}
        sku = body.get("sku")
        payment_method = body.get("paymentMethod", "crypto")

        if not sku:
            return fail("BAD_REQUEST", "Missing sku", 400)

        addr = session["siwe_address"]

        # TODO: Integrate with payment processor (Stripe/crypto/onchain)
        # TODO: Create checkout intent and queue worker job

        checkout_data = {
            "checkoutId": f"ck_demo_{sku}_{addr[:8]}",
            "user": addr,
            "sku": sku,
            "paymentMethod": payment_method,
            "status": "pending",
            "amount": 999 if sku == "sne_box" else 199 if sku == "sne_key_pro" else 49
        }

        logger.info(f"Checkout created for user {addr}: {sku}")
        return ok(checkout_data)

    except Exception as e:
        logger.error(f"Checkout error: {e}")
        return fail("INTERNAL_ERROR", "Failed to create checkout", 500)

@vault_bp.get("/licenses")
@require_session
def licenses():
    """
    Get user licenses and entitlements
    GET /api/vault/licenses
    """
    try:
        addr = session["siwe_address"]

        # TODO: Query database for user licenses
        # TODO: Check onchain NFT ownership

        user_licenses = [
            {
                "type": "pro_annual",
                "status": "active",
                "user": addr,
                "sku": "sne_key_pro",
                "purchasedAt": "2024-01-01T00:00:00Z",
                "expiresAt": "2025-12-31T23:59:59Z"
            }
        ]

        return ok(user_licenses)

    except Exception as e:
        logger.error(f"Licenses error: {e}")
        return fail("INTERNAL_ERROR", "Failed to fetch licenses", 500)


        # TODO: Query database for user licenses
        # TODO: Check onchain NFT ownership

        user_licenses = [
            {
                "type": "pro_annual",
                "status": "active",
                "user": addr,
                "sku": "sne_key_pro",
                "purchasedAt": "2024-01-01T00:00:00Z",
                "expiresAt": "2025-12-31T23:59:59Z"
            }
        ]

        return ok(user_licenses)

    except Exception as e:
        logger.error(f"Licenses error: {e}")
        return fail("INTERNAL_ERROR", "Failed to fetch licenses", 500)


        # TODO: Query database for user licenses
        # TODO: Check onchain NFT ownership

        user_licenses = [
            {
                "type": "pro_annual",
                "status": "active",
                "user": addr,
                "sku": "sne_key_pro",
                "purchasedAt": "2024-01-01T00:00:00Z",
                "expiresAt": "2025-12-31T23:59:59Z"
            }
        ]

        return ok(user_licenses)

    except Exception as e:
        logger.error(f"Licenses error: {e}")
        return fail("INTERNAL_ERROR", "Failed to fetch licenses", 500)

Products, checkout, and license management for SNE OS
"""
from flask import Blueprint, request, session
from .common.http import ok, fail
from .common.auth import require_session
import logging

logger = logging.getLogger(__name__)

vault_bp = Blueprint("vault", __name__)

# Public products (no wallet required)
@vault_bp.get("/products")
def products():
    """
    Get available SNE products from database
    GET /api/vault/products
    """
    from app.models import Product
    from app.utils.redis_safe import SafeRedis
    import json

    try:
        redis_client = SafeRedis()

        # Cache produtos (5min - mudam raramente)
        cache_key = "vault:products"

        cached_products = redis_client.get(cache_key)
        if cached_products:
            return ok(json.loads(cached_products))

        # Query database
        db_products = Product.query.filter_by(active=True).all()

        items = []
        for p in db_products:
            items.append({
                "sku": p.sku,
                "name": p.name,
                "description": p.description or f"Licença {p.name}",
                "priceUsd": float(p.price_usd),
                "tier": getattr(p, 'tier', 'basic'),
                "active": p.active,
                "category": getattr(p, 'category', 'license')
            })

        # Fallback se DB estiver vazia
        if not items:
            logger.warning("No products in database, using fallback")
            items = [
                {
                    "sku": "sne_box",
                    "name": "SNE Box",
                    "description": "Hardware completo com ASIC PoU e Secure Element",
                    "priceUsd": 999.0,
                    "tier": "premium",
                    "active": True,
                    "category": "hardware"
                },
                {
                    "sku": "sne_key_pro",
                    "name": "SNE Key Pro",
                    "description": "Licença profissional para acesso completo ao Radar",
                    "priceUsd": 199.0,
                    "tier": "pro",
                    "active": True,
                    "category": "license"
                },
                {
                    "sku": "sne_license_basic",
                    "name": "SNE License Basic",
                    "description": "Licença básica para exploração do ecossistema",
                    "priceUsd": 49.0,
                    "tier": "basic",
                    "active": True,
                    "category": "license"
                }
            ]

        # Cache por 5 minutos
        redis_client.set(cache_key, json.dumps(items), ex=300)

        return ok(items)

    except Exception as e:
        logger.error(f"Products query error: {e}")
        return fail("INTERNAL_ERROR", "Failed to fetch products", 500)

@vault_bp.post("/checkout")
@require_session
def checkout():
    """
    Create checkout intent for product purchase
    POST /api/vault/checkout
    Body: { "sku": "sne_box", "paymentMethod": "crypto|stripe" }
    """
    try:
        body = request.get_json(silent=True) or {}
        sku = body.get("sku")
        payment_method = body.get("paymentMethod", "crypto")

        if not sku:
            return fail("BAD_REQUEST", "Missing sku", 400)

        addr = session["siwe_address"]

        # TODO: Integrate with payment processor (Stripe/crypto/onchain)
        # TODO: Create checkout intent and queue worker job

        checkout_data = {
            "checkoutId": f"ck_demo_{sku}_{addr[:8]}",
            "user": addr,
            "sku": sku,
            "paymentMethod": payment_method,
            "status": "pending",
            "amount": 999 if sku == "sne_box" else 199 if sku == "sne_key_pro" else 49
        }

        logger.info(f"Checkout created for user {addr}: {sku}")
        return ok(checkout_data)

    except Exception as e:
        logger.error(f"Checkout error: {e}")
        return fail("INTERNAL_ERROR", "Failed to create checkout", 500)

@vault_bp.get("/licenses")
@require_session
def licenses():
    """
    Get user licenses and entitlements
    GET /api/vault/licenses
    """
    try:
        addr = session["siwe_address"]

        # TODO: Query database for user licenses
        # TODO: Check onchain NFT ownership

        user_licenses = [
            {
                "type": "pro_annual",
                "status": "active",
                "user": addr,
                "sku": "sne_key_pro",
                "purchasedAt": "2024-01-01T00:00:00Z",
                "expiresAt": "2025-12-31T23:59:59Z"
            }
        ]

        return ok(user_licenses)

    except Exception as e:
        logger.error(f"Licenses error: {e}")
        return fail("INTERNAL_ERROR", "Failed to fetch licenses", 500)
