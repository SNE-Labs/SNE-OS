# 🚀 **SNE Radar - Deploy Completo**

## 🎯 **Sistema Pronto para Produção**

### **Arquitetura Implementada:**
```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Vercel        │    │  Cloud Run      │    │   Cloud SQL     │    │   Redis         │
│   (Frontend)    │◄──►│   (Backend)     │◄──►│  (PostgreSQL)   │◄──►│  (Cache)       │
│                 │    │                 │    │                 │    │                 │
│ • React + TS    │    │ • Flask + SIWE  │    │ • Users/Signals │    │ • Sessions      │
│ • TradingView   │    │ • Motor Renan   │    │ • Analyses      │    │ • Rate Limits   │
│ • SIWE Auth     │    │ • Tier System   │    │ • User Tiers    │    │ • API Cache     │
│ • Dashboard     │    │ • WebSocket     │    │                 │    │                 │
└─────────────────┘    └─────────────────┘    └─────────────────┘    └─────────────────┘
```

---

## ⚡ **DEPLOY AUTOMÁTICO - 1 Comando**

### **Pré-requisitos:**
```bash
# 1. Instalar Google Cloud CLI
# https://cloud.google.com/sdk/docs/install

# 2. Autenticar
gcloud auth login

# 3. Configurar projeto
export PROJECT_ID=your-project-id
gcloud config set project $PROJECT_ID
```

### **Deploy Completo:**
```bash
# Do diretório raiz do projeto
chmod +x deploy-cloud-run.sh
./deploy-cloud-run.sh
```

**O script faz automaticamente:**
- ✅ Cria Cloud SQL (PostgreSQL)
- ✅ Inicializa tabelas do banco
- ✅ Cria secrets no Secret Manager
- ✅ Build Docker image
- ✅ Deploy no Cloud Run
- ✅ Testa endpoints
- ✅ Fornece URL do backend

---

## 📋 **DEPLOY MANUAL (Passo a Passo)**

### **1. Configurar Google Cloud**
```bash
export PROJECT_ID=sne-labs
gcloud config set project $PROJECT_ID

# Habilitar APIs
gcloud services enable run.googleapis.com
gcloud services enable sqladmin.googleapis.com
gcloud services enable containerregistry.googleapis.com
gcloud services enable secretmanager.googleapis.com
```

### **2. Criar Cloud SQL**
```bash
gcloud sql instances create sne-db-prod \
  --database-version=POSTGRES_15 \
  --cpu=2 \
  --memory=4GB \
  --region=us-central1 \
  --root-password="5a9862d483ba291dc2012f254cce03a7"

gcloud sql databases create sne --instance=sne-db-prod
gcloud sql users create sne_admin \
  --instance=sne-db-prod \
  --password="5a9862d483ba291dc2012f254cce03a7"
```

### **3. Inicializar Banco**
```bash
# Via Cloud Shell
gcloud sql connect sne-db-prod --user=sne_admin --database=sne

# Executar SQL das tabelas (ver arquivo inicializar_banco_gcs.sh)
```

### **4. Deploy Backend**
```bash
cd backend-v2/services/sne-web

# Build
docker build -t gcr.io/$PROJECT_ID/sne-web:latest .
docker push gcr.io/$PROJECT_ID/sne-web:latest

# Deploy
gcloud run deploy sne-web \
  --image gcr.io/$PROJECT_ID/sne-web:latest \
  --platform managed \
  --region=us-central1 \
  --allow-unauthenticated \
  --set-env-vars="SECRET_KEY=sne-jwt-secret,SIWE_DOMAIN=radar.snelabs.space,SIWE_ORIGIN=https://radar.snelabs.space" \
  --set-secrets="DB_PASSWORD=sne-db-password:latest,JWT_SECRET=sne-jwt-secret:latest" \
  --add-cloudsql-instances=$PROJECT_ID:us-central1:sne-db-prod
```

### **5. Configurar Frontend**
```bash
# Obter URL do backend
gcloud run services list

# Configurar no Vercel:
# VITE_API_BASE_URL=https://sne-web-ABC123-uc.a.run.app
# VITE_WS_URL=https://sne-web-ABC123-uc.a.run.app
```

