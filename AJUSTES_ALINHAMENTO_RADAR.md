# 🔄 Ajustes para Alinhar com Radar Existente

## ✅ O que precisa ser ajustado:

### 1. **Dashboard API** → `/api/v1/global-metrics` e `/api/v1/system/status`
   - ❌ Atual: `/api/dashboard/summary`
   - ✅ Deve ser: `/api/v1/global-metrics` (métricas globais)
   - ✅ Deve ser: `/api/v1/system/status` (status do sistema)

### 2. **Charts API** → `/api/v1/chart-data` (consolidado)
   - ❌ Atual: `/api/charts/ohlcv` e `/api/charts/indicators`
   - ✅ Deve ser: `/api/v1/chart-data` (retorna candles + indicadores + níveis em uma única chamada)

### 3. **Analysis API** → `/api/analyze` (POST) usando `motor_renan.analise_completa()`
   - ❌ Atual: `/api/analysis/technical` (dados mockados)
   - ✅ Deve ser: `/api/analyze` (POST) que chama `motor_renan.analise_completa(symbol, timeframe)`

### 4. **Signal API** → `/api/signal` (GET)
   - ✅ Já existe no radar: `/api/signal` (GET) retorna sinal simplificado

### 5. **Integração Binance**
   - ✅ Usar `buscar_dados_binance(symbol, interval, limit)` do radar existente
   - ✅ Ou criar função similar que busca da Binance API

## 🎯 Próximos Passos:

1. ✅ Criar endpoint `/api/v1/global-metrics`
2. ✅ Criar endpoint `/api/v1/system/status`
3. ✅ Criar endpoint `/api/v1/chart-data` (consolidado)
4. ✅ Ajustar `/api/analyze` para usar `motor_renan.analise_completa()` (ou criar wrapper)
5. ✅ Integrar `buscar_dados_binance()` ou criar função similar

