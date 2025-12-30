# 🚀 Deploy SNE Backend no Google Cloud Run

## 📋 Pré-requisitos

### 1. **Configurar Google Cloud**
```bash
# Instalar Google Cloud CLI (se não tiver)
# https://cloud.google.com/sdk/docs/install

# Autenticar
gcloud auth login

# Configurar projeto
export GOOGLE_CLOUD_PROJECT=sne-labs
gcloud config set project sne-labs

# Habilitar APIs necessárias
gcloud services enable run.googleapis.com
gcloud services enable containerregistry.googleapis.com
gcloud services enable secretmanager.googleapis.com
```

### 2. **Configurar Secrets no Google Cloud**

```bash
# Criar secrets para variáveis sensíveis
echo -n "sne-jwt-secret-change-in-production" | \
  gcloud secrets create sne-jwt-secret --data-file=-

echo -n "postgresql://user:password@host:5432/database" | \
  gcloud secrets create sne-database-url --data-file=-

echo -n "redis://host:6379" | \
  gcloud secrets create sne-redis-url --data-file=-
```

## 🐳 **Opção 1: Deploy via Container (Recomendado)**

### **1. Build e Push da Imagem**
```bash
# Navegar para o diretório do backend
cd backend-v2/services/sne-web

# Build da imagem
docker build -t gcr.io/sne-labs/sne-web:latest .

# Push para Google Container Registry
docker push gcr.io/sne-labs/sne-web:latest
```

### **2. Deploy no Cloud Run**
```bash
gcloud run deploy sne-web \
  --image gcr.io/sne-labs/sne-web:latest \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated \
  --port 8080 \
  --memory 1Gi \
  --cpu 1 \
  --max-instances 10 \
  --concurrency 80 \
  --timeout 300 \
  --set-env-vars="\
    JWT_SECRET=sne-jwt-secret-change-in-production,\
    SIWE_DOMAIN=radar.snelabs.space,\
    SIWE_ORIGIN=https://radar.snelabs.space,\
    SECRET_KEY=sne-secret-key-change-in-production" \
  --set-secrets="\
    DATABASE_URL=sne-database-url:latest,\
    REDIS_URL=sne-redis-url:latest"
```

### **3. Verificar Deploy**
```bash
# Listar serviços
gcloud run services list

# Output esperado:
# SERVICE_NAME  REGION       URL
# sne-web       us-central1  https://sne-web-abc123-uc.a.run.app

# Copiar a URL gerada (ex: https://sne-web-abc123-uc.a.run.app)
```

## 🔧 **Opção 2: Deploy via Source (Alternativa)**

### **1. Preparar Código Fonte**
```bash
cd backend-v2/services/sne-web

# Criar requirements.txt se não existir
cat > requirements.txt << 'EOF'
Flask==3.0.0
flask-socketio==5.3.6
gunicorn==21.2.0
gevent==23.9.1
gevent-websocket==0.10.1
psycopg2-binary==2.9.9
SQLAlchemy==2.0.23
python-dotenv==1.0.0
requests==2.31.0
pandas>=2.2.0
numpy>=1.26.0
scipy>=1.11.0
google-cloud-secret-manager>=2.16.0
pytz>=2023.3
flask-cors==4.0.0
PyJWT==2.8.0
web3==6.11.0
eth-account==0.9.0
EOF
```

### **2. Deploy via Cloud Build**
```bash
gcloud run deploy sne-web \
  --source . \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated \
  --set-env-vars="\
    JWT_SECRET=sne-jwt-secret-change-in-production,\
    SIWE_DOMAIN=radar.snelabs.space,\
    SIWE_ORIGIN=https://radar.snelabs.space,\
    SECRET_KEY=sne-secret-key-change-in-production" \
  --set-secrets="\
    DATABASE_URL=sne-database-url:latest,\
    REDIS_URL=sne-redis-url:latest"
```

## 🌐 **Configurar Frontend (Vercel)**

### **1. Obter URL do Cloud Run**
Após o deploy, copie a URL gerada:
```
https://sne-web-ABC123-uc.a.run.app
```

### **2. Atualizar Vercel Environment Variables**

No painel do Vercel → Project Settings → Environment Variables:

```
VITE_API_BASE_URL=https://sne-web-ABC123-uc.a.run.app
VITE_WS_URL=https://sne-web-ABC123-uc.a.run.app
```

### **3. Redeploy Frontend**
```bash
# Trigger redeploy no Vercel
# Ou faça push no GitHub para trigger automático
git commit --allow-empty -m "trigger: redeploy with backend URL"
git push
```

## 🧪 **Testes Pós-Deploy**

### **1. Testar Health Check**
```bash
curl https://sne-web-ABC123-uc.a.run.app/health
# Expected: {"status": "healthy", "service": "sne-web", "version": "1.0.0"}
```

### **2. Testar SIWE Authentication**
```bash
# Testar nonce generation
curl -X POST https://sne-web-ABC123-uc.a.run.app/api/auth/nonce \
  -H "Content-Type: application/json" \
  -d '{"address": "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb"}'

# Expected: {"nonce": "hex_string"}
```

### **3. Testar Dashboard API**
```bash
# Com token JWT (se tiver)
curl -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  https://sne-web-ABC123-uc.a.run.app/api/dashboard/summary

# Expected: dados do dashboard
```

### **4. Testar Análise**
```bash
curl -X POST https://sne-web-ABC123-uc.a.run.app/api/analyze/auth \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"symbol": "BTCUSDT", "timeframe": "1h"}'

# Expected: análise completa com motor_renan.py
```

## 🔍 **Troubleshooting**

### **Erro: Container Failed to Start**
```bash
# Verificar logs
gcloud run services logs read sne-web --region=us-central1

# Verificar imagem
docker run -p 8080:8080 gcr.io/sne-labs/sne-web:latest
```

### **Erro: Environment Variables**
```bash
# Verificar secrets
gcloud secrets list

# Atualizar secrets
gcloud secrets versions add sne-database-url --data-file=database.txt
```

### **Erro: CORS**
```bash
# Verificar headers CORS no backend
curl -I https://sne-web-ABC123-uc.a.run.app/health
```

## 📊 **Monitoramento**

### **1. Logs**
```bash
# Ver logs em tempo real
gcloud run services logs tail sne-web --region=us-central1

# Ver logs de um período específico
gcloud run services logs read sne-web \
  --region=us-central1 \
  --start-time="2024-01-01T00:00:00Z"
```

### **2. Métricas**
```bash
# Ver métricas no Google Cloud Console
# Cloud Run → sne-web → Métricas

# Principais métricas:
# - Latência de resposta
# - Taxa de erro
# - Uso de CPU/Memória
# - Número de solicitações
```

## 💰 **Custos Estimados**

- **Cloud Run**: ~$0.15/hora (por instância ativa)
- **Container Registry**: ~$0.026/GB/mês
- **Secrets Manager**: ~$0.06/segredo/mês
- **Traffic**: Gratuito até 2 milhões de requests/mês

**Total estimado**: ~$10-20/mês para uso moderado

## 🎯 **Próximos Passos**

1. ✅ **Deploy sne-web** no Cloud Run
2. ✅ **Obter URL gerada**
3. ✅ **Atualizar Vercel** com URL correta
4. ✅ **Testar integração** completa
5. 🔄 **Deploy sne-worker** (opcional para jobs em background)
6. 🔄 **Configurar domínio custom** (opcional)

---

**URL do seu serviço aparecerá aqui após o deploy:**
```
https://sne-web-[HASH]-uc.a.run.app
```

**Copie esta URL e use no Vercel!** 🚀

