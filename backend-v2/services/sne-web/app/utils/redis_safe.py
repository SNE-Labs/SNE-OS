"""
Redis wrapper seguro com fallback quando Redis não está disponível
"""

import os
import logging
from typing import Any, Optional

logger = logging.getLogger(__name__)

class SafeRedis:
    """
    Wrapper para Redis que funciona mesmo quando Redis não está disponível.
    Útil para desenvolvimento e quando Redis cai em produção.
    """

    def __init__(self, host: str = 'localhost', port: int = 6379, db: int = 0, **kwargs):
        self.host = host
        self.port = port
        self.db = db
        self.kwargs = kwargs
        self.redis = None
        self.available = False

        self._connect()

    def _connect(self):
        """Tenta conectar ao Redis"""
        try:
            import redis
            self.redis = redis.Redis(
                host=self.host,
                port=self.port,
                db=self.db,
                **self.kwargs
            )
            # Test connection
            self.redis.ping()
            self.available = True
            logger.info(f"Redis connected: {self.host}:{self.port}")
        except Exception as e:
            self.available = False
            logger.warning(f"Redis unavailable ({self.host}:{self.port}): {str(e)}. Using fallback mode.")

    def get(self, key: str) -> Optional[str]:
        """Get com fallback"""
        if not self.available:
            return None
        try:
            return self.redis.get(key)
        except Exception as e:
            logger.warning(f"Redis get error: {str(e)}")
            return None

    def set(self, key: str, value: Any) -> bool:
        """Set com fallback"""
        if not self.available:
            return True  # Success in fallback mode
        try:
            return self.redis.set(key, value)
        except Exception as e:
            logger.warning(f"Redis set error: {str(e)}")
            return False

    def setex(self, key: str, time: int, value: Any) -> bool:
        """Set with expiration com fallback"""
        if not self.available:
            return True  # Success in fallback mode
        try:
            return self.redis.setex(key, time, value)
        except Exception as e:
            logger.warning(f"Redis setex error: {str(e)}")
            return False

    def delete(self, key: str) -> int:
        """Delete com fallback"""
        if not self.available:
            return 1  # Success in fallback mode
        try:
            return self.redis.delete(key)
        except Exception as e:
            logger.warning(f"Redis delete error: {str(e)}")
            return 0

    def incr(self, key: str) -> int:
        """Increment com fallback"""
        if not self.available:
            return 1  # Sempre retorna 1 no fallback
        try:
            return self.redis.incr(key)
        except Exception as e:
            logger.warning(f"Redis incr error: {str(e)}")
            return 1

    def expire(self, key: str, time: int) -> bool:
        """Expire com fallback"""
        if not self.available:
            return True  # Success in fallback mode
        try:
            return self.redis.expire(key, time)
        except Exception as e:
            logger.warning(f"Redis expire error: {str(e)}")
            return False

    def ping(self) -> bool:
        """Test connection"""
        if not self.available:
            return False
        try:
            return self.redis.ping()
        except Exception as e:
            return False
