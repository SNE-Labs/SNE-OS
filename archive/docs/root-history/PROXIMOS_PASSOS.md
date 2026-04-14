# 🚀 Próximos Passos - SNE Radar

## 📊 Status Atual

### ✅ Concluído
- ✅ Estrutura base do projeto (frontend + backend)
- ✅ Dependências instaladas (frontend e backend)
- ✅ SIWE manual implementado (sem dependência do pacote `siwe`)
- ✅ Autenticação completa (nonce, siwe, verify, logout)
- ✅ LicenseService com verificação on-chain
- ✅ Socket.IO handlers básicos
- ✅ Logging e métricas estruturadas

### 🚧 Pendente
- ⏭️ Configuração de ambiente (.env)
- ⏭️ Banco de dados (PostgreSQL + migrations)
- ⏭️ APIs de dados (Dashboard, Chart, Analysis)
- ⏭️ Frontend completo (componentes, gráficos, integração)
- ⏭️ Testes e validação

---

## 🎯 Plano de Ação (Priorizado)

### **FASE 1: Configuração e Infraestrutura** (Prioridade ALTA)

#### 1.1. Configurar Variáveis de Ambiente
**Arquivo:** `backend/.env`

```bash
# Backend
SECRET_KEY=your-secret-key-here
SCROLL_RPC_URL=https://sepolia-rpc.scroll.io
LICENSE_CONTRACT_ADDRESS=0x...  # Endereço do contrato SNELicenseRegistry
REDIS_HOST=localhost
REDIS_PORT=6379
DATABASE_URL=postgresql://user:pass@localhost:5432/sne_radar
SIWE_DOMAIN=radar.snelabs.space
SIWE_ORIGIN=https://radar.snelabs.space

# Frontend
VITE_WALLETCONNECT_PROJECT_ID=your-project-id
VITE_API_URL=http://localhost:8080
VITE_SIWE_DOMAIN=radar.snelabs.space
VITE_SIWE_ORIGIN=https://radar.snelabs.space
```

**Ações:**
- [ ] Criar `backend/.env.example` com todas as variáveis
- [ ] Criar `frontend/.env.example` com todas as variáveis
- [ ] Documentar como obter cada valor

#### 1.2. Adicionar ABI do Contrato
**Arquivo:** `contracts/SNELicenseRegistry.abi.json`

**Ações:**
- [ ] Obter ABI do contrato deployado no Scroll Sepolia
- [ ] Salvar em `contracts/SNELicenseRegistry.abi.json`
- [ ] Validar que o arquivo está sendo carregado corretamente

#### 1.3. Configurar Banco de Dados
**Arquivo:** `backend/app/__init__.py` ou `backend/main.py`

**Ações:**
- [ ] Instalar PostgreSQL local ou configurar Cloud SQL
- [ ] Criar database `sne_radar`
- [ ] Configurar SQLAlchemy com `DATABASE_URL`
- [ ] Criar migration inicial (Alembic)
- [ ] Criar tabela `user_tiers`

**Comandos:**
```bash
cd backend
venv\Scripts\activate
alembic init migrations
alembic revision --autogenerate -m "Initial migration"
alembic upgrade head
```

#### 1.4. Configurar Redis
**Ações:**
- [ ] Instalar Redis local ou configurar Cloud Memorystore
- [ ] Testar conexão: `redis-cli ping`
- [ ] Validar que nonces e cache estão funcionando

---

### **FASE 2: Backend - APIs de Dados** (Prioridade ALTA)

#### 2.1. Blueprint `/api/dashboard`
**Arquivo:** `backend/app/api/dashboard.py`

**Endpoints:**
- `GET /api/dashboard/summary` - Resumo geral (Free)
- `GET /api/dashboard/markets` - Lista de mercados (Free)
- `GET /api/dashboard/watchlist` - Watchlist do usuário (Premium/Pro)

