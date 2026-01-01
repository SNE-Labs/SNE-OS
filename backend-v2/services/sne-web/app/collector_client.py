"""
Client para comunicação com o SNE Collector
Substitui chamadas diretas para Binance por chamadas seguras ao coletor
"""

import os
import requests
import logging

logger = logging.getLogger(__name__)

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
    Busca dados de klines via coletor (cache-first)
    Substitui chamadas diretas para api.binance.com
    """
    if not COLLECTOR_URL:
        raise RuntimeError("COLLECTOR_URL não configurado no backend")

    try:
        logger.info(f"Coletando dados via COLLECTOR_URL: {symbol} {interval} limit={limit}")

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

    except requests.exceptions.RequestException as e:
        logger.error(f"Erro na comunicação com coletor: {str(e)}")
        raise RuntimeError(f"Falha ao coletar dados: {str(e)}")

def get_binance_data(endpoint: str, params: dict = None):
    """
    Função genérica para outros endpoints do Binance via coletor
    """
    if not COLLECTOR_URL:
        raise RuntimeError("COLLECTOR_URL não configurado no backend")

    try:
        url = f"{COLLECTOR_URL}/binance/{endpoint.lstrip('/')}"
        r = requests.get(url, params=params or {}, headers=_headers(), timeout=10)
        r.raise_for_status()

        result = r.json()
        if isinstance(result, dict) and "error" in result:
            raise RuntimeError(f"Collector error: {result['error']}")
        return result["data"] if isinstance(result, dict) and "data" in result else result

    except requests.exceptions.RequestException as e:
        logger.error(f"Erro na comunicação com coletor: {str(e)}")
        raise RuntimeError(f"Falha ao coletar dados: {str(e)}")
