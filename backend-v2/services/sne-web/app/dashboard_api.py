"""
API de Dashboard para SNE Radar
Integrou com motor de análise real do SNE V1.0
"""

from flask import Blueprint, request, jsonify, g
from datetime import datetime, timedelta
import logging
import json as json_lib

from .auth_siwe import require_auth, check_tier_limits
from .motor import analisar_par
from app.utils.redis_safe import SafeRedis

dashboard_bp = Blueprint('dashboard', __name__)
logger = logging.getLogger(__name__)

# Redis para cache
redis_client = SafeRedis()

@dashboard_bp.route('/summary', methods=['GET'])
@require_auth
def dashboard_summary():
    """
    Resumo do dashboard com dados de mercado e análise
    Endpoint: GET /api/dashboard/summary
    """
    try:
        user = g.user
        wallet_address = user['address']
        tier = user['tier']

        # Verificar rate limits
        if not check_tier_limits(wallet_address, tier, 'request'):
            return jsonify({'error': 'Rate limit exceeded'}), 429

        # Cache key
        cache_key = f'dashboard:summary:{tier}'
        cache_ttl = 300 if tier == 'free' else 60  # 5min free, 1min premium+

        # Verificar cache
        cached_data = redis_client.get(cache_key)
        if cached_data:
            import json
            return jsonify(json.loads(cached_data)), 200

        # Gerar dados do dashboard
        summary_data = generate_dashboard_summary(tier)

        # Cache data
        redis_client.setex(cache_key, cache_ttl, json_lib.dumps(summary_data))

        return jsonify(summary_data), 200

    except Exception as e:
        logger.error(f"Dashboard summary error: {str(e)}", exc_info=True)
        return jsonify({'error': 'Failed to generate dashboard summary'}), 500

def generate_dashboard_summary(tier: str) -> dict:
    """Gera dados do dashboard baseado no tier"""

    # Top movers simulados (em produção, viria de API externa)
    top_movers = [
        {
            'symbol': 'BTCUSDT',
            'price': 43250.50,
            'change24h': 5.23,
            'volume': '2.5B'
        },
        {
            'symbol': 'ETHUSDT',
            'price': 2280.75,
            'change24h': -2.14,
            'volume': '1.8B'
        },
        {
            'symbol': 'SOLUSDT',
            'price': 98.32,
            'change24h': 12.45,
            'volume': '850M'
        }
    ]

    # Limitar dados baseado no tier
    if tier == 'free':
        top_movers = top_movers[:2]  # Apenas top 2

    # Análise básica para dashboard
    try:
        # Análise rápida do BTC (cacheada)
        btc_analysis = analisar_par('BTCUSDT', '1h')
        btc_signal = btc_analysis.get('analysis', {}).get('recommendation', 'HOLD')
    except Exception as e:
        btc_signal = 'HOLD'

    return {
        'timestamp': datetime.utcnow().isoformat(),
        'tier': tier,
        'market_summary': {
            'btc_dominance': 48.2,
            'market_cap': '1.8T',
            'volume_24h': '95B',
            'fear_greed_index': 62,
            'btc_signal': btc_signal
        },
        'top_movers': top_movers,
        'stats': {
            'analyses_today': 0,  # TODO: implementar tracking real
            'success_rate': None,
            'best_setup': None,
            'next_analysis_available': True
        }
    }

@dashboard_bp.route('/api/dashboard/watchlist', methods=['GET'])
@require_auth
def get_watchlist():
    """
    Lista de ativos favoritados
    Endpoint: GET /api/dashboard/watchlist
    """
    try:
        user = g.user
        tier = user['tier']

        # Verificar limits
        watchlist_limits = {'free': 3, 'premium': 10, 'pro': float('inf')}
        max_items = watchlist_limits.get(tier, 3)

        # TODO: implementar watchlist real no database
        # Por enquanto, retorna lista vazia
        return jsonify({
            'watchlist': [],
            'max_items': max_items,
            'tier': tier
        }), 200

    except Exception as e:
        logger.error(f"Watchlist error: {str(e)}")
        return jsonify({'error': 'Failed to load watchlist'}), 500

# ============================================
# SNE OS - Endpoints de Radar (compatibilidade)
# ============================================

@dashboard_bp.route('/api/radar/market-summary', methods=['GET'])
def radar_market_summary():
    """
    Resumo de mercado para SNE OS Radar
    Endpoint: GET /api/radar/market-summary
    """
    try:
        # Dados básicos de mercado (sem autenticação obrigatória)
        summary_data = generate_dashboard_summary('free')  # Usar dados básicos

        # Extrair apenas dados de mercado
        market_data = {
            'btc_dominance': summary_data.get('market_summary', {}).get('btc_dominance'),
            'market_cap': summary_data.get('market_summary', {}).get('market_cap'),
            'volume_24h': summary_data.get('market_summary', {}).get('volume_24h'),
            'fear_greed_index': summary_data.get('market_summary', {}).get('fear_greed_index'),
            'top_movers': summary_data.get('top_movers', [])[:5]  # Limitar a 5
        }

        return jsonify(market_data), 200

    except Exception as e:
        logger.error(f"Radar market summary failed: {str(e)}")
        return jsonify({
            'btc_dominance': None,
            'market_cap': None,
            'volume_24h': None,
            'fear_greed_index': None,
            'top_movers': []
        }), 200

@dashboard_bp.route('/api/radar/signals', methods=['POST'])
def radar_signals():
    """
    Sinais de análise para SNE OS Radar
    Endpoint: POST /api/radar/signals
    Body: { "symbol": "BTC/USD", "timeframe": "4H" }
    """
    try:
        data = request.get_json() or {}
        symbol = data.get('symbol', 'BTCUSDT').replace('/', '')  # Converter BTC/USD para BTCUSDT
        timeframe = data.get('timeframe', '4H')

        # Usar motor de análise para gerar sinais
        analysis_result = analisar_par(symbol, timeframe)

        if not analysis_result:
            return jsonify({'signals': []}), 200

        # Converter para formato esperado pelo frontend
        signals = []

        # Sinal principal
        signal_data = analysis_result.get('analysis', {})
        if signal_data.get('recommendation'):
            signals.append({
                'symbol': symbol,
                'signal': signal_data['recommendation'],
                'strength': signal_data.get('strength', 'Moderate'),
                'timeframe': timeframe,
                'updated': analysis_result.get('timestamp', datetime.utcnow().isoformat()),
                'change': signal_data.get('change_percent', '--'),
                'score': signal_data.get('confidence', 50)
            })

        # Adicionar sinais adicionais se disponíveis
        additional_signals = analysis_result.get('signals', [])
        for signal in additional_signals[:5]:  # Limitar a 5 sinais adicionais
            signals.append({
                'symbol': symbol,
                'signal': signal.get('type', 'Unknown'),
                'strength': signal.get('strength', 'Weak'),
                'timeframe': timeframe,
                'updated': signal.get('timestamp', datetime.utcnow().isoformat()),
                'change': signal.get('change', '--'),
                'score': signal.get('score', 30)
            })

        return jsonify({'signals': signals[:10]}), 200  # Limitar a 10 sinais no total

    except Exception as e:
        logger.error(f"Radar signals failed: {str(e)}")
        return jsonify({'signals': []}), 200

