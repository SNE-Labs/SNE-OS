"""
Blueprint de Autenticação - SIWE (Sign-In with Ethereum)
"""
from flask import Blueprint, request, jsonify, session
from datetime import datetime, timedelta
import os
import secrets
import jwt
import redis
from web3 import Web3

from app.services.license_service import LicenseService
from app.security.siwe_verify import verify_siwe, parse_siwe_message

auth_bp = Blueprint('auth', __name__)
license_service = LicenseService()

# Redis para nonces e cache de tier (com fallback seguro)
from app.utils.redis_safe import SafeRedis
redis_client = SafeRedis(
    host=os.getenv('REDIS_HOST', 'localhost'),
    port=int(os.getenv('REDIS_PORT', 6379)),
    db=0,
    decode_responses=True
)

# Configuração do domínio (domain binding)
SIWE_DOMAIN = os.getenv('SIWE_DOMAIN', 'radar.snelabs.space')
SIWE_ORIGIN = os.getenv('SIWE_ORIGIN', 'https://radar.snelabs.space')

@auth_bp.route('/api/auth/nonce', methods=['POST'])
def get_nonce():
    """
    Gerar nonce único para SIWE (single-use, com expiração curta)
    """
    from app.utils.tier_checker import rate_limit_auth
    
    @rate_limit_auth('nonce')
    def _get_nonce():
        data = request.json
        address = data.get('address')
        
        if not address:
            return jsonify({'error': 'Address required'}), 400
        
        # ✅ Rate limit por wallet (evitar spam de nonce)
        wallet_key = f'rate_limit:nonce:wallet:{address.lower()}'
        wallet_count = redis_client.get(wallet_key)
        
        if wallet_count and int(wallet_count) >= 10:  # Máximo 10 nonces/minuto por wallet
            return jsonify({'error': 'Rate limit exceeded for wallet'}), 429
        
        redis_client.incr(wallet_key)
        redis_client.expire(wallet_key, 60)  # Reset a cada minuto
        
        # Gerar nonce aleatório único
        nonce = secrets.token_hex(16)
        
        # Armazenar no Redis com expiração de 5 minutos
        nonce_key = f'siwe:nonce:{nonce}'
        redis_client.setex(
            nonce_key,
            300,  # 5 minutos
            address.lower()
        )
        
        return jsonify({'nonce': nonce})
    
    return _get_nonce()