**Ações:**
- [ ] Criar blueprint `dashboard.py`
- [ ] Integrar com Binance API (ou outra fonte de dados)
- [ ] Implementar cache Redis (5 min)
- [ ] Adicionar rate limiting por tier
- [ ] Registrar blueprint em `main.py`

#### 2.2. Blueprint `/api/charts`
**Arquivo:** `backend/app/api/charts.py`

**Endpoints:**
- `GET /api/charts/ohlcv?symbol=BTCUSDT&interval=1h` - Dados OHLCV (Free)
- `GET /api/charts/indicators?symbol=BTCUSDT` - Indicadores técnicos (Premium/Pro)
- `WebSocket /ws/charts/:symbol` - Stream de dados em tempo real (Premium/Pro)

**Ações:**
- [ ] Criar blueprint `charts.py`
- [ ] Integrar com Binance WebSocket API
- [ ] Implementar cache para dados históricos
- [ ] Adicionar gating por tier (indicadores = Premium/Pro)
- [ ] Configurar Socket.IO para streaming

#### 2.3. Blueprint `/api/analysis`
**Arquivo:** `backend/app/api/analysis.py`

**Endpoints:**
- `POST /api/analysis/technical` - Análise técnica completa (Pro)
- `POST /api/analysis/sentiment` - Análise de sentimento (Pro)
- `POST /api/analysis/risk` - Análise de risco (Pro)

**Ações:**
- [ ] Criar blueprint `analysis.py`
- [ ] Implementar análise técnica (indicadores, padrões)
- [ ] Integrar com APIs de sentimento (opcional)
- [ ] Adicionar gating por tier (apenas Pro)
- [ ] Adicionar rate limiting (ex: 10 análises/hora para Pro)

#### 2.4. Blueprint `/api/payment` (Webhook Genérico)
**Arquivo:** `backend/app/api/payment.py`

**Endpoints:**
- `POST /api/payment/webhook` - Webhook genérico para atualizar tiers

**Ações:**
- [ ] Criar blueprint `payment.py`
- [ ] Implementar validação de webhook (assinatura, etc)
- [ ] Atualizar tabela `user_tiers` com novo tier
- [ ] Invalidar cache Redis do tier
- [ ] Adicionar logging estruturado

---

### **FASE 3: Frontend - Componentes e Integração** (Prioridade MÉDIA)

#### 3.1. Componente de Conexão de Wallet
**Arquivo:** `frontend/src/components/WalletConnect.vue`

**Ações:**
- [ ] Criar componente de conexão
- [ ] Integrar com `useWallet.ts`
- [ ] Mostrar estado de conexão
- [ ] Implementar fluxo SIWE completo
- [ ] Adicionar tratamento de erros

#### 3.2. Dashboard View
**Arquivo:** `frontend/src/views/DashboardView.vue`

**Ações:**
- [ ] Integrar com `/api/dashboard/summary`
- [ ] Mostrar resumo de mercados (Free)
- [ ] Implementar watchlist (Premium/Pro)
- [ ] Adicionar loading states
- [ ] Adicionar tratamento de erros

#### 3.3. Chart View
**Arquivo:** `frontend/src/views/ChartView.vue`

**Ações:**
- [ ] Integrar TradingView Lightweight Charts
- [ ] Conectar com `/api/charts/ohlcv`
- [ ] Implementar WebSocket para dados em tempo real (Premium/Pro)
- [ ] Adicionar indicadores técnicos (Premium/Pro)
- [ ] Adicionar controles de intervalo (1m, 5m, 1h, 1d, etc)

#### 3.4. Analysis View
**Arquivo:** `frontend/src/views/AnalysisView.vue`

**Ações:**
- [ ] Integrar com `/api/analysis/technical`
- [ ] Mostrar análise técnica completa (Pro)
- [ ] Adicionar gráficos de indicadores
- [ ] Implementar gating por tier (mostrar upgrade prompt se Free/Premium)

