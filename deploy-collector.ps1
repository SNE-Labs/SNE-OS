# Script para deploy do SNE Collector via Railway CLI

Write-Host "🚀 Deploying SNE Data Collector..." -ForegroundColor Green

# Verificar se estamos no diretório correto
$currentPath = Get-Location
$expectedPath = Join-Path $PSScriptRoot "backend-v2\services\sne-collector"

if ($currentPath -ne $expectedPath) {
    Write-Host "📁 Navegando para diretório do coletor..." -ForegroundColor Yellow
    Set-Location $expectedPath
}

# Verificar se os arquivos existem
$dockerfile = "Dockerfile"
$appFile = "app.py"
$requirementsFile = "requirements.txt"

if (!(Test-Path $dockerfile) -or !(Test-Path $appFile) -or !(Test-Path $requirementsFile)) {
    Write-Host "❌ Arquivos necessários não encontrados!" -ForegroundColor Red
    Write-Host "Verifique se está no diretório correto: $expectedPath" -ForegroundColor Red
    exit 1
}

Write-Host "✅ Arquivos encontrados:" -ForegroundColor Green
Write-Host "  - $dockerfile" -ForegroundColor Gray
Write-Host "  - $appFile" -ForegroundColor Gray
Write-Host "  - $requirementsFile" -ForegroundColor Gray

# Tentar railway up
Write-Host ""
Write-Host "🐳 Executando railway up..." -ForegroundColor Yellow
try {
    & railway up 2>&1
    Write-Host "✅ Deploy iniciado!" -ForegroundColor Green
} catch {
    Write-Host "❌ Erro no deploy: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host ""
Write-Host "📋 PRÓXIMOS PASSOS:" -ForegroundColor Cyan
Write-Host "1. Verifique o Railway Dashboard" -ForegroundColor White
Write-Host "2. Monitore o build/deploy logs" -ForegroundColor White
Write-Host "3. Teste: curl https://[url]/debug/binance" -ForegroundColor White

Write-Host ""
Write-Host "🎯 URL esperada: https://sne-collector-*.railway.app" -ForegroundColor Green
