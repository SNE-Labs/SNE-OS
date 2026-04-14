# 🔄 Alinhamento com Radar Existente

## ⚠️ Problema Identificado

A implementação atual **NÃO está seguindo** a estrutura do radar existente. Preciso adaptar para usar:

1. **Endpoints existentes:**
   - `/api/analyze` (POST) - usa `motor_renan.analise_completa()`
   - `/api/signal` (GET) - sinal simplificado
   - `/api/v1/chart-data` - dados consolidados
   - `/api/v1/global-metrics` - métricas globais
   - `/api/v1/system/status` - status do sistema
   - `/api/v1/alerts` - alertas

2. **Motor de análise:**
   - `motor_renan.py` com `analise_completa(symbol, timeframe)`
   - Retorna: `sintese`, `niveis_operacionais`, `contexto`, `estrutura`, `confluencia`, etc.

3. **Integração Binance:**
   - `buscar_dados_binance()` para candles
   - Cliente Binance compartilhado

## ✅ O que precisa ser ajustado

### 1. Dashboard API
**Atual:** `/api/dashboard/summary`, `/api/dashboard/markets`  
**Deve ser:** `/api/v1/global-metrics`, `/api/v1/system/status`

### 2. Charts API
**Atual:** `/api/charts/ohlcv`  
**Deve ser:** `/api/v1/chart-data` (consolidado com indicadores + níveis)

### 3. Analysis API
**Atual:** `/api/analysis/technical`  
**Deve ser:** `/api/analyze` (POST) usando `motor_renan.analise_completa()`

### 4. Integração Binance
**Atual:** Dados mockados  
**Deve ser:** Usar `buscar_dados_binance()` do sistema existente

## 🎯 Próximo Passo

Adaptar as APIs para seguir a estrutura existente e integrar com o motor de análise real.

