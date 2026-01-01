# 🔧 Solução para Build no Vercel

## ⚠️ Problema

O Vercel não encontra o diretório `frontend` durante o build, mesmo que ele exista no repositório.

## ✅ Soluções Implementadas

### 1. Script de Build (`build.sh`)

Criei um script `build.sh` na raiz que:
- Entra no diretório `frontend`
- Instala dependências
- Executa o build

### 2. Configuração no Dashboard (RECOMENDADO)

A **melhor solução** é configurar o **Root Directory** no Dashboard do Vercel:

1. Acesse: https://vercel.com/dashboard
2. Selecione seu projeto **SNE-Radar**
3. Vá em **Settings** > **General**
4. Role até **Root Directory**
5. Digite: `frontend`
6. Clique em **Save**
7. **Redeploy** o projeto

### 3. Após Configurar Root Directory

Depois de configurar o Root Directory no Dashboard, você pode simplificar o `vercel.json`:

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

## 🎯 Por que isso funciona?

Quando você configura o Root Directory como `frontend` no Dashboard:
- ✅ O Vercel usa `frontend/` como diretório raiz
- ✅ Todos os comandos rodam dentro de `frontend/` automaticamente
- ✅ Não precisa de `cd frontend` nos comandos
- ✅ O `package.json` é encontrado automaticamente

## 📝 Checklist

- [ ] Configurar Root Directory no Dashboard do Vercel
- [ ] Redeploy o projeto
- [ ] Verificar se o build funciona
- [ ] (Opcional) Simplificar `vercel.json` após configurar Root Directory

---

**💡 Dica:** A configuração do Root Directory no Dashboard é a solução mais confiável e recomendada pelo Vercel!