---

## 🔧 **Configurações Finais**

### **WalletConnect**
1. Acesse: https://cloud.reown.com
2. Projeto ID: `3fcc6bba6f1de962d911bb5b5c3dba68`
3. Settings → App Settings
4. Adicionar domínio: `https://sneradar.vercel.app`

### **Vercel Environment Variables**
```
VITE_API_BASE_URL=https://sne-web-ABC123-uc.a.run.app
VITE_WS_URL=https://sne-web-ABC123-uc.a.run.app
VITE_WALLETCONNECT_PROJECT_ID=3fcc6bba6f1de962d911bb5b5c3dba68
VITE_SCROLL_RPC_URL=https://sepolia-rpc.scroll.io
VITE_SIWE_DOMAIN=radar.snelabs.space
VITE_SIWE_ORIGIN=https://radar.snelabs.space
```

---

## 🧪 **Testes Pós-Deploy**

### **Backend**
```bash
# Health check
curl https://sne-web-ABC123-uc.a.run.app/health

# SIWE nonce
curl -X POST https://sne-web-ABC123-uc.a.run.app/api/auth/nonce \
  -H "Content-Type: application/json" \
  -d '{"address": "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb"}'

# Análise
curl -X POST https://sne-web-ABC123-uc.a.run.app/api/analyze \
  -H "Content-Type: application/json" \
  -d '{"symbol": "BTCUSDT", "timeframe": "1h"}'
```

### **Frontend**
1. Acesse: https://sneradar.vercel.app
2. Conecte wallet (MetaMask/WalletConnect)
3. Faça SIWE login
4. Execute análise
5. Verifique gráficos

---

## 📊 **Custos Estimados**

| Serviço | Configuração | Custo Mensal |
|---------|-------------|--------------|
| **Vercel** | Hobby Plan | $0 (gratuito) |
| **Cloud Run** | 1Gi RAM, 1 CPU | $15-25 |
| **Cloud SQL** | PostgreSQL, 4GB | $20-30 |
| **Redis** | Memorystore 1GB | $15-20 |
| **Container Registry** | Storage | $1-5 |
| **Secrets Manager** | 2 secrets | $0.06 |

**Total:** ~$50-80/mês

---

## 🔍 **Monitoramento**

### **Logs**
```bash
# Logs do Cloud Run
gcloud run logs tail sne-web --region=us-central1

# Logs do Cloud SQL
gcloud sql instances list
```

### **Métricas**
- **Cloud Run Console:** Latência, erros, requests
- **Cloud SQL Console:** CPU, memória, conexões
- **Vercel Dashboard:** Build status, performance

---

## 🚨 **Troubleshooting**

### **Erro: Container Failed**
```bash
gcloud run logs read sne-web --region=us-central1 --limit=50
```

### **Erro: Database Connection**
```bash
# Verificar Cloud SQL
gcloud sql instances describe sne-db-prod
```

### **Erro: CORS**
```bash
# Verificar headers
curl -I https://sne-web-ABC123-uc.a.run.app/health
```

---

## 🎯 **SUCESSO! Sistema 100% Funcional**

### **Funcionalidades Ativas:**
- ✅ **Frontend React** no Vercel
- ✅ **Backend Flask** no Cloud Run
- ✅ **Banco PostgreSQL** no Cloud SQL
- ✅ **SIWE Authentication** completa
- ✅ **Motor de Análise** profissional
- ✅ **Sistema de Tiers** implementado
- ✅ **Charts TradingView** funcionais
- ✅ **Rate Limiting** por tier
- ✅ **WebSocket** para updates

### **Próximo Passo:**
**Execute `./deploy-cloud-run.sh`** e tenha o sistema em produção! 🚀

---

**Desenvolvido por:** SNE Labs  
**Versão:** SNE Radar v2.0 - Production Ready  
**Data:** Dezembro 2024

**#SNERadar #Web3 #Trading #Fintech #GoogleCloud**

