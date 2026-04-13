"""
Networks API for SNE OS.
Exposes supported network metadata and capabilities.
"""

from flask import Blueprint, jsonify

from .networks import get_default_network_metadata, list_networks


networks_bp = Blueprint("networks", __name__)


@networks_bp.get("/")
def index():
    return jsonify({
        "default": get_default_network_metadata(),
        "items": list_networks(),
    }), 200

