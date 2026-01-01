"""
Socket.IO Handlers - Gerenciamento de conexões WebSocket
"""
from flask_socketio import SocketIO, emit, join_room, leave_room
from flask import request
import jwt
import os
import time
from threading import Timer

# ✅ Storage de usuários por sid (Socket.IO session ID)
# g.user não é confiável entre eventos no Socket.IO
# ⚠️ TTL para evitar acumulação em edge cases
# ⚠️ Se rodar múltiplas instâncias, migrar para Redis
user_sessions = {}  # {sid: {'address': str, 'tier': str, 'created_at': float}}

def cleanup_user_session(sid: str, ttl: int = 3600):
    """Limpar sessão após TTL (30-60 min)"""
    if sid in user_sessions:
        user_sessions.pop(sid, None)

def set_user_session(sid: str, address: str, tier: str, ttl: int = 3600):
    """Armazenar sessão com TTL"""
    user_sessions[sid] = {
        'address': address,
        'tier': tier,
        'created_at': time.time()
    }
    
    # Agendar limpeza após TTL
    timer = Timer(ttl, cleanup_user_session, args=[sid, ttl])
    timer.daemon = True
    timer.start()

# Socket.IO com CORS configurado para cookies
# ⚠️ NÃO usar wildcard com credentials=True (browser rejeita)
# Allowlist explícita ou validação dinâmica
def get_allowed_origins():
    """Retorna origens permitidas (allowlist explícita)"""
    import re
    
    # Domínio de produção
    allowed = ["https://radar.snelabs.space"]
    
    # Em desenvolvimento, permitir localhost
    if os.getenv('FLASK_ENV') == 'development':
        allowed.extend([
            'http://localhost:5173',
            'http://127.0.0.1:5173'
        ])
    
    # Durante preview, validar Origin dinamicamente (se houver request context)
    try:
        from flask import request as flask_request
        origin = flask_request.headers.get('Origin')
        
        if origin:
            # Padrão Vercel preview: https://sne-radar-*.vercel.app
            vercel_preview_pattern = re.compile(
                r'^https://sne-radar-[a-z0-9-]+\.vercel\.app$'
            )
            
            if vercel_preview_pattern.match(origin):
                allowed.append(origin)
    except RuntimeError:
        # Fora de request context (normal durante importação)
        pass
    
    return allowed

socketio = SocketIO(
    cors_allowed_origins=get_allowed_origins(),  # Lista padrão (sem request context)
    cors_credentials=True  # Permite cookies
)

@socketio.on('connect')
def handle_connect(auth):
    """
    Autenticação no handshake Socket.IO
    
    ✅ Aceita cookie HttpOnly (default) OU auth.token (fallback opcional para debug)
    ✅ Armazena user por sid (não usa g.user - não é persistente)
    """
    from flask import request as flask_request
    from flask_socketio import request as socketio_request
    from app.utils.logging import log_ws_connect
    from app.utils.metrics import ws_connect, ws_reject
    
    # 1. Tentar ler do cookie HttpOnly (default - frontend não tem acesso ao token)
    # Socket.IO envia cookies automaticamente no handshake
    token = flask_request.cookies.get('sne_token')
    
    # 2. Fallback: auth.token (opcional, para debug/testes)
    if not token and auth:
        token = auth.get('token')
    
    if not token:
        log_ws_connect('unknown', 'unknown', 'unknown', success=False)
        ws_reject.labels(reason='no_token').inc()
        return False
    
    try:
        payload = jwt.decode(token, os.getenv('SECRET_KEY'), algorithms=['HS256'])
        
        # ✅ Armazenar por sid (Socket.IO session ID)
        # g.user não é confiável entre eventos
        sid = socketio_request.sid
        address = payload.get('address')
        tier = payload.get('tier', 'free')
        
        set_user_session(
            sid,
            address,
            tier,
            ttl=3600  # 1 hora (ajustar conforme necessário)
        )
        
        # ✅ Logging estruturado
        log_ws_connect(sid, address, tier, success=True)
        ws_connect.labels(tier=tier).inc()
        
        return True
    except Exception as e:
        # ✅ Logging de falha
        log_ws_connect('unknown', 'unknown', 'unknown', success=False)
        ws_reject.labels(reason='auth_failed').inc()
        return False

@socketio.on('disconnect')
def handle_disconnect():
    """Limpar sessão ao desconectar"""
    from flask_socketio import request
    sid = request.sid
    user_sessions.pop(sid, None)

@socketio.on('join_dashboard')
def handle_join_dashboard():
    """Join rooms do dashboard baseado no tier"""
    # ✅ Ler de user_sessions por sid (não g.user)
    from flask_socketio import request
    sid = request.sid
    user = user_sessions.get(sid)
    
    if not user:
        emit('error', {'message': 'Not authenticated'})
        return False
    
    tier = user['tier']
    
    # Todos podem ver market summary
    join_room('market:summary')
    
    if tier in ['premium', 'pro']:
        join_room('movers:top')
        join_room(f'watchlist:{user["address"]}')
    
    emit('joined', {'rooms': ['market:summary']})

@socketio.on('join_chart')
def handle_join_chart(data):
    """Join rooms de chart"""
    # ✅ Ler de user_sessions por sid (não g.user)
    from flask_socketio import request
    sid = request.sid
    user = user_sessions.get(sid)
    
    if not user:
        emit('error', {'message': 'Not authenticated'})
        return False
    
    symbol = data.get('symbol')
    tf = data.get('timeframe')
    tier = user['tier']
    
    # Verificar limites por tier
    if tier == 'free':
        # Free: apenas 1 símbolo
        # TODO: Implementar get_user_active_charts
        # if len(get_user_active_charts(user['address'])) >= 1:
        #     emit('error', {'message': 'Limit: 1 chart at a time'})
        #     return
        pass  # Por enquanto, permite (implementar limite depois)
    
    join_room(f'kline:{symbol}:{tf}')
    
    if tier == 'pro':
        join_room(f'dom:{symbol}')
        join_room(f'ind:{symbol}:{tf}')

