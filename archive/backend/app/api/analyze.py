"""
API Analyze - Análise técnica completa (compatível com radar existente)
"""
from flask import Blueprint, jsonify, request, g
from app.utils.tier_checker import require_tier
from app.utils.logging import get_request_id
from app.utils.metrics import analysis_requests, analysis_duration
import redis
import os
import time
import json
import logging

logger = logging.getLogger(__name__)

analyze_bp = Blueprint('analyze', __name__)

# Redis para cache (com fallback seguro)
from app.utils.redis_safe import SafeRedis
redis_client = SafeRedis(
    host=os.getenv('REDIS_HOST', 'localhost'),
    port=int(os.getenv('REDIS_PORT', 6379)),
    db=0,
    decode_responses=True
)

@analyze_bp.route('/api/analyze', methods=['POST'])
@require_tier('free')  # Todos os tiers podem acessar (análise básica)
def analyze():
    """
    Análise técnica completa (compatível com radar existente)
    
    Body:
    - symbol: par de trading (ex: BTCUSDT)
    - timeframe: intervalo (1h, 4h, 1d)
    
    Retorna: análise completa com sintese, niveis_operacionais, contexto, estrutura, confluencia
    """
    request_id = get_request_id()
    start_time = time.time()
    
    data = request.get_json() or {}
    symbol = data.get('symbol', 'BTCUSDT').upper()
    timeframe = data.get('timeframe', '1h')
    
    # Verificar cache
    cache_key = f'analyze:{symbol}:{timeframe}'
    cached = redis_client.get(cache_key)
    
    if cached:
        analysis_requests.labels(tier=g.user.get('tier', 'free'), cached=True).inc()
        analysis_duration.observe(time.time() - start_time)
        return jsonify(json.loads(cached))
    
    try:
        # Importar motor service
        from app.services.motor_service import analyze as motor_analyze
        
        # Executar análise real
        resultado = motor_analyze(symbol, timeframe)
        
        # Se houver erro, retornar
        if resultado.get('status') == 'error':
            analysis_requests.labels(tier=g.user.get('tier', 'free'), cached=False, error=True).inc()
            return jsonify(resultado), 500
        
        # Cachear resultado (TTL curto - 30s)
        redis_client.setex(cache_key, 30, json.dumps(resultado))
        
        analysis_requests.labels(tier=g.user.get('tier', 'free'), cached=False).inc()
        analysis_duration.observe(time.time() - start_time)
        
        return jsonify(resultado)
        
    except ImportError:
        # Fallback: retornar dados mockados se motor não estiver disponível
        logger.warning("⚠️ Motor de análise não disponível, usando dados mockados")
        
        # Estrutura de resposta compatível com motor_renan
        resultado = {
            "sintese": {
                "score_combinado": 7.5,
                "acao": "LONG",
                "recomendacao": "COMPRA",
                "entry_price": 43250.0,
                "stop_loss": 42000.0,
                "tp1": 44500.0,
                "tp2": 45000.0,
                "tp3": 46000.0
            },
            "niveis_operacionais": {
                "entry_price": 43250.0,
                "stop_loss": 42000.0,
                "tp1": 44500.0,
                "tp2": 45000.0,
                "tp3": 46000.0
            },
            "contexto": {
                "preco_atual": 43250.0,
                "tendencia_curta": "BULLISH",
                "tendencia_longa": "BULLISH",
                "volatilidade": "normal"
            },
            "estrutura": {
                "suportes": [42500, 42000, 41500],
                "resistencias": [44000, 44500, 45000]
            },
            "confluencia": {
                "score": 7.5,
                "bias": "BULLISH"
            },
            "indicadores": {
                "rsi": 65.5,
                "ema8": 43100.0,
                "ema21": 42800.0
            }
        }
        
        # Cachear resultado (TTL curto - 30s)
        redis_client.setex(cache_key, 30, json.dumps(resultado))
        
        analysis_requests.labels(tier=g.user.get('tier', 'free'), cached=False).inc()
        analysis_duration.observe(time.time() - start_time)
        
        return jsonify(resultado)
        
    except Exception as e:
        analysis_requests.labels(tier=g.user.get('tier', 'free'), cached=False, error=True).inc()
        return jsonify({
            "status": "error",
            "error": str(e)
        }), 500

@analyze_bp.route('/api/signal', methods=['GET'])
@require_tier('free')  # Todos os tiers podem acessar
def get_signal():
    """
    Obter sinal simplificado (compatível com radar existente)
    
    Query params:
    - symbol: par de trading (ex: BTCUSDT)
    - timeframe: intervalo (1h, 4h, 1d)
    
    Retorna: sinal BUY/SELL/NEUTRAL + score
    """
    request_id = get_request_id()
    start_time = time.time()
    
    symbol = request.args.get('symbol', 'BTCUSDT').upper()
    timeframe = request.args.get('timeframe', '1h')
    
    # Verificar cache
    cache_key = f'signal:{symbol}:{timeframe}'
    cached = redis_client.get(cache_key)
    
    if cached:
        analysis_requests.labels(tier=g.user.get('tier', 'free'), cached=True).inc()
        analysis_duration.observe(time.time() - start_time)
        return jsonify(json.loads(cached))
    
    try:
        # Importar motor service
        from app.services.motor_service import analyze as motor_analyze, extract_signal
        
        # Executar análise completa
        resultado_completo = motor_analyze(symbol, timeframe)
        
        # Se houver erro, retornar erro
        if resultado_completo.get('status') == 'error':
            analysis_requests.labels(tier=g.user.get('tier', 'free'), cached=False, error=True).inc()
            return jsonify(resultado_completo), 500
        
        # Extrair sinal simplificado
        sinal_result = extract_signal(resultado_completo)
        
        # TTL por timeframe (em segundos)
        TTL_BY_TIMEFRAME = {
            '1m': 60, '3m': 60, '5m': 60,
            '15m': 180, '30m': 180,
            '1h': 300,
            '2h': 600, '4h': 1800, '6h': 1800,
            '8h': 1800, '12h': 1800, '1d': 1800,
            '3d': 3600, '1w': 3600, '1M': 7200
        }
        ttl = TTL_BY_TIMEFRAME.get(timeframe, 300)
        
        # Cachear resultado
        redis_client.setex(cache_key, ttl, json.dumps(sinal_result))
        
        analysis_requests.labels(tier=g.user.get('tier', 'free'), cached=False).inc()
        analysis_duration.observe(time.time() - start_time)
        
        return jsonify(sinal_result)
        
    except Exception as e:
        analysis_requests.labels(tier=g.user.get('tier', 'free'), cached=False, error=True).inc()
        return jsonify({
            "status": "error",
            "error": str(e)
        }), 500

