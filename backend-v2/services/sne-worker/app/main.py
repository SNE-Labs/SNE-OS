"""
Main application routes for SNE Worker
"""
from flask import jsonify, request
from . import app
import logging

logger = logging.getLogger(__name__)

@app.route('/health', methods=['GET'])
def health():
    """Health check endpoint"""
    return jsonify({
        'status': 'healthy',
        'service': 'sne-worker',
        'version': '1.0.0'
    }), 200

@app.route('/run-backtest', methods=['POST'])
def run_backtest():
    """
    Run backtest job - stub for now
    Expected payload: { "symbol": "BTCUSDT", "timeframe": "1h", "start_date": "2024-01-01", "end_date": "2024-12-31" }
    """
    try:
        data = request.get_json() or {}
        symbol = data.get('symbol', 'BTCUSDT')
        timeframe = data.get('timeframe', '1h')
        
        logger.info(f"Backtest requested for {symbol} on {timeframe}")
        
        # TODO: Integrate with backtest.py
        # This would typically queue a job or run async
        return jsonify({
            'status': 'ok',
            'job_id': 'backtest_123',
            'symbol': symbol,
            'timeframe': timeframe,
            'message': 'Backtest queued successfully'
        }), 202
        
    except Exception as e:
        logger.error(f"Error in run_backtest: {str(e)}")
        return jsonify({'error': str(e)}), 500



