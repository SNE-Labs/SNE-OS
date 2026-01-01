# 🚀 ROADMAP: ELEVANDO O FRONTEND PARA NÍVEL BLOOMBERG

**Data:** Janeiro 2025  
**Objetivo:** Transformar o SNE Radar em uma ferramenta profissional de nível terminal financeiro

---

## 🎯 O QUE É "BLOOMBERG-LEVEL" NO FRONTEND?

### Definição

**Bloomberg Terminal** é o padrão-ouro em interfaces financeiras profissionais. Não é apenas sobre design bonito - é sobre **produtividade extrema, densidade de informação e workflow otimizado**.

### Características Principais

1. **Densidade de Informação**
   - Múltiplas camadas de dados simultâneas sem poluição visual
   - Hierarquia visual clara (o que é importante vs. secundário)
   - Números alinhados e formatados consistentemente

2. **Workflow Otimizado**
   - Atalhos de teclado para tudo
   - Command palette (Ctrl+K) para navegação rápida
   - Layouts salvos (workspaces) para diferentes cenários

3. **Feedback Visual Constante**
   - Usuário nunca fica "no escuro"
   - Status de tudo visível (feeds, conexões, atualizações)
   - Animações discretas mas informativas

4. **Real-time Percebido**
   - Mesmo com polling, UI parece "viva"
   - Timestamps de última atualização
   - Status visual de feeds (verde/amarelo/vermelho)
   - Flash/tick quando dados mudam

---

## 📊 AVALIAÇÃO DAS SUGESTÕES

### ✅ **EXCELENTES** - Implementar Imediatamente

#### 1. Densidade + Hierarquia
**Status:** ⚠️ Parcialmente implementado

**O que você já tem:**
- ✅ Tabular-nums (font-variant-numeric)
- ✅ Formatação consistente
- ✅ Grid layouts

**O que falta:**
- ⚠️ Múltiplas camadas simultâneas (tabela + chart + ticker + alertas)
- ⚠️ Hierarquia visual mais clara (tamanhos, pesos, cores)

**Avaliação:** 🟢 **9/10** - Sugestão perfeita, alinhada com Bloomberg

#### 2. Workflow: Tudo Rápido e Previsível
**Status:** ❌ Não implementado

**Sugestões:**
- Command Palette (Ctrl+K)
- Atalhos de teclado
- Layouts salvos (workspaces)

**Avaliação:** 🟢 **10/10** - **CRÍTICO** para produtividade. Isso diferencia produto amador de profissional.

#### 3. Feedback Visual de Ação
**Status:** ⚠️ Básico implementado

**O que você já tem:**
- ✅ Loading spinners
- ✅ Error states básicos

**O que falta (sua análise está correta):**
- ❌ Toast notifications
- ❌ Skeleton loaders
- ❌ Progress indicators
- ❌ Confirmações de ações

**Avaliação:** 🟢 **10/10** - Você identificou corretamente o gap. Isso é **fundamental**.

#### 4. Real-time "Percebido"
**Status:** ❌ Não implementado

**Sugestões:**
- "Last updated 3s ago"
- Status de feed (verde/amarelo/vermelho)
- Animações de tick/flash

**Avaliação:** 🟢 **9/10** - Excelente para sensação de "vivo". Mesmo com polling de 30s, UI parece real-time.

---

## 🎯 ROADMAP EM 5 SPRINTS

### ✅ **SPRINT 0: FUNDAÇÃO** (1 Semana)

**Prioridade:** 🔴 **CRÍTICA** - Base para tudo

**Objetivo:** Criar infraestrutura global antes de features

#### 1. Store Global (Pinia)

**Definition of Done:**
- ✅ Store `useGlobalStore` criado com:
  - `activeSymbol: Ref<string>` (padrão: 'BTCUSDT')
  - `activeTimeframe: Ref<string>` (padrão: '1h')
  - `tier: Ref<'free'|'premium'|'pro'>` (sincronizado com auth)
  - `feedStatus: Ref<'ok'|'warning'|'error'>` (padrão: 'ok')
  - `lastUpdated: Ref<Date | null>` (atualizado a cada fetch)
- ✅ Getters computados:
  - `isFeedHealthy: boolean`
  - `timeSinceLastUpdate: string` ("3s ago", "1m ago")
- ✅ Actions:
  - `setActiveSymbol(symbol: string)`
  - `setActiveTimeframe(tf: string)`
  - `updateFeedStatus(status)`
  - `updateLastUpdated()`
