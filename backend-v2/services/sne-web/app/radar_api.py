"""
Radar API - SNE Market Analysis and Signals
Market data, signals, and analysis for SNE OS Radar
"""
from flask import Blueprint, Response, request, jsonify, g
import hmac
import logging
import os
import time
from datetime import datetime
from .common.auth import get_auth_context, require_authenticated_user
from .collector_client import get_live_market_snapshot
from .radar_report_delivery import send_radar_report_to_telegram, send_radar_report_to_threads
from .radar_report_service import build_radar_report
from .radar_report_visuals import render_radar_report_chart
from .radar_service import build_radar_overview, derive_signal_from_ticker

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

radar_bp = Blueprint("radar", __name__)


def _normalize_report_channels(value):
    requested = value if isinstance(value, list) else [value] if isinstance(value, str) else ["telegram"]
    ordered = []
    for item in requested:
        channel = str(item or "").strip().lower()
        if channel in {"telegram", "threads"} and channel not in ordered:
            ordered.append(channel)
    return ordered or ["telegram"]


def _radar_chart_public_url(report_payload) -> str:
    base = (
        os.getenv("RADAR_REPORT_PUBLIC_BASE_URL")
        or os.getenv("PUBLIC_API_BASE")
        or "https://api.snelabs.space"
    ).strip().rstrip("/")
    symbol = str(report_payload.get("symbol") or "BTCUSDT").upper().replace("/", "")
    timeframe = str(report_payload.get("timeframe") or "1h").strip()
    return f"{base}/api/radar/report/chart/{symbol}/{timeframe}.png"


def _radar_report_secret_authorized() -> bool:
    expected = (
        os.getenv("RADAR_REPORT_SECRET")
        or os.getenv("INTEL_REFRESH_SECRET")
        or os.getenv("INTEL_DISTRIBUTION_SECRET")
        or ""
    ).strip()
    if not expected:
        return False

    provided = (
        request.headers.get("X-Radar-Report-Secret", "")
        or request.headers.get("X-Intel-Refresh-Secret", "")
        or request.headers.get("Authorization", "").removeprefix("Bearer ")
    ).strip()
    return bool(provided) and hmac.compare_digest(provided, expected)

# ============================================
# PUBLIC ENDPOINTS (no auth required)
# ============================================

@radar_bp.get("/market-summary")
def market_summary():
    """
    Get market summary data (public - no auth required)
    GET /api/radar/market-summary
    """
    try:
        top_movers = get_live_market_snapshot(limit=5)
        market_data = {
            'btc_dominance': None,
            'market_cap': None,
            'volume_24h': None,
            'fear_greed_index': None,
            'top_movers': top_movers,
            'timestamp': datetime.utcnow().isoformat()
        }
        
        return jsonify(market_data), 200
        
    except Exception as e:
        logger.error(f"Market summary error: {e}")
        return jsonify({
            'btc_dominance': None,
            'market_cap': None,
            'volume_24h': None,
            'fear_greed_index': None,
            'top_movers': []
        }), 200


