"""
Redis Safe - Wrapper para Redis com tratamento de erros
"""
import os
import redis
import logging

logger = logging.getLogger(__name__)

class SafeRedis:
    """Wrapper para Redis que não quebra se Redis não estiver disponível"""
    
    def __init__(self, host=None, port=None, db=0, decode_responses=True):
        self.host = host or os.getenv('REDIS_HOST', 'localhost')
        self.port = port or int(os.getenv('REDIS_PORT', 6379))
        self.db = db
        self.decode_responses = decode_responses
        self._client = None
        self._available = False
        
        # Tentar conectar
        self._connect()
    
    def _connect(self):
        """Tenta conectar ao Redis"""
        try:
            self._client = redis.Redis(
                host=self.host,
                port=self.port,
                db=self.db,
                decode_responses=self.decode_responses,
                socket_connect_timeout=1,  # Timeout curto
                socket_timeout=1
            )
            # Testar conexão
            self._client.ping()
            self._available = True
            logger.info(f"Redis conectado em {self.host}:{self.port}")
        except Exception as e:
            self._available = False
            logger.warning(f"Redis não disponível ({self.host}:{self.port}): {e}")
            logger.warning("App funcionará sem cache Redis")
            self._client = None
    
    def get(self, key, default=None):
        """Get com fallback"""
        if not self._available or not self._client:
            return default
        try:
            return self._client.get(key) or default
        except Exception as e:
            logger.warning(f"Erro ao ler do Redis: {e}")
            return default
    
    def setex(self, key, time, value):
        """Setex com tratamento de erro"""
        if not self._available or not self._client:
            return False
        try:
            self._client.setex(key, time, value)
            return True
        except Exception as e:
            logger.warning(f"Erro ao escrever no Redis: {e}")
            return False
    
    def delete(self, key):
        """Delete com tratamento de erro"""
        if not self._available or not self._client:
            return False
        try:
            self._client.delete(key)
            return True
        except Exception as e:
            logger.warning(f"Erro ao deletar do Redis: {e}")
            return False
    
    def incr(self, key):
        """Increment com tratamento de erro"""
        if not self._available or not self._client:
            return 0
        try:
            return self._client.incr(key)
        except Exception as e:
            logger.warning(f"Erro ao incrementar no Redis: {e}")
            return 0
    
    def expire(self, key, time):
        """Expire com tratamento de erro"""
        if not self._available or not self._client:
            return False
        try:
            self._client.expire(key, time)
            return True
        except Exception as e:
            logger.warning(f"Erro ao definir expire no Redis: {e}")
            return False
    
    def is_available(self):
        """Verifica se Redis está disponível"""
        return self._available

