# 🚂 **DEPLOY NO RAILWAY - GUIA COMPLETO**

## ❌ **Problemas Comuns no Railway:**

1. **Diretório errado** - Railway tenta build do diretório raiz
2. **Variáveis de ambiente** - DATABASE_URL não configurada
3. **Porta incorreta** - Railway usa porta específica
4. **Build falhando** - Dependências não instaladas

## ✅ **SOLUÇÃO: Configuração Correta**

---

## 📋 **PASSO 1: ACESSAR RAILWAY**

1. **Acesse:** https://railway.app
2. **Conecte sua conta GitHub**
3. **Clique:** "New Project" → "Deploy from GitHub repo"

---

## 📋 **PASSO 2: SELECIONAR REPOSITÓRIO**

### **Repository:**
```
https://github.com/SNE-Labs/SNE-Radar
```

### **Branch:**
```
main
```

---

## 📋 **PASSO 3: CONFIGURAR BUILD**

### **Root Directory:**
```
backend-v2/services/sne-web
```

### **Build Command:**
```bash
pip install -r requirements.txt
```

### **Start Command:**
```bash
python app.py
```

---

## 📋 **PASSO 4: CONFIGURAR BANCO DE DADOS**

### **Adicionar PostgreSQL:**
1. **No Railway Dashboard:** "Add Plugin" → "PostgreSQL"
2. **Plan:** Hobby (gratuito)
3. **Region:** US West (Oregon) - `us-west-2`

### **A DATABASE_URL será criada automaticamente!**

---

## 📋 **PASSO 5: CONFIGURAR ENVIRONMENT VARIABLES**

### **No painel do serviço, aba "Variables":**

```bash
SECRET_KEY=sne-jwt-secret-change-in-production
SIWE_DOMAIN=radar.snelabs.space
SIWE_ORIGIN=https://radar.snelabs.space
DEBUG=false
FLASK_ENV=production
PORT=8080

# WalletConnect
WALLETCONNECT_PROJECT_ID=3fcc6bba6f1de962d911bb5b5c3dba68
```

**⚠️ IMPORTANTE:** A `DATABASE_URL` será configurada automaticamente pelo Railway!

---

## 📋 **PASSO 6: DEPLOY**

### **Clique "Deploy"**

O Railway irá:
- ✅ Fazer build no diretório correto
- ✅ Instalar dependências Python
- ✅ Conectar ao banco PostgreSQL
- ✅ Iniciar aplicação na porta 8080
- ✅ Gerar URL HTTPS automática

---

## 📋 **PASSO 7: INICIALIZAR BANCO DE DADOS**

### **Após deploy, abrir Railway Shell:**

1. **Railway Dashboard** → seu projeto → **sne-web** → **Shell**
2. **Executar:**
```bash
python init_db.py
```

---

## 📋 **PASSO 8: VERIFICAR DEPLOY**

### **Testar endpoints:**
```bash
# Health check
curl https://sne-web-production.up.railway.app/health

# SIWE nonce
curl -X POST https://sne-web-production.up.railway.app/api/auth/nonce \
  -H "Content-Type: application/json" \
  -d '{"address": "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb"}'

# Análise (pode demorar)
curl -X POST https://sne-web-production.up.railway.app/api/analyze \
  -H "Content-Type: application/json" \
  -d '{"symbol": "BTCUSDT", "timeframe": "1h"}'
```

---

## 📋 **PASSO 9: CONFIGURAR VERCEL (FRONTEND)**

### **Environment Variables no Vercel:**
```bash
VITE_API_BASE_URL=https://sne-web-production.up.railway.app
VITE_WS_URL=https://sne-web-production.up.railway.app
VITE_WALLETCONNECT_PROJECT_ID=3fcc6bba6f1de962d911bb5b5c3dba68
VITE_SCROLL_RPC_URL=https://sepolia-rpc.scroll.io
VITE_SIWE_DOMAIN=radar.snelabs.space
VITE_SIWE_ORIGIN=https://radar.snelabs.space
```

---

## 📋 **PASSO 10: CONFIGURAR WALLET CONNECT**

### **No painel do Reown (WalletConnect):**
- https://cloud.reown.com
- Projeto ID: `3fcc6bba6f1de962d911bb5b5c3dba68`
- **Adicionar domínio:** `https://sneradar.vercel.app`

---

## 🎯 **VERIFICAÇÃO FINAL**

### **Teste completo:**
1. **Acesse:** https://sneradar.vercel.app
2. **Conecte sua wallet** (MetaMask)
3. **Execute análise** de BTCUSDT
4. **Verifique gráficos** e dados

---

## 💰 **CUSTOS RAILWAY:**

- ✅ **Backend:** 100% GRÁTIS (512MB RAM, 1GB disco)
- ✅ **PostgreSQL:** 100% GRÁTIS (512MB)
- ✅ **Deploy:** Automático do GitHub
- ✅ **SSL:** Automático
- ✅ **Custom Domain:** $5/mês (opcional)

**TOTAL: $0/mês** 🚀

---

## 🔧 **CONFIGURAÇÃO TÉCNICA RAILWAY:**

### **railway.json** (já criado):
```json
{
  "build": {
    "builder": "dockerfile",
    "dockerfilePath": "./Dockerfile"
  },
  "deploy": {
    "startCommand": "python app.py",
    "healthcheckPath": "/health",
    "healthcheckTimeout": 30,
    "restartPolicyType": "ON_FAILURE",
    "restartPolicyMaxRetries": 10
  }
}
```

### **Variáveis de Ambiente Essenciais:**
- `DATABASE_URL` - Criada automaticamente
- `PORT` - Porta do Railway (normalmente 8080)
- `SECRET_KEY` - Para JWT
- `SIWE_DOMAIN` - Domínio para SIWE
- `SIWE_ORIGIN` - URL completa para SIWE

---

## 🚨 **SE ALGO DER ERRADO:**

### **Verificar Logs:**
```bash
# Railway Dashboard → Deployments → View Logs
```

### **Verificar Banco:**
```bash
# Railway Dashboard → PostgreSQL → Connect
# Ou usar shell do serviço
```

### **Redeploy:**
```bash
# Railway Dashboard → Deployments → Redeploy
```

---

## 🎉 **DEPLOY BEM-SUCEDIDO!**

**URL esperada:** `https://sne-web-production.up.railway.app`

**Agora configure o Vercel e terá o sistema 100% funcional!** 🚀

---

## 🤔 **PRECISA DE AJUDA?**

**Dificuldades específicas:**
- Build falhando? → Verificar `requirements.txt`
- Banco não conecta? → Verificar `DATABASE_URL`
- Porta errada? → Usar variável `$PORT` do Railway
- SIWE não funciona? → Verificar `SIWE_DOMAIN` e `SIWE_ORIGIN`

**Me diga qual erro específico está enfrentando!** 🔧
