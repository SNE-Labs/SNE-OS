"""
Client para comunicação com o SNE Collector
Substitui chamadas diretas para Binance por chamadas seguras ao coletor
"""

import os
import requests
import logging
from typing import Any, Dict, List

logger = logging.getLogger(__name__)
BINANCE_PUBLIC_BASE = "https://api.binance.com/api/v3"
RADAR_MARKET_UNIVERSE = {
    "BTCUSDT",
    "ETHUSDT",
    "SOLUSDT",
    "BNBUSDT",
    "XRPUSDT",
    "DOGEUSDT",
    "ADAUSDT",
    "LINKUSDT",
    "AVAXUSDT",
    "ARBUSDT",
    "OPUSDT",
    "AAVEUSDT",
    "UNIUSDT",
    "MKRUSDT",
    "CRVUSDT",
    "LDOUSDT",
    "INJUSDT",
    "SUIUSDT",
    "SEIUSDT",
    "JUPUSDT",
}

# Normaliza URL (remove espaços, remove / final, adiciona https:// se faltar)
_raw = (os.getenv("COLLECTOR_URL") or "").strip()
if _raw and not _raw.startswith(("http://", "https://")):
    _raw = "https://" + _raw
COLLECTOR_URL = _raw.rstrip("/")

# Token simples (mais rápido que HMAC). Defina no Render e no Railway.
COLLECTOR_TOKEN = (os.getenv("COLLECTOR_TOKEN") or "").strip()

def _headers():
    h = {}
    if COLLECTOR_TOKEN:
        h["Authorization"] = f"Bearer {COLLECTOR_TOKEN}"
    return h

def get_klines(symbol: str, interval: str, limit: int = 100):
    """
    Busca dados de klines via coletor ou endpoint público.
    """
    try:
        if COLLECTOR_URL:
            logger.info(f"Collecting via COLLECTOR_URL: {symbol} {interval} limit={limit}")
            url = f"{COLLECTOR_URL}/binance/klines"
            r = requests.get(
                url,
                params={"symbol": symbol.upper(), "interval": interval, "limit": limit},
                headers=_headers(),
                timeout=15,
            )
            r.raise_for_status()

            result = r.json()
            if isinstance(result, dict) and "error" in result:
                raise RuntimeError(f"Collector error: {result['error']}")
            return result["data"] if isinstance(result, dict) and "data" in result else result

        logger.info(f"Collecting directly from Binance public API: {symbol} {interval} limit={limit}")
        r = requests.get(
            f"{BINANCE_PUBLIC_BASE}/klines",
            params={"symbol": symbol.upper(), "interval": interval, "limit": limit},
            timeout=15,
        )
        r.raise_for_status()
        return r.json()

    except requests.exceptions.RequestException as e:
        logger.error(f"Erro na comunicação com coletor: {str(e)}")
        raise RuntimeError(f"Falha ao coletar dados: {str(e)}")

def get_binance_data(endpoint: str, params: dict = None):
    """
    Função genérica para endpoints públicos do Binance.
    Se COLLECTOR_URL existir, usa o collector; caso contrário, consulta direto.
    """
    try:
        endpoint = endpoint.lstrip("/")
        if COLLECTOR_URL:
            url = f"{COLLECTOR_URL}/binance/{endpoint}"
            r = requests.get(url, params=params or {}, headers=_headers(), timeout=10)
        else:
            url = f"{BINANCE_PUBLIC_BASE}/{endpoint}"
            r = requests.get(url, params=params or {}, timeout=10)
        r.raise_for_status()

        result = r.json()
        if isinstance(result, dict) and "error" in result:
            raise RuntimeError(f"Collector error: {result['error']}")
        return result["data"] if isinstance(result, dict) and "data" in result else result

    except requests.exceptions.RequestException as e:
        logger.error(f"Erro na comunicação com coletor: {str(e)}")
        raise RuntimeError(f"Falha ao coletar dados: {str(e)}")


def get_live_market_snapshot(limit: int = 5) -> List[Dict[str, Any]]:
    """
    Busca snapshot real de mercado via coletor.
    Retorna top movers reais ordenados por variação percentual absoluta,
    filtrando pares USDT com volume relevante.
    """
    raw = get_binance_data("ticker/24hr")
    if not isinstance(raw, list):
        raise RuntimeError("Collector returned unexpected ticker payload")

    normalized: List[Dict[str, Any]] = []

    for item in raw:
        try:
            symbol = str(item.get("symbol", "")).upper()
            if not symbol.endswith("USDT"):
                continue
            if symbol not in RADAR_MARKET_UNIVERSE:
                continue

            quote_volume = float(item.get("quoteVolume", 0) or 0)
            if quote_volume < 10_000_000:
                continue

            price = float(item.get("lastPrice", 0) or 0)
            if price <= 0:
                continue
            change_pct = float(item.get("priceChangePercent", 0) or 0) / 100
            weighted_score = abs(change_pct) * min(quote_volume / 10_000_000, 20)

            normalized.append({
                "symbol": symbol,
                "price": price,
                "change24h": change_pct,
                "volume": quote_volume,
                "score": weighted_score,
            })
        except (TypeError, ValueError):
            continue

    ranked = sorted(normalized, key=lambda item: item["score"], reverse=True)

    return ranked[:limit]
