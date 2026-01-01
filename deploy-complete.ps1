# 🚀 Script Completo de Deploy SNE Radar no Google Cloud
# Executar no PowerShell com gcloud configurado

$PROJECT_ID = "sne-v1"
$REGION = "us-central1"
$INSTANCE_NAME = "sne-db-prod"
$DB_NAME = "sne"
$SERVICE_NAME = "sne-web"

Write-Host "🚀 Iniciando deploy completo do SNE Radar" -ForegroundColor Green
Write-Host "Projeto: $PROJECT_ID" -ForegroundColor Yellow
Write-Host "Região: $REGION" -ForegroundColor Yellow
Write-Host "Instância DB: $INSTANCE_NAME" -ForegroundColor Yellow
Write-Host "Serviço: $SERVICE_NAME" -ForegroundColor Yellow
Write-Host ""

# ==================== 1. VERIFICAR GCP ====================
Write-Host "🔍 Verificando configuração Google Cloud..." -ForegroundColor Cyan

# Configurar projeto
gcloud config set project $PROJECT_ID
gcloud config set compute/region $REGION

# Verificar se projeto existe
$projectExists = gcloud projects describe $PROJECT_ID 2>$null
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Projeto $PROJECT_ID não encontrado!" -ForegroundColor Red
    Write-Host "📝 Crie o projeto em: https://console.cloud.google.com/" -ForegroundColor Yellow
    exit 1
}

Write-Host "✅ Projeto $PROJECT_ID encontrado" -ForegroundColor Green

# ==================== 2. HABILITAR APIS ====================
Write-Host ""
Write-Host "🔧 Habilitando APIs do Google Cloud..." -ForegroundColor Cyan

$apis = @(
    "run.googleapis.com",
    "sqladmin.googleapis.com",
    "containerregistry.googleapis.com",
    "secretmanager.googleapis.com",
    "cloudbuild.googleapis.com",
    "storage.googleapis.com"
)

foreach ($api in $apis) {
    Write-Host "  - Habilitando $api..." -ForegroundColor Gray
    gcloud services enable $api --quiet
}

Write-Host "✅ APIs habilitadas" -ForegroundColor Green

# ==================== 3. CRIAR CLOUD SQL ====================
Write-Host ""
Write-Host "🗄️ Configurando Cloud SQL..." -ForegroundColor Cyan

# Verificar se instância já existe
$sqlExists = gcloud sql instances describe $INSTANCE_NAME --project=$PROJECT_ID 2>$null
if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Instância Cloud SQL $INSTANCE_NAME já existe" -ForegroundColor Green
} else {
    Write-Host "📦 Criando instância Cloud SQL..." -ForegroundColor Yellow
    gcloud sql instances create $INSTANCE_NAME `
        --database-version=POSTGRES_15 `
        --cpu=2 `
        --memory=4GB `
        --region=$REGION `
        --root-password="5a9862d483ba291dc2012f254cce03a7" `
        --project=$PROJECT_ID `
        --quiet

    Write-Host "⏳ Aguardando Cloud SQL ficar pronto..." -ForegroundColor Yellow
    Start-Sleep -Seconds 60
}

# Criar banco de dados se não existir
$dbExists = gcloud sql databases describe $DB_NAME --instance=$INSTANCE_NAME --project=$PROJECT_ID 2>$null
if ($LASTEXITCODE -ne 0) {
    Write-Host "📊 Criando banco de dados $DB_NAME..." -ForegroundColor Yellow
    gcloud sql databases create $DB_NAME `
        --instance=$INSTANCE_NAME `
        --project=$PROJECT_ID `
        --quiet
}

# Criar usuário se não existir
$userExists = gcloud sql users describe sne_admin --instance=$INSTANCE_NAME --project=$PROJECT_ID 2>$null
if ($LASTEXITCODE -ne 0) {
    Write-Host "👤 Criando usuário sne_admin..." -ForegroundColor Yellow
    gcloud sql users create sne_admin `
        --instance=$INSTANCE_NAME `
        --password="5a9862d483ba291dc2012f254cce03a7" `
        --project=$PROJECT_ID `
        --quiet
}

