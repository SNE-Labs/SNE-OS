"""
API v1 - Endpoints compatíveis com radar existente
"""
from flask import Blueprint, jsonify, request, g
from app.utils.tier_checker import require_tier
from app.utils.logging import get_request_id
from app.utils.metrics import dashboard_requests, dashboard_duration
import redis
import os
import time
import requests
import pandas as pd
import logging

logger = logging.getLogger(__name__)

v1_bp = Blueprint('v1', __name__)

# Redis para cache (com fallback seguro)
from app.utils.redis_safe import SafeRedis
redis_client = SafeRedis(
    host=os.getenv('REDIS_HOST', 'localhost'),
    port=int(os.getenv('REDIS_PORT', 6379)),
    db=0,
    decode_responses=True
)

CACHE_TTL = int(os.getenv('CACHE_DASHBOARD_TTL', 300))  # 5 minutos

def buscar_dados_binance(symbol, interval, limit, skip_rate_limit=False):
    """
    Busca dados da Binance API (compatível com radar existente)
    
    Args:
        symbol: Símbolo da moeda (ex: BTCUSDT)
        interval: Intervalo (1m, 5m, 1h, etc)
        limit: Número de candles
        skip_rate_limit: Se True, ignora rate limit
    
    Returns:
        DataFrame com candles ou None se erro
    """
    try:
        url = "https://api.binance.com/api/v3/klines"
        
        # Mapear intervalos para Binance Data API
        interval_mapping = {
            "1m": "1m", "3m": "3m", "5m": "5m",
            "15m": "15m", "30m": "30m",
            "1h": "1h", "2h": "2h", "4h": "4h",
            "6h": "6h", "8h": "8h", "12h": "12h",
            "1d": "1d", "1w": "1w", "1M": "1M"
        }
        
        binance_interval = interval_mapping.get(interval, interval)
        
        params = {
            "symbol": symbol,
            "interval": binance_interval,
            "limit": min(limit, 1000)
        }
        
        response = requests.get(url, params=params, timeout=10)
        
        if response.status_code != 200:
            print(f"❌ Erro Binance {response.status_code}: {response.text}")
            return None
        
        data = response.json()
        
        if not data or len(data) == 0:
            return None
        
        # Converter para DataFrame
        df = pd.DataFrame(data, columns=[
            "open_time", "open", "high", "low", "close", "volume",
            "close_time", "qav", "trades", "tbb", "tbq", "ignore"
        ])
        
        # Converter tipos
        df["open_time"] = pd.to_datetime(df["open_time"], unit="ms")
        df = df.astype({
            "open": float, "high": float, "low": float,
            "close": float, "volume": float
        })
        
        df.set_index("open_time", inplace=True)
        
        # Calcular indicadores básicos
        df["EMA8"] = df["close"].ewm(span=8, adjust=False).mean()
        df["EMA21"] = df["close"].ewm(span=21, adjust=False).mean()
        
        # Calcular RSI
        delta = df["close"].diff()
        gain = (delta.where(delta > 0, 0)).rolling(window=14).mean()
        loss = (-delta.where(delta < 0, 0)).rolling(window=14).mean()
        rs = gain / loss
        df["RSI"] = 100 - (100 / (1 + rs))
        
        return df
        
    except Exception as e:
        print(f"❌ Erro ao buscar dados Binance: {e}")
        return None

@v1_bp.route('/api/v1/global-metrics', methods=['GET'])
@require_tier('free')  # Todos os tiers podem acessar
def get_global_metrics():
    """
    Métricas globais do mercado (compatível com radar existente)
    
    Retorna: market cap, BTC/ETH dominance, breadth (gainers/losers)
    """
    request_id = get_request_id()
    start_time = time.time()
    
    # Verificar cache
    cache_key = 'v1:global-metrics'
    cached = redis_client.get(cache_key)
    
    if cached:
        dashboard_requests.labels(tier='free', cached=True).inc()
        dashboard_duration.observe(time.time() - start_time)
        import json
        return jsonify({
            "success": True,
            "data": json.loads(cached)
        })
    
    try:
        # Integrar com CoinMarketCap API
        from app.integrations.cmc import get_global_metrics
        
        res = get_global_metrics(ttl=300, timeout=10)  # Cache 5 minutos
        
        # Normalização defensiva (compatível com radar existente)
        cap = None
        btc_dom = None
        eth_dom = None
        gainers = 0
        losers = 0
        
        try:
            data_res = res.get('data', {})
            quote = data_res.get('data', {})  # Estrutura CMC
            
            # Market cap
            if quote.get('quote'):
                cap = float(quote.get('quote', {}).get('USD', {}).get('total_market_cap', 0))
            
            # Dominance
            btc_dom = float(quote.get('btc_dominance', 0)) if 'btc_dominance' in quote else None
            eth_dom = float(quote.get('eth_dominance', 0)) if 'eth_dominance' in quote else None
            
            # Breadth (gainers/losers - placeholder)
            active = quote.get('active_cryptocurrencies', 0)
            if active:
                gainers = int(active * 0.5)
                losers = max(0, int(active) - gainers)
        except Exception as e:
            logger.warning(f"Erro ao processar dados CMC: {e}")
            # Fallback para valores padrão
            cap = 2500000000000
            btc_dom = 52.5
            eth_dom = 17.2
            gainers = 1500
            losers = 1200
        
        data = {
            "market_cap": cap,
            "btc_dominance": btc_dom,
            "eth_dominance": eth_dom,
            "breadth": {
                "gainers": gainers,
                "losers": losers
            },
            "timestamp": int(time.time())
        }
        
        # Cachear resultado
        import json
        redis_client.setex(cache_key, CACHE_TTL, json.dumps(data))
        
        dashboard_requests.labels(tier='free', cached=False).inc()
        dashboard_duration.observe(time.time() - start_time)
        
        return jsonify({
            "success": True,
            "data": data
        })
        
    except Exception as e:
        dashboard_requests.labels(tier='free', cached=False, error=True).inc()
        return jsonify({
            "success": False,
            "error": str(e)
        }), 500

