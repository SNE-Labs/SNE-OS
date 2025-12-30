"""
API de Charts para SNE Radar
Integração com dados de mercado e indicadores
"""

from flask import Blueprint, request, jsonify, g
import logging
import requests
import json as json_lib
import hmac
import hashlib
from datetime import datetime
import uuid
from .auth_siwe import require_auth, check_tier_limits
from app.utils.redis_safe import SafeRedis

charts_bp = Blueprint('charts', __name__)
logger = logging.getLogger(__name__)

# Redis para cache
redis_client = SafeRedis()

# Configurações do coletor
COLLECTOR_URL = "http://sne-collector.railway.internal"  # Domínio interno Railway (HTTP)
HMAC_SECRET = "sne-shared-secret-change-in-prod"  # Mesmo secret do coletor

def call_collector(endpoint, params=None, timeout=8):
    """Chama o coletor com HMAC"""
    if params is None:
        params = {}

    # HMAC signature
    timestamp = datetime.utcnow().isoformat() + 'Z'
    nonce = str(uuid.uuid4())

    message = f"GET{endpoint}{timestamp}{nonce}".encode()
    signature = hmac.new(HMAC_SECRET.encode(), message, hashlib.sha256).hexdigest()

    headers = {
        'X-SNE-Signature': signature,
        'X-SNE-Timestamp': timestamp,
        'X-SNE-Nonce': nonce
    }

    try:
        url = f"{COLLECTOR_URL}{endpoint}"
        response = requests.get(url, params=params, headers=headers, timeout=timeout)
        response.raise_for_status()
        return response.json()
    except requests.exceptions.RequestException as e:
        logger.error(f"Collector call failed: {str(e)}")
        return None

# Configuração Binance API (exemplo)
BINANCE_BASE_URL = 'https://api.binance.com/api/v3'

def get_candles_from_binance(symbol: str, interval: str, limit: int = 500):
    """Busca dados de candles via coletor (cache-first)"""
    try:
        # Chamar coletor ao invés de Binance diretamente
        params = {
            'symbol': symbol.upper(),
            'interval': interval,
            'limit': limit
        }

        result = call_collector('/api/v1/market/klines', params)

        if not result or "error" in result:
            logger.error(f"Collector error: {result}")
            return []

        # Resultado do coletor: {"source": "cache|fresh", "data": [...]}
        data = result.get("data", [])

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

        logger.info(f"Candles from {result.get('source', 'unknown')}: {symbol} {len(candles)} candles")
        return candles

    except Exception as e:
        logger.error(f"Collector call error: {str(e)}")
        return None

# Função unificada para buscar klines (usada pelo motor_renan e outros)
def get_klines(symbol: str, interval: str, limit: int = 200):
    """Função unificada para buscar klines via coletor"""
    collector_url = os.environ.get('COLLECTOR_URL')

    if collector_url:
        try:
            # Usar coletor
            response = requests.get(
                f"{collector_url}/api/v1/market/klines",
                params={
                    'symbol': symbol.upper(),
                    'interval': interval,
                    'limit': limit
                },
                timeout=15
            )
            response.raise_for_status()
            result = response.json()

            # Retornar dados no formato esperado pelo motor
            if result.get('success') and 'data' in result:
                return result['data']
            else:
                logger.warning(f"Invalid collector response: {result}")
        except Exception as e:
            logger.error(f"Collector call failed: {str(e)}")

    # Fallback para Binance direto (só em desenvolvimento)
    try:
        logger.warning("Using Binance fallback - should not happen in production")
        response = requests.get(
            "https://api.binance.com/api/v3/klines",
            params={
                'symbol': symbol.upper(),
                'interval': interval,
                'limit': limit
            },
            timeout=15
        )
        response.raise_for_status()
        return response.json()
    except Exception as e:
        logger.error(f"Binance fallback failed: {str(e)}")
        return []

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
        redis_client.setex(cache_key, cache_ttl, json_lib.dumps(result))

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
        redis_client.setex(cache_key, cache_ttl, json_lib.dumps(result))

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