- ✅ Todos os componentes usam store (não props locais)
- ✅ Store persiste no localStorage (símbolo/timeframe)

**Biblioteca:** Pinia (já instalado)

**Tempo:** 2 dias

#### 2. Layout Engine (Grid com Painéis)

**Definition of Done:**
- ✅ Componente `ResizableGrid` criado
- ✅ Suporta 2-4 painéis redimensionáveis
- ✅ Salva layout no localStorage (workspace)
- ✅ Breakpoints responsivos (mobile colapsa painéis)
- ✅ Mínimo/máximo de tamanho por painel
- ✅ Visual de "drag handle" visível
- ✅ Funciona sem JavaScript errors

**Biblioteca:** `vue-resizable` ou `@vueuse/core` (useResizeObserver) + custom

**Tempo:** 2 dias

#### 3. Telemetry UI (Status Bar)

**Definition of Done:**
- ✅ Componente `StatusBar` criado
- ✅ Mostra: Feed Status (🟢/🟡/🔴), WebSocket Status, "Last updated X ago"
- ✅ Atualiza em tempo real (polling ou WebSocket)
- ✅ Cores semânticas (verde=ok, amarelo=warning, vermelho=error)
- ✅ Tooltip com detalhes (clique mostra mais info)
- ✅ Posicionado no top-right (não interfere no conteúdo)
- ✅ Responsivo (mobile mostra só ícone)

**Tempo:** 1 dia

**Tempo Total Sprint 0:** 5 dias (1 semana)

---

### ✅ **SPRINT 1: PRODUTIVIDADE** (Impacto Máximo)

**Prioridade:** 🔴 **CRÍTICA**

#### 1. Command Palette (Ctrl+K)

**Definition of Done:**
- ✅ Abre com `Ctrl+K` (ou `Cmd+K` no Mac)
- ✅ Fecha com `Esc`
- ✅ Busca por símbolo (digite "BTC" → mostra "BTCUSDT")
- ✅ Navega para views: "Chart", "Analysis", "Dashboard"
- ✅ Mostra atalhos visíveis (ex: "Chart (G)")
- ✅ Funciona **100% sem mouse** (teclado only)
- ✅ Busca é fuzzy (ex: "ch" encontra "Chart")
- ✅ Categorias visuais (Symbols, Navigation, Actions)
- ✅ Enter executa ação
- ✅ Não conflita com inputs (só abre quando não está digitando)
- ✅ Animações suaves (fade in/out)
- ✅ Acessível (ARIA labels, focus trap)

**Biblioteca:** `@vueuse/core` (useMagicKeys) + `fuse.js` (fuzzy search) + custom modal

**Código Base:**
```typescript
// composables/useCommandPalette.ts
import { useMagicKeys } from '@vueuse/core'
import Fuse from 'fuse.js'

const commands = [
  { id: 'chart', label: 'Chart', action: () => router.push('/chart'), shortcut: 'G' },
  { id: 'analysis', label: 'Analysis', action: () => router.push('/analysis'), shortcut: 'A' },
  { id: 'dashboard', label: 'Dashboard', action: () => router.push('/dashboard'), shortcut: 'D' },
  // ... símbolos dinâmicos da watchlist
]

const fuse = new Fuse(commands, { keys: ['label', 'id'] })
```

**Impacto:** ⭐⭐⭐⭐⭐ (Máximo)

**Tempo:** 3 dias

#### 2. Atalhos de Teclado (Hotkeys)

**Definition of Done:**
- ✅ `1/2/3/4` muda timeframe global (1h, 4h, 1d, 1w)
- ✅ `G` abre ChartView
- ✅ `A` abre AnalysisView
- ✅ `D` abre DashboardView
- ✅ `/` foca busca de símbolo (se input visível)
- ✅ `Esc` fecha modais/command palette
- ✅ **Não conflita com inputs** (desabilita quando input está focado)
- ✅ Funciona em todas as views
- ✅ Feedback visual (toast mostra "Timeframe: 4h" ao pressionar)
- ✅ Atalhos visíveis em tooltip/help (opcional: `?` mostra help)

**Biblioteca:** `@vueuse/core` (useMagicKeys)

**Código Base:**
```typescript
// composables/useGlobalHotkeys.ts
import { useMagicKeys, whenever } from '@vueuse/core'
import { useGlobalStore } from '@/stores/global'

const { '1': key1, '2': key2, '3': key3, '4': key4, g, a, d } = useMagicKeys()

whenever(key1, () => globalStore.setActiveTimeframe('1h'))
whenever(key2, () => globalStore.setActiveTimeframe('4h'))
// ... etc
```

