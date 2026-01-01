"""
Common authentication middleware for API endpoints
"""
from functools import wraps
from flask import session
from .http import fail

def require_session(fn):
    """
    Decorator to require authenticated session (SIWE wallet connected)
    """
    @wraps(fn)
    def wrapper(*args, **kwargs):
        addr = session.get("siwe_address")
        if not addr:
            return fail("UNAUTHENTICATED", "Connect wallet required", 401)
        return fn(*args, **kwargs)
    return wrapper


