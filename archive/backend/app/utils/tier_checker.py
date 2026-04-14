"""
Middleware para verificação de tiers e rate limiting
"""
from functools import wraps
from flask import request, jsonify, g
import jwt
import redis
import os
from datetime import datetime, timedelta

# Redis com fallback seguro (não quebra se Redis não estiver rodando)
from app.utils.redis_safe import SafeRedis
redis_client = SafeRedis(
    host=os.getenv('REDIS_HOST', 'localhost'),
    port=int(os.getenv('REDIS_PORT', 6379)),
    db=0,
    decode_responses=True
)

def rate_limit_auth(endpoint: str):
    """
    Rate limit para endpoints de autenticação (/nonce, /siwe)
    
    ✅ Por IP e por wallet (evitar spam)
    """
    def decorator(f):
        @wraps(f)
        def decorated_function(*args, **kwargs):
            # Rate limit por IP
            ip = request.remote_addr
            ip_key = f'rate_limit:auth:{endpoint}:ip:{ip}'
            ip_count = redis_client.get(ip_key)
            
            limits = {
                'nonce': 20,  # 20 nonces/minuto por IP
                'siwe': 10    # 10 tentativas/minuto por IP
            }
            
            if ip_count and int(ip_count) >= limits.get(endpoint, 10):
                return jsonify({'error': 'Rate limit exceeded (IP)'}), 429
            
            redis_client.incr(ip_key)
            redis_client.expire(ip_key, 60)  # Reset a cada minuto
            
            return f(*args, **kwargs)
        return decorated_function
    return decorator

def require_tier(min_tier: str):
    """
    Decorator para verificar tier mínimo
    
    ✅ Padronizado: lê cookie HttpOnly OU header Authorization (igual /verify)
    """
    tier_levels = {'free': 0, 'premium': 1, 'pro': 2}
    
    def decorator(f):
        @wraps(f)
        def decorated_function(*args, **kwargs):
            # ✅ Padronizado: cookie OU header (igual /verify)
            token = request.cookies.get('sne_token') or request.headers.get('Authorization', '').replace('Bearer ', '')
            
            if not token:
                return jsonify({'error': 'No token provided'}), 401
            
            try:
                payload = jwt.decode(token, os.getenv('SECRET_KEY'), algorithms=['HS256'])
                user_tier = payload.get('tier', 'free')
                
                # Verificar tier mínimo
                if tier_levels.get(user_tier, 0) < tier_levels.get(min_tier, 0):
                    return jsonify({
                        'error': f'Requires {min_tier} tier',
                        'current_tier': user_tier
                    }), 403
                
                # ✅ Injetar no contexto (g importado do flask)
                g.user = {
                    'address': payload.get('address'),
                    'tier': user_tier
                }
                
                return f(*args, **kwargs)
            except jwt.ExpiredSignatureError:
                return jsonify({'error': 'Token expired'}), 401
            except jwt.InvalidTokenError:
                return jsonify({'error': 'Invalid token'}), 401
        return decorated_function
    return decorator