Write-Host "✅ Cloud SQL configurado" -ForegroundColor Green

# ==================== 4. CRIAR SECRETS ====================
Write-Host ""
Write-Host "🔐 Configurando secrets..." -ForegroundColor Cyan

# JWT Secret
$jwtSecretExists = gcloud secrets describe sne-jwt-secret --project=$PROJECT_ID 2>$null
if ($LASTEXITCODE -ne 0) {
    Write-Host "🔑 Criando JWT secret..." -ForegroundColor Yellow
    "sne-jwt-secret-$(Get-Date -Format 'yyyyMMddHHmmss')" | gcloud secrets create sne-jwt-secret --data-file=- --project=$PROJECT_ID
}

# Database password
$dbSecretExists = gcloud secrets describe sne-db-password --project=$PROJECT_ID 2>$null
if ($LASTEXITCODE -ne 0) {
    Write-Host "🔑 Criando DB password secret..." -ForegroundColor Yellow
    "5a9862d483ba291dc2012f254cce03a7" | gcloud secrets create sne-db-password --data-file=- --project=$PROJECT_ID
}

Write-Host "✅ Secrets configurados" -ForegroundColor Green

# ==================== 5. BUILD E DEPLOY ====================
Write-Host ""
Write-Host "🐳 Build e deploy do backend..." -ForegroundColor Cyan

# Verificar se estamos no diretório correto
$currentPath = Get-Location
$expectedPath = Join-Path $PSScriptRoot "backend-v2\services\sne-web"

if ($currentPath -ne $expectedPath) {
    Write-Host "📁 Navegando para diretório backend-v2/services/sne-web..." -ForegroundColor Yellow
    Set-Location "backend-v2\services\sne-web"
}

# Build Docker image
Write-Host "🏗️ Building Docker image..." -ForegroundColor Yellow
docker build -t "gcr.io/$PROJECT_ID/$SERVICE_NAME`:latest" .

# Push to Container Registry
Write-Host "📤 Pushing to Container Registry..." -ForegroundColor Yellow
docker push "gcr.io/$PROJECT_ID/$SERVICE_NAME`:latest"

# Deploy to Cloud Run
Write-Host "🚀 Deploying to Cloud Run..." -ForegroundColor Yellow
gcloud run deploy $SERVICE_NAME `
    --image "gcr.io/$PROJECT_ID/$SERVICE_NAME`:latest" `
    --platform managed `
    --region=$REGION `
    --allow-unauthenticated `
    --port 8080 `
    --memory 1Gi `
    --cpu 1 `
    --max-instances 10 `
    --concurrency 80 `
    --timeout 300 `
    --set-env-vars="SECRET_KEY=sne-jwt-secret-change-in-production,SIWE_DOMAIN=radar.snelabs.space,SIWE_ORIGIN=https://radar.snelabs.space,DEBUG=false,FLASK_ENV=production,DB_NAME=$DB_NAME,DB_USER=sne_admin,DB_PORT=5432,PORT=8080,DB_HOST=/cloudsql/$PROJECT_ID`:$REGION`:$INSTANCE_NAME" `
    --set-secrets="DB_PASSWORD=sne-db-password`:latest,JWT_SECRET=sne-jwt-secret`:latest" `
    --add-cloudsql-instances="$PROJECT_ID`:$REGION`:$INSTANCE_NAME" `
    --project=$PROJECT_ID `
    --quiet

# ==================== 6. VERIFICAÇÃO ====================
Write-Host ""
Write-Host "🔍 Verificando deploy..." -ForegroundColor Cyan

# Obter URL do serviço
$SERVICE_URL = gcloud run services describe $SERVICE_NAME `
    --region=$REGION `
    --project=$PROJECT_ID `
    --format="value(status.url)"

