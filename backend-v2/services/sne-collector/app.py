#!/usr/bin/env python3
"""
SNE Data Collector - Microserviço para coleta de dados de mercado
Versão melhorada com HMAC + anti-replay + cache-first
"""

import os
import sys
import time
import hmac
import hashlib
import logging
from datetime import datetime, timedelta

# Adicionar diretório atual ao path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

# Flask e dependências
from flask import Flask, request, jsonify
from flask_cors import CORS
import requests
import redis
import json as json_lib

# Configuração de logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Configurações
app = Flask(__name__)
CORS(app, origins=["https://api.snelabs.space", "https://sne-radar-y21p.onrender.com"])

# Redis connection
REDIS_URL = os.environ.get('REDIS_URL', 'redis://localhost:6379')
redis_client = redis.from_url(REDIS_URL)

# HMAC Secret (mesmo para todos os serviços)
HMAC_SECRET = os.environ.get('SNE_HMAC_SECRET', 'sne-shared-secret-change-in-prod')

# Timeouts otimizados
COLLECTOR_TIMEOUT = 8  # backend → collector
BINANCE_TIMEOUT = 5    # collector → Binance

# ================================
# HMAC VERIFICATION + ANTI-REPLAY
# ================================

def verify_hmac_signature(request):
    """Verifica HMAC signature + anti-replay"""
    try:
        # Headers obrigatórios
        signature = request.headers.get('X-SNE-Signature')
        timestamp_str = request.headers.get('X-SNE-Timestamp')
        nonce = request.headers.get('X-SNE-Nonce')

        if not all([signature, timestamp_str, nonce]):
            return False, "Missing HMAC headers"

        # Verificar timestamp (janela de ±60s)
        try:
            timestamp = datetime.fromisoformat(timestamp_str.replace('Z', '+00:00'))
            now = datetime.utcnow().replace(tzinfo=timestamp.tzinfo)
            if abs((now - timestamp).total_seconds()) > 60:
                return False, "Timestamp outside window"
        except:
            return False, "Invalid timestamp format"

        # Verificar nonce (anti-replay)
        nonce_key = f"nonce:{nonce}"
        if redis_client.exists(nonce_key):
            return False, "Nonce already used"

        # Armazenar nonce por 5 minutos
        redis_client.setex(nonce_key, 300, "used")

        # Verificar HMAC
        body = request.get_data()
        message = f"{request.method}{request.path}{timestamp_str}{nonce}".encode()
        if body:
            message += body

        expected_signature = hmac.new(
            HMAC_SECRET.encode(),
            message,
            hashlib.sha256
        ).hexdigest()

        if not hmac.compare_digest(signature, expected_signature):
            return False, "Invalid HMAC signature"

        return True, "OK"

    except Exception as e:
        logger.error(f"HMAC verification error: {str(e)}")
        return False, f"HMAC error: {str(e)}"

def require_hmac(f):
    """Decorator para proteger endpoints com HMAC"""
    def wrapper(*args, **kwargs):
        valid, message = verify_hmac_signature(request)
        if not valid:
            return jsonify({"error": message}), 401
        return f(*args, **kwargs)
    wrapper.__name__ = f.__name__
    return wrapper

# ================================
# ENDPOINTS
# ================================

@app.route('/health')
def health():
    """Health check"""
    return jsonify({
        "status": "ok",
        "service": "sne-collector",
        "redis": "connected" if redis_client.ping() else "disconnected"
    })

@app.route('/debug/binance')
def debug_binance():
    """Endpoint de debug para testar egress da Binance"""
    try:
        # Teste básico na Binance
        response = requests.get(
            "https://api.binance.com/api/v3/time",
            timeout=BINANCE_TIMEOUT
        )

        return jsonify({
            "status_code": response.status_code,
            "response": response.json() if response.status_code == 200 else response.text,
            "timestamp": datetime.utcnow().isoformat(),
            "egress_ok": response.status_code == 200
        })

    except requests.exceptions.RequestException as e:
        return jsonify({
            "error": str(e),
            "timestamp": datetime.utcnow().isoformat(),
            "egress_ok": False
        }), 500