**Impacto:** ⭐⭐⭐⭐⭐ (Máximo)

**Tempo:** 2 dias

#### Watchlist Dock Fixo
```vue
<!-- Estrutura sugerida -->
<aside class="watchlist-dock">
  <div class="watchlist-header">
    <h3>Watchlist</h3>
    <button>+</button>
  </div>
  <div class="watchlist-items">
    <WatchlistItem 
      v-for="symbol in watchlist"
      :symbol="symbol"
      :price="prices[symbol]"
      :change="changes[symbol]"
      @click="setActiveSymbol(symbol)"
    />
  </div>
</aside>
```

**Características:**
- Clique troca símbolo global (todos os componentes atualizam)
- Mostra variação % com cores
- Flash quando preço muda
- Posição fixa (lado esquerdo)

**Impacto:** ⭐⭐⭐⭐ (Alto)

**Tempo estimado:** 2-3 semanas

---

### ✅ **SPRINT 2: FEEDBACK VISUAL PROFISSIONAL**

**Prioridade:** 🔴 **ALTA**

#### 1. Toast System

**Definition of Done:**
- ✅ API: `toast.success()`, `toast.error()`, `toast.info()`, `toast.warning()`
- ✅ Empilha múltiplos toasts (não sobrepõe)
- ✅ Auto-dismiss: success/info (3s), warning (5s), error (não auto-dismiss)
- ✅ Ação "Retry" em erros de API (botão clicável)
- ✅ Posição: top-right (desktop), bottom-center (mobile)
- ✅ Animações: slide-in da direita, fade out
- ✅ Ícones visuais por tipo (✓, ✗, ℹ, ⚠)
- ✅ Cores semânticas (verde=success, vermelho=error, etc)
- ✅ Clique fecha toast manualmente
- ✅ Máximo 5 toasts visíveis (scroll se mais)
- ✅ Acessível (ARIA live region)

**Biblioteca:** `vue-toastification` (Vue 3 compatible)

**Instalação:**
```bash
npm install vue-toastification@next
```

**Código Base:**
```typescript
// plugins/toast.ts
import Toast from 'vue-toastification'
import 'vue-toastification/dist/index.css'

app.use(Toast, {
  position: 'top-right',
  timeout: 3000,
  closeOnClick: true,
  pauseOnHover: true,
  draggable: true,
  draggablePercent: 0.6,
})

// Uso
import { useToast } from 'vue-toastification'
const toast = useToast()
toast.success('Análise concluída')
toast.error('Erro ao conectar', { 
  action: { text: 'Retry', onClick: () => retry() }
})
```

**Impacto:** ⭐⭐⭐⭐⭐ (Máximo)

**Tempo:** 2 dias

#### 2. Skeleton Loaders

**Definition of Done:**
- ✅ Componente `SkeletonCard` criado
- ✅ Componente `SkeletonTable` criado
- ✅ Componente `SkeletonChart` criado
- ✅ Animação shimmer suave
- ✅ Forma similar ao conteúdo final (mesmo tamanho)
- ✅ Substitui **todos** os spinners existentes
- ✅ Múltiplos tamanhos (sm, md, lg)
- ✅ Acessível (aria-label="Loading...")

**Biblioteca:** `vue-loading-skeleton` ou custom (recomendo custom para controle total)

**Código Base:**
```vue
<!-- components/SkeletonCard.vue -->
<template>
  <div class="skeleton-card animate-shimmer">
    <div class="skeleton-line h-4 w-3/4 mb-2"></div>
    <div class="skeleton-line h-8 w-1/2"></div>
  </div>
</template>

<style>
@keyframes shimmer {
  0% { background-position: -1000px 0; }
  100% { background-position: 1000px 0; }
}
.animate-shimmer {
  background: linear-gradient(90deg, #1a1a1a 0%, #2a2a2a 50%, #1a1a1a 100%);
  background-size: 1000px 100%;
  animation: shimmer 2s infinite;
}
</style>
```

**Impacto:** ⭐⭐⭐⭐ (Alto)

**Tempo:** 1 dia

#### 3. Progress State

