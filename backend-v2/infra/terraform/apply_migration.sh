#!/bin/bash
# Script para aplicar migração com retry em caso de erro de deletion_protection

set -e

PROJECT_ID=${1:-"sne-v1"}
REGION=${2:-"europe-west1"}

echo "🚀 Aplicando migração para $REGION..."
echo ""

cd "$(dirname "$0")"

# Tentar aplicar
MAX_RETRIES=3
RETRY_COUNT=0

while [ $RETRY_COUNT -lt $MAX_RETRIES ]; do
    echo "📋 Tentativa $((RETRY_COUNT + 1)) de $MAX_RETRIES..."
    
    if terraform apply -var="project_id=$PROJECT_ID" -var="region=$REGION" -auto-approve; then
        echo ""
        echo "✅ Migração aplicada com sucesso!"
        exit 0
    else
        ERROR_CODE=$?
        
        # Verificar se o erro é relacionado a deletion_protection
        if terraform apply -var="project_id=$PROJECT_ID" -var="region=$REGION" -auto-approve 2>&1 | grep -q "deletion_protection"; then
            RETRY_COUNT=$((RETRY_COUNT + 1))
            
            if [ $RETRY_COUNT -lt $MAX_RETRIES ]; then
                echo ""
                echo "⏳ Aguardando propagação da mudança de deletion_protection..."
                echo "   Aguardando 30 segundos..."
                sleep 30
                
                # Verificar novamente se está desabilitado
                echo "🔍 Verificando deletion_protection..."
                PROTECTION_STATUS=$(gcloud sql instances describe sne-db-prod \
                    --project=$PROJECT_ID \
                    --format="value(settings.deletionProtectionEnabled)" 2>/dev/null || echo "unknown")
                
                if [ "$PROTECTION_STATUS" == "False" ] || [ "$PROTECTION_STATUS" == "false" ]; then
                    echo "✅ deletion_protection está desabilitado"
                else
                    echo "⚠️  deletion_protection ainda está habilitado, desabilitando novamente..."
                    gcloud sql instances patch sne-db-prod \
                        --project=$PROJECT_ID \
                        --no-deletion-protection
                fi
                
                echo ""
            fi
        else
            echo ""
            echo "❌ Erro diferente de deletion_protection. Abortando."
            exit $ERROR_CODE
        fi
    fi
done

echo ""
echo "❌ Falhou após $MAX_RETRIES tentativas. Verifique manualmente."
exit 1

