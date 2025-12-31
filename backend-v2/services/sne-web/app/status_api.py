"""
Status API for SNE OS Home Dashboard
Provides real-time system metrics, status, and activity data
"""
import time
import random
from datetime import datetime, timedelta
from flask import Blueprint
from .common.http import ok
from .common.auth import require_session

status_bp = Blueprint("status", __name__)

# Simulated system state (in production, this would come from monitoring systems)
SYSTEM_START_TIME = time.time()
LAST_PROOF_TIME = time.time() - random.randint(60, 600)  # 1-10 minutes ago

def get_uptime_percentage():
    """Calculate uptime percentage (simplified)"""
    # In production, this would track actual downtime
    return 99.9

def get_current_latency():
    """Get current system latency (simplified)"""
    # In production, this would measure actual response times
    return random.randint(15, 45)

def get_system_status():
    """Get overall system status"""
    # Simulate occasional issues
    if random.random() < 0.05:  # 5% chance of issues
        return "Partial Outage"
    return "All Systems Operational"

def get_components_status():
    """Get status of all system components"""
    components = [
        {"name": "API", "status": "online", "last_check": datetime.now().isoformat()},
        {"name": "Indexer", "status": "online", "last_check": datetime.now().isoformat()},
        {"name": "Relayer", "status": "degraded" if random.random() < 0.1 else "online", "last_check": datetime.now().isoformat()},
        {"name": "Database", "status": "online", "last_check": datetime.now().isoformat()},
        {"name": "Cache", "status": "online", "last_check": datetime.now().isoformat()},
    ]
    return components

def get_recent_activity():
    """Get recent system activities"""
    activities = [
        {
            "event": "Proof Published",
            "component": "Vault",
            "time": f"{random.randint(1, 5)}m ago",
            "status": "Online",
            "timestamp": (datetime.now() - timedelta(minutes=random.randint(1, 5))).isoformat()
        },
        {
            "event": "Data Sync",
            "component": "Indexer",
            "time": f"{random.randint(5, 15)}m ago",
            "status": "Online",
            "timestamp": (datetime.now() - timedelta(minutes=random.randint(5, 15))).isoformat()
        },
        {
            "event": "API Request",
            "component": "API Gateway",
            "time": f"{random.randint(10, 30)}m ago",
            "status": "Online",
            "timestamp": (datetime.now() - timedelta(minutes=random.randint(10, 30))).isoformat()
        },
        {
            "event": "Relay Update",
            "component": "Relayer",
            "time": f"{random.randint(20, 45)}m ago",
            "status": "Degraded" if random.random() < 0.3 else "Online",
            "timestamp": (datetime.now() - timedelta(minutes=random.randint(20, 45))).isoformat()
        },
        {
            "event": "Node Heartbeat",
            "component": "Edge Node",
            "time": f"{random.randint(30, 60)}m ago",
            "status": "Online",
            "timestamp": (datetime.now() - timedelta(minutes=random.randint(30, 60))).isoformat()
        }
    ]

    # Sort by timestamp (most recent first)
    activities.sort(key=lambda x: x["timestamp"], reverse=True)
    return activities

def get_active_alerts():
    """Get active system alerts"""
    alerts = []

    # Simulate occasional alerts
    if random.random() < 0.3:  # 30% chance of having alerts
        alert_types = [
            {"message": "Relayer experiencing delays", "type": "warning", "time": f"{random.randint(10, 45)}m ago"},
            {"message": "High memory usage detected", "type": "warning", "time": f"{random.randint(5, 30)}m ago"},
            {"message": "Node sync completed", "type": "success", "time": f"{random.randint(30, 120)}m ago"},
            {"message": "Backup completed successfully", "type": "success", "time": f"{random.randint(60, 240)}m ago"},
        ]

        # Return 1-2 random alerts
        num_alerts = random.randint(1, 2)
        selected_alerts = random.sample(alert_types, num_alerts)
        alerts = selected_alerts

    return alerts

@status_bp.get("/status")
def system_status():
    """Get overall system status"""
    return ok({
        "overall_status": get_system_status(),
        "uptime_percentage": get_uptime_percentage(),
        "last_updated": datetime.now().isoformat()
    })

@status_bp.get("/metrics")
def system_metrics():
    """Get system metrics/KPIs"""
    return ok({
        "latency_ms": get_current_latency(),
        "uptime_percentage": get_uptime_percentage(),
        "last_proof_minutes": int((time.time() - LAST_PROOF_TIME) / 60),
        "active_connections": random.randint(50, 200),
        "requests_per_minute": random.randint(100, 500),
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

@status_bp.get("/dashboard")
def dashboard_data():
    """Get all dashboard data in one request"""
    return ok({
        "status": {
            "overall_status": get_system_status(),
            "uptime_percentage": get_uptime_percentage()
        },
        "metrics": {
            "latency_ms": get_current_latency(),
            "uptime_percentage": get_uptime_percentage(),
            "last_proof_minutes": int((time.time() - LAST_PROOF_TIME) / 60)
        },
        "components": get_components_status(),
        "activities": get_recent_activity(),
        "alerts": get_active_alerts(),
        "last_updated": datetime.now().isoformat()
    })