**Definition of Done:**
- ✅ Componente `ProgressBar` criado
- ✅ Mostra % de progresso (se backend suportar)
- ✅ Ou estimativa baseada em tempo médio (fallback)
- ✅ Status text ("Analyzing...", "Fetching data...")
- ✅ Cancelamento de operação (botão "Cancel")
- ✅ Usado em ações longas (análise, fetch de dados)
- ✅ Visual: barra verde com animação
- ✅ Acessível (aria-valuenow, aria-valuemin, aria-valuemax)

**Biblioteca:** Custom (simples de implementar)

**Tempo:** 1 dia

#### 4. Session Expired State

**Definition of Done:**
- ✅ Detecção automática (intercepta 401 do backend)
- ✅ Modal `SessionExpiredModal` criado
- ✅ Botão "Relogin" (1 clique, reutiliza wallet conectada)
- ✅ Não perde contexto (salva estado no localStorage)
- ✅ Toast de aviso antes de expirar (5min antes)
- ✅ Auto-redirect para login se necessário

**Tempo:** 1 dia

**Tempo Total Sprint 2:** 5 dias (1 semana)

---

### ✅ **SPRINT 3: CHART DE NÍVEL TERMINAL**

**Prioridade:** 🟡 **MÉDIA**

#### Tooltip Rico
```typescript
// Tooltip com mais informações
interface RichTooltip {
  time: string
  open: number
  high: number
  low: number
  close: number
  volume: number
  change: number
  changePercent: number
  spread?: number
}
```

**Impacto:** ⭐⭐⭐⭐ (Alto)

#### Zoom/Pan com UI Visível
```vue
<!-- Controles de zoom/pan -->
<div class="chart-controls">
  <button @click="zoomIn">+</button>
  <button @click="zoomOut">-</button>
  <button @click="resetZoom">Reset</button>
  <button @click="fitContent">Fit</button>
</div>
```

**Impacto:** ⭐⭐⭐ (Médio)

#### Indicadores Pluginável
```vue
<!-- Adicionar/remover indicadores -->
<IndicatorsPanel>
  <IndicatorToggle label="EMA 8" :enabled="true" />
  <IndicatorToggle label="EMA 21" :enabled="true" />
  <IndicatorToggle label="RSI" :enabled="false" />
  <IndicatorToggle label="MACD" :enabled="false" />
</IndicatorsPanel>
```

**Impacto:** ⭐⭐⭐⭐ (Alto)

#### Export (Imagem/CSV)
```typescript
// Export functions
exportChartAsImage() // PNG/SVG
exportDataAsCSV()    // CSV dos dados
```

**Biblioteca:** Lightweight Charts já tem suporte nativo

**Impacto:** ⭐⭐⭐ (Médio) - Low effort, high value

#### RSI Plot (Painel Separado)
```vue
<!-- RSI em painel abaixo do chart principal -->
<div class="rsi-panel">
  <RSIChart :data="rsiData" />
</div>
```

**Impacto:** ⭐⭐⭐ (Médio)

**Tempo estimado:** 2-3 semanas

---

### ✅ **SPRINT 4: ANALYSISVIEW "DE VERDADE"**

**Prioridade:** 🔴 **ALTA** (Você identificou corretamente como gap principal)

#### 1. Mini-Chart com Níveis Operacionais

**Definition of Done:**
- ✅ Componente `MiniChart` criado (usa Lightweight Charts)
- ✅ Linhas visíveis no gráfico:
  - Entry (azul, linha sólida)
  - Stop Loss (vermelho, linha tracejada)
  - TP1, TP2, TP3 (verde, linhas sólidas)
- ✅ Labels nos níveis (texto visível)
- ✅ Hover mostra valor exato (tooltip)
- ✅ Sincroniza com `activeSymbol` e `activeTimeframe` (store global)
- ✅ Atualiza quando análise muda
- ✅ Responsivo (mobile: altura reduzida)
- ✅ Cores semânticas consistentes (azul=entry, vermelho=SL, verde=TP)

**Biblioteca:** Lightweight Charts (já instalado)

**Código Base:**
```typescript
// components/MiniChart.vue
import { createChart, ColorType } from 'lightweight-charts'

// Adicionar linhas
chart.addLineSeries({
  price: entryPrice,
  color: '#00aaff',
  lineWidth: 2,
  title: 'Entry'
})
```

**Impacto:** ⭐⭐⭐⭐⭐ (Máximo) - **Isso é o que falta!**

**Tempo:** 3 dias

#### 2. Scenario Cards

