import os
import secrets
import time
from dataclasses import dataclass
from flask import current_app

@dataclass
class DownloadToken:
    token: str
    expires_at: int

class DownloadService:
    def __init__(self, redis_client, license_service):
        self.redis = redis_client
        self.license_service = license_service

    def _key(self, token: str) -> str:
        return f"sne:dl:{token}"

    def create_download_token(self, user_address: str, platform: str) -> DownloadToken:
        if platform not in ("win", "mac"):
            raise ValueError("invalid_platform")

        # ✅ verificar licença on-chain (use seu license_service existente)
        # deve retornar True/False ou levantar exceção
        if not self.license_service.check_license(user_address)['valid']:
            raise PermissionError("license_required")

        token = secrets.token_urlsafe(32)
        ttl_seconds = int(current_app.config.get("DOWNLOAD_TOKEN_TTL_SECONDS", 300))
        expires_at = int(time.time()) + ttl_seconds

        payload = f"{user_address}:{platform}"
        self.redis.setex(self._key(token), ttl_seconds, payload)

        return DownloadToken(token=token, expires_at=expires_at)

    def consume_download_token(self, token: str) -> tuple[str, str]:
        """Return (user_address, platform). One-time use: deletes key."""
        key = self._key(token)
        payload = self.redis.get(key)
        if not payload:
            raise PermissionError("invalid_or_expired_token")

        # one-time use
        self.redis.delete(key)

        if isinstance(payload, bytes):
            payload = payload.decode("utf-8")

        user_address, platform = payload.split(":", 1)
        return user_address, platform

    def resolve_file_path(self, platform: str) -> str:
        downloads_dir = current_app.config.get("DOWNLOADS_DIR", "static/downloads")
        filename_map = current_app.config.get("DOWNLOAD_FILENAME_MAP", {
            "win": "SNE_RADAR_DISTRIBUICAO_20251208_175125.zip",
            "mac": "SNE_RADAR_MAC_20251208_175125.zip",
        })
        filename = filename_map.get(platform)
        if not filename:
            raise ValueError("invalid_platform")

        path = os.path.join(current_app.root_path, "..", downloads_dir, filename)
        path = os.path.abspath(path)

        if not os.path.exists(path):
            raise FileNotFoundError("file_not_found")

        return path
