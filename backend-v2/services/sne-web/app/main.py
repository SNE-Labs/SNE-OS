"""
Main application routes for SNE Web
"""
from flask import jsonify
from . import socketio
import logging

logger = logging.getLogger(__name__)

# Health check moved to __init__.py to avoid conflicts

@socketio.on('connect')
def handle_connect():
    """Handle WebSocket connection"""
    logger.info('Client connected')
    socketio.emit('status', {'message': 'Connected to SNE Web'})

@socketio.on('disconnect')
def handle_disconnect():
    """Handle WebSocket disconnection"""
    logger.info('Client disconnected')

if __name__ == '__main__':
    socketio.run(app, host='0.0.0.0', port=8080, debug=True)



