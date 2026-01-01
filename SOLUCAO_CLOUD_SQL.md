# 🔧 **SOLUÇÃO: Cloud SQL Suspenso**

## ❌ **Problema Identificado:**
```
ERROR: (gcloud.sql.instances.patch) HTTPError 409: The instance or operation is not in an appropriate state to handle the request.
```

A instância `sne-db-prod` está **SUSPENDED** e não pode ser ativada diretamente.

---

## ✅ **SOLUÇÕES POSSÍVEIS:**

### **OPÇÃO 1: RECRIAR A INSTÂNCIA (RECOMENDADO)**

```bash
# 1. Deletar instância suspensa
gcloud sql instances delete sne-db-prod --quiet

# 2. Aguardar exclusão (2-3 minutos)
sleep 180

# 3. Criar nova instância
gcloud sql instances create sne-db-prod \
  --database-version=POSTGRES_15 \
  --cpu=2 \
  --memory=4GB \
  --region=us-central1 \
  --root-password="5a9862d483ba291dc2012f254cce03a7"

# 4. Criar banco e usuário
gcloud sql databases create sne --instance=sne-db-prod
gcloud sql users create sne_admin \
  --instance=sne-db-prod \
  --password="5a9862d483ba291dc2012f254cce03a7"
```

### **OPÇÃO 2: VERIFICAR STATUS DETALHADO**

```bash
# Verificar estado detalhado
gcloud sql instances describe sne-db-prod

# Verificar operações pendentes
gcloud sql operations list --instance=sne-db-prod

# Se houver operações pendentes, aguardar conclusão
```

### **OPÇÃO 3: USAR CONSOLE DO GCP**

1. Acesse: https://console.cloud.google.com/sql/instances
2. Selecione `sne-db-prod`
3. Clique em **"START"** se disponível
4. Ou **"DELETE"** e recrie

---

## 🎯 **CONTINUAR APÓS RESOLVER:**

### **Após recriar/ativar a instância:**

```bash
# 1. Navegar para backend
cd "C:\Users\windows10\Desktop\SNE RADAR DEPLOY\backend-v2\services\sne-web"

# 2. Inicializar tabelas
python init_db.py

# 3. Criar secrets
echo -n "5a9862d483ba291dc2012f254cce03a7" | gcloud secrets create sne-db-password --data-file=-
echo -n "sne-jwt-secret-change-in-production" | gcloud secrets create sne-jwt-secret --data-file=-

# 4. Build e deploy
docker build -t gcr.io/sne-v1/sne-web:latest .
docker push gcr.io/sne-v1/sne-web:latest

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

# 5. Verificar
gcloud run services list --region=us-central1
```

---

## 📊 **POR QUE ACONTECEU:**

- **Suspensão automática:** Google suspende instâncias gratuitas após período de inatividade
- **Limite de recursos:** Conta gratuita pode ter limites
- **Estado inconsistente:** Operação anterior pode ter falhado

**Recomendação:** **Recriar a instância** (Opção 1) é a solução mais rápida.

---

## 🎯 **EXECUTE:**

```bash
# Deletar instância suspensa
gcloud sql instances delete sne-db-prod --quiet

# Aguardar 3 minutos...
sleep 180

# Recriar
gcloud sql instances create sne-db-prod \
  --database-version=POSTGRES_15 \
  --cpu=2 \
  --memory=4GB \
  --region=us-central1 \
  --root-password="5a9862d483ba291dc2012f254cce03a7"

# Continuar com os próximos passos...
```

**Vamos recriar a instância e continuar!** 🚀

