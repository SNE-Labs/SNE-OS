# Erros WalletConnect e Backend - Diagnóstico

## 🔴 Problemas Identificados

### 1. WalletConnect - Erro 403 (Allowlist)

**Erro:**
```
Origin https://sneradar.vercel.app not found on Allowlist - update configuration on cloud.reown.com
```

**Causa:** O domínio `https://sneradar.vercel.app` não está na allowlist do projeto WalletConnect.

**Solução:**
1. Acesse https://cloud.reown.com
2. Faça login com sua conta WalletConnect
3. Selecione o projeto com ID: `3fcc6bba6f1de962d911bb5b5c3dba68`
4. Vá em **Settings** → **App Settings**
5. Adicione `https://sneradar.vercel.app` na lista de **Allowed Domains**
6. Salve as alterações

**Domínios que devem estar na allowlist:**
- `https://sneradar.vercel.app` (produção)
- `http://localhost:5173` (desenvolvimento local)
- `http://localhost:3000` (se usar outra porta)

### 2. Backend API - Erro 405 (Method Not Allowed)

**Erro:**
```
api/auth/nonce:1 Failed to load resource: the server responded with a status of 405
```

**Causa:** O endpoint `/api/auth/nonce` não está aceitando requisições POST ou não existe.

**Verificações necessárias:**

1. **Backend está rodando?**
   - Verificar se o servidor Flask está ativo
   - Verificar se está escutando na porta correta
   - Verificar variáveis de ambiente

2. **Endpoint existe?**
   - Verificar se há rota `/api/auth/nonce` no backend
   - Verificar se aceita método POST
   - Verificar CORS se necessário

3. **Código do endpoint esperado:**
```python
@app.route('/api/auth/nonce', methods=['POST'])
def get_nonce():
    data = request.get_json()
    address = data.get('address')
    
    # Gerar nonce único
    nonce = secrets.token_hex(32)
    
    # Armazenar nonce (Redis ou session)
    # ...
    
    return jsonify({'nonce': nonce}), 200
```

### 3. Auth Check Failed - JSON Parse Error

**Erro:**
```
Auth check failed: SyntaxError: Unexpected token '<', "<!DOCTYPE "... is not valid JSON
```

**Causa:** O backend está retornando HTML (provavelmente página de erro 404/500) em vez de JSON.

**Solução:**
- Verificar se o backend está respondendo corretamente
- Verificar se as rotas estão configuradas corretamente
- Verificar se o proxy do Vite está funcionando

## 🔧 Correções Necessárias

### Frontend - useWallet.ts

O código atual está tentando fazer POST para `/api/auth/nonce`, mas pode precisar ajustar:

```typescript
// Verificar se o endpoint está correto
const nonceRes = await fetch('/api/auth/nonce', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  credentials: 'include',
  body: JSON.stringify({ address }),
})
```

### Backend - Verificar Rotas

Certifique-se de que o backend tem:

1. **Rota `/api/auth/nonce`** (POST)
2. **Rota `/api/auth/siwe`** (POST)
3. **Rota `/api/auth/verify`** (GET)
4. **Rota `/api/auth/logout`** (POST)
5. **CORS configurado** para aceitar requisições do frontend

### Variáveis de Ambiente

Verificar se estão configuradas no Vercel:

- `VITE_API_BASE_URL` - URL do backend
- `VITE_WS_URL` - URL do WebSocket
- `VITE_WALLETCONNECT_PROJECT_ID` - ID do projeto WalletConnect
- `VITE_SCROLL_RPC_URL` - RPC do Scroll L2
- `VITE_SIWE_DOMAIN` - Domínio para SIWE
- `VITE_SIWE_ORIGIN` - Origin para SIWE

## 📝 Checklist de Resolução

- [ ] Adicionar `https://sneradar.vercel.app` na allowlist do WalletConnect
- [ ] Verificar se o backend está rodando e acessível
- [ ] Verificar se o endpoint `/api/auth/nonce` existe e aceita POST
- [ ] Verificar CORS no backend
- [ ] Verificar variáveis de ambiente no Vercel
- [ ] Testar conexão do frontend com o backend
- [ ] Verificar logs do backend para erros

## 🚀 Próximos Passos

1. **Imediato:** Adicionar domínio na allowlist do WalletConnect
2. **Verificar Backend:** Confirmar que está rodando e acessível
3. **Testar Endpoints:** Usar Postman/curl para testar `/api/auth/nonce`
4. **Ajustar CORS:** Se necessário, configurar CORS no backend
5. **Testar Localmente:** Verificar se funciona em desenvolvimento

