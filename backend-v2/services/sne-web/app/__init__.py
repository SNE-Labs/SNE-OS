"""
SNE Web Service - Flask API with WebSocket support
"""
from flask import Flask
from flask_socketio import SocketIO
from flask_cors import CORS
import os
import logging

# Configure logging
logging.basicConfig(level=logging.DEBUG)
logger = logging.getLogger(__name__)

logger.info("Initializing Flask app...")
app = Flask(__name__)
app.config['SECRET_KEY'] = os.environ.get('SECRET_KEY', 'dev-secret-key-change-in-production')
app.config['SQLALCHEMY_DATABASE_URI'] = os.environ.get('DATABASE_URL', 'postgresql://localhost/sne')
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
logger.info("Flask app created successfully")

# CORS configuration for cross-origin requests from radar.snelabs.space
CORS(app, origins=["https://radar.snelabs.space", "https://www.radar.snelabs.space"],
     methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
     allowed_headers=["Content-Type", "Authorization"],
     supports_credentials=True)

socketio = SocketIO(app, cors_allowed_origins=["https://radar.snelabs.space", "https://www.radar.snelabs.space"],
                   async_mode='threading')

# Simple test route
@app.route('/', methods=['GET'])
def root():
    logger.info("Root endpoint called")
    return jsonify({'message': 'SNE Web API is running', 'status': 'ok'}), 200

# Database initialization endpoint
@app.route('/init-db', methods=['POST'])
def init_database():
    """Endpoint para inicializar banco de dados"""
    try:
        from .models import init_db
        logger.info("Initializing database...")
        init_db()
        logger.info("Database initialized successfully")
        return jsonify({'status': 'success', 'message': 'Database initialized'}), 200
    except Exception as e:
        logger.error(f"Database initialization failed: {str(e)}")
        return jsonify({'status': 'error', 'message': str(e)}), 500

# Initialize database automatically
from .models import init_db_auto
try:
    with app.app_context():
        init_db_auto()
except Exception as e:
    logger.warning(f"Database auto-initialization failed: {str(e)}")

# Register blueprints
from . import main, api, auth_siwe, dashboard_api, charts_api
app.register_blueprint(auth_siwe.auth_bp)
app.register_blueprint(dashboard_api.dashboard_bp)
app.register_blueprint(charts_api.charts_bp)



