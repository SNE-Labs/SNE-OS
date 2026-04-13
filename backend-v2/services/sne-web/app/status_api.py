"""
Status API for SNE OS Home Dashboard
Provides real-time system metrics, status, and activity data
"""
import time
import logging
from datetime import datetime, timedelta
from functools import wraps
from flask import Blueprint, jsonify, session
from sqlalchemy import text

from .collector_client import COLLECTOR_URL, get_binance_data
from .extensions import db
from .utils.redis_safe import SafeRedis

logger = logging.getLogger(__name__)

# Local HTTP helpers to avoid import issues
def ok(data=None, **meta):
    """Standard success response"""
    payload = {"ok": True, "data": data}
    if meta: payload["meta"] = meta
    return jsonify(payload), 200

def fail(code: str, message: str, status: int = 400, **details):
    """Standard error response"""
    payload = {"ok": False, "error": {"code": code, "message": message, "details": details or None}}
    return jsonify(payload), status

# Local authentication helper to avoid import issues
def require_session(fn):
    """Decorator to require authenticated session (SIWE wallet connected)"""
    @wraps(fn)
    def wrapper(*args, **kwargs):
        addr = session.get("siwe_address")
        if not addr:
            return fail("UNAUTHENTICATED", "Connect wallet required", 401)
        return fn(*args, **kwargs)
    return wrapper

status_bp = Blueprint("status", __name__)

# Create dashboard blueprint for /api/dashboard routes
dashboard_bp = Blueprint("status_dashboard", __name__)

@dashboard_bp.get("/")
def dashboard_root():
    """Alias for /api/dashboard - returns system overview"""
    return ok(get_dashboard_payload())

@status_bp.get("/health")
def health_check():
    """Health check endpoint - no dependencies"""
    return ok({"status": "ok", "service": "sne-web"})

@status_bp.get("/session")
def get_session():
    """Get current session info for frontend"""
    try:
        # Check if user is authenticated via session
        address = session.get("siwe_address")
        if address:
            return ok({
                "user": address,
                "authenticated": True
            })
        else:
            return ok({
                "user": None,
                "authenticated": False
            })
    except Exception as e:
        logger.error(f"Session check error: {e}")
        return ok({
            "user": None,
            "authenticated": False
        })

SYSTEM_START_TIME = time.time()

def get_uptime_percentage():
    """Uptime histórico não está instrumentado neste serviço."""
    return None

def get_current_latency():
    """Latência sintética removida até existir instrumentação real."""
    return None

def check_database_status():
    try:
        db.session.execute(text("SELECT 1"))
        return "online"
    except Exception as exc:
        logger.warning(f"Database health check failed: {exc}")
        return "offline"

def check_cache_status():
    try:
        redis_client = SafeRedis()
        if not redis_client.available:
            return "disabled"
        return "online" if redis_client.ping() else "offline"
    except Exception as exc:
        logger.warning(f"Cache health check failed: {exc}")
        return "offline"

def check_collector_status():
    if not COLLECTOR_URL:
        return "disabled"
    try:
        get_binance_data("time")
        return "online"
    except Exception as exc:
        logger.warning(f"Collector health check failed: {exc}")
        return "offline"

def get_system_status(components):
    """Get overall system status from real component states."""
    statuses = {component["status"] for component in components}
    if "offline" in statuses:
        return "Partial Outage"
    if "degraded" in statuses:
        return "Degraded"
    return "Operational"

def get_components_status():
    """Get status of system components from real dependencies."""
    components = [
        {"name": "API", "status": "online", "last_check": datetime.now().isoformat()},
        {"name": "Database", "status": check_database_status(), "last_check": datetime.now().isoformat()},
        {"name": "Cache", "status": check_cache_status(), "last_check": datetime.now().isoformat()},
        {"name": "Collector", "status": check_collector_status(), "last_check": datetime.now().isoformat()},
    ]
    return components

def get_recent_activity():
    """Get recent activities from real process/dependency state."""
    now = datetime.now()
    components = get_components_status()
    activities = [
        {
            "event": "Service Boot",
            "component": "API",
            "time": f"{int((time.time() - SYSTEM_START_TIME) / 60)}m ago",
            "status": "Online",
            "timestamp": datetime.fromtimestamp(SYSTEM_START_TIME).isoformat()
        }
    ]

    for component in components:
        if component["name"] == "API":
            continue
        if component["status"] in {"offline", "degraded"}:
            activities.append({
                "event": "Dependency Check",
                "component": component["name"],
                "time": "now",
                "status": component["status"].title(),
                "timestamp": now.isoformat()
            })

    activities.sort(key=lambda x: x["timestamp"], reverse=True)
    return activities

def get_active_alerts():
    """Get active alerts from real component state."""
    alerts = []
    for component in get_components_status():
        if component["status"] == "offline":
            alerts.append({"message": f"{component['name']} is offline", "type": "error", "time": "now"})
        elif component["status"] == "degraded":
            alerts.append({"message": f"{component['name']} is degraded", "type": "warning", "time": "now"})
    return alerts

@status_bp.get("/status")
def system_status():
    """Get overall system status"""
    components = get_components_status()
    return ok({
        "overall_status": get_system_status(components),
        "uptime_percentage": get_uptime_percentage(),
        "last_updated": datetime.now().isoformat()
    })

@status_bp.get("/metrics")
def system_metrics():
    """Get system metrics/KPIs"""
    return ok({
        "latency_ms": get_current_latency(),
        "uptime_percentage": get_uptime_percentage(),
        "last_proof_minutes": None,
        "active_connections": None,
        "requests_per_minute": None,
        "last_updated": datetime.now().isoformat()
    })

@status_bp.get("/components")
def components_status():
    """Get status of all system components"""
    return ok({
        "components": get_components_status(),
        "last_updated": datetime.now().isoformat()
    })

@status_bp.get("/activity")
def recent_activity():
    """Get recent system activities"""
    return ok({
        "activities": get_recent_activity(),
        "total_count": len(get_recent_activity()),
        "last_updated": datetime.now().isoformat()
    })

@status_bp.get("/alerts")
def active_alerts():
    """Get active system alerts"""
    return ok({
        "alerts": get_active_alerts(),
        "total_count": len(get_active_alerts()),
        "last_updated": datetime.now().isoformat()
    })

def get_dashboard_payload():
    """Get dashboard payload data"""
    try:
        components = get_components_status()
        return {
            "status": {
                "overall_status": get_system_status(components),
                "uptime_percentage": get_uptime_percentage()
            },
            "metrics": {
                "latency_ms": get_current_latency(),
                "uptime_percentage": get_uptime_percentage(),
                "last_proof_minutes": None
            },
            "components": components,
            "activities": get_recent_activity(),
            "alerts": get_active_alerts(),
            "last_updated": datetime.now().isoformat()
        }
    except Exception as e:
        # Fallback data if anything fails
        logger.error(f"Dashboard error: {e}")
        return {
            "status": {
                "overall_status": "Unknown",
                "uptime_percentage": None
            },
            "metrics": {
                "latency_ms": None,
                "uptime_percentage": None,
                "last_proof_minutes": None
            },
            "components": [],
            "activities": [],
            "alerts": [],
            "last_updated": datetime.now().isoformat()
        }

@status_bp.get("/dashboard")
def dashboard_data():
    """Get all dashboard data in one request"""
    return ok(get_dashboard_payload())
