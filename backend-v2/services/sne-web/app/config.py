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
    SIWE_CHAIN_ID = int(os.getenv("SIWE_CHAIN_ID", 534352))
    SIWE_ALLOWED_CHAIN_IDS = _parse_chain_ids(
        os.getenv("SIWE_ALLOWED_CHAIN_IDS"),
        (1, 10, 137, 8453, 42161, 534352),
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
