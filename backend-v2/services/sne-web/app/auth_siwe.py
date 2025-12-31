"""
Blueprint de Autenticação SIWE (Sign-In with Ethereum)
Adicionado ao SNE V1.0 para integração com frontend React
"""

from flask import Blueprint, request, jsonify, session, g
from datetime import datetime, timedelta
import jwt
import secrets
from functools import wraps
from werkzeug.exceptions import BadRequest
import os
import logging

from app.utils.redis_safe import SafeRedis
from app.security.siwe_verify import verify_siwe, parse_siwe_message

logger = logging.getLogger(__name__)
from app.models import db, get_user_tier, set_user_tier, save_analysis, get_user_analyses_count

auth_bp = Blueprint('auth', __name__)

# Configurações SIWE - compatível com variáveis existentes
SIWE_DOMAIN = os.getenv('SIWE_DOMAIN', 'radar.snelabs.space')
SIWE_ORIGIN = os.getenv('SIWE_ORIGIN', 'https://radar.snelabs.space')
JWT_SECRET = os.getenv('SECRET_KEY', 'gerar_automaticamente')  # Usa SECRET_KEY existente
JWT_ALGORITHM = 'HS256'

# Redis para nonces e cache de tier
# Suporta Upstash REST API ou TCP Redis
redis_client = SafeRedis(
    host=os.getenv('REDIS_HOST', 'localhost'),
    port=int(os.getenv('REDIS_PORT', 6379)),
    password=os.getenv('REDIS_PASSWORD'),
    db=0,
    decode_responses=True
)

# Tier limits (movido para config)
TIER_LIMITS = {
    'free': {
        'analyses_per_day': 3,
        'requests_per_hour': 100,
        'charts_per_hour': 50,
        'websocket_updates': False
    },
    'premium': {
        'analyses_per_day': 50,
        'requests_per_hour': 1000,
        'charts_per_hour': 200,
        'websocket_updates': True
    },
    'pro': {
        'analyses_per_day': float('inf'),  # ilimitado
        'requests_per_hour': 10000,
        'charts_per_hour': 1000,
        'websocket_updates': True
    }
}

def rate_limit_auth(endpoint: str):
    """Decorator para rate limiting por endpoint e wallet"""
    def decorator(f):
        @wraps(f)
        def wrapper(*args, **kwargs):
            try:
                # Para endpoints que precisam de wallet
                data = request.get_json() or {}
                wallet_address = data.get('address', '').lower()

                if wallet_address:
                    # Rate limit por wallet
                    wallet_key = f'rate_limit:{endpoint}:wallet:{wallet_address}'
                    wallet_count = redis_client.get(wallet_key) or 0
                    wallet_count = int(wallet_count)

                    # Global rate limit por IP
                    client_ip = request.remote_addr
                    ip_key = f'rate_limit:{endpoint}:ip:{client_ip}'
                    ip_count = redis_client.get(ip_key) or 0
                    ip_count = int(ip_count)

                    # Verificar limites
                    if wallet_count >= 10 or ip_count >= 100:  # Bloqueio temporário
                        return jsonify({'error': 'Rate limit exceeded'}), 429

                    # Incrementar contadores
                    redis_client.incr(wallet_key)
                    redis_client.incr(ip_key)
                    redis_client.expire(wallet_key, 60)  # Reset em 1 minuto
                    redis_client.expire(ip_key, 60)

            except Exception as e:
                # Se Redis falhar, permitir request (fail-open)
                pass

            return f(*args, **kwargs)
        return wrapper
    return decorator

def require_auth(f):
    """Decorator para verificar JWT token"""
    @wraps(f)
    def wrapper(*args, **kwargs):
        # Allow OPTIONS requests (CORS preflight) to pass through
        if request.method == "OPTIONS":
            return ("", 204)

        auth_header = request.headers.get('Authorization', '')
        if not auth_header.startswith('Bearer '):
            return jsonify({'error': 'Missing or invalid token'}), 401

        token = auth_header.replace('Bearer ', '')

        try:
            payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])

            # Verificar expiração
            exp = datetime.fromtimestamp(payload['exp'])
            if exp < datetime.utcnow():
                return jsonify({'error': 'Token expired'}), 401

            # Set user context
            g.user = {
                'address': payload['address'],
                'tier': payload['tier'],
                'exp': payload['exp']
            }

            return f(*args, **kwargs)

        except jwt.ExpiredSignatureError:
            return jsonify({'error': 'Token expired'}), 401
        except jwt.InvalidTokenError:
            return jsonify({'error': 'Invalid token'}), 401
        except Exception as e:
            return jsonify({'error': 'Authentication failed'}), 401

    return wrapper

def get_user_tier(wallet_address: str) -> str:
    """Obtém tier do usuário do PostgreSQL com cache Redis"""
    try:
        # Cache no Redis (TTL: 1 hora)
        cache_key = f'user:tier:{wallet_address.lower()}'
        cached_tier = redis_client.get(cache_key)

        if cached_tier:
            return cached_tier

        # Buscar no PostgreSQL
        from app.models import UserTier
        user_tier = UserTier.query.filter_by(user_address=wallet_address.lower()).first()

        if user_tier and user_tier.is_active():
            tier = user_tier.tier
        else:
            tier = 'free'

        # Cache por 1 hora
        redis_client.setex(cache_key, 3600, tier)

        return tier

    except Exception as e:
        # Fail-safe: retorna free
        return 'free'

