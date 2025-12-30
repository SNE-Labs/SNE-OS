# 🚀 **EXECUTE ESTES COMANDOS NO SEU TERMINAL**

Você já está logado no projeto `sne-v1`. Execute estes comandos **um por um**:

---

## **1. VERIFICAR E CRIAR CLOUD SQL:**

```bash
# Verificar se Cloud SQL já existe
gcloud sql instances list

# Se não existir, criar:
gcloud sql instances create sne-db-prod \
  --database-version=POSTGRES_15 \
  --cpu=2 \
  --memory=4GB \
  --region=us-central1 \
  --root-password="5a9862d483ba291dc2012f254cce03a7"

# Criar banco e usuário:
gcloud sql databases create sne --instance=sne-db-prod
gcloud sql users create sne_admin \
  --instance=sne-db-prod \
  --password="5a9862d483ba291dc2012f254cce03a7"
```

---

## **2. NAVEGAR PARA BACKEND:**

```bash
# Navegar para o diretório do backend
cd "C:\Users\windows10\Desktop\SNE RADAR DEPLOY\backend-v2\services\sne-web"
```

---

## **3. INICIALIZAR BANCO:**

```bash
# Executar script Python para criar tabelas
python init_db.py
```

---

## **4. CRIAR SECRETS:**

```bash
# Criar secrets no Google Cloud
echo -n "5a9862d483ba291dc2012f254cce03a7" | gcloud secrets create sne-db-password --data-file=-
echo -n "sne-jwt-secret-change-in-production" | gcloud secrets create sne-jwt-secret --data-file=-
```

---

## **5. BUILD E PUSH DOCKER:**

```bash
# Build da imagem
docker build -t gcr.io/sne-v1/sne-web:latest .

# Push para Container Registry
docker push gcr.io/sne-v1/sne-web:latest
```

---

## **6. DEPLOY NO CLOUD RUN:**

```bash
gcloud run deploy sne-web \
  --image gcr.io/sne-v1/sne-web:latest \
  --platform managed \
  --region=us-central1 \
  --allow-unauthenticated \
  --port 8080 \
  --memory 1Gi \
  --cpu 1 \
  --max-instances 10 \
  --concurrency 80 \
  --timeout 300 \
  --set-env-vars="SECRET_KEY=sne-jwt-secret-change-in-production,SIWE_DOMAIN=radar.snelabs.space,SIWE_ORIGIN=https://radar.snelabs.space,DEBUG=false,FLASK_ENV=production,DB_NAME=sne,DB_USER=sne_admin,DB_PORT=5432,PORT=8080" \
  --set-secrets="DB_PASSWORD=sne-db-password:latest,JWT_SECRET=sne-jwt-secret:latest" \
  --add-cloudsql-instances=sne-v1:us-central1:sne-db-prod
```

---

## **7. VERIFICAR DEPLOY:**

```bash
# Ver serviços ativos
gcloud run services list --region=us-central1

# Copie a URL gerada!
```

---

## **🎯 RESULTADO ESPERADO:**

Após executar todos os comandos, você verá algo como:

```
SERVICE_NAME  REGION       URL
sne-web       us-central1  https://sne-web-abc123-uc.a.run.app
```

**Copie esta URL:** `https://sne-web-ABC123-uc.a.run.app`

---

## **📋 PRÓXIMOS PASSOS:**

### **1. Configure Vercel:**
No painel Vercel, adicione:
```
VITE_API_BASE_URL=https://sne-web-ABC123-uc.a.run.app
VITE_WS_URL=https://sne-web-ABC123-uc.a.run.app
```

### **2. Configure WalletConnect:**
- https://cloud.reown.com
- Projeto: `3fcc6bba6f1de962d911bb5b5c3dba68`
- Adicionar: `https://sneradar.vercel.app`

### **3. Teste:**
- https://sneradar.vercel.app
- Conecte wallet
- Faça análise

---

## 🚨 **SE ALGO DER ERRADO:**

### **Ver logs:**
```bash
gcloud run logs tail sne-web --region=us-central1
```

### **Testar API:**
```bash
curl https://sne-web-ABC123-uc.a.run.app/health
```

---

## 🎉 **EXECUTE OS COMANDOS ACIMA!**

**Sistema estará 100% funcional após o deploy!** 🚀

**Precisa de ajuda com algum comando?** 🤔

