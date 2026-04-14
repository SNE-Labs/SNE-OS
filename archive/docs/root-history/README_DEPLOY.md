# 📦 Deploy SNE Radar

## 🎯 Arquitetura de Deploy

```
┌─────────────────┐         ┌──────────────────┐
│   Vercel        │         │  Google Cloud Run │
│   (Frontend)    │ ──────► │   (Backend)       │
│                 │         │                   │
│  Vue.js + Vite  │         │  Flask + Socket.IO│
│  Static Files   │         │  Python API       │
└─────────────────┘         └──────────────────┘
```

## ✅ Status de Preparação

### Frontend (Vercel) ✅
- [x] `vercel.json` configurado
- [x] `vite.config.ts` otimizado
- [x] `.env.example` criado
- [x] Build testado localmente

### Backend (Cloud Run) ⚠️
- [x] `Dockerfile` (se necessário)
- [x] `requirements.txt` completo
- [ ] Variáveis de ambiente configuradas
- [ ] Deploy no Cloud Run

## 🚀 Deploy Rápido

### 1. Frontend (Vercel)

```bash
# Opção 1: Via Dashboard
# 1. Acesse vercel.com
# 2. Conecte repositório
# 3. Configure variáveis de ambiente
# 4. Deploy automático

# Opção 2: Via CLI
cd frontend
vercel --prod
```

### 2. Backend (Cloud Run)

```bash
cd backend
gcloud run deploy sne-radar-api \
  --source . \
  --region us-central1 \
  --allow-unauthenticated \
  --set-env-vars "FLASK_ENV=production"
```

## 📋 Variáveis de Ambiente

### Frontend (Vercel)
```env
VITE_API_BASE_URL=https://sne-radar-api-xxxxx.run.app
VITE_WS_URL=wss://sne-radar-api-xxxxx.run.app
VITE_WALLETCONNECT_PROJECT_ID=seu-project-id
```

### Backend (Cloud Run)
```env
FLASK_ENV=production
SECRET_KEY=seu-secret-key-aqui
DATABASE_URL=postgresql://...
REDIS_HOST=redis-host
SCROLL_RPC_URL=https://sepolia-rpc.scroll.io
LICENSE_CONTRACT_ADDRESS=0x...
```

## 📚 Documentação Completa

- **Frontend:** Ver `DEPLOY_VERCEL.md`
- **Backend:** Ver `DEPLOY_CLOUD_RUN.md` (criar se necessário)

---

**Status:** ✅ Frontend pronto | ⚠️ Backend precisa deploy