def check_tier_limits(wallet_address: str, tier: str, action: str) -> bool:
    """Verifica se usuário pode executar ação baseado no tier"""
    try:
        limits = TIER_LIMITS.get(tier, TIER_LIMITS['free'])

        # Rate limiting por ação
        action_key = f'rate_limit:{action}:{wallet_address.lower()}:{datetime.utcnow().strftime("%Y-%m-%d-%H")}'
        action_count = redis_client.get(action_key) or 0
        action_count = int(action_count)

        # Verificar limites
        if action == 'analysis' and action_count >= limits['analyses_per_day']:
            return False
        elif action == 'request' and action_count >= limits['requests_per_hour']:
            return False
        elif action == 'chart' and action_count >= limits['charts_per_hour']:
            return False

        # Incrementar contador
        redis_client.incr(action_key)
        redis_client.expire(action_key, 3600)  # Expira em 1 hora

        return True

    except Exception as e:
        # Fail-open: permite se Redis falhar
        return True

@auth_bp.route('/api/auth/nonce', methods=['POST'])
@rate_limit_auth('nonce')
def get_nonce():
    """
    Gerar nonce único para SIWE
    Endpoint: POST /api/auth/nonce
    Body: { "address": "0x..." }
    """
    logger.info("Nonce endpoint called")
    try:
        data = request.get_json()
        if not data or 'address' not in data:
            return jsonify({'error': 'Address required'}), 400

        address = data['address'].lower()

        # Rate limit check
        if not check_tier_limits(address, 'free', 'request'):
            return jsonify({'error': 'Rate limit exceeded'}), 429

        # Gerar nonce único
        nonce = secrets.token_hex(16)

        # Armazenar no Redis com expiração (5 minutos)
        nonce_key = f'siwe:nonce:{nonce}'
        redis_client.setex(nonce_key, 300, address)

        # VALIDAR: Redis deve ter armazenado o nonce corretamente
        stored_address = redis_client.get(nonce_key)
        if not stored_address or stored_address != address:
            return jsonify({'error': 'Nonce storage unavailable - Redis not working'}), 503

        return jsonify({'nonce': nonce}), 200

    except Exception as e:
        return jsonify({'error': 'Failed to generate nonce'}), 500

@auth_bp.route('/api/auth/siwe', methods=['POST'])
@rate_limit_auth('siwe')
def siwe_login():
    """
    Autenticação via SIWE
    Endpoint: POST /api/auth/siwe
    Body: {
        "message": "Sign message...",
        "signature": "0x..."
    }
    """
    try:
        data = request.get_json()
        if not data or 'message' not in data or 'signature' not in data:
            return jsonify({'error': 'Message and signature required'}), 400

        message = data['message']
        signature = data['signature']

        # Verificar SIWE message
        try:
            parsed_message = parse_siwe_message(message)
            address = parsed_message['address'].lower()

            # Verificar assinatura
            if not verify_siwe(message, signature):
                return jsonify({'error': 'Invalid signature'}), 401

            # Verificar nonce
            nonce = parsed_message['nonce']
            nonce_key = f'siwe:nonce:{nonce}'
            stored_address = redis_client.get(nonce_key)

            if not stored_address or stored_address.lower() != address:
                return jsonify({'error': 'Invalid or expired nonce'}), 401

            # Remover nonce usado (one-time use)
            redis_client.delete(nonce_key)

            # Obter tier do usuário
            tier = get_user_tier(address)

            # Verificar rate limits
            if not check_tier_limits(address, tier, 'request'):
                return jsonify({'error': 'Rate limit exceeded for your tier'}), 429

            # Gerar JWT token
            exp = datetime.utcnow() + timedelta(hours=24)  # 24 horas
            token_data = {
                'address': address,
                'tier': tier,
                'exp': exp.timestamp()
            }

            token = jwt.encode(token_data, JWT_SECRET, algorithm=JWT_ALGORITHM)

            # Cache tier por 1 hora
            cache_key = f'user:tier:{address}'
            redis_client.setex(cache_key, 3600, tier)

            return jsonify({
                'token': token,
                'address': address,
                'tier': tier,
                'exp': exp.timestamp()
            }), 200

        except Exception as e:
            return jsonify({'error': f'SIWE verification failed: {str(e)}'}), 401

    except Exception as e:
        return jsonify({'error': 'Authentication failed'}), 500

@auth_bp.route('/api/auth/verify', methods=['GET'])
@require_auth
def verify_token():
    """
    Verificar se token JWT é válido
    Endpoint: GET /api/auth/verify
    Headers: Authorization: Bearer <token>
    """
    try:
        user = g.user
        return jsonify({
            'valid': True,
            'address': user['address'],
            'tier': user['tier'],
            'cached': True  # Indicador que dados podem vir do cache
        }), 200

    except Exception as e:
        return jsonify({'error': 'Token verification failed'}), 500

@auth_bp.route('/api/auth/logout', methods=['POST'])
@require_auth
def logout():
    """
    Logout - limpar session
    Endpoint: POST /api/auth/logout
    """
    try:
        # Limpar cache do tier (opcional)
        user = getattr(g, 'user', None)
        if user:
            cache_key = f'user:tier:{user["address"]}'
            redis_client.delete(cache_key)

        return jsonify({'success': True}), 200

    except Exception as e:
        return jsonify({'error': 'Logout failed'}), 500

# Export decorators for use in other modules
__all__ = ['require_auth', 'check_tier_limits', 'get_user_tier']
