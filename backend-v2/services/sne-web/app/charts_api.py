"""
API de Charts para SNE Radar
Integração com dados de mercado e indicadores
"""

from flask import Blueprint, request, jsonify, g
import logging
import requests
from datetime import datetime, timedelta

from .auth_siwe import require_auth, check_tier_limits
from app.utils.redis_safe import SafeRedis

charts_bp = Blueprint('charts', __name__)
logger = logging.getLogger(__name__)

# Redis para cache
redis_client = SafeRedis()

# Configuração Binance API (exemplo)
BINANCE_BASE_URL = 'https://api.binance.com/api/v3'

def get_candles_from_binance(symbol: str, interval: str, limit: int = 500):
    """Busca dados de candles da Binance"""
    try:
        url = f'{BINANCE_BASE_URL}/klines'
        params = {
            'symbol': symbol.upper(),
            'interval': interval,
            'limit': limit
        }

        response = requests.get(url, params=params, timeout=10)
        response.raise_for_status()

        data = response.json()

        # Converter formato Binance para formato interno
        candles = []
        for candle in data:
            candles.append({
                'timestamp': int(candle[0]),
                'open': float(candle[1]),
                'high': float(candle[2]),
                'low': float(candle[3]),
                'close': float(candle[4]),
                'volume': float(candle[5])
            })

        return candles

    except Exception as e:
        logger.error(f"Binance API error: {str(e)}")
        return None

@charts_bp.route('/api/chart/candles', methods=['GET'])
@require_auth
def get_candles():
    """
    Dados de candles para gráfico
    Endpoint: GET /api/chart/candles?symbol=BTCUSDT&tf=1h&limit=500
    """
    try:
        user = g.user
        tier = user['tier']

        # Parâmetros
        symbol = request.args.get('symbol', 'BTCUSDT').upper()
        timeframe = request.args.get('tf', '1h')
        limit = min(int(request.args.get('limit', 500)), 1000)  # Max 1000

        # Verificar rate limits
        if not check_tier_limits(user['address'], tier, 'chart'):
            return jsonify({'error': 'Chart rate limit exceeded'}), 429

        # Timeframes disponíveis por tier
        available_tf = {
            'free': ['15m', '1h', '4h', '1d'],
            'premium': ['5m', '15m', '1h', '4h', '1d'],
            'pro': ['1m', '5m', '15m', '1h', '4h', '1d']
        }

        if timeframe not in available_tf.get(tier, available_tf['free']):
            return jsonify({
                'error': f'Timeframe {timeframe} not available for {tier} tier',
                'available': available_tf.get(tier, [])
            }), 403

        # Cache key
        cache_key = f'candles:{symbol}:{timeframe}:{limit}'
        cache_ttl = 60 if tier in ['premium', 'pro'] else 300  # 1min premium+, 5min free

        # Verificar cache
        cached_data = redis_client.get(cache_key)
        if cached_data:
            import json
            return jsonify(json.loads(cached_data)), 200

        # Buscar dados
        candles = get_candles_from_binance(symbol, timeframe, limit)

        if not candles:
            return jsonify({'error': 'Failed to fetch candle data'}), 500

        result = {
            'symbol': symbol,
            'timeframe': timeframe,
            'candles': candles,
            'timestamp': datetime.utcnow().isoformat()
        }

        # Cache
        redis_client.setex(cache_key, cache_ttl, json.dumps(result))

        return jsonify(result), 200

    except Exception as e:
        logger.error(f"Candles API error: {str(e)}", exc_info=True)
        return jsonify({'error': 'Failed to fetch candle data'}), 500

@charts_bp.route('/api/chart/indicators', methods=['GET'])
@require_auth
def get_indicators():
    """
    Indicadores técnicos para o símbolo
    Endpoint: GET /api/chart/indicators?symbol=BTCUSDT&tf=1h&set=basic
    """
    try:
        user = g.user
        tier = user['tier']

        symbol = request.args.get('symbol', 'BTCUSDT').upper()
        timeframe = request.args.get('tf', '1h')
        indicator_set = request.args.get('set', 'basic')  # basic ou advanced

        # Verificar se tier permite indicadores avançados
        if indicator_set == 'advanced' and tier == 'free':
            return jsonify({'error': 'Advanced indicators require Premium tier'}), 403

        # Cache key
        cache_key = f'indicators:{symbol}:{timeframe}:{indicator_set}'
        cache_ttl = 120  # 2 minutos

        # Verificar cache
        cached_data = redis_client.get(cache_key)
        if cached_data:
            import json
            return jsonify(json.loads(cached_data)), 200

        # Calcular indicadores
        indicators = calculate_indicators(symbol, timeframe, indicator_set, tier)

        result = {
            'symbol': symbol,
            'timeframe': timeframe,
            'set': indicator_set,
            'indicators': indicators,
            'timestamp': datetime.utcnow().isoformat()
        }

        # Cache
        redis_client.setex(cache_key, cache_ttl, json.dumps(result))

        return jsonify(result), 200

    except Exception as e:
        logger.error(f"Indicators API error: {str(e)}", exc_info=True)
        return jsonify({'error': 'Failed to calculate indicators'}), 500