@v1_bp.route('/api/v1/system/status', methods=['GET'])
@require_tier('free')  # Todos os tiers podem acessar
def get_system_status():
    """
    Status do sistema (compatível com radar existente)
    
    Retorna: circuit breakers, rate limits, API call counts
    """
    request_id = get_request_id()
    start_time = time.time()
    
    try:
        # TODO: Implementar sistema de circuit breakers e rate limits real
        # Por enquanto, retornar estrutura compatível
        status = {
            "circuit_breakers": {
                "binance": False,
                "cmc": False,
                "coinglass": False
            },
            "rate_limits": {
                "binance": 0,
                "cmc": 0,
                "coinglass": 0
            },
            "api_call_counts": {
                "binance": 0,
                "cmc": 0,
                "coinglass": 0
            },
            "timestamp": int(time.time())
        }
        
        dashboard_requests.labels(tier='free', cached=False).inc()
        dashboard_duration.observe(time.time() - start_time)
        
        return jsonify({
            "success": True,
            "data": status
        })
        
    except Exception as e:
        dashboard_requests.labels(tier='free', cached=False, error=True).inc()
        return jsonify({
            "success": False,
            "error": str(e)
        }), 500

@v1_bp.route('/api/v1/chart-data', methods=['GET'])
@require_tier('free')  # Todos os tiers podem acessar
def get_chart_data():
    """
    Dados consolidados para gráfico interativo (compatível com radar existente)
    
    Retorna: candles, indicadores (EMA8, EMA21, RSI), níveis operacionais, S/R
    
    Query params:
    - symbol: par de trading (ex: BTCUSDT)
    - interval: intervalo (1h, 4h, 1d)
    - limit: número de candles (default: 500, max: 1000)
    """
    request_id = get_request_id()
    start_time = time.time()
    
    symbol = request.args.get('symbol', 'BTCUSDT').upper()
    interval = request.args.get('interval', '1h')
    requested_limit = int(request.args.get('limit', '500'))
    limit = min(requested_limit, 1000)
    
    # Verificar cache
    cache_key = f'v1:chart-data:{symbol}:{interval}:{limit}'
    cached = redis_client.get(cache_key)
    
    if cached:
        dashboard_requests.labels(tier='free', cached=True).inc()
        dashboard_duration.observe(time.time() - start_time)
        import json
        return jsonify(json.loads(cached))
    
    try:
        # Buscar dados da Binance
        df = buscar_dados_binance(symbol, interval, limit, skip_rate_limit=True)
        
        if df is None or df.empty:
            return jsonify({
                "success": False,
                "error": "Dados não disponíveis da Binance"
            }), 404
        
        # Preparar candles para Lightweight Charts (timestamp em segundos)
        candles = []
        for timestamp, row in df.iterrows():
            time_sec = int(timestamp.timestamp())
            candles.append({
                "time": time_sec,
                "open": float(row['open']),
                "high": float(row['high']),
                "low": float(row['low']),
                "close": float(row['close']),
                "volume": float(row['volume'])
            })
        
        # Preparar indicadores (apenas valores não-nulos)
        indicators = {
            "ema8": [],
            "ema21": [],
            "rsi": []
        }
        
        for i, (timestamp, row) in enumerate(df.iterrows()):
            time_sec = int(timestamp.timestamp())
            
            # EMA8 - começar após 8 períodos
            if i >= 7 and pd.notna(row.get('EMA8')):
                indicators["ema8"].append({
                    "time": time_sec,
                    "value": float(row['EMA8'])
                })
            
            # EMA21 - começar após 21 períodos
            if i >= 20 and pd.notna(row.get('EMA21')):
                indicators["ema21"].append({
                    "time": time_sec,
                    "value": float(row['EMA21'])
                })
            
            # RSI - começar após 14 períodos
            if i >= 13 and pd.notna(row.get('RSI')):
                indicators["rsi"].append({
                    "time": time_sec,
                    "value": float(row['RSI'])
                })
        
        # Níveis operacionais (placeholder - TODO: integrar com motor_renan)
        levels = {
            "supports": [],
            "resistances": [],
            "operational": {
                "entry": None,
                "stop_loss": None,
                "take_profit": [None, None, None]
            }
        }
        
        # Preço atual
        current_price = float(df['close'].iloc[-1])
        
        # Montar resposta
        response_data = {
            "success": True,
            "symbol": symbol,
            "timeframe": interval,
            "candles": candles,
            "indicators": indicators,
            "levels": levels,
            "current_price": current_price,
            "timestamp": int(time.time())
        }
        
        # Cachear resultado (TTL curto - 1 min)
        import json
        redis_client.setex(cache_key, 60, json.dumps(response_data))
        
        dashboard_requests.labels(tier='free', cached=False).inc()
        dashboard_duration.observe(time.time() - start_time)
        
        return jsonify(response_data)
        
    except Exception as e:
        dashboard_requests.labels(tier='free', cached=False, error=True).inc()
        return jsonify({
            "success": False,
            "error": str(e)
        }), 500

