"""
Redis wrapper seguro com fallback quando Redis não está disponível
Suporta tanto TCP Redis quanto REST API (Upstash)
"""

import os
import logging
from typing import Any, Optional
import redis
import requests

logger = logging.getLogger(__name__)

class UpstashRedis:
    """Upstash Redis REST API client"""

    def __init__(self, url: str, token: str):
        self.url = url.rstrip('/')
        self.token = token
        self.headers = {'Authorization': f'Bearer {token}'}
        self.available = True

    def ping(self) -> bool:
        """Test connection"""
        try:
            response = requests.get(f'{self.url}/ping', headers=self.headers, timeout=5)
            return response.status_code == 200
        except Exception as e:
            logger.warning(f"Upstash ping error: {str(e)}")
            self.available = False
            return False

    def get(self, key: str) -> Optional[str]:
        """Get value"""
        if not self.available:
            return None
        try:
            response = requests.get(f'{self.url}/get/{key}', headers=self.headers, timeout=5)
            if response.status_code == 200:
                data = response.json()
                return data.get('result')
            return None
        except Exception as e:
            logger.warning(f"Upstash get error: {str(e)}")
            return None

    def setex(self, key: str, time: int, value: Any) -> bool:
        """Set with expiration"""
        if not self.available:
            return True
        try:
            response = requests.post(
                f'{self.url}/setex/{key}',
                json={'value': str(value), 'ex': time},
                headers=self.headers,
                timeout=5
            )
            return response.status_code == 200
        except Exception as e:
            logger.warning(f"Upstash setex error: {str(e)}")
            return False

    def delete(self, key: str) -> int:
        """Delete key"""
        if not self.available:
            return 1
        try:
            response = requests.delete(f'{self.url}/del/{key}', headers=self.headers, timeout=5)
            return 1 if response.status_code == 200 else 0
        except Exception as e:
            logger.warning(f"Upstash delete error: {str(e)}")
            return 0

    def incr(self, key: str) -> int:
        """Increment counter"""
        if not self.available:
            return 1
        try:
            response = requests.post(f'{self.url}/incr/{key}', headers=self.headers, timeout=5)
            if response.status_code == 200:
                data = response.json()
                return data.get('result', 1)
            return 1
        except Exception as e:
            logger.warning(f"Upstash incr error: {str(e)}")
            return 1

    def expire(self, key: str, time: int) -> bool:
        """Set expiration"""
        if not self.available:
            return True
        try:
            response = requests.post(
                f'{self.url}/expire/{key}',
                json={'ex': time},
                headers=self.headers,
                timeout=5
            )
            return response.status_code == 200
        except Exception as e:
            logger.warning(f"Upstash expire error: {str(e)}")
            return False

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
        self.upstash = None
        self.available = False
        self.use_upstash = False

        self._connect()

    def _connect(self):
        """Tenta conectar ao Redis (Upstash REST ou TCP)"""
        # Primeiro tenta Upstash REST API
        upstash_url = os.getenv('REDIS_REST_URL')
        upstash_token = os.getenv('REDIS_REST_TOKEN')

        if upstash_url and upstash_token:
            try:
                self.upstash = UpstashRedis(upstash_url, upstash_token)
                if self.upstash.ping():
                    self.available = True
                    self.use_upstash = True
                    logger.info(f"Upstash Redis connected: {upstash_url}")
                    return
            except Exception as e:
                logger.warning(f"Upstash connection failed: {str(e)}")

        # Se Upstash falhou, tenta TCP Redis
        try:
            import redis
            # Suporte a REDIS_URL do ambiente
            redis_url = os.getenv('REDIS_URL')
            if redis_url:
                self.redis = redis.from_url(redis_url)
            else:
                self.redis = redis.Redis(
                    host=self.host,
                    port=self.port,
                    db=self.db,
                    **self.kwargs
                )
            # Test connection
            self.redis.ping()
            self.available = True
            self.use_upstash = False
            logger.info(f"TCP Redis connected: {redis_url or f'{self.host}:{self.port}'}")
        except Exception as e:
            self.available = False
            logger.warning(f"Redis unavailable ({self.host}:{self.port}): {str(e)}. Using fallback mode.")

    def get(self, key: str) -> Optional[str]:
        """Get com fallback"""
        if not self.available:
            return None
        try:
            if self.use_upstash:
                return self.upstash.get(key)
            else:
                return self.redis.get(key)
        except Exception as e:
            logger.warning(f"Redis get error: {str(e)}")
            return None

    def set(self, key: str, value: Any) -> bool:
        """Set com fallback"""
        if not self.available:
            return True  # Success in fallback mode
        try:
            if self.use_upstash:
                return self.upstash.setex(key, 0, value)  # Upstash não tem set sem expiração
            else:
                return self.redis.set(key, value)
        except Exception as e:
            logger.warning(f"Redis set error: {str(e)}")
            return False

    def setex(self, key: str, time: int, value: Any) -> bool:
        """Set with expiration com fallback"""
        if not self.available:
            return True  # Success in fallback mode
        try:
            if self.use_upstash:
                return self.upstash.setex(key, time, value)
            else:
                return self.redis.setex(key, time, value)
        except Exception as e:
            logger.warning(f"Redis setex error: {str(e)}")
            return False

    def delete(self, key: str) -> int:
        """Delete com fallback"""
        if not self.available:
            return 1  # Success in fallback mode
        try:
            if self.use_upstash:
                return self.upstash.delete(key)
            else:
                return self.redis.delete(key)
        except Exception as e:
            logger.warning(f"Redis delete error: {str(e)}")
            return 0

    def incr(self, key: str) -> int:
        """Increment com fallback"""
        if not self.available:
            return 1  # Sempre retorna 1 no fallback
        try:
            if self.use_upstash:
                return self.upstash.incr(key)
            else:
                return self.redis.incr(key)
        except Exception as e:
            logger.warning(f"Redis incr error: {str(e)}")
            return 1

    def expire(self, key: str, time: int) -> bool:
        """Expire com fallback"""
        if not self.available:
            return True  # Success in fallback mode
        try:
            if self.use_upstash:
                return self.upstash.expire(key, time)
            else:
                return self.redis.expire(key, time)
        except Exception as e:
            logger.warning(f"Redis expire error: {str(e)}")
            return False

    def ping(self) -> bool:
        """Test connection"""
        if not self.available:
            return False
        try:
            if self.use_upstash:
                return self.upstash.ping()
            else:
                return self.redis.ping()
        except Exception as e:
            return False
