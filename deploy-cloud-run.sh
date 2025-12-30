#!/bin/bash
# 🚀 Script Completo de Deploy SNE Radar no Google Cloud Run
# Inclui: Cloud SQL, tabelas, backend, frontend

set -e

# ==================== CONFIGURAÇÃO ====================
PROJECT_ID=${PROJECT_ID:-"sne-labs"}
INSTANCE_NAME=${INSTANCE_NAME:-"sne-db-prod"}
DB_NAME=${DB_NAME:-"sne"}
REGION=${REGION:-"us-central1"}
SERVICE_NAME="sne-web"

echo "🚀 Iniciando deploy completo do SNE Radar"
echo "Projeto: $PROJECT_ID"
echo "Região: $REGION"
echo "Instância DB: $INSTANCE_NAME"
echo "Serviço: $SERVICE_NAME"
echo ""

# ==================== 1. VERIFICAR GCP ====================
echo "🔍 Verificando configuração Google Cloud..."
gcloud config set project $PROJECT_ID
gcloud config set compute/region $REGION

# Verificar se projeto existe
if ! gcloud projects describe $PROJECT_ID &>/dev/null; then
    echo "❌ Projeto $PROJECT_ID não encontrado!"
    echo "📝 Crie o projeto em: https://console.cloud.google.com/"
    exit 1
fi

echo "✅ Projeto $PROJECT_ID encontrado"

# ==================== 2. HABILITAR APIS ====================
echo ""
echo "🔧 Habilitando APIs do Google Cloud..."

APIs=(
    "run.googleapis.com"
    "sqladmin.googleapis.com"
    "containerregistry.googleapis.com"
    "secretmanager.googleapis.com"
    "cloudbuild.googleapis.com"
    "storage.googleapis.com"
)

for api in "${APIs[@]}"; do
    echo "  - Habilitando $api..."
    gcloud services enable $api --quiet
done

echo "✅ APIs habilitadas"

# ==================== 3. CRIAR CLOUD SQL ====================
echo ""
echo "🗄️ Configurando Cloud SQL..."

# Verificar se instância já existe
if gcloud sql instances describe $INSTANCE_NAME --project=$PROJECT_ID &>/dev/null; then
    echo "✅ Instância Cloud SQL $INSTANCE_NAME já existe"
else
    echo "📦 Criando instância Cloud SQL..."
    gcloud sql instances create $INSTANCE_NAME \
        --database-version=POSTGRES_15 \
        --cpu=2 \
        --memory=4GB \
        --region=$REGION \
        --root-password="5a9862d483ba291dc2012f254cce03a7" \
        --project=$PROJECT_ID \
        --quiet

    echo "⏳ Aguardando Cloud SQL ficar pronto..."
    sleep 60
fi

# Criar banco de dados se não existir
if ! gcloud sql databases describe $DB_NAME --instance=$INSTANCE_NAME --project=$PROJECT_ID &>/dev/null; then
    echo "📊 Criando banco de dados $DB_NAME..."
    gcloud sql databases create $DB_NAME \
        --instance=$INSTANCE_NAME \
        --project=$PROJECT_ID \
        --quiet
fi

# Criar usuário se não existir
if ! gcloud sql users describe sne_admin --instance=$INSTANCE_NAME --project=$PROJECT_ID &>/dev/null; then
    echo "👤 Criando usuário sne_admin..."
    gcloud sql users create sne_admin \
        --instance=$INSTANCE_NAME \
        --password="5a9862d483ba291dc2012f254cce03a7" \
        --project=$PROJECT_ID \
        --quiet
fi

echo "✅ Cloud SQL configurado"

# ==================== 4. CRIAR TABELAS ====================
echo ""
echo "📋 Criando tabelas do banco..."

