#!/bin/bash
# 🚀 Deploy SNE Radar via Cloud Build (sem Docker local)
# Baseado no script original do SNE V1.0

set -e

# ==================== CONFIGURAÇÃO ====================
PROJECT_ID=${PROJECT_ID:-"sne-labs"}
REGION=${REGION:-"us-central1"}
INSTANCE_NAME=${INSTANCE_NAME:-"sne-db-prod"}
SERVICE_NAME="sne-web"

echo "🚀 Deploy via Cloud Build (sem Docker local)"
echo "Projeto: $PROJECT_ID"
echo "Região: $REGION"
echo "Instância DB: $INSTANCE_NAME"
echo "Serviço: $SERVICE_NAME"
echo ""

# ==================== VERIFICAÇÕES ====================
# Verificar se cloudbuild.yaml existe
if [ ! -f "cloudbuild.yaml" ]; then
    echo "❌ cloudbuild.yaml não encontrado!"
    echo "📝 Execute este script do diretório backend-v2/services/sne-web/"
    exit 1
fi

# Connection name para Cloud SQL
DB_CONNECTION_NAME="${PROJECT_ID}:${REGION}:${INSTANCE_NAME}"

echo "🔗 Cloud SQL Connection: $DB_CONNECTION_NAME"
echo ""

# ==================== DEPLOY VIA CLOUD BUILD ====================
echo "📦 Enviando build para Cloud Build..."
echo "   Projeto: $PROJECT_ID"
echo "   Região: $REGION"
echo "   Connection: $DB_CONNECTION_NAME"
echo ""

# Submeter build com substituições
gcloud builds submit \
    --project=$PROJECT_ID \
    --config=cloudbuild.yaml \
    --substitutions=_PROJECT_ID=$PROJECT_ID,_REGION=$REGION,_DB_CONNECTION_NAME=$DB_CONNECTION_NAME \
    --timeout=30m

echo ""
echo "✅ Build concluído!"
echo ""

# ==================== VERIFICAÇÃO ====================
echo "🔍 Verificando serviços..."
gcloud run services list --region=$REGION --project=$PROJECT_ID --format="table(SERVICE,URL,STATUS)"

# Obter URL do serviço
SERVICE_URL=$(gcloud run services describe $SERVICE_NAME \
    --region=$REGION \
    --project=$PROJECT_ID \
    --format="value(status.url)")

echo ""
echo "🌐 URL do backend: $SERVICE_URL"
echo ""

# ==================== TESTES ====================
echo "🧪 Testando endpoints..."

# Health check
if curl -f -s "$SERVICE_URL/health" > /dev/null; then
    echo "✅ Health check: OK"
else
    echo "❌ Health check: FAIL"
fi

# Auth nonce
if curl -f -s -X POST "$SERVICE_URL/api/auth/nonce" \
    -H "Content-Type: application/json" \
    -d '{"address": "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb"}' > /dev/null; then
    echo "✅ Auth nonce: OK"
else
    echo "❌ Auth nonce: FAIL"
fi

echo ""
echo "🎉 DEPLOY CONCLUÍDO!"
echo ""
echo "📋 PRÓXIMOS PASSOS:"
echo ""
echo "1. 📝 Configure o Vercel:"
echo "   VITE_API_BASE_URL=$SERVICE_URL"
echo "   VITE_WS_URL=$SERVICE_URL"
echo ""
echo "2. 🔑 Configure WalletConnect:"
echo "   https://cloud.reown.com"
echo "   Projeto ID: 3fcc6bba6f1de962d911bb5b5c3dba68"
echo "   Adicionar domínio: https://sneradar.vercel.app"
echo ""
echo "3. 🧪 Teste o sistema:"
echo "   https://sneradar.vercel.app"
echo ""
echo "📊 CUSTOS:"
echo "   Cloud Build: Gratuito (2h/dia)"
echo "   Cloud Run: ~\$15-25/mês"
echo "   Cloud SQL: ~\$20-30/mês"
echo ""
echo "🔍 MONITORAMENTO:"
echo "   gcloud run logs tail --region=$REGION"
echo ""
echo "🚀 SISTEMA PRONTO!"

