#!/usr/bin/env python3
"""
SNE Web Service - Versão Railway baseada no commit funcional cb0380c
"""
import os
import sys
import logging

# Add current directory to path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

try:
    from app import app, socketio
    logger.info("Successfully imported Flask app and SocketIO")
except ImportError as e:
    logger.error(f"Failed to import Flask app: {e}")
    sys.exit(1)

if __name__ == "__main__":
    port = int(os.environ.get('PORT', 8080))
    logger.info(f"🚀 Starting SNE Web Service on port {port}")

    try:
        # Usar SocketIO.run() como no commit funcional
        socketio.run(app, host='0.0.0.0', port=port, debug=False)
    except Exception as e:
        logger.error(f"Failed to start server: {e}")
        sys.exit(1)
