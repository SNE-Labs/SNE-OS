from flask import Blueprint, request, jsonify, send_file, current_app
from werkzeug.exceptions import BadRequest

bp = Blueprint("download", __name__)

# ✅ substitua pelos imports reais do seu projeto
# from app.api.auth_siwe import require_auth  # ou equivalente
# from app.extensions import redis
# from app.services.license_service import LicenseService
# from app.services.download_service import DownloadService

@bp.post("/api/download-token")
def create_download_token():
    data = request.get_json(silent=True) or {}
    platform = data.get("platform")
    if not platform:
        raise BadRequest("platform is required")

    # ✅ usar autenticação real (igual aos outros endpoints)
    from app.utils.logging import get_request_id
    from app.utils.tier_checker import rate_limit_auth

    @rate_limit_auth('download')
    def _create_token():
        # Pegar user do JWT (igual aos outros endpoints)
        from app.api.auth import verify_token
        # Simular chamada para verificar token
        token = request.cookies.get('sne_token') or request.headers.get('Authorization', '').replace('Bearer ', '')

        if not token:
            return jsonify({"error": "No token provided"}), 401

        try:
            import jwt
            payload = jwt.decode(token, current_app.config['SECRET_KEY'], algorithms=['HS256'])
            user_address = payload.get('address')

            if not user_address:
                return jsonify({"error": "Invalid token"}), 401

        except:
            return jsonify({"error": "Invalid token"}), 401

        # Rate limit adicional por usuário
        import time
        rate_key = f"download:user:{user_address}"
        last_download = bp.download_service.redis.get(rate_key)

        if last_download:
            time_since_last = time.time() - float(last_download)
            if time_since_last < 60:  # 1 download por minuto
                return jsonify({"error": "Rate limit exceeded"}), 429

        try:
            token_obj = bp.download_service.create_download_token(user_address, platform)

            # Registrar download para rate limiting
            bp.download_service.redis.setex(rate_key, 60, str(time.time()))

            return jsonify({"token": token_obj.token, "expiresAt": token_obj.expires_at})
        except ValueError:
            return jsonify({"error": "invalid_platform"}), 400
        except PermissionError as e:
            return jsonify({"error": str(e)}), 403

    return _create_token()

    try:
        token_obj = bp.download_service.create_download_token(user_address, platform)
        return jsonify({"token": token_obj.token, "expiresAt": token_obj.expires_at})
    except ValueError:
        return jsonify({"error": "invalid_platform"}), 400
    except PermissionError as e:
        return jsonify({"error": str(e)}), 403

@bp.get("/api/download/<token>")
def download_by_token(token: str):
    try:
        user_address, platform = bp.download_service.consume_download_token(token)
        file_path = bp.download_service.resolve_file_path(platform)

        # Serve como attachment (download)
        return send_file(
            file_path,
            as_attachment=True,
            download_name=file_path.split("/")[-1],
            mimetype="application/zip",
            conditional=True,
            max_age=0,
        )
    except PermissionError:
        return jsonify({"error": "invalid_or_expired_token"}), 403
    except FileNotFoundError:
        return jsonify({"error": "file_not_found"}), 404
