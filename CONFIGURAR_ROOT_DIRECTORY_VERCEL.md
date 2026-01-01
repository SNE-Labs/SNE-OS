# ⚙️ Configurar Root Directory no Vercel

## ⚠️ Problema

O `vercel.json` não suporta a propriedade `rootDirectory`. Essa configuração deve ser feita no **Dashboard do Vercel**.

## ✅ Solução

### Opção 1: Configurar no Dashboard (Recomendado)

1. Acesse: https://vercel.com/dashboard
2. Selecione seu projeto **SNE-Radar**
3. Vá em **Settings** > **General**
4. Role até **Root Directory**
5. Selecione: **`frontend`**
6. Clique em **Save**

Agora o Vercel vai:
- ✅ Usar `frontend/` como diretório raiz
- ✅ Executar comandos dentro de `frontend/` automaticamente
- ✅ Não precisar de `cd frontend` nos comandos

### Opção 2: Usar comandos com `cd` (Atual)

Se preferir não configurar no Dashboard, o `vercel.json` atual já está configurado com:
```json
{
  "buildCommand": "cd frontend && npm install && npm run build",
  "outputDirectory": "frontend/dist"
}
```

Isso deve funcionar, mas pode dar erro se o diretório não existir no contexto do build.

## 🎯 Recomendação

**Configure o Root Directory no Dashboard** (Opção 1) para evitar problemas com `cd frontend`.

Depois de configurar, você pode simplificar o `vercel.json`:

```json
{
  "buildCommand": "npm install && npm run build",
  "outputDirectory": "dist",
  "framework": "vite"
}
```

## 📝 Passo a Passo no Dashboard

1. **Acesse o projeto no Vercel**
2. **Settings** > **General**
3. **Root Directory**: Digite `frontend` ou selecione da lista
4. **Save**
5. **Redeploy** o projeto

---

**✅ Após configurar, o build deve funcionar corretamente!**

