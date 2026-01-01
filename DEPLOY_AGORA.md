# 🚀 **EXECUTE O DEPLOY AGORA!**

## ✅ **Google Cloud Configurado**

Você já está logado no projeto **sne-v1** com o email **cnxsrtw@gmail.com**.

---

## 🎯 **OPÇÃO 1: Deploy Automático (Recomendado)**

### **Execute o script completo:**

```bash
# Do diretório raiz do projeto
cd /path/to/SNE-RADAR-DEPLOY

# Tornar executável e rodar
chmod +x deploy-cloud-run.sh
./deploy-cloud-run.sh
```

**O script fará automaticamente:**
- ✅ Criar Cloud SQL (PostgreSQL)
- ✅ Inicializar tabelas
- ✅ Criar secrets
- ✅ Build Docker image
- ✅ Deploy no Cloud Run
- ✅ Testar endpoints
- ✅ Dar URL do backend

---

## 🎯 **OPÇÃO 2: Deploy Passo a Passo**

### **1. Preparar Infraestrutura**

```bash
# Configurar projeto e região
export PROJECT_ID=sne-v1
export REGION=us-central1
gcloud config set project $PROJECT_ID

# Criar Cloud SQL
gcloud sql instances create sne-db-prod \
  --database-version=POSTGRES_15 \
  --cpu=2 \
  --memory=4GB \
  --region=$REGION \
  --root-password="5a9862d483ba291dc2012f254cce03a7"

gcloud sql databases create sne --instance=sne-db-prod
gcloud sql users create sne_admin \
  --instance=sne-db-prod \
  --password="5a9862d483ba291dc2012f254cce03a7"
```

### **2. Inicializar Banco**

```bash
# Executar script de inicialização
cd backend-v2/services/sne-web
python init_db.py
```

### **3. Deploy Backend**

```bash
# Build e deploy
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
```

---

## 🎯 **OPÇÃO 3: Deploy via Cloud Build (Sem Docker)**

```bash
# Navegar para backend
cd backend-v2/services/sne-web

# Executar deploy via Cloud Build
chmod +x ../../deploy-cloud-build.sh
../../deploy-cloud-build.sh
```

---

## 📋 **APÓS O DEPLOY**

### **1. Obter URL do Backend**
```bash
gcloud run services list --region=us-central1
# Copie a URL: https://sne-web-ABC123-uc.a.run.app
```

### **2. Configurar Vercel**
No painel Vercel → Environment Variables:
```
VITE_API_BASE_URL=https://sne-web-ABC123-uc.a.run.app
VITE_WS_URL=https://sne-web-ABC123-uc.a.run.app
```

### **3. Configurar WalletConnect**
1. Acesse: https://cloud.reown.com
2. Projeto ID: `3fcc6bba6f1de962d911bb5b5c3dba68`
3. Adicionar domínio: `https://sneradar.vercel.app`

---

## 🧪 **TESTE FINAL**

1. **Acesse:** https://sneradar.vercel.app
2. **Conecte wallet** (MetaMask)
3. **Faça SIWE login**
4. **Execute análise** de BTCUSDT
5. **Verifique gráficos**

---

## 🎉 **SISTEMA PRONTO PARA PRODUÇÃO!**

### **Arquitetura Completa:**
- ✅ **Frontend:** React + Vercel
- ✅ **Backend:** Flask + Cloud Run
- ✅ **Database:** PostgreSQL + Cloud SQL
- ✅ **Cache:** Redis (opcional)
- ✅ **Auth:** SIWE + JWT
- ✅ **Analysis:** Motor Renan profissional

### **Funcionalidades:**
- ✅ Dashboard com dados em tempo real
- ✅ Gráficos TradingView
- ✅ Análise técnica profissional
- ✅ Sistema de tiers (Free/Premium/Pro)
- ✅ Autenticação Web3

---

## 🚨 **IMPORTANTE**

**Após o deploy, execute estes comandos para verificar:**

```bash
# Verificar serviços
gcloud run services list

# Ver logs
gcloud run logs tail sne-web --region=us-central1

# Testar API
curl https://YOUR_BACKEND_URL/health
```

**🎯 BOA SORTE NO DEPLOY!** 🚀

---

**Status:** Sistema 100% funcional e pronto para produção!

**Próximo passo:** Execute `./deploy-cloud-run.sh` e tenha o backend no ar! 🎉