**Definition of Done:**
- ✅ Componente `ScenarioCard` criado
- ✅ Mostra: Risco (baixo/médio/alto), Retorno (baixo/médio/alto), Probabilidade (%)
- ✅ Ponto de invalidação (Stop Loss)
- ✅ Visual: cards com cores semânticas (verde=conservador, amarelo=médio, vermelho=agressivo)
- ✅ 3 cenários: Conservative, Moderate, Aggressive
- ✅ Cálculo baseado em análise (RR ratio, volatilidade)

**Tempo:** 2 dias

#### 3. Histórico de Análises + Compare

**Definition of Done:**
- ✅ Componente `AnalysisHistory` criado
- ✅ Lista últimas 10 análises (localStorage ou backend)
- ✅ Compare side-by-side (2 análises lado a lado)
- ✅ Mostra diferença: scores, níveis, recomendações
- ✅ Filtro por símbolo/timeframe
- ✅ Data/hora de cada análise

**Tempo:** 2 dias

#### 4. Pin Analysis (Snapshot)

**Definition of Done:**
- ✅ Botão "Pin" em cada análise
- ✅ Salva snapshot no localStorage
- ✅ Lista de análises pinadas (sidebar ou modal)
- ✅ Restaura análise pinada (carrega dados salvos)
- ✅ Máximo 10 análises pinadas

**Tempo:** 1 dia

**Tempo Total Sprint 4:** 8 dias (1.5 semanas)

---

## 📚 BIBLIOTECAS ESCOLHIDAS (FIXADAS)

### ✅ **Vue-First** (Não React)

| Feature | Biblioteca | Versão | Motivo |
|---------|-----------|--------|--------|
| **Command Palette** | Custom + `@vueuse/core` + `fuse.js` | Latest | Vue-native, controle total |
| **Hotkeys** | `@vueuse/core` | Latest | Vue-native, já instalado |
| **Toast** | `vue-toastification` | `@next` (Vue 3) | Vue-first, maduro |
| **Skeleton** | Custom | - | Simples, controle total |
| **Icons** | `lucide-vue-next` | Latest | Vue-native, acessível |
| **Resizable** | `vue-resizable` ou custom | Latest | Vue-first |

### Instalação

```bash
# Command Palette (dependências)
npm install @vueuse/core fuse.js

# Toast
npm install vue-toastification@next

# Icons
npm install lucide-vue-next

# Resizable (opcional)
npm install vue-resizable
```

### Configuração

```typescript
// main.ts
import { createApp } from 'vue'
import Toast from 'vue-toastification'
import 'vue-toastification/dist/index.css'
import { createPinia } from 'pinia'

const app = createApp(App)
app.use(createPinia())
app.use(Toast, { 
  position: 'top-right',
  timeout: 3000,
  closeOnClick: true,
  pauseOnHover: true,
  draggable: true,
})
```

---

## 🎨 DESIGN: BLOOMBERG SEM PERDER "TERMINAL/HACKER"

### ✅ Manter
- ✅ Paleta de cores (verde neon, preto profundo)
- ✅ Tipografia (JetBrains Mono + Inter)
- ✅ Glow effects sutis
- ✅ Tema "hacker/terminal"

### 🔄 Melhorar
- ⚠️ **Substituir emojis por ícones SVG** (Lucide Icons)
  - Mais profissional
  - Melhor acessibilidade (ARIA)
  - Consistência visual
  - Resolve parte da acessibilidade (5/10 → 7/10)

**Biblioteca recomendada:** `lucide-vue-next`

```vue
<!-- Antes -->
<div class="text-4xl">📊</div>

<!-- Depois -->
<ChartBar class="w-8 h-8 text-terminal-accent" />
```

---

## 🏗️ TARGET BLUEPRINT: ESTRUTURA BLOOMBERG

### Layout Sugerido

```
┌─────────────────────────────────────────────────────────┐
│ TOP BAR                                                  │
│ [BTCUSDT] [1h] [🟢 Feed OK] [Last: 3s ago] [Tier: Pro] │
├──────────┬──────────────────────────────┬──────────────┤
│          │                              │              │
│ WATCHLIST│         MAIN CHART           │  ORDER FLOW │
│          │         (60% width)          │  SIGNALS    │
│ [BTC]    │                              │  LEVELS     │
│ [ETH]    │    [Gráfico Interativo]      │  (40% width)│
│ [SOL]    │                              │              │
│          │                              │              │
│ FILTROS  │                              │              │
│          │                              │              │
├──────────┴──────────────────────────────┴──────────────┤
│ BOTTOM: LOGS/ALERTS (colapsável)                        │
│ [INFO] Analysis completed for BTCUSDT                   │
│ [WARN] High volatility detected                         │
└─────────────────────────────────────────────────────────┘
```

