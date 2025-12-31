# 🚀 Deploy - SNE Scroll Passport

## ✅ Commit e Push Concluídos

O código foi commitado e enviado para:
**https://github.com/4LFR3Dv1/SNE-Scroll-Passport**

## 📦 Deploy no Vercel

### Opção 1: Deploy via Vercel Dashboard (Recomendado)

1. Acesse: https://vercel.com
2. Faça login com GitHub
3. Clique em "Add New Project"
4. Importe o repositório: `4LFR3Dv1/SNE-Scroll-Passport`
5. Configure:
   - **Framework Preset**: Vite
   - **Root Directory**: `sne-scroll-pass` (se necessário)
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
6. Clique em "Deploy"

### Opção 2: Deploy via CLI

```bash
# Instalar Vercel CLI
npm i -g vercel

# Fazer deploy
cd sne-scroll-pass
vercel

# Para produção
vercel --prod
```

## 🔧 Variáveis de Ambiente (Opcional)

Se precisar configurar variáveis de ambiente no Vercel:

- `VITE_WALLETCONNECT_PROJECT_ID` - Para WalletConnect (opcional)

## 📝 Notas Importantes

- O app usa proxy em desenvolvimento (`/api/rpc`)
- Em produção, usa RPC direto: `https://sepolia-rpc.scroll.io`
- Cache local funciona no navegador (LocalStorage)
- Todas as requisições são sob demanda (clique para buscar)

## 🌐 Após Deploy

O Vercel fornecerá uma URL como:
`https://sne-scroll-passport.vercel.app`

---

**Status**: ✅ Código commitado e pronto para deploy

