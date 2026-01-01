# 🔧 Correção: Erro de Certificado SSL

## ❌ **Problema Identificado**

O frontend está tentando acessar:
```
https://sne-radar-api-xxxxx.run.app/api/auth/verify
```

Mas recebe erro:
```
net::ERR_CERT_COMMON_NAME_INVALID
```

## 🔍 **Causa Raiz**

### 1. **URL do Backend Incorreta**
- A URL `sne-radar-api-xxxxx.run.app` não é uma URL válida do Google Cloud Run
- Google Cloud Run URLs seguem o padrão:
  ```
  https://SERVICE_NAME-HASH-uc.a.run.app
  ```
  Exemplo real:
  ```
  https://sne-web-abc123-uc.a.run.app
  ```

### 2. **Certificado SSL Inválido**
- O domínio `sne-radar-api-xxxxx.run.app` não existe
- Google Cloud Run fornece certificados SSL automaticamente para domínios `.run.app`

## ✅ **Solução**

### 1. **Obter URL Real do Google Cloud Run**

```bash
# Verificar serviços deployados
gcloud run services list

# Output esperado:
# SERVICE_NAME  REGION   URL
# sne-web       us-central1  https://sne-web-abc123-uc.a.run.app

# Copiar a URL real e substituir no frontend
```

### 2. **Atualizar Configuração**

#### **Vercel Environment Variables**
No painel do Vercel, adicionar:
```
VITE_API_BASE_URL=https://sne-web-REAL_HASH-uc.a.run.app
VITE_WS_URL=https://sne-web-REAL_HASH-uc.a.run.app
```

#### **Arquivo .env (local)**
```env
VITE_API_BASE_URL=https://sne-web-REAL_HASH-uc.a.run.app
VITE_WS_URL=https://sne-web-REAL_HASH-uc.a.run.app
```

### 3. **Verificar Deploy do Backend**

```bash
# 1. Verificar se o serviço está rodando
gcloud run services describe sne-web --region=us-central1

# 2. Testar endpoint health
curl https://sne-web-REAL_HASH-uc.a.run.app/health

# 3. Testar endpoint auth
curl -X POST https://sne-web-REAL_HASH-uc.a.run.app/api/auth/nonce \
  -H "Content-Type: application/json" \
  -d '{"address": "0x123..."}'
```

## 🚀 **Deploy do Backend no Google Cloud**

### **Pré-requisitos**
```bash
# 1. Instalar Google Cloud CLI
# 2. Configurar projeto
export GOOGLE_CLOUD_PROJECT=sne-labs
gcloud config set project sne-labs

# 3. Autenticar
gcloud auth login
```

### **Deploy sne-web**
```bash
# 1. Build da imagem
cd backend-v2/services/sne-web
docker build -t gcr.io/sne-labs/sne-web:latest .

# 2. Push para Google Container Registry
docker push gcr.io/sne-labs/sne-web:latest

# 3. Deploy no Cloud Run
gcloud run deploy sne-web \
  --image gcr.io/sne-labs/sne-web:latest \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated \
  --set-env-vars="DATABASE_URL=postgresql://...,REDIS_URL=redis://...,JWT_SECRET=...,SIWE_DOMAIN=radar.snelabs.space,SIWE_ORIGIN=https://radar.snelabs.space"
```

### **Deploy sne-worker** (opcional)
```bash
cd backend-v2/services/sne-worker
docker build -t gcr.io/sne-labs/sne-worker:latest .
docker push gcr.io/sne-labs/sne-worker:latest

gcloud run deploy sne-worker \
  --image gcr.io/sne-labs/sne-worker:latest \
  --platform managed \
  --region us-central1 \
  --no-allow-unauthenticated
```

## 📋 **Checklist de Correção**

- [ ] **Deploy do backend** no Google Cloud Run
- [ ] **Obter URL real** do serviço (ex: `https://sne-web-abc123-uc.a.run.app`)
- [ ] **Atualizar Vercel** com a URL correta
- [ ] **Configurar variáveis** de ambiente no Google Cloud
- [ ] **Testar endpoints** `/health`, `/api/auth/nonce`
- [ ] **Redeploy do frontend** no Vercel
- [ ] **Testar integração** completa

## 🎯 **Resultado Esperado**

Após correção:
- ✅ **Certificado SSL válido** (Google Cloud Run)
- ✅ **Backend responde** corretamente
- ✅ **SIWE authentication** funciona
- ✅ **Dashboard carrega** dados reais
- ✅ **Charts funcionam** com dados do Binance

## 💡 **Nota Importante**

O domínio `sne-radar-api-xxxxx.run.app` é placeholder. Substitua pela **URL real** obtida do comando:

```bash
gcloud run services list
```

