"""
Conexão com banco de dados compartilhada para serviços SNE
"""

import os
import logging
import psycopg2
from psycopg2.extras import RealDictCursor
from typing import Optional

logger = logging.getLogger(__name__)

def get_db_connection(database_url: Optional[str] = None):
    """
    Obtém conexão PostgreSQL
    
    Args:
        database_url: URL do banco (opcional, usa DATABASE_URL do env)
    
    Returns:
        psycopg2.connection: Conexão com o banco de dados
    """
    if not database_url:
        database_url = os.getenv('DATABASE_URL')
    
    if not database_url:
        raise ValueError("DATABASE_URL não configurado. Configure a variável de ambiente DATABASE_URL")
    
    try:
        conn = psycopg2.connect(database_url, cursor_factory=RealDictCursor)
        logger.info("✅ Conexão com banco de dados estabelecida")
        return conn
    except Exception as e:
        logger.error(f"❌ Erro ao conectar ao banco de dados: {e}")
        raise



