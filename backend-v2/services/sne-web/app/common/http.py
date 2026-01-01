"""
Common HTTP response helpers for consistent API responses
"""
from flask import jsonify
import logging

logger = logging.getLogger(__name__)

def ok(data=None, **meta):
    """
    Standard success response
    """
    payload = {"ok": True, "data": data}

    if meta:
        payload["meta"] = meta

    return jsonify(payload), 200

def fail(code: str, message: str, status: int = 400, **details):
    """
    Standard error response
    """
    logger.warning(f"API Error [{code}]: {message}", extra=details)

    payload = {
        "ok": False,
        "error": {
            "code": code,
            "message": message,
            "details": details or None
        }
    }

    return jsonify(payload), status

def error_handler(error, code="INTERNAL_ERROR", status=500):
    """
    Generic error handler for exceptions
    """
    logger.error(f"API Error Handler: {error}", exc_info=True)
    return fail(code, "Internal server error", status)


