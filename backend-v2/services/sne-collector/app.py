#!/usr/bin/env python3
"""
SNE Data Collector - Produção com cache-first e HMAC
"""

import os
import sys
import time
import hmac
import hashlib
import logging
from datetime import datetime, timedelta

# Flask e dependências
from flask import Flask, request, jsonify
import requests

# Redis (Upstash - best effort)
try:
    import redis
    REDIS_URL = os.environ.get('REDIS_URL') or os.environ.get('UPSTASH_REDIS_REST_URL')
    if REDIS_URL:
        redis_client = redis.from_url(REDIS_URL)
        redis_available = redis_client.ping()
    else:
        redis_client = None
        redis_available = False
except Exception:
    redis_client = None
    redis_available = False

# HMAC Secret
HMAC_SECRET = os.environ.get('SNE_HMAC_SECRET', 'sne-shared-secret-change-in-prod')
COLLECTOR_TOKEN = os.environ.get('COLLECTOR_TOKEN', 'sne-collector-token-prod')

app = Flask(__name__)

# ================================
# HMAC VERIFICATION + ANTI-REPLAY
# ================================

def verify_hmac_signature():
    """Verifica HMAC + anti-replay"""
    try:
        signature = request.headers.get('X-SNE-Signature')
        timestamp_str = request.headers.get('X-SNE-Timestamp')
        nonce = request.headers.get('X-SNE-Nonce')

        if not all([signature, timestamp_str, nonce]):
            return False, "Missing HMAC headers"

        # Timestamp window (±60s)
        timestamp = datetime.fromisoformat(timestamp_str.replace('Z', '+00:00'))
        now = datetime.utcnow().replace(tzinfo=timestamp.tzinfo)
        if abs((now - timestamp).total_seconds()) > 60:
            return False, "Timestamp outside window"

        # Nonce anti-replay (5min - best effort)
        nonce_key = f"nonce:{nonce}"
        if redis_available and redis_client:
            try:
                if redis_client.exists(nonce_key):
                    return False, "Nonce already used"
                redis_client.setex(nonce_key, 300, "used")
            except Exception:
                pass  # Redis down, skip anti-replay check

        # HMAC validation
        body = request.get_data()
        message = f"{request.method}{request.path}{timestamp_str}{nonce}".encode()
        if body:
            message += body

        expected = hmac.new(HMAC_SECRET.encode(), message, hashlib.sha256).hexdigest()
        if not hmac.compare_digest(signature, expected):
            return False, "Invalid HMAC"

        return True, "OK"
    except Exception as e:
        return False, f"HMAC error: {str(e)}"

def require_auth(f):
    """Decorator que aceita Bearer token OU HMAC"""
    def wrapper(*args, **kwargs):
        # Primeiro tenta Bearer token (mais simples)
        auth_header = request.headers.get('Authorization', '')
        if auth_header.startswith('Bearer '):
            token = auth_header[7:]  # Remove "Bearer "
            if token == COLLECTOR_TOKEN:
                return f(*args, **kwargs)
            else:
                return jsonify({"error": "Invalid token"}), 401

        # Se não tem Bearer, tenta HMAC (compatibilidade)
        valid, message = verify_hmac_signature()
        if not valid:
            return jsonify({"error": message}), 401

        return f(*args, **kwargs)
    return wrapper

# ================================
# CACHE-FIRST BINANCE API
# ================================

def get_cached_binance_data(endpoint, params=None, cache_ttl=300):
    """Cache-first: Redis → Binance → Redis (best effort)"""
    if params is None:
        params = {}

    # Cache key
    cache_key = f"binance:{endpoint}:{str(sorted(params.items()))}"

    # 1. Try cache first (best effort)
    if redis_available and redis_client:
        try:
            cached = redis_client.get(cache_key)
            if cached:
                try:
                    import json as json_lib
                    return {"source": "cache", "data": json_lib.loads(cached)}
                except:
                    pass  # Cache corrupted, fetch fresh
        except Exception:
            pass  # Redis down, continue without cache

    # 2. Fetch from Binance (with timeout)
    try:
        url = f"https://api.binance.com/api/v3/{endpoint}"
        response = requests.get(url, params=params, timeout=5)  # 5s timeout

        if response.status_code == 451:
            # Circuit breaker for restricted location
            return {"error": "Location restricted", "status": 451}

        response.raise_for_status()
        data = response.json()

        # 3. Cache result (best effort)
        if redis_available and redis_client:
            try:
                import json as json_lib
                redis_client.setex(cache_key, cache_ttl, json_lib.dumps(data))
            except Exception:
                pass  # Don't fail if cache write fails

        return {"source": "fresh", "data": data}

    except requests.exceptions.Timeout:
        return {"error": "Timeout", "status": 408}
    except requests.exceptions.RequestException as e:
        return {"error": str(e), "status": 500}

# ================================
# ENDPOINTS
# ================================

@app.route('/health')
def health():
    """Health check - sempre 200 se app está rodando"""
    return jsonify({"ok": True, "service": "sne-collector"})

@app.route('/health/deps')
def health_deps():
    """Health check das dependências externas"""
    redis_ok = False
    try:
        if redis_available and redis_client:
            redis_ok = redis_client.ping()
    except Exception:
        redis_ok = False

    return jsonify({
        "ok": True,
        "service": "sne-collector",
        "redis": redis_ok
    })

@app.route('/debug/binance')
def debug_binance():
    """Debug egress test"""
    result = get_cached_binance_data("time")
    if "error" in result:
        return jsonify({
            "ok": False,
            "err": result["error"],
            "egress_ok": False
        }), 502

    return jsonify({
        "ok": True,
        "status": 200,
        "body": result["data"],
        "source": result["source"],
        "egress_ok": True
    })

@app.route('/binance/<endpoint>', methods=['GET'])
@require_auth
def binance_proxy(endpoint):
    """Cache-first Binance proxy"""
    # Validate endpoint
    allowed = ['time', 'ticker/price', 'klines', 'ticker/24hr']
    if endpoint not in allowed:
        return jsonify({"error": "Endpoint not allowed"}), 403

    # Get params
    params = dict(request.args)

    # Special handling for klines
    if endpoint == 'klines':
        required = ['symbol', 'interval']
        if not all(k in params for k in required):
            return jsonify({"error": "Missing required params: symbol, interval"}), 400

    result = get_cached_binance_data(endpoint, params)

    if "error" in result:
        return jsonify({"error": result["error"]}), result.get("status", 500)

    return jsonify(result)

if __name__ == "__main__":
    port = int(os.environ.get("PORT", "8080"))
    print(f"🚀 SNE Data Collector starting on port {port}")
    app.run(host="0.0.0.0", port=port)