@auth_bp.route('/api/auth/siwe', methods=['POST'])
def siwe_login():
    """
    Autenticação via SIWE (Sign-In with Ethereum)
    Fluxo: Validar mensagem SIWE → Verificar assinatura (EIP-1271) → checkAccess on-chain → Emitir sessão
    """
    from app.utils.tier_checker import rate_limit_auth
    from app.utils.logging import log_siwe_attempt, get_request_id
    from app.utils.metrics import login_success, login_fail, siwe_duration
    import time
    
    @rate_limit_auth('siwe')
    def _siwe_login():
        request_id = get_request_id()
        start_time = time.time()
        
        data = request.json
        message = data.get('message')
        signature = data.get('signature')
        
        if not message or not signature:
            return jsonify({'error': 'Message and signature required'}), 400
        
        # ✅ Rate limit por wallet (evitar spam de tentativas de login)
        try:
            # Parsear mensagem para obter address (sem validação completa ainda)
            parsed_temp = parse_siwe_message(message)
            wallet_address = parsed_temp.address.lower()
            
            wallet_key = f'rate_limit:siwe:wallet:{wallet_address}'
            wallet_count = redis_client.get(wallet_key)
            
            if wallet_count and int(wallet_count) >= 5:  # Máximo 5 tentativas/minuto por wallet
                return jsonify({'error': 'Rate limit exceeded for wallet'}), 429
            
            redis_client.incr(wallet_key)
            redis_client.expire(wallet_key, 60)  # Reset a cada minuto
        except:
            pass  # Se não conseguir parsear, continua (será validado depois)
        
        try:
            # ✅ 1. Verificar nonce primeiro (antes de parsear tudo)
            # Parsear apenas para obter nonce
            parsed_temp = parse_siwe_message(message)
            nonce_key = f'siwe:nonce:{parsed_temp.nonce}'
            stored_address = redis_client.get(nonce_key)
            
            if not stored_address:
                return jsonify({'error': 'Invalid or expired nonce'}), 401
            
            # ✅ 2. Verificar SIWE completo (domain, uri, nonce, time, signature)
            # Usa verify_siwe que faz todas as validações de uma vez
            w3 = Web3(Web3.HTTPProvider(os.getenv('SCROLL_RPC_URL', 'https://sepolia-rpc.scroll.io')))
            
            address = verify_siwe(
                w3=w3,
                raw_message=message,
                signature=signature,
                expected_domain=SIWE_DOMAIN,
                expected_uri_prefix=SIWE_ORIGIN,
                expected_nonce=parsed_temp.nonce,
                max_age_minutes=5
            )
            
            # ✅ 3. Verificar chainId
            if parsed_temp.chain_id != 534351:  # Scroll Sepolia
                return jsonify({'error': 'Invalid chain ID'}), 401
            
            # ✅ 4. Verificar endereço do nonce
            if address.lower() != stored_address.lower():
                return jsonify({'error': 'Address mismatch'}), 401
            
            # ✅ 5. Invalidar nonce (single-use)
            redis_client.delete(nonce_key)
            
            # ✅ 6. Verificar licença on-chain (eth_call, apenas leitura)
            license_info = license_service.check_license(address)
            
            if not license_info['valid']:
                # Usuário sem licença = tier FREE
                license_info['tier'] = 'free'
            
            # ✅ 7. Cachear tier por 5 minutos (para revalidação rápida)
            tier_cache_key = f'tier:cache:{address.lower()}'
            redis_client.setex(
                tier_cache_key,
                300,  # 5 minutos
                license_info['tier']
            )
            
            # ✅ 8. Gerar JWT token (sessão curta: 1 hora)
            token = jwt.encode({
                'address': address,
                'tier': license_info['tier'],
                'chain_id': parsed_temp.chain_id,
                'exp': datetime.utcnow() + timedelta(hours=1),  # Sessão curta
                'iat': datetime.utcnow()
            }, os.getenv('SECRET_KEY'), algorithm='HS256')
            
            # ✅ 9. Criar sessão (opcional, para cookies)
            session['address'] = address
            session['tier'] = license_info['tier']
            session['chain_id'] = parsed_temp.chain_id
            
            # ✅ 13. Setar cookie HttpOnly (source of truth)
            response = jsonify({
                'success': True,
                'token': token,  # Opcional: manter para compatibilidade
                'license': license_info
            })
            
            # ✅ Cookie flags completos (hardening)
            # Determinar SameSite baseado em domínios
            frontend_domain = os.getenv('FRONTEND_DOMAIN', 'radar.snelabs.space')
            api_domain = os.getenv('API_DOMAIN', 'api.radar.snelabs.space')
            
            # Se mesmo domínio base, usar Lax; se diferentes, usar None
            same_site = 'Lax' if frontend_domain.split('.')[-2:] == api_domain.split('.')[-2:] else 'None'
            
            response.set_cookie(
                'sne_token',
                token,
                httponly=True,           # ✅ HttpOnly (não acessível via JS)
                secure=True,             # ✅ Secure=True (sempre em prod - HTTPS only)
                samesite=same_site,      # ✅ Lax (mesmo domínio) ou None (cross-site)
                path='/',                # ✅ Path=/ (disponível em todo o domínio)
                domain='.snelabs.space', # ✅ Domain=.snelabs.space (compartilhar subdomínios)
                max_age=3600             # 1 hora
            )
            
            # ✅ Logging e métricas
            duration = time.time() - start_time
            log_siwe_attempt(address, success=True, tier=license_info['tier'])
            login_success.labels(tier=license_info['tier']).inc()
            siwe_duration.observe(duration)
            
            return response
            
        except Exception as e:
            duration = time.time() - start_time
            # Tentar obter address do erro ou da mensagem parseada
            try:
                parsed_error = parse_siwe_message(message)
                address = parsed_error.address
            except:
                address = 'unknown'
            
            log_siwe_attempt(address, success=False, error=str(e))
            login_fail.labels(reason='exception').inc()
            siwe_duration.observe(duration)
            return jsonify({'error': f'SIWE validation failed: {str(e)}'}), 401
    
    return _siwe_login()

