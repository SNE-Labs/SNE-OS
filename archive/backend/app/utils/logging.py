"""
Logging estruturado e observabilidade
"""
import logging
import json
import uuid
from flask import request, g

# Configurar logging estruturado
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s [%(levelname)s] %(name)s: %(message)s'
)

def get_request_id():
    """Gerar ou obter request_id (para rastreamento)"""
    if not hasattr(g, 'request_id'):
        g.request_id = str(uuid.uuid4())
    return g.request_id

def log_siwe_attempt(address: str, success: bool, error: str = None, tier: str = None):
    """Log estruturado de tentativa SIWE"""
    log_data = {
        'event': 'siwe_attempt',
        'request_id': get_request_id(),
        'address': address,
        'success': success,
        'error': error,
        'tier': tier,
        'origin': request.headers.get('Origin'),
        'ip': request.remote_addr
    }
    logging.info(json.dumps(log_data))

def log_tier_check(address: str, tier: str, cached: bool, source: str):
    """Log de verificação de tier"""
    log_data = {
        'event': 'tier_check',
        'request_id': get_request_id(),
        'address': address,
        'tier': tier,
        'cached': cached,
        'source': source,  # 'on-chain' ou 'cache'
        'origin': request.headers.get('Origin')
    }
    logging.info(json.dumps(log_data))

def log_ws_connect(sid: str, address: str, tier: str, success: bool):
    """Log de conexão Socket.IO"""
    log_data = {
        'event': 'ws_connect' if success else 'ws_reject',
        'sid': sid,
        'address': address,
        'tier': tier,
        'success': success
    }
    logging.info(json.dumps(log_data))

def log_verify_fail(address: str, reason: str):
    """Log de falha na verificação"""
    log_data = {
        'event': 'verify_fail',
        'request_id': get_request_id(),
        'address': address,
        'reason': reason,
        'origin': request.headers.get('Origin')
    }
    logging.warning(json.dumps(log_data))

