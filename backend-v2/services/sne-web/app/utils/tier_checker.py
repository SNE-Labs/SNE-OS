"""
Sistema de verificação de tier e rate limiting
Integra com Redis para controle de limites por usuário
"""

import os
import logging
from functools import wraps
from flask import request, jsonify, g
from datetime import datetime, timedelta

from .redis_safe import SafeRedis

logger = logging.getLogger(__name__)
redis_client = SafeRedis()

# Limites por tier
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
    """
    Decorator para rate limiting por endpoint
    Aplica a todas as requests, independente de autenticação
    """
    def decorator(f):
        @wraps(f)
        def wrapper(*args, **kwargs):
            try:
                # Rate limit por IP (sempre aplicado)
                client_ip = request.remote_addr
                ip_key = f'rate_limit:{endpoint}:ip:{client_ip}'
                ip_count = redis_client.get(ip_key) or 0
                ip_count = int(ip_count)

                # Limite global por IP: 1000 requests/hora
                if ip_count >= 1000:
                    return jsonify({
                        'error': 'Rate limit exceeded',
                        'retry_after': 3600
                    }), 429

                redis_client.incr(ip_key)
                redis_client.expire(ip_key, 3600)  # 1 hora

                # Se for endpoint que precisa de wallet
                data = request.get_json() or {}
                wallet_address = data.get('address', '').lower()

                if wallet_address:
                    # Rate limit adicional por wallet
                    wallet_key = f'rate_limit:{endpoint}:wallet:{wallet_address}'
                    wallet_count = redis_client.get(wallet_key) or 0
                    wallet_count = int(wallet_count)

                    # Limite por wallet: 10 requests/minuto
                    if wallet_count >= 10:
                        return jsonify({
                            'error': 'Rate limit exceeded for wallet',
                            'retry_after': 60
                        }), 429

                    redis_client.incr(wallet_key)
                    redis_client.expire(wallet_key, 60)  # 1 minuto

            except Exception as e:
                logger.warning(f"Rate limit error: {str(e)}")
                # Fail-open: permite request se Redis falhar

            return f(*args, **kwargs)
        return wrapper
    return decorator

def require_tier(min_tier: str):
    """
    Decorator para verificar tier mínimo
    Deve ser usado APÓS @require_auth
    """
    def decorator(f):
        @wraps(f)
        def wrapper(*args, **kwargs):
            user = getattr(g, 'user', None)
            if not user:
                return jsonify({'error': 'Authentication required'}), 401

            user_tier = user.get('tier', 'free')

            # Hierarquia de tiers
            tier_hierarchy = {'free': 0, 'premium': 1, 'pro': 2}
            user_level = tier_hierarchy.get(user_tier, 0)
            required_level = tier_hierarchy.get(min_tier, 0)

            if user_level < required_level:
                return jsonify({
                    'error': f'Feature requires {min_tier} tier or higher',
                    'current_tier': user_tier,
                    'required_tier': min_tier
                }), 403

            return f(*args, **kwargs)
        return wrapper
    return decorator

def check_rate_limit(user_address: str, tier: str, action: str) -> bool:
    """
    Verifica se usuário pode executar ação baseado no tier e rate limits

    Args:
        user_address: endereço da wallet
        tier: tier do usuário
        action: tipo de ação ('analysis', 'request', 'chart')

    Returns:
        bool: True se permitido, False se limite excedido
    """
    try:
        limits = TIER_LIMITS.get(tier, TIER_LIMITS['free'])

        # Key para rate limiting: action:user:hour
        action_key = f'rate_limit:{action}:{user_address.lower()}:{datetime.utcnow().strftime("%Y-%m-%d-%H")}'
        action_count = redis_client.get(action_key) or 0
        action_count = int(action_count)

        # Verificar limites específicos
        if action == 'analysis' and action_count >= limits['analyses_per_day']:
            logger.warning(f"Analysis limit exceeded for {user_address} ({tier}): {action_count}/{limits['analyses_per_day']}")
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
        logger.warning(f"Rate limit check error: {str(e)}")
        return True  # Fail-open

def get_tier_limits(tier: str) -> dict:
    """Retorna limites do tier"""
    return TIER_LIMITS.get(tier, TIER_LIMITS['free'])

def can_use_websocket(tier: str) -> bool:
    """Verifica se tier permite WebSocket updates"""
    return TIER_LIMITS.get(tier, TIER_LIMITS['free']).get('websocket_updates', False)

def get_user_tier_from_cache(user_address: str) -> str:
    """
    Obtém tier do usuário do cache Redis
    Retorna 'free' se não encontrado
    """
    try:
        cache_key = f'user:tier:{user_address.lower()}'
        cached_tier = redis_client.get(cache_key)
        return cached_tier if cached_tier else 'free'
    except Exception as e:
        logger.warning(f"Cache error: {str(e)}")
        return 'free'

def set_user_tier_cache(user_address: str, tier: str, ttl: int = 3600):
    """
    Cache tier do usuário no Redis

    Args:
        user_address: endereço da wallet
        tier: tier do usuário
        ttl: tempo de vida em segundos (default: 1 hora)
    """
    try:
        cache_key = f'user:tier:{user_address.lower()}'
        redis_client.setex(cache_key, ttl, tier)
    except Exception as e:
        logger.warning(f"Cache set error: {str(e)}")

def get_rate_limit_status(user_address: str, tier: str) -> dict:
    """
    Retorna status atual dos rate limits do usuário
    Útil para mostrar no dashboard
    """
    try:
        limits = get_tier_limits(tier)
        status = {}

        # Verificar cada tipo de limite
        for action in ['analysis', 'request', 'chart']:
            action_key = f'rate_limit:{action}:{user_address.lower()}:{datetime.utcnow().strftime("%Y-%m-%d-%H")}'
            current = int(redis_client.get(action_key) or 0)
            limit = limits.get(f'{action}s_per_{"day" if action == "analysis" else "hour"}', 0)

            status[action] = {
                'current': current,
                'limit': limit,
                'remaining': max(0, limit - current),
                'percentage': min(100, (current / limit * 100) if limit > 0 else 0)
            }

        return status

    except Exception as e:
        logger.warning(f"Rate limit status error: {str(e)}")
        return {}
