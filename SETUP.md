# Setup do Projeto SNE Radar

## 📋 Estrutura Criada

```
SNE-RADAR-DEPLOY/
├── frontend/              # Vue.js 3 + TypeScript + Vite
│   ├── src/
│   │   ├── router/        # Vue Router
│   │   ├── views/         # Páginas
│   │   ├── components/    # Componentes Vue
│   │   ├── composables/  # Composables (useWallet, etc)
│   │   └── stores/       # Pinia stores
│   ├── package.json
│   └── vite.config.ts
├── backend/               # Flask + Socket.IO
│   ├── app/
│   │   ├── api/          # Blueprints (auth, charts, etc)
│   │   ├── services/     # LicenseService, etc
│   │   ├── models/       # SQLAlchemy models
│   │   ├── utils/        # Utilities (tier_checker, etc)
│   │   └── socketio/     # Socket.IO handlers
│   ├── main.py
│   └── requirements.txt
├── contracts/            # Smart contracts (ABI)
└── docs/                 # Documentação adicional
```

## 🚀 Próximos Passos

### 1. Frontend

```bash
cd frontend
npm install
npm run dev
```

### 2. Backend

```bash
cd backend
python -m venv venv
venv\Scripts\activate  # Windows
pip install -r requirements.txt

# Copiar .env.example para .env e configurar
copy .env.example .env

# Executar
python main.py
```

### 3. Implementações Prioritárias

#### Frontend
- [ ] Composable `useWallet.ts` (WalletConnect + SIWE)
- [ ] Store de autenticação (Pinia)
- [ ] Componente de conexão de wallet
- [ ] Dashboard com dados de mercado
- [ ] Chart com TradingView Lightweight Charts
- [ ] Análise técnica (Premium/Pro)

#### Backend
- [ ] Blueprint `/api/auth` (nonce, siwe, verify, logout)
- [ ] `LicenseService` (verificação on-chain)
- [ ] `UserTier` model (banco de dados)
- [ ] Socket.IO handlers (connect, join_dashboard, join_chart)
- [ ] Middleware `require_tier`
- [ ] Rate limiting
- [ ] Logging estruturado

### 4. Configuração

1. **Backend `.env`:**
   - Configurar `SECRET_KEY`
   - Configurar `DATABASE_URL` (PostgreSQL)
   - Configurar `REDIS_HOST` e `REDIS_PORT`
   - Configurar `SCROLL_RPC_URL` e `LICENSE_CONTRACT_ADDRESS`

2. **Frontend:**
   - Configurar variáveis de ambiente (Vite)
   - Configurar WalletConnect project ID

### 5. Banco de Dados

```sql
-- Criar tabela user_tiers
CREATE TABLE user_tiers (
    id SERIAL PRIMARY KEY,
    address VARCHAR(42) UNIQUE NOT NULL,
    tier VARCHAR(20) NOT NULL,  -- free, premium, pro
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    synced_with_contract BOOLEAN DEFAULT FALSE
);

CREATE INDEX idx_user_tiers_address ON user_tiers(address);
```

## 📚 Referências

- Consulte `PLANO_DEPLOY_COMPLETO_SNE_RADAR.md` no repositório principal para detalhes completos
- Documentação Vue.js: https://vuejs.org/
- Documentação Flask: https://flask.palletsprojects.com/
- Documentação Wagmi: https://wagmi.sh/

