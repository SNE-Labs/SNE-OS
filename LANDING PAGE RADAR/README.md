# SNE Radar Landing Page

Landing page profissional para distribuição do SNE Radar - Sistema Neural Estratégico.

## 🏗️ Arquitetura

- **Frontend**: React + Vite + Tailwind CSS (Vercel)
- **Backend**: Flask + PostgreSQL (api.snelabs.space)
- **Autenticação**: SIWE (Sign-In with Ethereum)
- **Licenciamento**: NFT on-chain na Scroll
- **Distribuição**: Download seguro via tokens one-time

## 🚀 Funcionalidades

### ✅ Implementado
- Landing page responsiva com design moderno
- Sistema de autenticação SIWE real
- Verificação de licenças on-chain
- Download seguro do executável via tokens
- UI intacta mantendo experiência visual

### 🔄 Fluxo de Usuário
1. **Conectar Wallet** → SIWE authentication
2. **Mint License** → NFT na Scroll (via wagmi)
3. **Download** → Token one-time → Redirect assinado

## 🛠️ Setup Local

### 1. Instalar dependências
```bash
npm install
```

### 2. Configurar ambiente
```bash
cp config.example.ts config.ts
# Edite config.ts com suas chaves
```

### 3. WalletConnect Project ID
```bash
# Acesse https://cloud.walletconnect.com/
# Crie um projeto e copie o Project ID
# Cole em config.ts
```

### 4. Executar desenvolvimento
```bash
npm run dev
```

### 5. Build para produção
```bash
npm run build
npm run preview
```

## 📦 Deploy

### Vercel (Frontend)
```bash
# O vercel.json já está configurado
# Basta conectar o repositório no Vercel
npm run build  # será executado automaticamente
```

### Backend
- O backend roda em `api.snelabs.space`
- Todas as chamadas `/api/*` são redirecionadas via vercel.json

## 🔐 Sistema de Segurança

### Download Seguro
- **Token one-time**: 60-120s TTL
- **Vinculado à wallet**: Não transferível
- **Rate limiting**: Por IP + wallet
- **Logs completos**: Auditoria de downloads

### Autenticação
- **SIWE**: Sign-in with Ethereum
- **Sessão HttpOnly**: Cookies seguros
- **Verificação on-chain**: Licenças validadas na blockchain

## 📋 Endpoints Utilizados

### Autenticação
- `GET /api/auth/nonce?address=0x...`
- `POST /api/auth/verify`

### Licenças
- `GET /api/licenses/me`

### Download
- `POST /api/download-token`
- `GET /api/download/:token`

### Admin (Wallets autorizadas)
- `GET /api/admin/licenses`
- `POST /api/admin/revoke`

## 🎨 Personalização

A landing page mantém **100% do visual atual**. Para modificar:

- **Cores**: `src/styles/theme.css`
- **Textos**: Componentes em `src/app/`
- **Layout**: `src/app/App.tsx`

## 📝 Notas Técnicas

- **UI Intacta**: Zero mudanças visuais para o usuário
- **Backend Real**: Todas as funcionalidades conectam com APIs reais
- **Mint Direto**: Frontend faz mint no contrato, backend verifica
- **Download Seguro**: Sistema de tokens one-time impede burlar

## 🤝 Suporte

Para suporte técnico ou dúvidas sobre integração:
- Backend: `api.snelabs.space`
- Documentação: Arquivos no diretório `../docs/`

---

**© 2025 SNE Labs** - Todos os direitos reservados