@radar_bp.get("/overview")
def overview():
    """
    Aggregated Radar page payload.
    GET /api/radar/overview?symbol=ETHUSDT&timeframe=24H
    """
    try:
      auth = get_auth_context()
      active_symbol = request.args.get("symbol", "ETHUSDT").replace("/", "")
      timeframe = request.args.get("timeframe", "24H")
      authenticated = bool(auth.get("address"))
      tier = auth.get("tier", "free")
      has_access = tier in {"premium", "pro"}

      return jsonify(build_radar_overview(active_symbol, authenticated, has_access, timeframe)), 200
    except Exception as e:
      logger.error(f"Radar overview error: {e}")
      return jsonify({
          "execution": {"label": "offline", "tone": "pending"},
          "hero": {
              "headline": "Regime sem ativo em foco.",
              "summary": "O Radar esta indisponivel agora.",
              "metrics": [],
          },
          "market_regime": {
              "label": "sem dados",
              "tone": "pending",
              "avg_change_24h": 0.0,
              "summary": "O Radar ainda nao tem snapshot suficiente para classificar o mercado.",
          },
          "focus_asset": None,
          "execution_risk": {
              "label": "sem dados",
              "tone": "pending",
              "score": 0,
              "summary": "Sem leitura suficiente para qualificar risco de execucao.",
              "blockers": ["O Radar nao retornou contexto suficiente nesta sessao."],
          },
          "next_action": {
              "state": "intel-first",
              "title": "Contexto antes da execucao.",
              "summary": "Use Intel e observacao ate o mercado voltar a responder.",
              "actions": [
                  {"label": "Ler Intel", "href": "/intel", "tone": "accent", "kind": "intel", "recommended": True},
                  {"label": "Observar", "href": "/radar", "tone": "neutral", "kind": "observe", "recommended": False},
              ],
          },
          "universe_summary": {
              "title": "Universo monitorado",
              "summary": "Liquidez viva, regime relativo e selecao rapida do ativo em foco.",
          },
          "rankings": {"momentum": [], "liquidity": []},
          "market_state": {"label": "Sem dados.", "access": "previa", "execution": "intel-first"},
          "featured": None,
          "signal": None,
          "universe": [],
          "last_updated": datetime.utcnow().isoformat(),
      }), 200


@radar_bp.get("/report")
def report():
    """
    Operational Radar report payload.
    GET /api/radar/report?symbol=BTCUSDT&timeframe=1h
    """
    try:
      auth = get_auth_context()
      symbol = request.args.get("symbol", "BTCUSDT")
      timeframe = request.args.get("timeframe", "1h")
      tier = auth.get("tier", "free")
      has_access = tier in {"premium", "pro"}

      return jsonify(build_radar_report(
          symbol=symbol,
          timeframe=timeframe,
          authenticated=bool(auth.get("address")),
          has_access=has_access,
      )), 200
    except Exception as e:
      logger.error(f"Radar report error: {e}", exc_info=True)
      return jsonify({
          "symbol": request.args.get("symbol", "BTCUSDT"),
          "timeframe": request.args.get("timeframe", "1h"),
          "status": "degraded",
          "data_quality": {"candles": "unavailable", "overview": "unavailable", "dom": "not_available"},
          "executive_summary": {
              "headline": "Relatorio operacional indisponivel.",
              "summary": "O Radar nao conseguiu agregar os dados atuais para este ativo.",
              "bias": "sem dados",
              "confluence_score": 0,
          },
          "market_context": {},
          "technical": {"current_candle": None, "indicators": {}, "levels": {"supports": [], "resistances": []}},
          "multi_timeframe": {"items": [], "alignment": "sem dados", "confluence_score": 0},
          "scenarios": {},
          "risk_plan": {"state": "observe", "blockers": ["Falha ao montar relatorio."]},
          "operator_decision": {
              "state": "observe",
              "title": "Aguardar dados.",
              "summary": "Sem payload suficiente para decisao operacional.",
              "checklist": [],
              "next_action": "Tentar novamente quando o Radar responder.",
          },
          "report_text": "Relatorio operacional indisponivel.",
      }), 200


@radar_bp.get("/report/chart")
def report_chart():
    """
    Public operational Radar chart image.
    GET /api/radar/report/chart?symbol=BTCUSDT&timeframe=1h
    """
    try:
      symbol = request.args.get("symbol", "BTCUSDT")
      timeframe = request.args.get("timeframe", "1h")
      report_payload = build_radar_report(
          symbol=symbol,
          timeframe=timeframe,
          authenticated=False,
          has_access=False,
      )
      if report_payload.get("status") != "ready":
          return fail("REPORT_DEGRADED", "Radar report chart is unavailable", 503)
      image_bytes = render_radar_report_chart(report_payload)
      return Response(
          image_bytes,
          mimetype="image/png",
          headers={
              "Cache-Control": "public, max-age=120",
              "X-Content-Type-Options": "nosniff",
          },
      )
    except Exception as e:
      logger.error(f"Radar report chart error: {e}", exc_info=True)
      return fail("INTERNAL_ERROR", "Failed to render Radar report chart", 500)


