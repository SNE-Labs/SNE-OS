# 🚀 Deploy no Vercel - SNE Radar Frontend

## ✅ Preparação Completa

O projeto está **100% preparado** para deploy no Vercel!

### 📋 Arquivos Criados:

1. ✅ `vercel.json` - Configuração do Vercel
2. ✅ `frontend/.env.example` - Template de variáveis de ambiente
3. ✅ `frontend/vite.config.ts` - Otimizado para produção

## 🔧 Configuração no Vercel

### 1. Conectar Repositório

1. Acesse [Vercel Dashboard](https://vercel.com/dashboard)
2. Clique em "Add New Project"
3. Conecte o repositório `SNE-Labs/SNE-Radar`
4. Configure:
   - **Framework Preset:** Vite
   - **Root Directory:** `frontend` (ou deixe raiz e ajuste `vercel.json`)
   - **Build Command:** `npm run build` (já configurado no `vercel.json`)
   - **Output Directory:** `dist` (já configurado no `vercel.json`)

### 2. Variáveis de Ambiente

Configure as seguintes variáveis no Vercel Dashboard:

#### Obrigatórias:
```
VITE_API_BASE_URL=https://sne-radar-api-xxxxx.run.app
VITE_WS_URL=wss://sne-radar-api-xxxxx.run.app
VITE_WALLETCONNECT_PROJECT_ID=seu-project-id-aqui
```

#### Opcionais (já têm valores padrão):
```
VITE_SCROLL_RPC_URL=https://sepolia-rpc.scroll.io
VITE_LICENSE_CONTRACT_ADDRESS=0x2577879dE5bC7bc87db820C79f7d65bFfE2d9fb7
VITE_SIWE_DOMAIN=radar.snelabs.space
VITE_SIWE_ORIGIN=https://radar.snelabs.space
```

### 3. Domínio Personalizado (Opcional)

1. No Vercel Dashboard, vá em **Settings > Domains**
2. Adicione: `radar.snelabs.space`
3. Configure DNS conforme instruções do Vercel

## 📦 Estrutura do Deploy

```
SNE-Radar/
├── vercel.json          # ✅ Configuração Vercel
├── frontend/
│   ├── dist/            # ✅ Build output (gerado)
│   ├── .env.example     # ✅ Template de variáveis
│   ├── vite.config.ts   # ✅ Config otimizada
│   └── package.json     # ✅ Dependências
└── backend/             # ⚠️ NÃO será deployado no Vercel
    └── ...              # (Backend vai para Cloud Run)
```

## 🎯 O que o Vercel faz:

1. ✅ Detecta automaticamente que é um projeto Vite
2. ✅ Instala dependências (`npm install`)
3. ✅ Executa build (`npm run build`)
4. ✅ Serve arquivos estáticos de `frontend/dist`
5. ✅ Aplica rewrites para SPA (todas as rotas → `/index.html`)
6. ✅ Configura cache para assets estáticos
7. ✅ Injeta variáveis de ambiente em build time

## ⚠️ Importante:

### Backend NÃO vai para Vercel

O backend (Flask) deve ser deployado no **Google Cloud Run**:

```bash
# Backend vai para Cloud Run
cd backend
gcloud run deploy sne-radar-api \
  --source . \
  --region us-central1 \
  --allow-unauthenticated
```

### Variáveis de Ambiente

**NUNCA** commite `.env` no Git! Use apenas `.env.example`.

No Vercel, configure as variáveis via Dashboard ou CLI:

```bash
vercel env add VITE_API_BASE_URL
vercel env add VITE_WALLETCONNECT_PROJECT_ID
# etc...
```

## 🚀 Deploy Manual (CLI)

Se preferir usar CLI:

```bash
# Instalar Vercel CLI
npm i -g vercel

# Login
vercel login

# Deploy (primeira vez)
cd frontend
vercel

# Deploy para produção
vercel --prod
```

## 📊 Verificações Pós-Deploy

Após o deploy, verifique:

1. ✅ Site carrega sem erros
2. ✅ WalletConnect conecta
3. ✅ API calls funcionam (verificar console do browser)
4. ✅ WebSocket conecta (se aplicável)
5. ✅ SIWE funciona (testar login)

## 🔍 Troubleshooting

### Build falha
- Verifique se todas as dependências estão em `package.json`
- Verifique logs no Vercel Dashboard

### Variáveis de ambiente não funcionam
- Variáveis devem começar com `VITE_` para serem expostas
- Rebuild após adicionar variáveis

### CORS errors
- Verifique se `VITE_API_BASE_URL` está correto
- Backend deve ter CORS configurado para o domínio do Vercel

### 404 em rotas
- Verifique se `rewrites` está configurado no `vercel.json`
- Todas as rotas devem redirecionar para `/index.html`

## ✅ Checklist Final

- [x] `vercel.json` criado
- [x] `frontend/.env.example` criado
- [x] `vite.config.ts` otimizado para produção
- [x] Build funciona localmente (`npm run build`)
- [ ] Variáveis de ambiente configuradas no Vercel
- [ ] Backend deployado no Cloud Run
- [ ] Domínio configurado (opcional)
- [ ] Testes pós-deploy realizados

---

**🎉 O projeto está pronto para deploy no Vercel!**

