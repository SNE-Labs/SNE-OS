"""
Common authentication middleware for API endpoints
"""
from datetime import datetime, timezone
from functools import wraps
from flask import g, request, session
import jwt

from app.config import Config
from .http import fail

JWT_SECRET = Config.SECRET_KEY
JWT_ALGORITHM = "HS256"

def _decode_bearer_token(token: str):
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        exp_raw = payload.get("exp")
        expires_at = datetime.fromtimestamp(exp_raw, tz=timezone.utc) if exp_raw is not None else None
        if expires_at and expires_at <= datetime.now(timezone.utc):
            return None
        return {
            "address": payload.get("address"),
            "identity_id": payload.get("identity_id"),
            "tier": payload.get("tier", "free"),
            "exp": exp_raw,
            "auth_source": "bearer",
        }
    except jwt.InvalidTokenError:
        return None

def get_auth_context():
    auth_header = request.headers.get("Authorization", "")
    if auth_header.startswith("Bearer "):
        context = _decode_bearer_token(auth_header.replace("Bearer ", "", 1).strip())
        if context and context.get("address"):
            g.user = context
            return context

    address = session.get("siwe_address")
    if address:
        context = {
            "address": address,
            "identity_id": session.get("identity_id"),
            "tier": session.get("tier", "free"),
            "exp": None,
            "auth_source": "session",
        }
        g.user = context
        return context

    return {
        "address": None,
        "identity_id": None,
        "tier": "free",
        "exp": None,
        "auth_source": None,
    }

def require_authenticated_user(fn):
    """
    Decorator to require an authenticated user from bearer token or session.
    """
    @wraps(fn)
    def wrapper(*args, **kwargs):
        auth = get_auth_context()
        if not auth.get("address"):
            return fail("UNAUTHENTICATED", "Connect wallet required", 401)
        return fn(*args, **kwargs)
    return wrapper

# Backward-compatible alias for existing imports.
require_session = require_authenticated_user