@radar_bp.get("/report/chart/<symbol>/<timeframe>.png")
def report_chart_path(symbol: str, timeframe: str):
    """
    Public operational Radar chart image with a clean media URL for social APIs.
    GET /api/radar/report/chart/BTCUSDT/1h.png
    """
    try:
      report_payload = build_radar_report(
          symbol=symbol,
          timeframe=timeframe,
          authenticated=False,
          has_access=False,
      )
      if report_payload.get("status") != "ready":
          return fail("REPORT_DEGRADED", "Radar report chart is unavailable", 503)
      image_bytes = render_radar_report_chart(report_payload)
      return Response(
          image_bytes,
          mimetype="image/png",
          headers={
              "Cache-Control": "public, max-age=120",
              "X-Content-Type-Options": "nosniff",
          },
      )
    except Exception as e:
      logger.error(f"Radar report chart path error: {e}", exc_info=True)
      return fail("INTERNAL_ERROR", "Failed to render Radar report chart", 500)


@radar_bp.post("/report/telegram")
def report_telegram():
    """
    Send an operational Radar report to Telegram.
    POST /api/radar/report/telegram
    Body: { "symbol": "BTCUSDT", "timeframe": "1h", "dryRun": false }
    """
    if not _radar_report_secret_authorized():
        return fail("UNAUTHORIZED", "Radar report secret required", 401)

    try:
      payload = request.get_json(silent=True) or {}
      symbol = payload.get("symbol") or request.args.get("symbol") or "BTCUSDT"
      timeframe = payload.get("timeframe") or request.args.get("timeframe") or "1h"
      dry_run = bool(payload.get("dryRun") or payload.get("dry_run"))
      include_chart = payload.get("includeChart", payload.get("include_chart", True)) is not False

      report_payload = build_radar_report(
          symbol=symbol,
          timeframe=timeframe,
          authenticated=False,
          has_access=False,
      )
      report_text = str(report_payload.get("report_text") or "").strip()
      if not report_text:
          return fail("REPORT_EMPTY", "Radar report text is empty", 422)

      message = report_text
      chart_bytes = b""
      if include_chart and report_payload.get("status") == "ready":
          chart_bytes = render_radar_report_chart(report_payload)
      if dry_run:
          return ok({
              "sent": False,
              "dryRun": True,
              "symbol": report_payload.get("symbol"),
              "timeframe": report_payload.get("timeframe"),
              "status": report_payload.get("status"),
              "chartBytes": len(chart_bytes),
              "message": message,
          })

      sent, error = send_radar_report_to_telegram(report_payload, chart_bytes=chart_bytes)
      if not sent:
          return fail("TELEGRAM_SEND_FAILED", error or "Telegram send failed", 502)

      return ok({
          "sent": True,
          "symbol": report_payload.get("symbol"),
          "timeframe": report_payload.get("timeframe"),
          "status": report_payload.get("status"),
          "generatedAt": report_payload.get("generated_at"),
          "chart": bool(chart_bytes),
      })
    except Exception as e:
      logger.error(f"Radar report Telegram error: {e}", exc_info=True)
      return fail("INTERNAL_ERROR", "Failed to send Radar report to Telegram", 500)


