# Script temporário para deploy Railway
Set-Location "backend-v2/services/sne-web"
railway up
Write-Host "Deploy concluído!"