#### 3.5. Layout e Navegação
**Arquivo:** `frontend/src/components/AppLayout.vue`

**Ações:**
- [ ] Criar layout principal
- [ ] Adicionar header com conexão de wallet
- [ ] Adicionar sidebar de navegação
- [ ] Mostrar tier atual do usuário
- [ ] Adicionar link para upgrade (se não for Pro)

---

### **FASE 4: Testes e Validação** (Prioridade MÉDIA)

#### 4.1. Testes Backend
**Ações:**
- [ ] Testar autenticação SIWE (EOA)
- [ ] Testar autenticação SIWE (EIP-1271 - Safe wallet)
- [ ] Testar verificação de licença on-chain
- [ ] Testar rate limiting
- [ ] Testar gating por tier
- [ ] Testar Socket.IO connections

#### 4.2. Testes Frontend
**Ações:**
- [ ] Testar conexão de wallet (MetaMask, WalletConnect)
- [ ] Testar fluxo SIWE completo
- [ ] Testar navegação entre views
- [ ] Testar gating por tier (Free vs Premium vs Pro)
- [ ] Testar WebSocket connections

#### 4.3. Testes de Integração
**Ações:**
- [ ] Testar fluxo completo: login → dashboard → chart → analysis
- [ ] Testar com diferentes tiers
- [ ] Testar rate limiting em produção
- [ ] Testar cache Redis

---

### **FASE 5: Deploy** (Prioridade BAIXA - depois de testes)

#### 5.1. Deploy Frontend (Vercel)
**Ações:**
- [ ] Configurar projeto no Vercel
- [ ] Adicionar variáveis de ambiente
- [ ] Configurar domínio `radar.snelabs.space`
- [ ] Testar deploy

#### 5.2. Deploy Backend (GCP Cloud Run)
**Ações:**
- [ ] Criar Dockerfile otimizado
- [ ] Configurar Cloud Run service
- [ ] Configurar Cloud SQL (PostgreSQL)
- [ ] Configurar Cloud Memorystore (Redis)
- [ ] Configurar variáveis de ambiente
- [ ] Testar deploy

#### 5.3. Configuração Final
**Ações:**
- [ ] Configurar CORS para domínio de produção
- [ ] Configurar cookies (SameSite, Domain)
- [ ] Configurar SSL/HTTPS
- [ ] Configurar monitoramento (Prometheus, logs)

---

## 📝 Checklist Rápido

### Urgente (Esta Semana)
- [ ] Criar `.env` files
- [ ] Adicionar ABI do contrato
- [ ] Configurar PostgreSQL
- [ ] Criar migrations
- [ ] Testar autenticação SIWE

### Importante (Próximas 2 Semanas)
- [ ] Implementar APIs de dados (dashboard, charts, analysis)
- [ ] Criar componentes frontend principais
- [ ] Integrar TradingView Charts
- [ ] Testar fluxo completo

### Desejável (Próximo Mês)
- [ ] Testes automatizados
- [ ] Deploy em staging
- [ ] Deploy em produção
- [ ] Monitoramento e alertas

---

## 🔗 Recursos Úteis

- **Scroll Sepolia Explorer:** https://sepolia.scrollscan.com/
- **WalletConnect Dashboard:** https://cloud.walletconnect.com/
- **TradingView Charts Docs:** https://tradingview.github.io/lightweight-charts/
- **Binance API Docs:** https://binance-docs.github.io/apidocs/

---

## 💡 Dicas

1. **Comece pelo básico:** Configure `.env` e teste autenticação antes de implementar APIs complexas
2. **Teste incrementalmente:** Teste cada endpoint isoladamente antes de integrar
3. **Use cache:** Redis é essencial para performance - use sempre que possível
4. **Log tudo:** Structured logging ajuda muito no debug
5. **Valide tiers:** Sempre verifique o tier do usuário antes de retornar dados sensíveis

---

**Última atualização:** 29/12/2025