@radar_bp.post("/reports/autopublish")
def reports_autopublish():
    """
    Send automatic operational Radar reports to Telegram.
    POST /api/radar/reports/autopublish
    Body: { "symbols": ["BTCUSDT"], "timeframes": ["1h"], "dryRun": false }
    """
    if not _radar_report_secret_authorized():
        return fail("UNAUTHORIZED", "Radar report secret required", 401)

    try:
      payload = request.get_json(silent=True) or {}
      symbols = payload.get("symbols") or payload.get("symbol") or ["BTCUSDT", "ETHUSDT", "SOLUSDT"]
      timeframes = payload.get("timeframes") or payload.get("timeframe") or ["1h"]
      dry_run = bool(payload.get("dryRun") or payload.get("dry_run"))
      include_chart = payload.get("includeChart", payload.get("include_chart", True)) is not False
      channels = _normalize_report_channels(payload.get("channels") or payload.get("channel"))

      if isinstance(symbols, str):
          symbols = [symbols]
      if isinstance(timeframes, str):
          timeframes = [timeframes]

      results = []
      for symbol in [str(item).upper().replace("/", "") for item in symbols if str(item).strip()][:8]:
          for timeframe in [str(item).strip() for item in timeframes if str(item).strip()][:4]:
              report_payload = build_radar_report(
                  symbol=symbol,
                  timeframe=timeframe,
                  authenticated=False,
                  has_access=False,
              )
              report_text = str(report_payload.get("report_text") or "").strip()
              if dry_run:
                  chart_size = 0
                  if include_chart and report_payload.get("status") == "ready":
                      chart_size = len(render_radar_report_chart(report_payload))
                  results.append({
                      "symbol": report_payload.get("symbol"),
                      "timeframe": report_payload.get("timeframe"),
                      "status": report_payload.get("status"),
                      "sent": False,
                      "dryRun": True,
                      "channels": channels,
                      "chartUrl": _radar_chart_public_url(report_payload) if "threads" in channels and chart_size else None,
                      "chartBytes": chart_size,
                  })
                  continue

              chart_bytes = b""
              if include_chart and report_payload.get("status") == "ready":
                  chart_bytes = render_radar_report_chart(report_payload)

              channel_results = []
              for channel in channels:
                  if channel == "telegram":
                      sent, error = send_radar_report_to_telegram(report_payload, chart_bytes=chart_bytes)
                  else:
                      sent, error = send_radar_report_to_threads(
                          report_payload,
                          image_url=_radar_chart_public_url(report_payload) if chart_bytes else None,
                      )
                  channel_results.append({"channel": channel, "sent": sent, "error": error})

              results.append({
                  "symbol": report_payload.get("symbol"),
                  "timeframe": report_payload.get("timeframe"),
                  "status": report_payload.get("status"),
                  "sent": any(item.get("sent") for item in channel_results),
                  "channelResults": channel_results,
                  "chart": bool(chart_bytes),
              })

      return ok({
          "dryRun": dry_run,
          "results": results,
          "sentCount": sum(
              1
              for item in results
              for channel_result in item.get("channelResults", [])
              if channel_result.get("sent")
          ) if not dry_run else 0,
      })
    except Exception as e:
      logger.error(f"Radar reports autopublish error: {e}", exc_info=True)
      return fail("INTERNAL_ERROR", "Failed to autopublish Radar reports", 500)


