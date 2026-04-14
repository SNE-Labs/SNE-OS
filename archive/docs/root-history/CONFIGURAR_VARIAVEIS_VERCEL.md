# ⚙️ Configurar Variáveis de Ambiente no Vercel

## ⚠️ Erro Corrigido

O `vercel.json` estava referenciando Secrets que não existem. Agora as variáveis que precisam ser configuradas manualmente foram removidas do `vercel.json`.

## 📋 Variáveis que DEVEM ser configuradas no Vercel Dashboard

### Obrigatórias:

1. **`VITE_API_BASE_URL`**
   - **Valor:** URL do seu backend no Cloud Run
   - **Exemplo:** `https://sne-radar-api-xxxxx.run.app`
   - **Como obter:** Após fazer deploy do backend no Cloud Run

2. **`VITE_WS_URL`**
   - **Valor:** URL WebSocket do backend
   - **Exemplo:** `wss://sne-radar-api-xxxxx.run.app`
   - **Nota:** Use `wss://` (WebSocket Secure) para HTTPS

3. **`VITE_LICENSE_CONTRACT_ADDRESS`** (Opcional)
   - **Valor:** Endereço do contrato na Scroll Sepolia
   - **Padrão:** `0x2577879dE5bC7bc87db820C79f7d65bFfE2d9fb7`

## 🚀 Como Configurar no Vercel

### Passo 1: Acesse o Dashboard

1. Vá para: https://vercel.com/dashboard
2. Selecione seu projeto **SNE-Radar**

### Passo 2: Configurar Variáveis

1. Vá em **Settings** > **Environment Variables**
2. Clique em **Add New**
3. Adicione cada variável:

#### Variável 1: VITE_API_BASE_URL
```
Name: VITE_API_BASE_URL
Value: https://sne-radar-api-xxxxx.run.app
Environments: ☑ Production ☑ Preview ☑ Development
```

#### Variável 2: VITE_WS_URL
```
Name: VITE_WS_URL
Value: wss://sne-radar-api-xxxxx.run.app
Environments: ☑ Production ☑ Preview ☑ Development
```

#### Variável 3: VITE_LICENSE_CONTRACT_ADDRESS (Opcional)
```
Name: VITE_LICENSE_CONTRACT_ADDRESS
Value: 0x2577879dE5bC7bc87db820C79f7d65bFfE2d9fb7
Environments: ☑ Production ☑ Preview ☑ Development
```

### Passo 3: Salvar e Redeploy

1. Clique em **Save** para cada variável
2. Vá em **Deployments**
3. Clique nos **3 pontos** do último deployment
4. Selecione **Redeploy**

## ✅ Variáveis já configuradas no vercel.json

Estas variáveis já estão no `vercel.json` e funcionam automaticamente:

- ✅ `VITE_WALLETCONNECT_PROJECT_ID` = `3fcc6bba6f1de962d911bb5b5c3dba68`
- ✅ `VITE_SCROLL_RPC_URL` = `https://sepolia-rpc.scroll.io`
- ✅ `VITE_SIWE_DOMAIN` = `radar.snelabs.space`
- ✅ `VITE_SIWE_ORIGIN` = `https://radar.snelabs.space`

## 🔧 Via CLI (Alternativa)

Se preferir usar a CLI:

```bash
# Instalar Vercel CLI
npm i -g vercel

# Login
vercel login

# Adicionar variáveis
vercel env add VITE_API_BASE_URL production
# Digite o valor quando solicitado

vercel env add VITE_WS_URL production
# Digite o valor quando solicitado

# Verificar
vercel env ls
```

## 📝 Checklist

- [ ] Backend deployado no Cloud Run
- [ ] URL do backend anotada
- [ ] `VITE_API_BASE_URL` configurada no Vercel
- [ ] `VITE_WS_URL` configurada no Vercel
- [ ] `VITE_LICENSE_CONTRACT_ADDRESS` configurada (opcional)
- [ ] Redeploy feito após configurar variáveis

## ⚠️ Importante

- **NUNCA** commite valores reais de produção no código
- Use sempre variáveis de ambiente no Vercel
- As variáveis são injetadas em **build time** (não runtime)
- Após adicionar variáveis, é necessário fazer **redeploy**

---

**✅ Agora o `vercel.json` não referencia Secrets inexistentes!**

Configure as variáveis manualmente no Dashboard do Vercel.

