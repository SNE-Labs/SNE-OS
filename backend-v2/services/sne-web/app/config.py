"""
Configuration for SNE Web API
"""
import os

IS_DEV = os.getenv("FLASK_ENV", "development") != "production"

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
