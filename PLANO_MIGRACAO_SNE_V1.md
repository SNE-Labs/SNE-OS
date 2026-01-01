# 🚀 Plano de Migração: Backend SNE V1.0

## 🎯 Objetivo

Migrar do backend Flask simples atual para os **serviços SNE V1.0** que oferecem infraestrutura superior no Google Cloud e funcionalidades muito mais avançadas.

## 📊 Análise Técnica dos Serviços SNE V1.0

### 🏗️ **Arquitetura Atual**

#### **sne-web** (API Principal - Flask + Socket.IO)
```
services/sne-web/
├── app/
│   ├── __init__.py      # Configuração Flask/SocketIO
│   ├── api.py           # Endpoints REST
│   ├── main.py          # Rotas principais + WebSocket
│   └── motor.py         # Interface para motor de análise
├── motor_renan.py       # 🎯 MOTOR REAL DE ANÁLISE
├── analise_candles_detalhada.py
├── calcular_suportes_resistencias.py
├── catalogo_magnetico.py
├── confluencia.py
├── contexto_global.py
├── estrutura_mercado.py
├── fluxo_ativo.py
├── gestao_risco_profissional.py
├── indicadores_avancados.py
├── indicadores.py
├── multi_timeframe.py
├── niveis_operacionais.py
├── padroes_graficos.py
├── relatorio_profissional.py
├── requirements.txt
└── Dockerfile
```

#### **sne-worker** (Jobs em Background)
```
services/sne-worker/
├── app/
│   ├── jobs.py          # Definições de jobs
│   ├── main.py          # API para executar jobs
│   └── __init__.py
├── run_job.py           # CLI para executar jobs
├── requirements.txt
└── Dockerfile
```

### 🔥 **Funcionalidades do Motor Real**

#### **motor_renan.py** - Análise Profissional
```python
def analisar_par(symbol: str, timeframe: str) -> dict:
    # ✅ Análise completa com múltiplos indicadores
    # ✅ Suportes e resistências
    # ✅ Padrões gráficos
    # ✅ Confluência de níveis
    # ✅ Estrutura de mercado
    # ✅ Gestão de risco profissional
    # ✅ Relatório detalhado
    return {
        'status': 'success',
        'score': float,
        'setup': str,
        'probabilidade': float,
        'niveis_operacionais': dict,
        'relatorio': str,
        'timestamp': datetime
    }
```

#### **Indicadores Avançados**
- Bollinger Bands, Stochastic, RSI, MACD
- Suportes/Resistências magnéticas
- Catálogo de padrões gráficos
- Análise multi-timeframe
- Contexto de mercado global

## 🔧 **Plano de Migração**

### **Fase 1: Análise e Preparação**

#### ✅ **1.1 Examinar Código Atual**
```bash
# Examinar estrutura atual
cat services/sne-web/app/__init__.py
cat services/sne-web/app/api.py
cat services/sne-web/motor_renan.py

# Verificar motor de análise
python -c "from services.sne-web.motor_renan import analisar_par; print(analisar_par('BTCUSDT', '1h'))"
```

#### ✅ **1.2 Backup do Backend Atual**
```bash
# Backup completo do backend atual
cp -r backend backend-old
```

### **Fase 2: Integração SIWE + Tier System**

#### **2.1 Criar Módulo de Autenticação**
```python
# services/sne-web/app/auth_siwe.py
from flask import Blueprint, request, jsonify
import jwt
from datetime import datetime, timedelta
import secrets

auth_bp = Blueprint('auth', __name__)

@auth_bp.route('/api/auth/nonce', methods=['POST'])
def get_nonce():
    # ✅ SIWE nonce generation
    # ✅ Rate limiting por wallet
    # ✅ Redis storage

@auth_bp.route('/api/auth/siwe', methods=['POST'])
def siwe_login():
    # ✅ SIWE verification
    # ✅ JWT token generation
    # ✅ Tier assignment

@auth_bp.route('/api/auth/verify', methods=['GET'])
def verify_token():
    # ✅ JWT verification
    # ✅ Return user tier
```

#### **2.2 Sistema de Tier por Redis**
```python
# services/sne-web/app/tier_system.py
TIER_LIMITS = {
    'free': {'analyses': 3, 'requests_per_hour': 100},
    'premium': {'analyses': 50, 'requests_per_hour': 1000},
    'pro': {'analyses': 1000, 'requests_per_hour': 10000}
}

def check_tier_limits(wallet_address: str, tier: str) -> bool:
    # ✅ Rate limiting por tier
    # ✅ Cache no Redis
```

### **Fase 3: Adaptação de Endpoints**

#### **3.1 Dashboard API**
```python
@dashboard_bp.route('/api/dashboard/summary', methods=['GET'])
@require_auth
def dashboard_summary():
    # ✅ Usar contexto_global.py
    # ✅ Top movers via fluxo_ativo.py
    # ✅ Market summary
    # ✅ Tier gating
```

