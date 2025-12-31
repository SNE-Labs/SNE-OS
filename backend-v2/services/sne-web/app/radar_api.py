"""
Radar API - SNE Market Analysis and Signals
Market data, signals, and analysis for SNE OS Radar
"""
from flask import Blueprint, request, session, jsonify
from functools import wraps
import logging

logger = logging.getLogger(__name__)

# Local helpers to avoid import issues
def ok(data=None, **meta):
    """Standard success response"""
    payload = {"ok": True, "data": data}
    if meta: payload["meta"] = meta
    return jsonify(payload), 200

def fail(code: str, message: str, status: int = 400, **details):
    """Standard error response"""
    payload = {"ok": False, "error": {"code": code, "message": message, "details": details or None}}
    return jsonify(payload), status

def require_session(fn):
    """Decorator to require authenticated session"""
    @wraps(fn)
    def wrapper(*args, **kwargs):
        addr = session.get("siwe_address")
        if not addr:
            return fail("UNAUTHENTICATED", "Connect wallet required", 401)
        return fn(*args, **kwargs)
    return wrapper

radar_bp = Blueprint("radar", __name__)

@radar_bp.get("/markets")
def markets():
    """
    Get available markets for analysis
    GET /api/radar/markets
    """
    markets_data = [
        {
            "id": "crypto",
            "name": "Cryptocurrency",
            "description": "BTC, ETH, and major altcoins",
            "active": True
        },
        {
            "id": "forex",
            "name": "Forex",
            "description": "Major currency pairs",
            "active": False  # Future feature
        },
        {
            "id": "indices",
            "name": "Stock Indices",
            "description": "Global stock market indices",
            "active": False  # Future feature
        }
    ]

    return ok(markets_data)

@radar_bp.get("/signals")
def signals():
    """
    Get market signals (public preview)
    GET /api/radar/signals?market=crypto&limit=10
    """
    from app.utils.redis_safe import SafeRedis
    import json

    try:
        market = request.args.get('market', 'crypto')
        limit = int(request.args.get('limit', 10))

        redis_client = SafeRedis()

        # Cache para sinais públicos (10s TTL)
        cache_key = f"radar:signals:public:{market}:{limit}"

        cached_data = redis_client.get(cache_key)
        if cached_data:
            return ok(json.loads(cached_data))

        # TODO: Integrar com sinais reais do motor SNE
        # Por enquanto, dados mock representativos

        signals_data = {
            "preview": True,
            "market": market,
            "limit": limit,
            "items": [
                {
                    "symbol": "BTCUSDT",
                    "signal": "BUY",
                    "strength": "Strong",
                    "timeframe": "4H",
                    "price": 45000,
                    "change": "+2.5%",
                    "timestamp": "2024-01-15T10:30:00Z"
                },
                {
                    "symbol": "ETHUSDT",
                    "signal": "SELL",
                    "strength": "Moderate",
                    "timeframe": "1H",
                    "price": 2800,
                    "change": "-1.2%",
                    "timestamp": "2024-01-15T10:25:00Z"
                }
            ][:limit],  # Limitar resultados
            "lastUpdated": str(int(time.time()))
        }

        # Cache por 10 segundos
        redis_client.set(cache_key, json.dumps(signals_data), ex=10)

        return ok(signals_data)

    except Exception as e:
        logger.error(f"Signals error: {e}")
        return fail("INTERNAL_ERROR", "Failed to fetch signals", 500)

@radar_bp.post("/analyze")
@require_session
def analyze():
    """
    Request market analysis for specific symbol using SNE motor
    POST /api/radar/analyze
    Body: { "symbol": "BTCUSDT", "timeframe": "15m", "market": "crypto" }
    """
    from .motor import analisar_par
    from app.utils.redis_safe import SafeRedis
    import json

    try:
        body = request.get_json(silent=True) or {}
        symbol = body.get("symbol")
        timeframe = body.get("timeframe", "15m")
        market = body.get("market", "crypto")

        if not symbol:
            return fail("BAD_REQUEST", "Missing symbol", 400)

        addr = session["siwe_address"]
        tier = session.get("tier", "free")

        # Verificar limites por tier
        if not check_tier_limits(addr, tier, 'analysis'):
            return fail("LIMIT_EXCEEDED", "Analysis limit reached for your tier", 429)

        redis_client = SafeRedis()

        # Cache key para análise
        cache_key = f"radar:analysis:{symbol}:{timeframe}"

        # Verificar cache (5min para análises)
        cached_result = redis_client.get(cache_key)
        if cached_result:
            cached_data = json.loads(cached_result)
            cached_data["cached"] = True
            return ok(cached_data)

        # Executar análise real com motor SNE
        try:
            logger.info(f"Running SNE analysis for {symbol} on {timeframe}")

            resultado = analisar_par(symbol, timeframe)

            if resultado.get('status') == 'error':
                logger.error(f"SNE motor error: {resultado}")
                return fail("ANALYSIS_ERROR", "Failed to analyze market data", 500)

            # Formatar resposta
            analysis_data = {
                "analysisId": f"analysis_{symbol}_{addr[:8]}_{timeframe}_{int(time.time())}",
                "user": addr,
                "symbol": symbol,
                "timeframe": timeframe,
                "market": market,
                "status": "completed",
                "result": resultado,
                "cached": False,
                "executedAt": str(int(time.time()))
            }

            # Cache por 5 minutos
            redis_client.set(cache_key, json.dumps(analysis_data), ex=300)

            logger.info(f"Analysis completed for {addr}: {symbol}")
            return ok(analysis_data)

        except Exception as e:
            logger.error(f"SNE motor execution error: {e}")
            return fail("ANALYSIS_ERROR", "Analysis engine unavailable", 503)

    except Exception as e:
        logger.error(f"Analysis request error: {e}")
        return fail("INTERNAL_ERROR", "Failed to request analysis", 500)

@radar_bp.post("/watchlist")
@require_session
def radar_watchlist():
    """
    Manage radar watchlist (symbols to monitor)
    POST /api/radar/watchlist
    Body: { "action": "add|remove", "symbol": "BTCUSDT", "market": "crypto" }
    """
    try:
        body = request.get_json(silent=True) or {}
        action = body.get("action")  # add/remove
        symbol = body.get("symbol")
        market = body.get("market", "crypto")

        if action not in ("add", "remove") or not symbol:
            return fail("BAD_REQUEST", "Invalid action or missing symbol", 400)

        addr = session["siwe_address"]

        # TODO: Persist watchlist in database
        # TODO: Limit watchlist size per user (tier-based)

        result = {
            "user": addr,
            "action": action,
            "symbol": symbol,
            "market": market,
            "status": "success"
        }

        logger.info(f"Radar watchlist {action} for user {addr}: {symbol}")
        return ok(result)

    except Exception as e:
        logger.error(f"Radar watchlist error: {e}")
        return fail("INTERNAL_ERROR", "Failed to update radar watchlist", 500)

@radar_bp.get("/watchlist")
@require_session
def get_radar_watchlist():
    """
    Get user's radar watchlist
    GET /api/radar/watchlist
    """
    try:
        addr = session["siwe_address"]

        # TODO: Query database for user's radar watchlist

        watchlist_data = {
            "user": addr,
            "items": []  # Stub - empty watchlist
        }

        return ok(watchlist_data)

    except Exception as e:
        logger.error(f"Get radar watchlist error: {e}")
        return fail("INTERNAL_ERROR", "Failed to fetch radar watchlist", 500)
