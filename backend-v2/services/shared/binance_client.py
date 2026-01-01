"""
Cliente Binance compartilhado para serviços SNE
"""

import os
import logging
from typing import Optional
from binance.client import Client
from google.cloud import secretmanager

logger = logging.getLogger(__name__)

def get_binance_client(api_key: Optional[str] = None, secret_key: Optional[str] = None) -> Client:
    """
    Obtém cliente Binance configurado
    
    Args:
        api_key: API key (opcional, tenta obter do Secret Manager)
        secret_key: Secret key (opcional, tenta obter do Secret Manager)
    
    Returns:
        Client: Cliente Binance configurado
    """
    project_id = os.getenv('GOOGLE_CLOUD_PROJECT', 'sne-v1')
    
    # Se não fornecido, tentar obter do Secret Manager
    if not api_key or not secret_key:
        try:
            client = secretmanager.SecretManagerServiceClient()
            
            if not api_key:
                try:
                    api_key = client.access_secret_version(
                        name=f"projects/{project_id}/secrets/sne-binance-api-key/versions/latest"
                    ).payload.data.decode('UTF-8')
                    logger.info("✅ Binance API Key obtida do Secret Manager")
                except Exception as e:
                    logger.warning(f"⚠️ Não foi possível obter Binance API Key: {e}")
            
            if not secret_key:
                try:
                    secret_key = client.access_secret_version(
                        name=f"projects/{project_id}/secrets/sne-binance-secret-key/versions/latest"
                    ).payload.data.decode('UTF-8')
                    logger.info("✅ Binance Secret Key obtida do Secret Manager")
                except Exception as e:
                    logger.warning(f"⚠️ Não foi possível obter Binance Secret Key: {e}")
        except Exception as e:
            logger.warning(f"⚠️ Erro ao acessar Secret Manager: {e}")
    
    # Se ainda não tiver, criar cliente sem autenticação (apenas leitura pública)
    if not api_key or not secret_key:
        logger.info("🔄 Criando cliente Binance sem autenticação (apenas leitura)")
        return Client()
    
    # Criar cliente autenticado
    try:
        return Client(api_key, secret_key)
    except Exception as e:
        logger.error(f"❌ Erro ao criar cliente Binance: {e}")
        # Fallback: cliente sem autenticação
        return Client()



