"""
Main application routes for SNE Auto
"""
from flask import jsonify, request
from . import app, scanner
import logging

logger = logging.getLogger(__name__)

@app.route('/health', methods=['GET'])
def health():
    """Health check endpoint"""
    return jsonify({
        'status': 'healthy',
        'service': 'sne-auto',
        'version': '1.0.0'
    }), 200

@app.route('/run-scan', methods=['POST'])
def run_scan():
    """
    Run automated scan - triggered by Cloud Scheduler
    Expected payload (optional): { "pairs": ["BTCUSDT", "ETHUSDT"], "timeframes": ["15m", "1h"] }
    """
    try:
        data = request.get_json() or {}
        pairs = data.get('pairs', ['BTCUSDT', 'ETHUSDT', 'SOLUSDT'])
        timeframes = data.get('timeframes', ['15m', '1h'])
        
        logger.info(f"Scan requested for pairs: {pairs}, timeframes: {timeframes}")
        
        # Run scan
        results = scanner.scan_pairs(pairs, timeframes)
        
        return jsonify({
            'status': 'ok',
            'scanned_pairs': len(pairs),
            'results': results,
            'timestamp': scanner.get_current_timestamp()
        }), 200
        
    except Exception as e:
        logger.error(f"Error in run_scan: {str(e)}")
        return jsonify({'error': str(e)}), 500



