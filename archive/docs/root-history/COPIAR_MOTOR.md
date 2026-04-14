# 📋 Instruções para Copiar Motor de Análise

## ⚠️ IMPORTANTE:

O motor de análise tem **muitos arquivos** (13+ módulos). Para copiar todos, você pode:

### Opção 1: Copiar Manualmente (Recomendado)
1. Copiar todos os arquivos de:
   ```
   C:\Users\windows10\Downloads\SNE-V1.0-CLOSED-BETA--production-functional\SNE-V1.0-CLOSED-BETA--production-functional\services\sne-web\
   ```
   
2. Para:
   ```
   C:\Users\windows10\Desktop\SNE RADAR DEPLOY\backend\app\services\motor\
   ```

3. Arquivos a copiar:
   - motor_renan.py
   - contexto_global.py
   - estrutura_mercado.py
   - multi_timeframe.py
   - confluencia.py
   - fluxo_ativo.py
   - catalogo_magnetico.py
   - padroes_graficos.py
   - indicadores.py
   - indicadores_avancados.py
   - analise_candles_detalhada.py
   - gestao_risco_profissional.py
   - relatorio_profissional.py
   - calcular_suportes_resistencias.py
   - niveis_operacionais.py

### Opção 2: Usar Script PowerShell
```powershell
$source = "C:\Users\windows10\Downloads\SNE-V1.0-CLOSED-BETA--production-functional\SNE-V1.0-CLOSED-BETA--production-functional\services\sne-web"
$dest = "C:\Users\windows10\Desktop\SNE RADAR DEPLOY\backend\app\services\motor"

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

foreach ($file in $files) {
    Copy-Item "$source\$file" "$dest\$file" -ErrorAction SilentlyContinue
    if (Test-Path "$dest\$file") {
        Write-Host "✅ Copiado: $file"
    } else {
        Write-Host "❌ Não encontrado: $file"
    }
}
```

## 🔄 Depois de Copiar:

1. **Ajustar imports em `motor_renan.py`:**
   - Trocar imports relativos para absolutos dentro do pacote `app.services.motor`

2. **Criar wrapper `motor_service.py`** (já será criado)

3. **Atualizar endpoints** para usar o wrapper

