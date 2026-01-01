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
    cors_allowed_origins=["https://snelabs.space", "https://api.snelabs.space"],
    async_mode="threading"  # Use threading instead of eventlet for compatibility
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

    # Initialize extensions with error handling
    try:
        db.init_app(app)
        logger.info("Database initialized successfully")
    except Exception as e:
        logger.warning(f"Database initialization failed: {e}")
        logger.warning("Continuing without database - some features may not work")

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

    # REGISTER BLUEPRINTS INSIDE create_app() - CRITICAL FIX
    from . import auth_siwe, dashboard_api, charts_api  # Import modules here
    from .vault_api import vault_bp
    from .passport_api import passport_bp
    from .radar_api import radar_bp
    from .status_api import status_bp, dashboard_bp

    # Existing blueprints
    app.register_blueprint(auth_siwe.auth_bp)
    app.register_blueprint(dashboard_api.dashboard_bp, url_prefix="/api/dashboard")
    app.register_blueprint(charts_api.charts_bp)

    # New SNE OS blueprints
    app.register_blueprint(vault_bp, url_prefix="/api/vault")
    app.register_blueprint(passport_bp, url_prefix="/api/passport")
    app.register_blueprint(radar_bp, url_prefix="/api/radar")
    app.register_blueprint(status_bp, url_prefix="/api/status")

    # Register global routes INSIDE create_app()
    @app.route('/', methods=['GET'])
    def root():
        logger.info("Root endpoint called")
        return jsonify({'message': 'SNE Web API is running', 'status': 'ok'}), 200

    @app.route('/health', methods=['GET'])
    def health():
        return jsonify({'status': 'ok', 'service': 'sne-web', 'version': '1.0'}), 200

    logger.info("Flask app created successfully")
    return app

# Create app instance for production (Gunicorn) - AFTER create_app is defined
app = create_app()