@radar_bp.post("/signals")
def signals_post():
    """
    Get market signals via POST (for SNE OS frontend)
    POST /api/radar/signals
    Body: { "symbol": "BTC/USD", "timeframe": "4H" }
    """
    try:
        body = request.get_json(silent=True) or {}
        symbol = body.get('symbol', 'BTCUSDT').replace('/', '')
        timeframe = body.get('timeframe', '4H')

        tickers = get_live_market_snapshot(limit=20)
        ticker = next((item for item in tickers if item["symbol"] == symbol), None)

        if not ticker:
            return jsonify({'signals': []}), 200

        signals_data = {
            'signals': [derive_signal_from_ticker(ticker, timeframe)]
        }

        return jsonify(signals_data), 200
        
    except Exception as e:
        logger.error(f"Signals POST error: {e}")
        return jsonify({'signals': []}), 200

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
def signals_get():
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

        top_movers = get_live_market_snapshot(limit=max(limit, 2))
        signals_data = {
            "preview": True,
            "market": market,
            "limit": limit,
            "items": [
                {
                    "symbol": item["symbol"],
                    "signal": "BUY" if item["change24h"] >= 0 else "SELL",
                    "strength": "Strong" if abs(item["change24h"]) >= 0.05 else "Moderate",
                    "timeframe": "24H",
                    "price": item["price"],
                    "change": f"{item['change24h'] * 100:+.2f}%",
                    "timestamp": datetime.utcnow().isoformat()
                }
                for item in top_movers[:limit]
            ],
            "lastUpdated": str(int(time.time()))
        }

        # Cache por 10 segundos
        redis_client.setex(cache_key, 10, json.dumps(signals_data))

        return ok(signals_data)

    except Exception as e:
        logger.error(f"Signals error: {e}")
        return fail("INTERNAL_ERROR", "Failed to fetch signals", 500)

# ============================================
# AUTHENTICATED ENDPOINTS (require wallet)
# ============================================

@radar_bp.post("/analyze")
@require_authenticated_user
def analyze():
    """
    Request market analysis for specific symbol using SNE motor
    POST /api/radar/analyze
    Body: { "symbol": "BTCUSDT", "timeframe": "15m", "market": "crypto" }
    """
    from .motor import analisar_par
    from app.utils.redis_safe import SafeRedis
    from .auth_siwe import check_tier_limits
    import json

    try:
        auth = g.user
        body = request.get_json(silent=True) or {}
        symbol = body.get("symbol")
        timeframe = body.get("timeframe", "15m")
        market = body.get("market", "crypto")

        if not symbol:
            return fail("BAD_REQUEST", "Missing symbol", 400)

        addr = auth["address"]
        tier = auth.get("tier", "free")

        # Verificar limites por tier
        if not check_tier_limits(addr, tier, 'analysis'):
            return fail("LIMIT_EXCEEDED", "Analysis limit reached for your tier", 429)

        redis_client = SafeRedis()

        # Cache key para análise
        cache_key = f"radar:analysis:{addr.lower()}:{symbol}:{timeframe}"

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
            redis_client.setex(cache_key, 300, json.dumps(analysis_data))

            logger.info(f"Analysis completed for {addr}: {symbol}")
            return ok(analysis_data)

        except Exception as e:
            logger.error(f"SNE motor execution error: {e}")
            return fail("ANALYSIS_ERROR", "Analysis engine unavailable", 503)

    except Exception as e:
        logger.error(f"Analysis request error: {e}")
        return fail("INTERNAL_ERROR", "Failed to request analysis", 500)

@radar_bp.post("/watchlist")
@require_authenticated_user
def radar_watchlist():
    """
    Manage radar watchlist (symbols to monitor)
    POST /api/radar/watchlist
    Body: { "action": "add|remove", "symbol": "BTCUSDT", "market": "crypto" }
    """
    try:
        auth = g.user
        body = request.get_json(silent=True) or {}
        action = body.get("action")  # add/remove
        symbol = body.get("symbol")
        market = body.get("market", "crypto")

        if action not in ("add", "remove") or not symbol:
            return fail("BAD_REQUEST", "Invalid action or missing symbol", 400)

        addr = auth["address"]

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
@require_authenticated_user
def get_radar_watchlist():
    """
    Get user's radar watchlist
    GET /api/radar/watchlist
    """
    try:
        auth = g.user
        addr = auth["address"]

        # TODO: Query database for user's radar watchlist

        watchlist_data = {
            "user": addr,
            "items": []  # Stub - empty watchlist
        }

        return ok(watchlist_data)

    except Exception as e:
        logger.error(f"Get radar watchlist error: {e}")
        return fail("INTERNAL_ERROR", "Failed to fetch radar watchlist", 500)
