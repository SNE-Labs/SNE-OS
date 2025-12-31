"""
SNE Web Service - Flask API with WebSocket support
"""
import os

# Fix DNS resolution issues with eventlet
# Temporarily disabled for local testing
# os.environ.setdefault("EVENTLET_NO_GREENDNS", "yes")
# import eventlet
# eventlet.monkey_patch()  # Deve ser o primeiro import

from flask import Flask, jsonify
from flask_socketio import SocketIO
from flask_cors import CORS
import os
import logging

# Import extensions
from .extensions import db

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

socketio = SocketIO(
    cors_allowed_origins=["https://radar.snelabs.space", "https://www.radar.snelabs.space"],
    async_mode="eventlet"
)

def create_app():
    """Application factory pattern"""
    logger.info("Creating Flask app...")

    app = Flask(__name__)
    app.config['SECRET_KEY'] = os.environ.get('SECRET_KEY', 'dev-secret-key-change-in-production')

    # DATABASE_URL fix for Render (postgres:// -> postgresql://)
    db_url = os.environ.get('DATABASE_URL')
    if db_url and db_url.startswith("postgres://"):
        db_url = db_url.replace("postgres://", "postgresql://", 1)
    app.config['SQLALCHEMY_DATABASE_URI'] = db_url or 'postgresql://localhost/sne'
    app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

    # Initialize extensions
    db.init_app(app)
    socketio.init_app(app)

    # Load configuration
    app.config.from_object("app.config.Config")

    # CORS configuration - Include all SNE OS subdomains
    from .config import Config
    cors_origins = Config.CORS_ORIGINS

    CORS(app,
         origins=cors_origins,
         resources={
             r"/api/*": {
                 "origins": cors_origins,
                 "methods": ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
                 "allow_headers": ["Content-Type", "Authorization", "Accept", "Origin", "X-Requested-With"],
                 "supports_credentials": True
             }
         },
         supports_credentials=True)

    logger.info("Flask app created successfully")
    return app

# Create app instance for production (Gunicorn)
app = create_app()

# Simple test route
@app.route('/', methods=['GET'])
def root():
    logger.info("Root endpoint called")
    return jsonify({'message': 'SNE Web API is running', 'status': 'ok'}), 200

# Database initialization endpoint (manual)
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

# Database auto-initialization (only if explicitly enabled)
if os.getenv("AUTO_INIT_DB") == "true":
    from .models import init_db_auto
    try:
        with app.app_context():
            init_db_auto()
    except Exception as e:
        logger.warning(f"Database auto-initialization failed: {str(e)}")

# Register blueprints
from . import main, api, auth_siwe, dashboard_api, charts_api
from .vault_api import vault_bp
from .passport_api import passport_bp
from .radar_api import radar_bp
from .status_api import status_bp

# Existing blueprints
app.register_blueprint(auth_siwe.auth_bp)
app.register_blueprint(dashboard_api.dashboard_bp)
app.register_blueprint(charts_api.charts_bp)

# New SNE OS blueprints - Direct imports to avoid namespace confusion
app.register_blueprint(vault_bp, url_prefix="/api/vault")
app.register_blueprint(passport_bp, url_prefix="/api/passport")
app.register_blueprint(radar_bp, url_prefix="/api/radar")
app.register_blueprint(status_bp, url_prefix="/api")



