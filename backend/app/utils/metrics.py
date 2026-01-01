"""
Métricas Prometheus para observabilidade
"""
from prometheus_client import Counter, Histogram

# Métricas de autenticação
login_success = Counter('login_success_total', 'Successful logins', ['tier'])
login_fail = Counter('login_fail_total', 'Failed logins', ['reason'])
verify_fail = Counter('verify_fail_total', 'Token verification failures', ['reason'])

# Métricas Socket.IO
ws_connect = Counter('ws_connect_total', 'WebSocket connections', ['tier'])
ws_reject = Counter('ws_reject_total', 'WebSocket rejections', ['reason'])

# Latência
siwe_duration = Histogram('siwe_duration_seconds', 'SIWE login duration')
tier_check_duration = Histogram('tier_check_duration_seconds', 'Tier check duration')

# Métricas de Dashboard
dashboard_requests = Counter('dashboard_requests_total', 'Total dashboard requests', ['tier', 'cached'])
dashboard_duration = Histogram('dashboard_duration_seconds', 'Dashboard request duration')

# Métricas de Charts
chart_requests = Counter('chart_requests_total', 'Total chart requests', ['tier', 'cached'])
chart_duration = Histogram('chart_duration_seconds', 'Chart request duration')

# Métricas de Analysis
analysis_requests = Counter('analysis_requests_total', 'Total analysis requests', ['tier', 'cached'])
analysis_duration = Histogram('analysis_duration_seconds', 'Analysis request duration')

