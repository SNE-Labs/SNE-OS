# 🚀 Deploy SNE OS no Vercel

## ✅ Setup Completo para Vercel

### 📋 Configuração do Projeto

O SNE OS está **100% preparado** para deploy no Vercel com a seguinte configuração:

#### Arquivos Criados/Atualizados:
- ✅ `vercel.json` - Configuração completa do Vercel
- ✅ `env.example` - Template de variáveis de ambiente
- ✅ `package.json` - Scripts atualizados (dev, build, preview)
- ✅ `vite.config.ts` - Configurado com proxy para desenvolvimento

## 🔧 Configuração no Vercel

### 1. Conectar Repositório

1. Acesse [Vercel Dashboard](https://vercel.com/dashboard)
2. Clique em "Add New Project"
3. Conecte o repositório `SNE-Labs/SNE-OS`
4. Configure automaticamente (Vercel detectará Vite)

### 2. Configurações Automáticas (via vercel.json)

```json
{
  "buildCommand": "npm run build",
  "outputDirectory": "dist",
  "framework": "vite",
  "rewrites": [
    {
      "source": "/(.*)",
      "destination": "/index.html"
    }
  ]
}
```

### 3. Variáveis de Ambiente

Configure no Vercel Dashboard:

#### Produção (snelabs.space):
```
VITE_API_BASE=https://snelabs.space
VITE_WALLETCONNECT_PROJECT_ID=3fcc6bba6f1de962d911bb5b5c3dba68
VITE_SCROLL_RPC_URL=https://sepolia-rpc.scroll.io
VITE_SIWE_DOMAIN=snelabs.space
VITE_SIWE_ORIGIN=https://snelabs.space
```

#### Desenvolvimento (local):
```
VITE_API_BASE=http://localhost:5000
```

## 🌐 Domínio Personalizado

1. No Vercel Dashboard → Settings → Domains
2. Adicione: `snelabs.space`
3. Configure DNS conforme instruções do Vercel

## 📦 Estrutura do Deploy

```
SNE-OS/
├── vercel.json          # ✅ Configuração Vercel
├── env.example          # ✅ Template variáveis ambiente
├── package.json         # ✅ Scripts npm atualizados
├── vite.config.ts       # ✅ Proxy para desenvolvimento
├── dist/                # ✅ Build output (gerado automaticamente)
└── src/                 # ✅ Código fonte
    ├── app/
    ├── lib/
    ├── hooks/
    └── ...
```

## 🎯 O que o Vercel Faz Automaticamente

1. ✅ Detecta projeto Vite automaticamente
2. ✅ Instala dependências (`npm install`)
3. ✅ Executa build (`npm run build`)
4. ✅ Serve arquivos de `dist/`
5. ✅ Aplica SPA rewrites (todas as rotas → `/index.html`)
6. ✅ Configura cache otimizado para assets
7. ✅ Injeta variáveis de ambiente em build-time

## 🚀 Deploy via CLI (Opcional)

```bash
# Instalar Vercel CLI
npm i -g vercel

# Login
vercel login

# Deploy (primeira vez)
vercel

# Deploy para produção
vercel --prod
```

## 🔍 Verificações Pós-Deploy

Após deploy, teste:

1. ✅ Site carrega em `https://snelabs.space`
2. ✅ Roteamento funciona (`/radar`, `/vault`, `/pass`, etc.)
3. ✅ WalletConnect conecta
4. ✅ SIWE (Sign-In with Ethereum) funciona
5. ✅ API calls para `https://snelabs.space/api/*` funcionam
6. ✅ Entitlements são carregados corretamente

## ⚠️ Backend Separado

**Importante:** O backend Flask deve ser deployado separadamente:

- **Não vai para Vercel**
- Deve ser deployado em: Cloud Run, Railway, Render, etc.
- URL final: `https://snelabs.space` (mesmo domínio)
- Precisa de CORS configurado para aceitar `https://snelabs.space`

## 🔧 Desenvolvimento Local

```bash
# Instalar dependências
npm install

# Desenvolvimento (com proxy para backend local)
npm run dev

# Build para produção
npm run build

# Preview do build local
npm run preview
```

## 🔍 Troubleshooting

### Build falha no Vercel
- Verifique logs no Vercel Dashboard
- Certifique-se que todas as dependências estão em `package.json`
- Teste build local: `npm run build`

### API não funciona
- Verifique `VITE_API_BASE` no Vercel
- Backend deve ter CORS para `https://snelabs.space`
- Teste API endpoints diretamente

### SIWE não funciona
- Verifique variáveis `VITE_SIWE_DOMAIN` e `VITE_SIWE_ORIGIN`
- Devem ser exatamente `snelabs.space` e `https://snelabs.space`

### 404 em rotas SPA
- `vercel.json` deve ter rewrites configurados
- Todas as rotas devem ir para `/index.html`

## ✅ Checklist Final

- [x] `vercel.json` criado e configurado
- [x] `package.json` com scripts corretos
- [x] `vite.config.ts` com proxy para dev
- [x] Build funciona localmente (`npm run build`)
- [ ] Repositório conectado no Vercel
- [ ] Variáveis de ambiente configuradas no Vercel
- [ ] Domínio `snelabs.space` configurado
- [ ] Backend deployado e acessível
- [ ] Testes funcionais realizados

---

**🎉 SNE OS está pronto para deploy no Vercel!**

**Domínio Final:** `https://snelabs.space`