#### **3.2 Charts API**
```python
@charts_bp.route('/api/chart/candles', methods=['GET'])
@require_auth
def get_candles():
    # ✅ Dados de candles (Binance API)
    # ✅ Cache no Redis
    # ✅ Tier limits
```

#### **3.3 Analysis API** (JÁ EXISTE!)
```python
@analysis_bp.route('/api/analyze', methods=['POST'])
@require_auth
def analyze():
    # ✅ USA motor_renan.py REAL!
    # ✅ Análise profissional completa
    # ✅ Tier limits aplicados
    return analisar_par(symbol, timeframe)
```

### **Fase 4: Configuração Google Cloud**

#### **4.1 Terraform (JÁ EXISTE!)**
```bash
# Deploy usando infraestrutura existente
cd infra/terraform
terraform init
terraform plan
terraform apply
```

#### **4.2 Environment Variables**
```bash
# Google Cloud Secrets
GOOGLE_CLOUD_PROJECT=sne-labs
DATABASE_URL=postgresql://...
REDIS_URL=redis://...
JWT_SECRET=...
WALLETCONNECT_PROJECT_ID=...

# SIWE Config
SIWE_DOMAIN=radar.snelabs.space
SIWE_ORIGIN=https://radar.snelabs.space
```

### **Fase 5: Deploy e Teste**

#### **5.1 Build e Deploy**
```bash
# sne-web
docker build -t sne-web ./services/sne-web
gcloud run deploy sne-web --image sne-web --platform managed

# sne-worker
docker build -t sne-worker ./services/sne-worker
gcloud run deploy sne-worker --image sne-worker --platform managed
```

#### **5.2 Configurar CORS**
```python
# app/__init__.py
CORS(app, origins=[
    "https://sneradar.vercel.app",
    "http://localhost:5173"
])
```

#### **5.3 Teste de Integração**
```bash
# Testar endpoints
curl -X POST https://sne-web-url/api/auth/nonce \
  -H "Content-Type: application/json" \
  -d '{"address": "0x123..."}'

curl -X POST https://sne-web-url/api/analyze \
  -H "Authorization: Bearer <jwt>" \
  -H "Content-Type: application/json" \
  -d '{"symbol": "BTCUSDT", "timeframe": "1h"}'
```

## 📋 **Checklist de Migração**

### ✅ **Infraestrutura**
- [x] Terraform para Google Cloud (JÁ EXISTE)
- [x] Docker containers (JÁ EXISTE)
- [x] PostgreSQL + Redis (JÁ EXISTE)

### ✅ **Backend Services**
- [x] sne-web com Flask/SocketIO (JÁ EXISTE)
- [x] sne-worker para jobs (JÁ EXISTE)
- [x] Motor de análise profissional (JÁ EXISTE)

### 🔄 **Integrações Necessárias**
- [ ] SIWE Authentication endpoints
- [ ] Tier system com Redis
- [ ] CORS para Vercel domain
- [ ] JWT tokens
- [ ] Rate limiting por tier
- [ ] Error handling padronizado

### 🚀 **Deploy**
- [ ] Configurar secrets no Google Cloud
- [ ] Deploy sne-web no Cloud Run
- [ ] Deploy sne-worker no Cloud Run
- [ ] Configurar load balancer
- [ ] Teste de integração com frontend

## 🎯 **Benefícios da Migração**

### **Para Usuários**
- ✅ **Análise muito superior** - motor profissional real
- ✅ **Mais indicadores** - 269 linhas de código avançado
- ✅ **Backtesting** - simulação histórica completa
- ✅ **ML Predictions** - machine learning integrado
- ✅ **Alertas em tempo real** - sistema completo
- ✅ **Export profissional** - múltiplos formatos

### **Para Desenvolvimento**
- ✅ **Infra escalável** - Google Cloud auto-scaling
- ✅ **Microserviços** - arquitetura moderna
- ✅ **Background jobs** - processamento assíncrono
- ✅ **Database robusto** - PostgreSQL + Redis
- ✅ **Monitoring** - Google Cloud ops

### **Para Negócio**
- ✅ **Custos otimizados** - pay-per-use no Cloud Run
- ✅ **Alta disponibilidade** - Google Cloud SLA
- ✅ **Escalabilidade** - cresce com demanda
- ✅ **Manutenibilidade** - arquitetura clara

## 🔥 **Próximos Passos Imediatos**

1. **Examinar motor_renan.py** - entender funcionamento
2. **Implementar SIWE auth** - criar endpoints de auth
3. **Configurar tier system** - rate limiting no Redis
4. **Deploy no Google Cloud** - usar Terraform existente
5. **Testar integração** - conectar com frontend React

## 💡 **Conclusão**

A migração para **SNE V1.0** é uma **ótima decisão**:

- **Funcionalidades superiores** em análise técnica
- **Infraestrutura robusta** no Google Cloud
- **Código profissional** já implementado
- **Escalabilidade garantida**

O trabalho principal é integrar SIWE + tier system no código existente, que já tem tudo que precisamos! 🚀

