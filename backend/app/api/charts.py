"""
Blueprint Charts - Dados de gráficos e indicadores técnicos
"""
from flask import Blueprint, jsonify, request
from app.utils.tier_checker import require_tier
from app.utils.logging import get_request_id
from app.utils.metrics import chart_requests, chart_duration
import redis
import os
import time

charts_bp = Blueprint('charts', __name__)

# Redis para cache (com fallback seguro)
from app.utils.redis_safe import SafeRedis
redis_client = SafeRedis(
    host=os.getenv('REDIS_HOST', 'localhost'),
    port=int(os.getenv('REDIS_PORT', 6379)),
    db=0,
    decode_responses=True
)

CACHE_TTL = int(os.getenv('CACHE_CHART_TTL', 60))  # 1 minuto

@charts_bp.route('/api/charts/ohlcv', methods=['GET'])
@require_tier('free')  # Todos os tiers podem acessar
def get_ohlcv():
    """
    Dados OHLCV (Open, High, Low, Close, Volume) para gráfico
    
    Query params:
    - symbol: par de trading (ex: BTCUSDT)
    - interval: intervalo (1m, 5m, 15m, 1h, 4h, 1d)
    - limit: número de candles (default: 100, max: 1000)
    """
    request_id = get_request_id()
    start_time = time.time()
    
    symbol = request.args.get('symbol', 'BTCUSDT').upper()
    interval = request.args.get('interval', '1h')
    limit = min(int(request.args.get('limit', 100)), 1000)
    
    # Validar interval
    valid_intervals = ['1m', '5m', '15m', '30m', '1h', '4h', '1d', '1w']
    if interval not in valid_intervals:
        return jsonify({
            'success': False,
            'error': f'Invalid interval. Valid: {valid_intervals}'
        }), 400
    
    # Verificar cache
    cache_key = f'charts:ohlcv:{symbol}:{interval}:{limit}'
    cached = redis_client.get(cache_key)
    
    if cached:
        chart_requests.labels(tier='free', cached=True).inc()
        chart_duration.observe(time.time() - start_time)
        return jsonify({
            'success': True,
            'data': eval(cached),
            'cached': True
        })
    
    try:
        # TODO: Integrar com Binance API
        # Por enquanto, retornar dados mockados
        import random
        from datetime import datetime, timedelta
        
        # Gerar candles mockados
        candles = []
        base_price = 43000.0
        
        for i in range(limit):
            timestamp = int((datetime.now() - timedelta(minutes=limit-i)).timestamp() * 1000)
            open_price = base_price + random.uniform(-500, 500)
            high_price = open_price + random.uniform(0, 200)
            low_price = open_price - random.uniform(0, 200)
            close_price = random.uniform(low_price, high_price)
            volume = random.uniform(1000000, 5000000)
            
            candles.append({
                'timestamp': timestamp,
                'open': round(open_price, 2),
                'high': round(high_price, 2),
                'low': round(low_price, 2),
                'close': round(close_price, 2),
                'volume': round(volume, 2)
            })
            
            base_price = close_price
        
        # Cachear resultado
        redis_client.setex(cache_key, CACHE_TTL, str(candles))
        
        chart_requests.labels(tier='free', cached=False).inc()
        chart_duration.observe(time.time() - start_time)
        
        return jsonify({
            'success': True,
            'data': candles,
            'symbol': symbol,
            'interval': interval,
            'cached': False
        })
        
    except Exception as e:
        chart_requests.labels(tier='free', cached=False, error=True).inc()
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@charts_bp.route('/api/charts/indicators', methods=['GET'])
@require_tier('premium')  # Apenas Premium/Pro
def get_indicators():
    """
    Indicadores técnicos (Premium/Pro)
    
    Query params:
    - symbol: par de trading (ex: BTCUSDT)
    - interval: intervalo (1h, 4h, 1d)
    - indicators: lista de indicadores (RSI, MACD, EMA, etc)
    """
    from flask import g
    
    request_id = get_request_id()
    start_time = time.time()
    
    symbol = request.args.get('symbol', 'BTCUSDT').upper()
    interval = request.args.get('interval', '1h')
    indicators_str = request.args.get('indicators', 'RSI,MACD,EMA')
    indicators = [i.strip() for i in indicators_str.split(',')]
    
    # Verificar cache
    cache_key = f'charts:indicators:{symbol}:{interval}:{indicators_str}'
    cached = redis_client.get(cache_key)
    
    if cached:
        chart_requests.labels(tier=g.user.get('tier'), cached=True).inc()
        chart_duration.observe(time.time() - start_time)
        return jsonify({
            'success': True,
            'data': eval(cached),
            'cached': True
        })
    
    try:
        # TODO: Calcular indicadores técnicos reais
        # Por enquanto, retornar dados mockados
        data = {}
        
        if 'RSI' in indicators:
            data['RSI'] = {
                'value': 65.5,
                'signal': 'neutral',
                'overbought': False,
                'oversold': False
            }
        
        if 'MACD' in indicators:
            data['MACD'] = {
                'macd': 125.3,
                'signal': 120.8,
                'histogram': 4.5,
                'trend': 'bullish'
            }
        
        if 'EMA' in indicators:
            data['EMA'] = {
                'ema_20': 42850.0,
                'ema_50': 42500.0,
                'ema_200': 42000.0
            }
        
        # Cachear resultado (TTL menor para indicadores - 30s)
        redis_client.setex(cache_key, 30, str(data))
        
        chart_requests.labels(tier=g.user.get('tier'), cached=False).inc()
        chart_duration.observe(time.time() - start_time)
        
        return jsonify({
            'success': True,
            'data': data,
            'symbol': symbol,
            'interval': interval,
            'cached': False
        })
        
    except Exception as e:
        chart_requests.labels(tier=g.user.get('tier'), cached=False, error=True).inc()
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

