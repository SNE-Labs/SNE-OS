# Script PowerShell para copiar arquivos do motor de análise
$source = "C:\Users\windows10\Downloads\SNE-V1.0-CLOSED-BETA--production-functional\SNE-V1.0-CLOSED-BETA--production-functional\services\sne-web"
$dest = "C:\Users\windows10\Desktop\SNE RADAR DEPLOY\backend\app\services\motor"

# Criar diretório se não existir
if (-not (Test-Path $dest)) {
    New-Item -ItemType Directory -Path $dest -Force
    Write-Host "✅ Diretório criado: $dest"
}

$files = @(
    "motor_renan.py",
    "contexto_global.py",
    "estrutura_mercado.py",
    "multi_timeframe.py",
    "confluencia.py",
    "fluxo_ativo.py",
    "catalogo_magnetico.py",
    "padroes_graficos.py",
    "indicadores.py",
    "indicadores_avancados.py",
    "analise_candles_detalhada.py",
    "gestao_risco_profissional.py",
    "relatorio_profissional.py",
    "calcular_suportes_resistencias.py",
    "niveis_operacionais.py"
)

Write-Host "📋 Copiando arquivos do motor de análise..."
Write-Host ""

$copied = 0
$notFound = 0

foreach ($file in $files) {
    $sourcePath = Join-Path $source $file
    $destPath = Join-Path $dest $file
    
    if (Test-Path $sourcePath) {
        Copy-Item $sourcePath $destPath -Force
        Write-Host "✅ Copiado: $file"
        $copied++
    } else {
        Write-Host "❌ Não encontrado: $file"
        $notFound++
    }
}

Write-Host ""
Write-Host "📊 Resumo:"
Write-Host "  ✅ Copiados: $copied"
Write-Host "  ❌ Não encontrados: $notFound"
Write-Host ""
Write-Host "⚠️ Próximo passo: Ajustar imports nos arquivos copiados"