@app.route('/market/<symbol>')
@require_hmac
def get_market_data(symbol):
    """Cache-first market data"""
    interval = request.args.get('interval', '1h')
    cache_key = f"binance:{symbol}:{interval}"

    try:
        # Tentar cache primeiro
        cached_data = redis_client.get(cache_key)
        if cached_data:
            logger.info(f"Cache hit for {symbol}")
            return jsonify({
                "source": "cache",
                "data": json_lib.loads(cached_data),
                "cached_at": redis_client.ttl(cache_key)
            })

        # Cache miss - tentar coletar (mas com timeout curto)
        logger.info(f"Cache miss for {symbol}, attempting collection")

        # Coleta rápida (não bloquear usuário)
        try:
            collected_data = collect_binance_data(symbol, interval)
            if collected_data:
                # Salvar no cache por 5 minutos
                redis_client.setex(cache_key, 300, json_lib.dumps(collected_data))
                return jsonify({
                    "source": "fresh",
                    "data": collected_data
                })
        except Exception as e:
            logger.warning(f"Collection failed for {symbol}: {str(e)}")

        # Se tudo falhar, retornar erro mas não crashar
        return jsonify({
            "error": "Data unavailable",
            "symbol": symbol,
            "interval": interval
        }), 503

    except Exception as e:
        logger.error(f"Error in get_market_data: {str(e)}")
        return jsonify({"error": "Internal server error"}), 500

# ================================
# LÓGICA DE COLETA
# ================================

def collect_binance_data(symbol, interval='1h', limit=100):
    """Coleta dados da Binance com circuit breaker"""
    try:
        # Circuit breaker: verificar se Binance está bloqueada
        circuit_key = "circuit:binance:blocked"
        if redis_client.exists(circuit_key):
            logger.warning("Circuit breaker active - Binance blocked")
            return None

        # Fazer request para Binance
        params = {
            'symbol': symbol.upper(),
            'interval': interval,
            'limit': limit
        }

        response = requests.get(
            "https://api.binance.com/api/v3/klines",
            params=params,
            timeout=BINANCE_TIMEOUT
        )

        if response.status_code == 451:
            # Ativar circuit breaker por 10 minutos
            redis_client.setex(circuit_key, 600, "blocked")
            logger.error("Binance 451 - Circuit breaker activated")
            return None

        response.raise_for_status()

        # Processar dados
        data = response.json()
        processed = []

        for candle in data:
            processed.append({
                "timestamp": int(candle[0]),
                "open": float(candle[1]),
                "high": float(candle[2]),
                "low": float(candle[3]),
                "close": float(candle[4]),
                "volume": float(candle[5])
            })

        return {
            "symbol": symbol,
            "interval": interval,
            "candles": processed,
            "collected_at": datetime.utcnow().isoformat()
        }

    except requests.exceptions.Timeout:
        logger.warning(f"Timeout collecting {symbol}")
        return None
    except requests.exceptions.RequestException as e:
        logger.error(f"Request error collecting {symbol}: {str(e)}")
        return None
    except Exception as e:
        logger.error(f"Unexpected error collecting {symbol}: {str(e)}")
        return None

# ================================
# SCHEDULER (OPCIONAL - PARA CACHE FRESCO)
# ================================

def scheduled_collection():
    """Coleta programada para manter cache fresco"""
    import threading
    import time

    def collect_worker():
        while True:
            try:
                # Coletar símbolos principais
                symbols = ['BTCUSDT', 'ETHUSDT']
                intervals = ['1h', '4h', '1d']

                for symbol in symbols:
                    for interval in intervals:
                        collect_binance_data(symbol, interval)

                logger.info("Scheduled collection completed")
                time.sleep(300)  # A cada 5 minutos

            except Exception as e:
                logger.error(f"Scheduled collection error: {str(e)}")
                time.sleep(60)  # Esperar 1 minuto se der erro

    # Iniciar thread do scheduler
    if os.environ.get('ENABLE_SCHEDULER', 'false').lower() == 'true':
        thread = threading.Thread(target=collect_worker, daemon=True)
        thread.start()
        logger.info("Scheduler started")

# ================================
# MAIN
# ================================

if __name__ == "__main__":
    # Iniciar scheduler se habilitado
    scheduled_collection()

    port = int(os.environ.get('PORT', 8080))
    logger.info(f"🚀 SNE Data Collector starting on port {port}")

    app.run(host='0.0.0.0', port=port, debug=False)
