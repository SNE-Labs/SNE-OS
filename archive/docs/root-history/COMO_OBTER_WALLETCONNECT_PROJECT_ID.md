# 🔑 Como Obter o WalletConnect Project ID

## 📋 O que é o WalletConnect Project ID?

O **WalletConnect Project ID** é um identificador único necessário para usar o **WalletConnect v2** (a versão atual do WalletConnect). Ele é usado para:

- ✅ Conectar wallets ao seu aplicativo
- ✅ Gerenciar sessões de conexão
- ✅ Autenticar requisições ao WalletConnect Cloud

## 🚀 Como Obter o Project ID

### Passo 1: Acesse o WalletConnect Cloud

1. Acesse: **https://cloud.walletconnect.com/**
2. Faça login com sua conta (ou crie uma gratuita)

### Passo 2: Criar um Novo Projeto

1. No dashboard, clique em **"Create New Project"** ou **"New Project"**
2. Preencha:
   - **Project Name:** `SNE Radar` (ou o nome que preferir)
   - **Homepage URL:** `https://radar.snelabs.space` (ou seu domínio)
   - **Description:** (opcional) Descrição do projeto

### Passo 3: Obter o Project ID

1. Após criar o projeto, você verá o **Project ID**
2. Ele tem o formato: `a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6`
3. **Copie este ID** - você precisará dele!

## 📝 Exemplo Visual

```
┌─────────────────────────────────────┐
│  WalletConnect Cloud Dashboard      │
├─────────────────────────────────────┤
│                                     │
│  Project: SNE Radar                 │
│  Project ID: a1b2c3d4e5f6...       │ ← Este é o ID!
│                                     │
│  [Copy Project ID]                  │
│                                     │
└─────────────────────────────────────┘
```

## 🔧 Como Configurar

### No Vercel (Produção)

1. Acesse: https://vercel.com/dashboard
2. Vá em **Settings > Environment Variables**
3. Adicione:
   ```
   Key: VITE_WALLETCONNECT_PROJECT_ID
   Value: a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6
   ```
4. Selecione os ambientes: **Production, Preview, Development**
5. Salve

### Localmente (Desenvolvimento)

1. Crie/edite `frontend/.env`:
   ```env
   VITE_WALLETCONNECT_PROJECT_ID=a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6
   ```
2. Reinicie o servidor de desenvolvimento

## ⚠️ Importante

### ✅ Gratuito
- O WalletConnect Cloud tem um plano **gratuito** que é suficiente para começar
- Limite: ~1 milhão de requisições/mês (mais que suficiente para desenvolvimento)

### 🔒 Segurança
- O Project ID **NÃO é secreto** - pode ser exposto no frontend
- Ele identifica seu projeto, mas não dá acesso a dados sensíveis
- É seguro commitar no código (mas use variável de ambiente mesmo assim)

### 🎯 Uso no Código

O Project ID é usado assim no código:

```typescript
// frontend/src/composables/useWallet.ts
const projectId = import.meta.env.VITE_WALLETCONNECT_PROJECT_ID || 'your-project-id'

// Configuração do WalletConnect
const wagmiConfig = createConfig({
  connectors: [
    walletConnect({
      projectId: projectId, // ← Aqui!
      // ...
    })
  ]
})
```

## 📚 Links Úteis

- **WalletConnect Cloud:** https://cloud.walletconnect.com/
- **Documentação:** https://docs.walletconnect.com/
- **Dashboard:** https://cloud.walletconnect.com/dashboard

## 🆘 Troubleshooting

### "Invalid Project ID"
- Verifique se copiou o ID completo (64 caracteres)
- Certifique-se de que o projeto está ativo no dashboard

### "Project not found"
- Verifique se está usando o ID correto
- Confirme que o projeto existe no WalletConnect Cloud

### Wallets não conectam
- Verifique se o Project ID está configurado corretamente
- Veja o console do browser para erros
- Certifique-se de que o domínio está autorizado (se necessário)

---

**💡 Dica:** Anote o Project ID em um local seguro, pois você precisará dele sempre que configurar um novo ambiente!

