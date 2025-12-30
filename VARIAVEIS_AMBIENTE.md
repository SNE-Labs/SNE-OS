# 🔐 Variáveis de Ambiente - SNE Radar

## 📋 Frontend (Vercel)

### Obrigatórias:

```env
# URL do Backend API (Cloud Run)
VITE_API_BASE_URL=https://sne-radar-api-xxxxx.run.app

# URL do WebSocket (Cloud Run)
VITE_WS_URL=wss://sne-radar-api-xxxxx.run.app

# WalletConnect Project ID
# Obter em: https://cloud.walletconnect.com/
# Valor padrão já configurado no código
VITE_WALLETCONNECT_PROJECT_ID=3fcc6bba6f1de962d911bb5b5c3dba68
```

### Opcionais (têm valores padrão):

```env
# Scroll L2 RPC (Testnet)
VITE_SCROLL_RPC_URL=https://sepolia-rpc.scroll.io

# License Contract Address (Scroll Sepolia)
VITE_LICENSE_CONTRACT_ADDRESS=0x2577879dE5bC7bc87db820C79f7d65bFfE2d9fb7

# SIWE Domain (deve bater com o domínio do site)
VITE_SIWE_DOMAIN=radar.snelabs.space

# SIWE Origin (URL completa)
VITE_SIWE_ORIGIN=https://radar.snelabs.space
```

---

## 📋 Backend (Cloud Run / Local)

### Obrigatórias:

```env
# Secret Key para JWT e sessões
SECRET_KEY=seu-secret-key-super-seguro-aqui

# Database URL
# PostgreSQL (produção)
DATABASE_URL=postgresql://user:password@host:5432/sne_radar
# SQLite (desenvolvimento)
DATABASE_URL=sqlite:///sne_radar.db

# Redis (opcional - app funciona sem)
REDIS_HOST=localhost
REDIS_PORT=6379
```

### Opcionais (têm valores padrão):

```env
# Flask Environment
FLASK_ENV=production  # ou 'development'

# Session Type (flask-session)
SESSION_TYPE=filesystem  # ou 'redis' se usar Redis

# Scroll L2 RPC
SCROLL_RPC_URL=https://sepolia-rpc.scroll.io

# License Contract Address
LICENSE_CONTRACT_ADDRESS=0x2577879dE5bC7bc87db820C79f7d65bFfE2d9fb7

# SIWE Domain e Origin
SIWE_DOMAIN=radar.snelabs.space
SIWE_ORIGIN=https://radar.snelabs.space

# Skip License Check (apenas desenvolvimento)
SKIP_LICENSE_CHECK=false  # true para desenvolvimento sem contrato

# Cache TTL (segundos)
CACHE_DASHBOARD_TTL=300  # 5 minutos
CACHE_CHART_TTL=60       # 1 minuto

# Port (Cloud Run usa PORT automaticamente)
PORT=5000  # ou 8080 para Cloud Run
```

---

## 🔧 Como Configurar

### Frontend (Vercel)

1. **Via Dashboard:**
   - Acesse: https://vercel.com/dashboard
   - Vá em **Settings > Environment Variables**
   - Adicione cada variável `VITE_*`

2. **Via CLI:**
   ```bash
   vercel env add VITE_API_BASE_URL
   vercel env add VITE_WALLETCONNECT_PROJECT_ID
   # etc...
   ```

### Backend (Cloud Run)

1. **Via gcloud CLI:**
   ```bash
   gcloud run services update sne-radar-api \
     --set-env-vars "SECRET_KEY=xxx,DATABASE_URL=xxx" \
     --region us-central1
   ```

2. **Via Console:**
   - Acesse: https://console.cloud.google.com/run
   - Edite o serviço
   - Vá em **Variables & Secrets**
   - Adicione as variáveis

### Local (Desenvolvimento)

1. **Frontend:**
   ```bash
   cd frontend
   cp .env.example .env
   # Edite .env com seus valores
   ```

2. **Backend:**
   ```bash
   cd backend
   cp .env.example .env
   # Edite .env com seus valores
   ```

---

## 🔐 Segurança

### ⚠️ NUNCA commite `.env` no Git!

- ✅ Use `.env.example` como template
- ✅ Adicione `.env` ao `.gitignore`
- ✅ Configure variáveis no Vercel/Cloud Run

### 🔑 Gerar SECRET_KEY:

```bash
# Python
python -c "import secrets; print(secrets.token_hex(32))"

# Node.js
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# OpenSSL
openssl rand -hex 32
```

---

## 📊 Resumo Rápido

### Frontend (Vercel) - Mínimo:
- `VITE_API_BASE_URL`
- `VITE_WS_URL`
- `VITE_WALLETCONNECT_PROJECT_ID`

### Backend (Cloud Run) - Mínimo:
- `SECRET_KEY`
- `DATABASE_URL`
- `FLASK_ENV=production`

---

## 📚 Referências

- **Frontend:** `frontend/.env.example`
- **Backend:** `backend/.env.example`
- **Vercel:** `vercel.json` (seção `env`)