def calculate_indicators(symbol: str, timeframe: str, indicator_set: str, tier: str):
    """Calcula indicadores técnicos"""

    # Buscar dados de candles primeiro
    candles = get_candles_from_binance(symbol, timeframe, limit=100)

    if not candles:
        return {}

    # Indicadores básicos (sempre disponíveis)
    indicators = {
        'rsi': calculate_rsi_simple(candles),
        'macd': calculate_macd_simple(candles),
        'volume': sum(c['volume'] for c in candles[-24:])  # Volume 24h
    }

    # Indicadores avançados (tier premium+)
    if indicator_set == 'advanced' and tier in ['premium', 'pro']:
        indicators.update({
            'bollinger_bands': calculate_bollinger_simple(candles),
            'stochastic': calculate_stochastic_simple(candles),
            'williams_r': calculate_williams_r_simple(candles)
        })

    return indicators

def calculate_rsi_simple(candles, period=14):
    """RSI simples para dashboard"""
    if len(candles) < period + 1:
        return 50.0

    closes = [c['close'] for c in candles[-period-1:]]
    gains = []
    losses = []

    for i in range(1, len(closes)):
        change = closes[i] - closes[i-1]
        if change > 0:
            gains.append(change)
            losses.append(0)
        else:
            gains.append(0)
            losses.append(abs(change))

    avg_gain = sum(gains) / period
    avg_loss = sum(losses) / period

    if avg_loss == 0:
        return 100.0

    rs = avg_gain / avg_loss
    rsi = 100 - (100 / (1 + rs))

    return round(rsi, 2)

def calculate_macd_simple(candles):
    """MACD simples"""
    if len(candles) < 26:
        return {'signal': 0.0}

    closes = [c['close'] for c in candles[-26:]]

    # EMA 12
    ema12 = sum(closes[-12:]) / 12
    # EMA 26
    ema26 = sum(closes[-26:]) / 26

    macd = ema12 - ema26

    return {
        'signal': round(macd, 4),
        'histogram': round(macd * 0.5, 4)  # Simulação
    }

def calculate_bollinger_simple(candles, period=20):
    """Bollinger Bands simples"""
    if len(candles) < period:
        return {'upper': 0, 'middle': 0, 'lower': 0}

    closes = [c['close'] for c in candles[-period:]]
    middle = sum(closes) / period

    variance = sum((x - middle) ** 2 for x in closes) / period
    std = variance ** 0.5

    return {
        'upper': round(middle + (std * 2), 2),
        'middle': round(middle, 2),
        'lower': round(middle - (std * 2), 2)
    }

def calculate_stochastic_simple(candles, k_period=14):
    """Stochastic simples"""
    if len(candles) < k_period:
        return {'k': 50.0, 'd': 50.0}

    highs = [c['high'] for c in candles[-k_period:]]
    lows = [c['low'] for c in candles[-k_period:]]
    closes = [c['close'] for c in candles[-k_period:]]

    highest = max(highs)
    lowest = min(lows)
    current_close = closes[-1]

    if highest == lowest:
        k = 50.0
    else:
        k = ((current_close - lowest) / (highest - lowest)) * 100

    # %D é média simples de %K (simplificado)
    d = k

    return {'k': round(k, 2), 'd': round(d, 2)}

def calculate_williams_r_simple(candles, period=14):
    """Williams %R simples"""
    if len(candles) < period:
        return -50.0

    highs = [c['high'] for c in candles[-period:]]
    lows = [c['low'] for c in candles[-period:]]
    current_close = candles[-1]['close']

    highest = max(highs)
    lowest = min(lows)

    if highest == lowest:
        return -50.0

    williams_r = ((highest - current_close) / (highest - lowest)) * -100

    return round(williams_r, 2)
