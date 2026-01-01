# 🚀 **DEPLOY NO RENDER (100% GRÁTIS)**

## ❌ **Problema Atual:**
O Render está tentando fazer build do diretório raiz, mas o Dockerfile está em `backend-v2/services/sne-web/`.

## ✅ **SOLUÇÃO: Configurar Render Corretamente**

---

## 📋 **PASSO 1: ACESSAR RENDER**

1. **Acesse:** https://render.com
2. **Conecte sua conta GitHub**
3. **Clique:** "New" → "Web Service"

---

## 📋 **PASSO 2: CONFIGURAR SERVIÇO**

### **Repository:**
```
https://github.com/SNE-Labs/SNE-Radar
```

### **Branch:**
```
main
```

### **Root Directory:**
```
backend-v2/services/sne-web
```

### **Runtime:**
```
Docker
```

### **Dockerfile Path:**
```
./Dockerfile
```

---

## 📋 **PASSO 3: CONFIGURAR ENVIRONMENT**

### **Environment Variables:**
```
SECRET_KEY=sne-jwt-secret-change-in-production
SIWE_DOMAIN=radar.snelabs.space
SIWE_ORIGIN=https://radar.snelabs.space
DEBUG=false
FLASK_ENV=production
PORT=10000
DATABASE_URL=postgresql://[URL_DO_RENDER_DB]
```

---

## 📋 **PASSO 4: CRIAR BANCO DE DADOS**

### **No Render Dashboard:**

1. **Clique:** "New" → "PostgreSQL"
2. **Name:** `sne-db`
3. **Database:** `sne`
4. **User:** `sne_admin`
5. **Plan:** `Free`
6. **Region:** `Oregon (us-west-2)`

### **Copie a DATABASE_URL gerada**

---

## 📋 **PASSO 5: ATUALIZAR ENVIRONMENT**

### **No Web Service:**
- **Environment → DATABASE_URL**
- **Cole a URL do banco criado**

---

## 📋 **PASSO 6: DEPLOY**

### **Clique "Create Web Service"**

O Render irá:
- ✅ Fazer build do Docker
- ✅ Instalar dependências
- ✅ Conectar ao banco
- ✅ Iniciar aplicação
- ✅ Gerar URL HTTPS

---

## 📋 **PASSO 7: INICIALIZAR BANCO**

### **Após deploy, execute no shell do Render:**

```bash
# Abrir shell do serviço
# Render Dashboard → sne-web → Shell

# Executar inicialização
python init_db.py
```

---

## 📋 **PASSO 8: CONFIGURAR VERCEL**

### **Environment Variables no Vercel:**
```
VITE_API_BASE_URL=https://sne-web.onrender.com
VITE_WS_URL=https://sne-web.onrender.com
```

---

## 📋 **PASSO 9: CONFIGURAR WALLET CONNECT**

### **No painel do WalletConnect:**
- https://cloud.reown.com
- Projeto: `3fcc6bba6f1de962d911bb5b5c3dba68`
- Adicionar domínio: `https://sneradar.vercel.app`

---

## 🎯 **VERIFICAÇÃO FINAL**

### **Testes:**
```bash
# Health check
curl https://sne-web.onrender.com/health

# SIWE nonce
curl -X POST https://sne-web.onrender.com/api/auth/nonce \
  -H "Content-Type: application/json" \
  -d '{"address": "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb"}'

# Análise
curl -X POST https://sne-web.onrender.com/api/analyze \
  -H "Content-Type: application/json" \
  -d '{"symbol": "BTCUSDT", "timeframe": "1h"}'
```

### **Frontend:**
- Acesse: https://sneradar.vercel.app
- Conecte wallet
- Teste funcionalidades

---

## 💰 **CUSTOS RENDER:**

- ✅ **Web Service:** 100% GRÁTIS (750 horas/mês)
- ✅ **PostgreSQL:** 100% GRÁTIS (256MB)
- ✅ **Deploy:** Automático do GitHub
- ✅ **SSL:** Automático
- ✅ **CDN:** Incluído

**TOTAL: $0/mês** 🚀

---

## 🔧 **CONFIGURAÇÃO NO RENDER:**

### **Web Service Settings:**
- **Name:** sne-web
- **Root Directory:** `backend-v2/services/sne-web`
- **Dockerfile Path:** `./Dockerfile`
- **Plan:** Free

### **Database Settings:**
- **Name:** sne-db
- **Database:** sne
- **User:** sne_admin
- **Plan:** Free

---

## 🎉 **VAMOS DEPLOYAR!**

**Siga os passos acima no Render e terá um backend 100% funcional e gratuito!** 🎯

**Precisa de ajuda com algum passo?** 🤔

