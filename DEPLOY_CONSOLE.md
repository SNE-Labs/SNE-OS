# 🚀 **DEPLOY DIRETO NO GOOGLE CLOUD CONSOLE**

Como estamos no Windows e não temos `gcloud` instalado, vamos fazer o deploy diretamente pelo **Google Cloud Console**.

---

## 📋 **PASSO 1: ABRIR CLOUD SHELL**

1. **Acesse:** https://console.cloud.google.com/
2. **Selecione o projeto:** `sne-v1`
3. **Clique no ícone do Cloud Shell** (terminal) no topo direito
4. **Aguarde abrir** o terminal na parte inferior

---

## 📋 **PASSO 2: FAZER UPLOAD DOS ARQUIVOS**

### **Opção A: Upload via Interface**
1. No Cloud Shell, clique no ícone **"Upload"** (seta para cima)
2. Selecione estes arquivos para upload:
   - `backend-v2/services/sne-web/init_db.py`
   - `backend-v2/services/sne-web/Dockerfile`
   - `backend-v2/services/sne-web/requirements.txt`
   - `deploy-cloud-run.sh`
   - `cloudbuild.yaml`

### **Opção B: Git Clone (Recomendado)**
```bash
# Clonar repositório no Cloud Shell
git clone https://github.com/SNE-Labs/SNE-Radar.git
cd SNE-Radar
```

---

## 📋 **PASSO 3: EXECUTAR DEPLOY**

### **Execute estes comandos no Cloud Shell:**

```bash
# 1. Configurar projeto
export PROJECT_ID=sne-v1
export REGION=us-central1
gcloud config set project $PROJECT_ID

# 2. Verificar se Cloud SQL existe
gcloud sql instances list

# 3. Se não existir, criar Cloud SQL
gcloud sql instances create sne-db-prod \
  --database-version=POSTGRES_15 \
  --cpu=2 \
  --memory=4GB \
  --region=$REGION \
  --root-password="5a9862d483ba291dc2012f254cce03a7"

# 4. Criar banco e usuário
gcloud sql databases create sne --instance=sne-db-prod
gcloud sql users create sne_admin \
  --instance=sne-db-prod \
  --password="5a9862d483ba291dc2012f254cce03a7"

# 5. Inicializar tabelas
cd backend-v2/services/sne-web
python init_db.py

# 6. Build e push Docker
docker build -t gcr.io/$PROJECT_ID/sne-web:latest .
docker push gcr.io/$PROJECT_ID/sne-web:latest

# 7. Deploy no Cloud Run
gcloud run deploy sne-web \
  --image gcr.io/$PROJECT_ID/sne-web:latest \
  --platform managed \
  --region=$REGION \
  --allow-unauthenticated \
  --port 8080 \
  --memory 1Gi \
  --cpu 1 \
  --max-instances 10 \
  --concurrency 80 \
  --timeout 300 \
  --set-env-vars="\
    SECRET_KEY=sne-jwt-secret-change-in-production,\
    SIWE_DOMAIN=radar.snelabs.space,\
    SIWE_ORIGIN=https://radar.snelabs.space,\
    DEBUG=false,\
    FLASK_ENV=production,\
    DB_NAME=sne,\
    DB_USER=sne_admin,\
    DB_PORT=5432,\
    PORT=8080" \
  --set-secrets="\
    DB_PASSWORD=sne-db-password:latest,\
    JWT_SECRET=sne-jwt-secret:latest" \
  --add-cloudsql-instances=$PROJECT_ID:$REGION:sne-db-prod
```

---

## 📋 **PASSO 4: VERIFICAR DEPLOY**

### **No Cloud Shell, execute:**

```bash
# Verificar serviços
gcloud run services list --region=us-central1

# Copie a URL gerada (ex: https://sne-web-abc123-uc.a.run.app)
```

---

## 📋 **PASSO 5: CONFIGURAR VERCEL**

### **No painel do Vercel:**
1. **Acesse:** https://vercel.com/dashboard
2. **Selecione o projeto:** SNE Radar
3. **Settings → Environment Variables**
4. **Adicione:**
```
VITE_API_BASE_URL=https://sne-web-ABC123-uc.a.run.app
VITE_WS_URL=https://sne-web-ABC123-uc.a.run.app
```

---

## 📋 **PASSO 6: CONFIGURAR WALLET CONNECT**

1. **Acesse:** https://cloud.reown.com
2. **Projeto ID:** `3fcc6bba6f1de962d911bb5b5c3dba68`
3. **Settings → App Settings**
4. **Adicionar domínio:** `https://sneradar.vercel.app`

---

## 📋 **PASSO 7: TESTE FINAL**

1. **Acesse:** https://sneradar.vercel.app
2. **Conecte wallet** (MetaMask)
3. **Faça SIWE login**
4. **Execute análise**
5. **Verifique gráficos**

---

## 🎯 **RESUMO DOS COMANDOS (Cloud Shell)**

```bash
# Configuração
export PROJECT_ID=sne-v1
export REGION=us-central1
gcloud config set project $PROJECT_ID

# Cloud SQL
gcloud sql instances create sne-db-prod --database-version=POSTGRES_15 --cpu=2 --memory=4GB --region=$REGION --root-password="5a9862d483ba291dc2012f254cce03a7"
gcloud sql databases create sne --instance=sne-db-prod
gcloud sql users create sne_admin --instance=sne-db-prod --password="5a9862d483ba291dc2012f254cce03a7"

# Inicializar banco
cd backend-v2/services/sne-web
python init_db.py

# Deploy
docker build -t gcr.io/$PROJECT_ID/sne-web:latest .
docker push gcr.io/$PROJECT_ID/sne-web:latest

gcloud run deploy sne-web \
  --image gcr.io/$PROJECT_ID/sne-web:latest \
  --platform managed \
  --region=$REGION \
  --allow-unauthenticated \
  --set-env-vars="SECRET_KEY=sne-jwt-secret,SIWE_DOMAIN=radar.snelabs.space,SIWE_ORIGIN=https://radar.snelabs.space" \
  --set-secrets="DB_PASSWORD=sne-db-password:latest,JWT_SECRET=sne-jwt-secret:latest" \
  --add-cloudsql-instances=$PROJECT_ID:$REGION:sne-db-prod

# Verificar
gcloud run services list --region=us-central1
```

---

## 🚨 **SE ALGO DER ERRADO**

### **Verificar Logs:**
```bash
gcloud run logs tail sne-web --region=us-central1
```

### **Verificar Cloud SQL:**
```bash
gcloud sql instances describe sne-db-prod
```

### **Testar Conexão:**
```bash
gcloud sql connect sne-db-prod --user=sne_admin --database=sne
\\dt  # Listar tabelas
```

---

## 🎉 **SUCESSO!**

Após estes passos, o sistema estará **100% funcional**:

- ✅ Backend no Cloud Run
- ✅ Banco PostgreSQL configurado
- ✅ Frontend no Vercel conectado
- ✅ Autenticação SIWE funcionando
- ✅ Análise profissional disponível

**🎯 VAMOS DEPLOYAR!** 🚀

