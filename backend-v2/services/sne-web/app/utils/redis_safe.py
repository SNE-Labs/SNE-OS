"""
Redis wrapper seguro com fallback quando Redis não está disponível
Suporta tanto TCP Redis quanto REST API (Upstash)
"""

import os
import logging
from typing import Any, Optional
import redis
import requests
import urllib.parse

logger = logging.getLogger(__name__)

class UpstashRedis:
    """Upstash Redis REST API client - Correct URL format"""

    def __init__(self, url: str, token: str):
        self.url = url.rstrip('/')
        self.headers = {"Authorization": f"Bearer {token}"}
        self.available = True

    def _get(self, path: str):
        """Internal GET request helper"""
        if not self.available:
            return None
        try:
            r = requests.get(f"{self.url}/{path}", headers=self.headers, timeout=5)
            if r.status_code == 200:
                return r.json().get("result")
            logger.warning(f"Upstash {path} -> {r.status_code}: {r.text[:200]}")
            return None
        except Exception as e:
            logger.warning(f"Upstash request error: {e}")
            self.available = False
            return None

    def ping(self) -> bool:
        """Test connection"""
        return self._get("ping") == "PONG"

    def get(self, key: str) -> Optional[str]:
        """Get value - Upstash format: /get/key"""
        key = urllib.parse.quote(key, safe="")
        return self._get(f"get/{key}")

    def setex(self, key: str, time: int, value: Any) -> bool:
        """Set with expiration - Upstash format: /setex/key/seconds/value"""
        key = urllib.parse.quote(key, safe="")
        val = urllib.parse.quote(str(value), safe="")
        res = self._get(f"setex/{key}/{int(time)}/{val}")
        return res == "OK"

    def delete(self, key: str) -> int:
        """Delete key - Upstash format: /del/key"""
        key = urllib.parse.quote(key, safe="")
        res = self._get(f"del/{key}")
        try:
            return int(res or 0)
        except:
            return 0

    def incr(self, key: str) -> int:
        """Increment counter - Upstash format: /incr/key"""
        key = urllib.parse.quote(key, safe="")
        res = self._get(f"incr/{key}")
        return int(res or 1)

    def expire(self, key: str, time: int) -> bool:
        """Set expiration - Upstash format: /expire/key/seconds"""
        key = urllib.parse.quote(key, safe="")
        res = self._get(f"expire/{key}/{int(time)}")
        return res == 1 or res is True

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
        upstash_url = os.getenv('REDIS_REST_URL') or os.getenv('UPSTASH_REDIS_REST_URL')
        upstash_token = os.getenv('REDIS_REST_TOKEN') or os.getenv('UPSTASH_REDIS_REST_TOKEN')

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