@auth_bp.route('/api/auth/verify', methods=['GET'])
def verify_token():
    """
    Verificar token JWT e revalidar tier (com cache)
    Recheck: Cache de 5 minutos, depois revalida on-chain
    
    Retorna: { valid, address, tier, cached }
    """
    from app.utils.logging import log_verify_fail, log_tier_check, get_request_id
    from app.utils.metrics import verify_fail, tier_check_duration
    import time
    
    request_id = get_request_id()
    start_time = time.time()
    
    # Buscar token do cookie (HttpOnly) ou header Authorization
    token = request.cookies.get('sne_token') or request.headers.get('Authorization', '').replace('Bearer ', '')
    
    if not token:
        log_verify_fail('unknown', 'No token provided')
        verify_fail.labels(reason='no_token').inc()
        return jsonify({'error': 'No token provided'}), 401
    
    try:
        payload = jwt.decode(token, os.getenv('SECRET_KEY'), algorithms=['HS256'])
        
        address = payload.get('address')
        
        # Verificar cache de tier (5 minutos)
        tier_cache_key = f'tier:cache:{address.lower()}'
        cached_tier_redis = redis_client.get(tier_cache_key)
        
        if cached_tier_redis:
            # Usar tier do cache
            tier = cached_tier_redis
            cached = True
            source = 'cache'
        else:
            # Revalidar on-chain (recheck)
            license_info = license_service.check_license(address)
            
            if not license_info['valid']:
                tier = 'free'
            else:
                tier = license_info['tier']
            
            # Atualizar cache
            redis_client.setex(tier_cache_key, 300, tier)
            cached = False
            source = 'on-chain'
        
        # ✅ Logging estruturado
        duration = time.time() - start_time
        log_tier_check(address, tier, cached, source)
        tier_check_duration.observe(duration)
        
        return jsonify({
            'valid': True,
            'address': address,
            'tier': tier,  # ✅ Padronizado: tier top-level
            'cached': cached
        })
    except jwt.ExpiredSignatureError:
        log_verify_fail('unknown', 'Token expired')
        verify_fail.labels(reason='expired').inc()
        return jsonify({'error': 'Token expired'}), 401
    except jwt.InvalidTokenError:
        log_verify_fail('unknown', 'Invalid token')
        verify_fail.labels(reason='invalid').inc()
        return jsonify({'error': 'Invalid token'}), 401

@auth_bp.route('/api/auth/logout', methods=['POST'])
def logout():
    """Logout - limpar sessão e cookie"""
    response = jsonify({'success': True})
    response.set_cookie('sne_token', '', expires=0)
    session.clear()
    return response

# ============================================
# SNE OS - Endpoints de Sessão e Entitlements
# ============================================

@auth_bp.route('/api/session', methods=['GET'])
def get_session():
    """
    Retornar informações da sessão atual
    Usado pelo SNE OS para reidratar sessão no refresh da página
    """
    address = session.get('address')
    if not address:
        return jsonify({'user': None}), 200

    return jsonify({
        'user': address,
        'tier': session.get('tier', 'free'),
        'chain_id': session.get('chain_id')
    }), 200

@auth_bp.route('/api/entitlements', methods=['GET'])
def get_entitlements():
    """
    Retornar entitlements baseados na sessão
    Usado pelo SNE OS para controle de acesso e gating
    """
    address = session.get('address')
    if not address:
        # Usuário não logado - acesso limitado
        return jsonify({
            'user': None,
            'tier': 'free',
            'features': ['vault.preview', 'pass.preview', 'radar.preview'],
            'limits': {
                'watchlist': 3,
                'signals_per_day': 5,
                'vault_items': 1
            },
            'expiresAt': None
        }), 200

    # Usuário logado - verificar tier atual
    tier = session.get('tier', 'free')

    # Mapeamento de features por tier
    tier_features = {
        'free': [
            'vault.preview', 'pass.preview', 'radar.preview',
            'vault.basic', 'pass.basic'
        ],
        'premium': [
            'vault.preview', 'pass.preview', 'radar.preview',
            'vault.access', 'pass.access', 'radar.basic',
            'vault.checkout', 'pass.spy'
        ],
        'pro': [
            'vault.preview', 'pass.preview', 'radar.preview',
            'vault.access', 'pass.access', 'radar.access',
            'vault.checkout', 'pass.spy', 'radar.trade',
            'ws.realtime', 'api.full'
        ]
    }

    # Limites por tier
    tier_limits = {
        'free': {
            'watchlist': 3,
            'signals_per_day': 10,
            'vault_items': 2,
            'api_calls_per_hour': 50
        },
        'premium': {
            'watchlist': 10,
            'signals_per_day': 100,
            'vault_items': 10,
            'api_calls_per_hour': 500
        },
        'pro': {
            'watchlist': float('inf'),  # ilimitado
            'signals_per_day': 1000,
            'vault_items': float('inf'),
            'api_calls_per_hour': 5000
        }
    }

    # Calcular expiração (30 dias a partir de agora para tiers pagos)
    expires_at = None
    if tier in ['premium', 'pro']:
        from datetime import datetime, timedelta
        expires_at = (datetime.utcnow() + timedelta(days=30)).isoformat() + 'Z'

    return jsonify({
        'user': address,
        'tier': tier,
        'features': tier_features.get(tier, tier_features['free']),
        'limits': tier_limits.get(tier, tier_limits['free']),
        'expiresAt': expires_at
    }), 200

