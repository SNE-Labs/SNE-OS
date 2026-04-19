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

    # Load configuration before initializing extensions so runtime flags are available.
    app.config.from_object("app.config.Config")

    # Initialize extensions with error handling
    try:
        db.init_app(app)
        logger.info("Database initialized successfully")
    except Exception as e:
        logger.warning(f"Database initialization failed: {e}")
        logger.warning("Continuing without database - some features may not work")

    # Best-effort schema bootstrap for environments without migrations.
    if app.config.get("AUTO_INIT_DB"):
        try:
            with app.app_context():
                from .models import init_db_auto
                init_db_auto()
        except Exception as e:
            logger.warning(f"Database schema bootstrap skipped: {e}")
    else:
        logger.info("Automatic database bootstrap disabled for this environment")

    socketio.init_app(app)

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
    from .keys_api import keys_bp
    from .swaps_api import swaps_bp
    from .checkout_api import checkout_bp
    from .networks_api import networks_bp
    from .radar_api import radar_bp
    from .secrets_api import secrets_bp
    from .status_api import status_bp, dashboard_bp as status_dashboard_bp
    from .intel_api import intel_bp
    from .home_api import home_bp
    from .seo_api import seo_bp
    from .share_api import share_bp

    # Existing blueprints
    app.register_blueprint(auth_siwe.auth_bp)
    # Register dashboard root endpoint from status_api FIRST (before dashboard_api routes)
    app.register_blueprint(status_dashboard_bp, url_prefix="/api/dashboard")
    app.register_blueprint(dashboard_api.dashboard_bp, url_prefix="/api/dashboard")
    app.register_blueprint(charts_api.charts_bp)

    # New SNE OS blueprints
    app.register_blueprint(vault_bp, url_prefix="/api/vault")
    app.register_blueprint(passport_bp, url_prefix="/api/passport")
    app.register_blueprint(keys_bp, url_prefix="/api/keys")
    app.register_blueprint(swaps_bp, url_prefix="/api/swaps")
    app.register_blueprint(checkout_bp, url_prefix="/api/checkout")
    app.register_blueprint(networks_bp, url_prefix="/api/networks")
    app.register_blueprint(radar_bp, url_prefix="/api/radar")
    app.register_blueprint(secrets_bp, url_prefix="/api/secrets")
    app.register_blueprint(status_bp, url_prefix="/api/status")
    app.register_blueprint(intel_bp, url_prefix="/api/intel")
    app.register_blueprint(seo_bp, url_prefix="/api/seo")
    app.register_blueprint(share_bp, url_prefix="/api")
    app.register_blueprint(home_bp, url_prefix="/api")

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
