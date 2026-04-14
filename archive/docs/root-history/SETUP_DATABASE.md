# 🗄️ Setup do Banco de Dados

## ✅ Status

- ✅ `flask-sqlalchemy` instalado
- ✅ Alembic inicializado
- ✅ Model `UserTier` criado
- ✅ Script `init_db.py` criado

## 📋 Opções de Banco de Dados

### Opção 1: SQLite (Desenvolvimento Local - Mais Fácil)

**Vantagens:**
- ✅ Não precisa instalar nada
- ✅ Funciona imediatamente
- ✅ Perfeito para desenvolvimento

**Configuração:**
```bash
# No backend/.env
DATABASE_URL=sqlite:///sne_radar.db
```

**Inicializar:**
```bash
cd backend
venv\Scripts\activate
python scripts\init_db.py
```

### Opção 2: PostgreSQL (Produção/Desenvolvimento Avançado)

**Vantagens:**
- ✅ Mais robusto
- ✅ Melhor para produção
- ✅ Suporta mais recursos

**Instalação (Windows):**
1. Baixar PostgreSQL: https://www.postgresql.org/download/windows/
2. Instalar e criar database:
```sql
CREATE DATABASE sne_radar;
```

**Configuração:**
```bash
# No backend/.env
DATABASE_URL=postgresql://postgres:password@localhost:5432/sne_radar
```

**Inicializar:**
```bash
cd backend
venv\Scripts\activate
python scripts\init_db.py
```

## 🔧 Comandos Úteis

### Criar Migration
```bash
cd backend
venv\Scripts\activate
alembic revision --autogenerate -m "Descrição da mudança"
```

### Aplicar Migrations
```bash
alembic upgrade head
```

### Reverter Migration
```bash
alembic downgrade -1
```

### Ver Status das Migrations
```bash
alembic current
alembic history
```

## 📊 Estrutura da Tabela `user_tiers`

```sql
CREATE TABLE user_tiers (
    id INTEGER PRIMARY KEY,
    address VARCHAR(42) UNIQUE NOT NULL,
    tier VARCHAR(20) NOT NULL,  -- 'free', 'premium', 'pro'
    updated_at DATETIME,
    synced_with_contract BOOLEAN DEFAULT FALSE
);
```

## ✅ Próximos Passos

1. **Escolher banco de dados:**
   - SQLite para desenvolvimento rápido
   - PostgreSQL para produção

2. **Configurar `.env`:**
   - Atualizar `DATABASE_URL`

3. **Inicializar banco:**
   ```bash
   python scripts\init_db.py
   ```

4. **Testar conexão:**
   ```bash
   python -c "from main import app, db; print('✅ DB conectado!')"
   ```

---

**Status Atual:** ✅ Pronto para inicializar o banco de dados!

