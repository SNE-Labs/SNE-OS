"""
SNE Radar Backend - Flask + Socket.IO
"""
import os
from flask import Flask, request
from flask_cors import CORS
from flask_session import Session
from flask_sqlalchemy import SQLAlchemy
from dotenv import load_dotenv

# Carregar variáveis de ambiente
load_dotenv()

app = Flask(__name__)

# Inicializar SQLAlchemy
db = SQLAlchemy()
app.config['SQLALCHEMY_DATABASE_URI'] = os.getenv('DATABASE_URL', 'sqlite:///sne_radar.db')
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
db.init_app(app)

# Inicializar models
from app.models.user_tier import get_user_tier_model
UserTier = get_user_tier_model(db)

# Configuração de sessão e cookies
app.config['SECRET_KEY'] = os.getenv('SECRET_KEY', 'dev-secret-key-change-in-production')
app.config['SESSION_COOKIE_HTTPONLY'] = True
app.config['SESSION_COOKIE_SECURE'] = os.getenv('FLASK_ENV') == 'production'
app.config['SESSION_COOKIE_SAMESITE'] = 'Lax'
app.config['SESSION_COOKIE_MAX_AGE'] = 3600  # 1 hora

# Flask-Session requer SESSION_TYPE
app.config['SESSION_TYPE'] = os.getenv('SESSION_TYPE', 'filesystem')
Session(app)

# CORS com supports_credentials para cookies HttpOnly
def get_allowed_origins():
    """
    Retorna origens permitidas (allowlist explícita)
    
    ✅ IMPORTANTE: Com credentials=True, NUNCA usar wildcard
    ✅ Apenas domínios finais reais
    """
    from flask import request
    import re
    
    # Domínios de produção fixos (SNE OS + Radar)
    allowed = [
        "https://snelabs.space",        # SNE OS principal
        "https://www.snelabs.space",    # SNE OS www
        "https://radar.snelabs.space",  # Radar legacy
        "https://www.radar.snelabs.space",
        "https://pass.snelabs.space",   # Passport
        "https://vault.snelabs.space"   # Vault (future)
    ]
    
    # Durante preview, validar Origin dinamicamente
    origin = request.headers.get('Origin')
    
    if origin:
        # Padrão Vercel preview: https://sne-radar-*.vercel.app
        vercel_preview_pattern = re.compile(
            r'^https://sne-radar-[a-z0-9-]+\.vercel\.app$'
        )
        
        if vercel_preview_pattern.match(origin):
            allowed.append(origin)
    
    # Em desenvolvimento, permitir localhost
    if os.getenv('FLASK_ENV') == 'development':
        allowed.extend([
            'http://localhost:5173',
            'http://127.0.0.1:5173'
        ])
    
    return allowed

# ✅ CORS configurado corretamente
# ⚠️ Flask-CORS precisa de lista ou função que retorna lista
# Para desenvolvimento, usar lista fixa (mais simples)
cors_origins_list = [
    "https://snelabs.space",        # SNE OS principal
    "https://www.snelabs.space",    # SNE OS www
    "https://radar.snelabs.space",  # Radar legacy
    "https://www.radar.snelabs.space",
    "https://pass.snelabs.space",   # Passport
    "https://vault.snelabs.space"   # Vault (future)
]

# Em desenvolvimento, adicionar localhost
if os.getenv('FLASK_ENV') != 'production':
    cors_origins_list.extend([
        'http://localhost:5173',
        'http://127.0.0.1:5173',
        'http://localhost:5000',
        'http://127.0.0.1:5000'
    ])

CORS(
    app,
    origins=cors_origins_list,  # ✅ Lista fixa (mais simples e funciona)
    supports_credentials=True,    # ✅ OBRIGATÓRIO: permite cookies HttpOnly
    allow_headers=["Content-Type", "Authorization"],
    methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"]
)

# ✅ CORREÇÃO CORS: Handle OPTIONS preflight requests
@app.before_request
def handle_preflight():
    """Handle CORS preflight OPTIONS requests globally"""
    if request.method == "OPTIONS":
        return ("", 204)

# Registrar blueprints
from app.api.auth import auth_bp
from app.api.dashboard import dashboard_bp
from app.api.charts import charts_bp
from app.api.analysis import analysis_bp
from app.api.v1 import v1_bp
from app.api.analyze import analyze_bp

app.register_blueprint(auth_bp)
app.register_blueprint(dashboard_bp)
app.register_blueprint(charts_bp)
app.register_blueprint(analysis_bp)
app.register_blueprint(v1_bp)  # API v1 compatível com radar existente
app.register_blueprint(analyze_bp)  # /api/analyze e /api/signal

# Inicializar Socket.IO (com tratamento de erro)
try:
    from app.socketio.handlers import socketio
    socketio.init_app(app, cors_allowed_origins="*", cors_credentials=True)
except Exception as e:
    import logging
    logger = logging.getLogger(__name__)
    logger.warning(f"Socket.IO não pôde ser inicializado: {e}")
    socketio = None

@app.route('/', methods=['GET'])
def index():
    """Rota raiz - informações da API"""
    return {
        'service': 'SNE Radar Backend',
        'version': '1.0.0',
        'status': 'running',
        'endpoints': {
            'health': '/health',
            'auth': '/api/auth/*',
            'v1': '/api/v1/*',
            'analyze': '/api/analyze',
            'signal': '/api/signal'
        }
    }, 200

@app.route('/health', methods=['GET'])
def health():
    """Health check endpoint"""
    return {'status': 'healthy', 'service': 'sne-radar-backend'}, 200

if __name__ == '__main__':
    port = int(os.getenv('PORT', 5000))
    debug = os.getenv('FLASK_ENV') == 'development'
    app.run(host='0.0.0.0', port=port, debug=debug)