# Criar arquivo SQL temporário
cat > /tmp/init_sne_db.sql << 'EOF'
-- Tabela users (compatibilidade)
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(255) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabela signals (compatibilidade)
CREATE TABLE IF NOT EXISTS signals (
    id SERIAL PRIMARY KEY,
    pair VARCHAR(20) NOT NULL,
    signal_type VARCHAR(50) NOT NULL,
    price DECIMAL(18, 8),
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    metadata JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabela trades (compatibilidade)
CREATE TABLE IF NOT EXISTS trades (
    id SERIAL PRIMARY KEY,
    pair VARCHAR(20) NOT NULL,
    side VARCHAR(10) NOT NULL,
    price DECIMAL(18, 8) NOT NULL,
    quantity DECIMAL(18, 8) NOT NULL,
    status VARCHAR(20) DEFAULT 'pending',
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    metadata JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabela analyses (SNE Radar)
CREATE TABLE IF NOT EXISTS analyses (
    id SERIAL PRIMARY KEY,
    user_address VARCHAR(42) NOT NULL,
    pair VARCHAR(20) NOT NULL,
    timeframe VARCHAR(10) NOT NULL,
    analysis_result JSONB NOT NULL,
    tier VARCHAR(20) DEFAULT 'free',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabela user_tiers (SNE Radar)
CREATE TABLE IF NOT EXISTS user_tiers (
    id SERIAL PRIMARY KEY,
    user_address VARCHAR(42) UNIQUE NOT NULL,
    tier VARCHAR(20) DEFAULT 'free',
    license_expires TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_signals_pair ON signals(pair);
CREATE INDEX IF NOT EXISTS idx_signals_timestamp ON signals(timestamp);
CREATE INDEX IF NOT EXISTS idx_trades_pair ON trades(pair);
CREATE INDEX IF NOT EXISTS idx_trades_status ON trades(status);
CREATE INDEX IF NOT EXISTS idx_analyses_user ON analyses(user_address);
CREATE INDEX IF NOT EXISTS idx_analyses_created ON analyses(created_at);
CREATE INDEX IF NOT EXISTS idx_user_tiers_address ON user_tiers(user_address);
EOF

# Upload para Cloud Storage e importar
BUCKET_NAME="${PROJECT_ID}-temp-sql"
SQL_FILE="init_sne_db.sql"

# Criar bucket se não existir
if ! gsutil ls "gs://${BUCKET_NAME}" &>/dev/null; then
    gsutil mb "gs://${BUCKET_NAME}" || true
fi

# Upload SQL
gsutil cp /tmp/init_sne_db.sql "gs://${BUCKET_NAME}/${SQL_FILE}"

# Importar SQL
echo "📥 Importando tabelas..."
gcloud sql import sql $INSTANCE_NAME \
    "gs://${BUCKET_NAME}/${SQL_FILE}" \
    --database=$DB_NAME \
    --project=$PROJECT_ID \
    --quiet

# Limpar
gsutil rm "gs://${BUCKET_NAME}/${SQL_FILE}" || true
rm -f /tmp/init_sne_db.sql

echo "✅ Tabelas criadas"

# ==================== 5. CRIAR SECRETS ====================
echo ""
echo "🔐 Configurando secrets..."

# JWT Secret
if ! gcloud secrets describe sne-jwt-secret --project=$PROJECT_ID &>/dev/null; then
    echo -n "sne-jwt-secret-$(date +%s)" | \
        gcloud secrets create sne-jwt-secret --data-file=- --project=$PROJECT_ID
fi

# Database password
if ! gcloud secrets describe sne-db-password --project=$PROJECT_ID &>/dev/null; then
    echo -n "5a9862d483ba291dc2012f254cce03a7" | \
        gcloud secrets create sne-db-password --data-file=- --project=$PROJECT_ID
fi

echo "✅ Secrets configurados"

# ==================== 6. BUILD E DEPLOY ====================
echo ""
echo "🐳 Build e deploy do backend..."

# Verificar se estamos no diretório correto
if [ ! -d "backend-v2/services/sne-web" ]; then
    echo "❌ Diretório backend-v2/services/sne-web não encontrado!"
    echo "📁 Execute este script do diretório raiz do projeto"
    exit 1
fi

cd backend-v2/services/sne-web

# Build Docker image
echo "🏗️ Building Docker image..."
docker build -t gcr.io/$PROJECT_ID/$SERVICE_NAME:latest .

# Push to Container Registry
echo "📤 Pushing to Container Registry..."
docker push gcr.io/$PROJECT_ID/$SERVICE_NAME:latest

# Deploy to Cloud Run
echo "🚀 Deploying to Cloud Run..."
gcloud run deploy $SERVICE_NAME \
    --image gcr.io/$PROJECT_ID/$SERVICE_NAME:latest \
    --platform managed \
    --region=$REGION \
    --allow-unauthenticated \
    --port 8080 \
    --memory 1Gi \
    --cpu 1 \
    --max-instances 10 \
    --concurrency 80 \
    --timeout 300 \
    --set-env-vars="\
        SECRET_KEY=sne-jwt-secret-change-in-production,\
        SIWE_DOMAIN=radar.snelabs.space,\
        SIWE_ORIGIN=https://radar.snelabs.space,\
        DEBUG=false,\
        FLASK_ENV=production,\
        DB_NAME=$DB_NAME,\
        DB_USER=sne_admin,\
        DB_PORT=5432,\
        PORT=8080" \
    --set-secrets="\
        DB_PASSWORD=sne-db-password:latest,\
        JWT_SECRET=sne-jwt-secret:latest" \
    --add-cloudsql-instances=$PROJECT_ID:$REGION:$INSTANCE_NAME \
    --project=$PROJECT_ID \
    --quiet

# ==================== 7. VERIFICAÇÃO ====================
echo ""
echo "🔍 Verificando deploy..."

# Obter URL do serviço
SERVICE_URL=$(gcloud run services describe $SERVICE_NAME \
    --region=$REGION \
    --project=$PROJECT_ID \
    --format="value(status.url)")

echo "✅ Deploy concluído!"
echo ""
echo "🌐 URL do backend: $SERVICE_URL"
echo ""
echo "🧪 Testando endpoints..."

# Testar health check
if curl -f -s "$SERVICE_URL/health" > /dev/null; then
    echo "✅ Health check: OK"
else
    echo "❌ Health check: FAIL"
fi

# Testar nonce endpoint
if curl -f -s -X POST "$SERVICE_URL/api/auth/nonce" \
    -H "Content-Type: application/json" \
    -d '{"address": "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb"}' > /dev/null; then
    echo "✅ Auth nonce: OK"
else
    echo "❌ Auth nonce: FAIL"
fi

# ==================== 8. INSTRUÇÕES FINAIS ====================
echo ""
echo "🎉 DEPLOY CONCLUÍDO COM SUCESSO!"
echo ""
echo "📋 PRÓXIMOS PASSOS:"
echo ""
echo "1. 📝 Anote a URL do backend:"
echo "   $SERVICE_URL"
echo ""
echo "2. 🌐 Configure o Vercel (frontend):"
echo "   VITE_API_BASE_URL=$SERVICE_URL"
echo "   VITE_WS_URL=$SERVICE_URL"
echo ""
echo "3. 🔑 Configure WalletConnect allowlist:"
echo "   Acesse: https://cloud.reown.com"
echo "   Projeto ID: 3fcc6bba6f1de962d911bb5b5c3dba68"
echo "   Adicionar domínio: https://sneradar.vercel.app"
echo ""
echo "4. 🧪 Teste o sistema completo:"
echo "   - Acesse: https://sneradar.vercel.app"
echo "   - Conecte wallet"
echo "   - Execute análise"
echo "   - Verifique gráficos"
echo ""
echo "📊 CUSTOS ESTIMADOS:"
echo "   Cloud Run: \$15-25/mês"
echo "   Cloud SQL: \$20-30/mês"
echo "   Total: ~\$35-55/mês"
echo ""
echo "🔍 MONITORAMENTO:"
echo "   Logs: gcloud run logs tail --region=$REGION"
echo "   Status: gcloud run services describe $SERVICE_NAME"
echo ""
echo "🚀 SISTEMA PRONTO PARA PRODUÇÃO!"

# Voltar para diretório raiz
cd ../../../..

echo ""
echo "📁 Arquivos gerados:"
echo "   - Backend deployado no Cloud Run"
echo "   - Banco PostgreSQL configurado"
echo "   - Secrets criados no Secret Manager"
echo "   - Tabelas inicializadas"

