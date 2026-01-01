# ⚠️ URGENTE: Configurar Root Directory no Vercel

## 🚨 Problema Atual

O Vercel continua tentando executar `cd frontend` mas não encontra o diretório durante o build, mesmo que ele exista no repositório.

## ✅ SOLUÇÃO DEFINITIVA

**Você DEVE configurar o Root Directory no Dashboard do Vercel!**

### Passo a Passo:

1. **Acesse:** https://vercel.com/dashboard
2. **Selecione:** Projeto **SNE-Radar**
3. **Vá em:** **Settings** > **General**
4. **Role até:** **Root Directory**
5. **Digite:** `frontend`
6. **Clique:** **Save**
7. **Redeploy:** Vá em **Deployments** > **3 pontos** > **Redeploy**

## 🎯 Por que isso é necessário?

O Vercel precisa saber que o diretório raiz do projeto é `frontend/`, não a raiz do repositório. Quando você configura isso:

- ✅ O Vercel automaticamente usa `frontend/` como diretório de trabalho
- ✅ Todos os comandos rodam dentro de `frontend/` automaticamente
- ✅ O `package.json` é encontrado automaticamente
- ✅ Não precisa de `cd frontend` em nenhum comando

## 📝 Após Configurar

Depois de configurar o Root Directory, você pode simplificar o `vercel.json`:

```json
{
  "buildCommand": "npm install && npm run build",
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

## ⚠️ IMPORTANTE

**Não há como fazer funcionar sem configurar o Root Directory no Dashboard!**

O `vercel.json` não suporta `rootDirectory` como propriedade. Essa configuração **DEVE** ser feita no Dashboard do Vercel.

---

**🚀 Configure agora e faça o redeploy!**

