"""
Main application routes for SNE Telegram
"""
from flask import jsonify
from . import app
import logging

logger = logging.getLogger(__name__)

@app.route('/health', methods=['GET'])
def health():
    """Health check endpoint"""
    return jsonify({
        'status': 'healthy',
        'service': 'sne-telegram',
        'version': '1.0.0'
    }), 200



