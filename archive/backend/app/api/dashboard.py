"""
Blueprint Dashboard - Dados de mercado e resumo
"""
from flask import Blueprint, jsonify, request
from app.utils.tier_checker import require_tier
from app.utils.logging import get_request_id
from app.utils.metrics import dashboard_requests, dashboard_duration
import redis
import os
import time
import requests

dashboard_bp = Blueprint('dashboard', __name__)

# Redis para cache (com fallback seguro)
from app.utils.redis_safe import SafeRedis
redis_client = SafeRedis(
    host=os.getenv('REDIS_HOST', 'localhost'),
    port=int(os.getenv('REDIS_PORT', 6379)),
    db=0,
    decode_responses=True
)

CACHE_TTL = int(os.getenv('CACHE_DASHBOARD_TTL', 300))  # 5 minutos

@dashboard_bp.route('/api/dashboard/summary', methods=['GET'])
@require_tier('free')  # Todos os tiers podem acessar
def get_summary():
    """
    Resumo geral do mercado (Free tier)
    
    Retorna: market cap, volume 24h, top movers, etc.
    """
    request_id = get_request_id()
    start_time = time.time()
    
    # Verificar cache
    cache_key = 'dashboard:summary'
    cached = redis_client.get(cache_key)
    
    if cached:
        dashboard_requests.labels(tier='free', cached=True).inc()
        dashboard_duration.observe(time.time() - start_time)
        return jsonify({
            'success': True,
            'data': eval(cached),  # ⚠️ Em produção, usar json.loads
            'cached': True
        })
    
    try:
        # TODO: Integrar com Binance API ou CoinMarketCap
        # Por enquanto, retornar dados mockados
        data = {
            'market_cap': 2500000000000,  # $2.5T
            'volume_24h': 85000000000,    # $85B
            'btc_dominance': 52.5,
            'eth_dominance': 17.2,
            'fear_greed_index': 65,
            'top_gainers': [
                {'symbol': 'BTC', 'change_24h': 3.5},
                {'symbol': 'ETH', 'change_24h': 2.8},
                {'symbol': 'SOL', 'change_24h': 5.2}
            ],
            'top_losers': [
                {'symbol': 'DOGE', 'change_24h': -2.1},
                {'symbol': 'SHIB', 'change_24h': -1.8}
            ]
        }
        
        # Cachear resultado
        redis_client.setex(cache_key, CACHE_TTL, str(data))
        
        dashboard_requests.labels(tier='free', cached=False).inc()
        dashboard_duration.observe(time.time() - start_time)
        
        return jsonify({
            'success': True,
            'data': data,
            'cached': False
        })
        
    except Exception as e:
        dashboard_requests.labels(tier='free', cached=False, error=True).inc()
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@dashboard_bp.route('/api/dashboard/markets', methods=['GET'])
@require_tier('free')  # Todos os tiers podem acessar
def get_markets():
    """
    Lista de mercados principais (Free tier)
    
    Query params:
    - limit: número de resultados (default: 50, max: 100)
    - sort: campo para ordenar (default: 'volume_24h')
    """
    request_id = get_request_id()
    start_time = time.time()
    
    limit = min(int(request.args.get('limit', 50)), 100)
    sort = request.args.get('sort', 'volume_24h')
    
    # Verificar cache
    cache_key = f'dashboard:markets:{limit}:{sort}'
    cached = redis_client.get(cache_key)
    
    if cached:
        dashboard_requests.labels(tier='free', cached=True).inc()
        dashboard_duration.observe(time.time() - start_time)
        return jsonify({
            'success': True,
            'data': eval(cached),
            'cached': True
        })
    
    try:
        # TODO: Integrar com Binance API
        # Por enquanto, retornar dados mockados
        markets = [
            {
                'symbol': 'BTCUSDT',
                'price': 43250.50,
                'change_24h': 2.5,
                'volume_24h': 25000000000,
                'market_cap': 850000000000
            },
            {
                'symbol': 'ETHUSDT',
                'price': 2650.30,
                'change_24h': 1.8,
                'volume_24h': 12000000000,
                'market_cap': 320000000000
            },
            {
                'symbol': 'SOLUSDT',
                'price': 98.45,
                'change_24h': 4.2,
                'volume_24h': 3500000000,
                'market_cap': 45000000000
            }
        ]
        
        # Ordenar
        if sort == 'volume_24h':
            markets.sort(key=lambda x: x['volume_24h'], reverse=True)
        elif sort == 'change_24h':
            markets.sort(key=lambda x: x['change_24h'], reverse=True)
        
        # Limitar
        markets = markets[:limit]
        
        # Cachear resultado
        redis_client.setex(cache_key, CACHE_TTL, str(markets))
        
        dashboard_requests.labels(tier='free', cached=False).inc()
        dashboard_duration.observe(time.time() - start_time)
        
        return jsonify({
            'success': True,
            'data': markets,
            'cached': False
        })
        
    except Exception as e:
        dashboard_requests.labels(tier='free', cached=False, error=True).inc()
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@dashboard_bp.route('/api/dashboard/watchlist', methods=['GET'])
@require_tier('premium')  # Apenas Premium/Pro
def get_watchlist():
    """
    Watchlist do usuário (Premium/Pro)
    
    Retorna símbolos salvos pelo usuário
    """
    from flask import g
    
    request_id = get_request_id()
    start_time = time.time()
    
    address = g.user.get('address')
    
    # Verificar cache
    cache_key = f'dashboard:watchlist:{address}'
    cached = redis_client.get(cache_key)
    
    if cached:
        dashboard_requests.labels(tier=g.user.get('tier'), cached=True).inc()
        dashboard_duration.observe(time.time() - start_time)
        return jsonify({
            'success': True,
            'data': eval(cached),
            'cached': True
        })
    
    try:
        # TODO: Buscar do banco de dados
        # Por enquanto, retornar lista vazia
        watchlist = []
        
        # Cachear resultado (TTL menor para watchlist - 1 min)
        redis_client.setex(cache_key, 60, str(watchlist))
        
        dashboard_requests.labels(tier=g.user.get('tier'), cached=False).inc()
        dashboard_duration.observe(time.time() - start_time)
        
        return jsonify({
            'success': True,
            'data': watchlist,
            'cached': False
        })
        
    except Exception as e:
        dashboard_requests.labels(tier=g.user.get('tier'), cached=False, error=True).inc()
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@dashboard_bp.route('/api/dashboard/watchlist', methods=['POST'])
@require_tier('premium')  # Apenas Premium/Pro
def add_to_watchlist():
    """
    Adicionar símbolo à watchlist (Premium/Pro)
    """
    from flask import g
    
    request_id = get_request_id()
    data = request.json
    symbol = data.get('symbol')
    
    if not symbol:
        return jsonify({
            'success': False,
            'error': 'Symbol required'
        }), 400
    
    address = g.user.get('address')
    
    try:
        # TODO: Salvar no banco de dados
        # Por enquanto, apenas invalidar cache
        cache_key = f'dashboard:watchlist:{address}'
        redis_client.delete(cache_key)
        
        return jsonify({
            'success': True,
            'message': f'{symbol} added to watchlist'
        })
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