### Componentes

1. **Top Bar**
   - Símbolo ativo + timeframe
   - Status de feed (verde/amarelo/vermelho)
   - "Last updated X ago"
   - Tier do usuário

2. **Left Rail (Watchlist)**
   - Lista de símbolos
   - Variação % com cores
   - Flash quando muda
   - Filtros/agrupamentos

3. **Main (Chart)**
   - Gráfico principal (60% width)
   - Tooltip rico
   - Zoom/pan controls
   - Indicadores plugináveis

4. **Right Rail (Order Flow/Signals)**
   - Níveis operacionais
   - Sinais de trading
   - Order flow (se disponível)
   - 40% width

5. **Bottom (Logs/Alerts)**
   - Logs de sistema
   - Alertas importantes
   - Colapsável

---

## 📚 BIBLIOTECAS ESCOLHIDAS (FIXADAS)

### ✅ **Vue-First** (Não React)

| Feature | Biblioteca | Versão | Motivo |
|---------|-----------|--------|--------|
| **Command Palette** | Custom + `@vueuse/core` + `fuse.js` | Latest | Vue-native, controle total |
| **Hotkeys** | `@vueuse/core` | Latest | Vue-native, já instalado |
| **Toast** | `vue-toastification` | `@next` (Vue 3) | Vue-first, maduro |
| **Skeleton** | Custom | - | Simples, controle total |
| **Icons** | `lucide-vue-next` | Latest | Vue-native, acessível |
| **Resizable** | `vue-resizable` ou custom | Latest | Vue-first |

### Instalação

```bash
# Command Palette (dependências)
npm install @vueuse/core fuse.js

# Toast
npm install vue-toastification@next

# Icons
npm install lucide-vue-next

# Resizable (opcional)
npm install vue-resizable
```

### Configuração

```typescript
// main.ts
import { createApp } from 'vue'
import Toast from 'vue-toastification'
import 'vue-toastification/dist/index.css'
import { createPinia } from 'pinia'

const app = createApp(App)
app.use(createPinia())
app.use(Toast, { /* config */ })
```

---

## 📊 PRIORIZAÇÃO FINAL

### 🔴 **CRÍTICO** (Sprint 0 + 1)
1. ✅ **Sprint 0:** Store global, Layout engine, Telemetry UI
2. ✅ Command Palette (Ctrl+K) - **DoD completo**
3. ✅ Atalhos de teclado - **DoD completo**
4. ✅ Toast system - **DoD completo**
5. ✅ Mini-chart com níveis operacionais - **DoD completo**

### 🟡 **ALTO** (Sprint 2)
6. Skeleton loaders - **DoD completo**
7. Progress indicators - **DoD completo**
8. Session expired state - **DoD completo**

### 🟢 **MÉDIO** (Sprint 3 + 4)
9. Watchlist dock
10. Indicadores plugináveis
11. Export (imagem/CSV)
12. RSI plot separado
13. Histórico de análises
14. Scenario cards

---

## ✅ CONCLUSÃO

### Avaliação das Sugestões

**Nota Geral:** 🟢 **9.5/10**

**Pontos Fortes:**
- ✅ Sugestões muito bem pensadas e priorizadas
- ✅ Alinhadas com padrões profissionais (Bloomberg)
- ✅ Roadmap realista em 4 sprints
- ✅ Identificou corretamente os gaps principais

**O que define "Bloomberg-level":**
1. **Produtividade extrema** (atalhos, command palette)
2. **Densidade de informação** sem poluição
3. **Feedback visual constante** (usuário nunca no escuro)
4. **Real-time percebido** (mesmo com polling)

**Recomendação:**
- ✅ **Implementar todas as sugestões**
- ✅ Priorizar Sprint 1 e 2 (maior impacto)
- ✅ Manter tema terminal/hacker (único)
- ✅ Substituir emojis por ícones SVG (Lucide)

**Tempo Total Estimado:** 
- Sprint 0: 1 semana
- Sprint 1: 1 semana
- Sprint 2: 1 semana
- Sprint 3: 2-3 semanas
- Sprint 4: 1.5 semanas
- **Total: 6.5-7.5 semanas (1.5-2 meses)**

---

**Análise realizada por:** Auto (Cursor AI)  
**Data:** Janeiro 2025

