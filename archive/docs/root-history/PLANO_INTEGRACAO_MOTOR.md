# 🔧 Plano de Integração do Motor de Análise

## 📋 Arquivos a Copiar:

### 1. Motor Principal
- ✅ `motor_renan.py` (1007 linhas)

### 2. Módulos de Análise (Dependências)
- `contexto_global.py`
- `estrutura_mercado.py`
- `multi_timeframe.py`
- `confluencia.py`
- `fluxo_ativo.py`
- `catalogo_magnetico.py`
- `padroes_graficos.py`
- `indicadores.py`
- `indicadores_avancados.py`
- `analise_candles_detalhada.py`
- `gestao_risco_profissional.py`
- `relatorio_profissional.py`
- `calcular_suportes_resistencias.py`
- `niveis_operacionais.py`

### 3. Dependências Python
- `scipy` (para `find_peaks`)
- `pytz` (para timezone)

## 🔄 Adaptações Necessárias:

1. **Ajustar imports:**
   - De: `from contexto_global import ...`
   - Para: `from app.services.motor.contexto_global import ...`

2. **Ajustar função `coletar_dados`:**
   - Usar `buscar_dados_binance()` do `app.api.v1` ou criar wrapper

3. **Criar serviço wrapper:**
   - `app/services/motor_service.py` que chama `motor_renan.analise_completa()`
   - Serializa resultado para JSON
   - Trata erros

4. **Atualizar endpoints:**
   - `/api/analyze` → usar `motor_service.analyze()`
   - `/api/signal` → extrair sinal do resultado

## 📁 Estrutura Final:

```
backend/app/services/motor/
├── __init__.py
├── motor_renan.py
├── contexto_global.py
├── estrutura_mercado.py
├── multi_timeframe.py
├── confluencia.py
├── fluxo_ativo.py
├── catalogo_magnetico.py
├── padroes_graficos.py
├── indicadores.py
├── indicadores_avancados.py
├── analise_candles_detalhada.py
├── gestao_risco_profissional.py
├── relatorio_profissional.py
├── calcular_suportes_resistencias.py
└── niveis_operacionais.py

backend/app/services/
└── motor_service.py  # Wrapper para integrar com endpoints
```