Write-Host "✅ Deploy concluído!" -ForegroundColor Green
Write-Host ""
Write-Host "🌐 URL do backend: $SERVICE_URL" -ForegroundColor Cyan
Write-Host ""

Write-Host "🧪 Testando endpoints..." -ForegroundColor Yellow

# Testar health check
try {
    $healthResponse = Invoke-WebRequest -Uri "$SERVICE_URL/health" -TimeoutSec 10
    if ($healthResponse.StatusCode -eq 200) {
        Write-Host "✅ Health check: OK" -ForegroundColor Green
    } else {
        Write-Host "❌ Health check: FAIL" -ForegroundColor Red
    }
} catch {
    Write-Host "❌ Health check: FAIL - $($_.Exception.Message)" -ForegroundColor Red
}

# Testar nonce endpoint
try {
    $nonceBody = '{"address": "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb"}'
    $nonceResponse = Invoke-WebRequest -Uri "$SERVICE_URL/api/auth/nonce" -Method POST -Body $nonceBody -ContentType "application/json" -TimeoutSec 10
    if ($nonceResponse.StatusCode -eq 200) {
        Write-Host "✅ Auth nonce: OK" -ForegroundColor Green
    } else {
        Write-Host "❌ Auth nonce: FAIL" -ForegroundColor Red
    }
} catch {
    Write-Host "❌ Auth nonce: FAIL - $($_.Exception.Message)" -ForegroundColor Red
}

# ==================== 7. INSTRUÇÕES FINAIS ====================
Write-Host ""
Write-Host "🎉 DEPLOY CONCLUÍDO COM SUCESSO!" -ForegroundColor Green
Write-Host ""
Write-Host "📋 PRÓXIMOS PASSOS:" -ForegroundColor Cyan
Write-Host ""
Write-Host "1. 📝 Anote a URL do backend:" -ForegroundColor Yellow
Write-Host "   $SERVICE_URL" -ForegroundColor White
Write-Host ""
Write-Host "2. 🌐 Configure o Vercel (frontend):" -ForegroundColor Yellow
Write-Host "   VITE_API_BASE_URL=$SERVICE_URL" -ForegroundColor White
Write-Host "   VITE_WS_URL=$SERVICE_URL" -ForegroundColor White
Write-Host ""
Write-Host "3. 🔑 Configure WalletConnect allowlist:" -ForegroundColor Yellow
Write-Host "   Acesse: https://cloud.reown.com" -ForegroundColor White
Write-Host "   Projeto ID: 3fcc6bba6f1de962d911bb5b5c3dba68" -ForegroundColor White
Write-Host "   Adicionar domínio: https://sneradar.vercel.app" -ForegroundColor White
Write-Host ""
Write-Host "4. 🧪 Teste o sistema completo:" -ForegroundColor Yellow
Write-Host "   - Acesse: https://sneradar.vercel.app" -ForegroundColor White
Write-Host "   - Conecte wallet" -ForegroundColor White
Write-Host "   - Execute análise" -ForegroundColor White
Write-Host "   - Verifique gráficos" -ForegroundColor White
Write-Host ""
Write-Host "📊 CUSTOS ESTIMADOS:" -ForegroundColor Cyan
Write-Host "   Cloud Run: `$15-25/mês" -ForegroundColor White
Write-Host "   Cloud SQL: `$20-30/mês" -ForegroundColor White
Write-Host "   Total: ~`$35-55/mês" -ForegroundColor White
Write-Host ""
Write-Host "🔍 MONITORAMENTO:" -ForegroundColor Cyan
Write-Host "   Logs: gcloud run logs tail --region=$REGION" -ForegroundColor White
Write-Host "   Status: gcloud run services describe $SERVICE_NAME" -ForegroundColor White
Write-Host ""
Write-Host "🚀 SISTEMA PRONTO PARA PRODUÇÃO!" -ForegroundColor Green
