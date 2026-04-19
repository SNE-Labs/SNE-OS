"""
Configuration for SNE Web API
"""
import os
from urllib.parse import urlparse

IS_DEV = os.getenv("FLASK_ENV", "development") != "production"

def _parse_chain_ids(value: str | None, fallback: tuple[int, ...]) -> tuple[int, ...]:
    if not value:
        return fallback
    parsed: list[int] = []
    for part in value.split(","):
        item = part.strip()
        if not item:
            continue
        try:
            parsed.append(int(item))
        except ValueError:
            continue
    return tuple(parsed) if parsed else fallback

def _normalize_origin(value: str | None) -> str:
    parsed = urlparse((value or "").strip())
    if not parsed.scheme or not parsed.netloc:
        return ""
    return f"{parsed.scheme.lower()}://{parsed.netloc.lower()}"

def _origin_to_domain(origin: str) -> str:
    parsed = urlparse(origin)
    return parsed.netloc.lower()

class Config:
    """Application configuration"""

    # Flask core
    SECRET_KEY = os.getenv("SECRET_KEY", "dev-secret-key-change-in-production")
    DEBUG = os.getenv("FLASK_ENV") == "development"

    # Database
    SQLALCHEMY_DATABASE_URI = os.getenv("DATABASE_URL", "postgresql://localhost/sne")
    SQLALCHEMY_TRACK_MODIFICATIONS = False

    # SIWE Configuration
    SIWE_DOMAIN = os.getenv("SIWE_DOMAIN", "snelabs.space")
    SIWE_ORIGIN = os.getenv("SIWE_ORIGIN", "https://snelabs.space")
    SIWE_CHAIN_ID = int(os.getenv("SIWE_CHAIN_ID", 42161))
    SIWE_ALLOWED_CHAIN_IDS = _parse_chain_ids(
        os.getenv("SIWE_ALLOWED_CHAIN_IDS"),
        (42161, 421614, 1, 10, 137, 8453, 534352),
    )
    SIWE_MAX_CLOCK_SKEW_SECONDS = int(os.getenv("SIWE_MAX_CLOCK_SKEW_SECONDS", 300))

    # Session configuration
    SESSION_COOKIE_NAME = os.getenv("SESSION_COOKIE_NAME", "sne_session")
    SESSION_COOKIE_SECURE = not IS_DEV
    SESSION_COOKIE_HTTPONLY = True
    SESSION_COOKIE_SAMESITE = "Lax"

    # Enable cross-subdomain cookie sharing for SNE OS
    SESSION_COOKIE_DOMAIN = None if IS_DEV else ".snelabs.space"

    # Redis
    REDIS_HOST = os.getenv("REDIS_HOST", "localhost")
    REDIS_PORT = int(os.getenv("REDIS_PORT", 6379))
    REDIS_PASSWORD = os.getenv("REDIS_PASSWORD")
    REDIS_DB = 0
    REDIS_URL = os.getenv("REDIS_URL")

    # CORS Origins - Include all SNE OS subdomains
    CORS_ORIGINS = [
        "https://snelabs.space",
        "https://www.snelabs.space",
        "https://pass.snelabs.space",
        "https://radar.snelabs.space",
        "https://vault.snelabs.space"
    ]

    if IS_DEV:
        CORS_ORIGINS.extend([
            "http://localhost:5173",
            "http://127.0.0.1:5173",
            "http://localhost:5000",
            "http://127.0.0.1:5000",
        ])

    # API Limits
    MAX_REQUESTS_PER_MINUTE = 1000
    MAX_ANALYSES_PER_DAY = 50

    MAX_REQUESTS_PER_MINUTE = 1000
    MAX_ANALYSES_PER_DAY = 50

    # Intel
    INTEL_ENRICHMENT_PROVIDER = os.getenv("INTEL_ENRICHMENT_PROVIDER", "heuristic")
    INTEL_ENRICHMENT_MODEL = os.getenv("INTEL_ENRICHMENT_MODEL", "gpt-4.1-mini")
    OPENAI_BASE_URL = os.getenv("OPENAI_BASE_URL", "https://api.openai.com/v1")

    # SNE Keys sovereign access
    SNE_KEYS_NETWORK = os.getenv("SNE_KEYS_NETWORK", os.getenv("DEFAULT_NETWORK", "arbitrum"))
    SNE_KEYS_DEPLOYMENT_PATH = os.getenv("SNE_KEYS_DEPLOYMENT_PATH")
    SNE_OPERATOR_KEY_CONTRACT = os.getenv("SNE_OPERATOR_KEY_CONTRACT")
    SNE_DELEGATION_REGISTRY_CONTRACT = os.getenv("SNE_DELEGATION_REGISTRY_CONTRACT")
    SNE_KEYSALE_CONTRACT = os.getenv("SNE_KEYSALE_CONTRACT")
    SNE_KEYS_LEGACY_REGISTRY_CONTRACT = os.getenv("SNE_KEYS_LEGACY_REGISTRY_CONTRACT")
    SNE_KEYS_LEGACY_ABI_PATH = os.getenv("SNE_KEYS_LEGACY_ABI_PATH")
    SNE_CHECKOUT_PRODUCT_CODE = os.getenv("SNE_CHECKOUT_PRODUCT_CODE", "operator_key")
    SNE_CHECKOUT_OPERATOR_PRICE_USDT = os.getenv("SNE_CHECKOUT_OPERATOR_PRICE_USDT", "100")
    SNE_CHECKOUT_PAYMENT_CHAIN = os.getenv("SNE_CHECKOUT_PAYMENT_CHAIN", "tron")
    SNE_CHECKOUT_PAYMENT_ASSET = os.getenv("SNE_CHECKOUT_PAYMENT_ASSET", "usdt")
    SNE_CHECKOUT_ACTIVATION_CHAIN = os.getenv("SNE_CHECKOUT_ACTIVATION_CHAIN", SNE_KEYS_NETWORK or "arbitrum")
    TRON_RPC_URL = os.getenv("TRON_RPC_URL")
    TRON_USDT_CONTRACT = os.getenv("TRON_USDT_CONTRACT")
    TRON_TREASURY_ADDRESS = os.getenv("TRON_TREASURY_ADDRESS")
    TRON_USDT_DECIMALS = int(os.getenv("TRON_USDT_DECIMALS", 6))

    SIWE_ALLOWED_ORIGINS = tuple(
        origin
        for origin in {
            _normalize_origin(SIWE_ORIGIN),
            *(_normalize_origin(origin) for origin in CORS_ORIGINS),
        }
        if origin
    )
    SIWE_ALLOWED_DOMAINS = tuple(
        domain
        for domain in {
            SIWE_DOMAIN.strip().lower(),
            *(_origin_to_domain(origin) for origin in SIWE_ALLOWED_ORIGINS),
        }
        if domain
    )
