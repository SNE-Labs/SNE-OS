<template>
  <Layout>
    <div class="chart-view">
      <!-- Header -->
      <div class="mb-8">
        <h1 class="text-4xl font-mono font-bold mb-2 glow-green">Chart Analysis</h1>
        <p class="text-gray-400 font-mono">Gráficos interativos com indicadores técnicos avançados</p>
      </div>

      <!-- Controls -->
      <TerminalCard class="mb-6">
        <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label class="block text-xs text-gray-500 uppercase tracking-wider mb-2 font-mono">Symbol</label>
            <input
              v-model="symbol"
              type="text"
              class="terminal-input w-full"
              placeholder="BTCUSDT"
            />
          </div>
          
          <div>
            <label class="block text-xs text-gray-500 uppercase tracking-wider mb-2 font-mono">Timeframe</label>
            <select
              v-model="timeframe"
              class="terminal-input w-full"
            >
              <option value="1m">1m</option>
              <option value="5m">5m</option>
              <option value="15m">15m</option>
              <option value="1h">1h</option>
              <option value="4h">4h</option>
              <option value="1d">1d</option>
            </select>
          </div>
          
          <div class="flex items-end">
            <TerminalButton
              @click="loadChart"
              :disabled="loading"
              variant="primary"
              class="w-full"
            >
              {{ loading ? 'Loading...' : 'Load Chart' }}
            </TerminalButton>
          </div>
          
          <div v-if="chartData" class="flex items-end">
            <div class="w-full">
              <div class="text-xs text-gray-500 uppercase tracking-wider mb-1 font-mono">Current Price</div>
              <div class="text-2xl font-mono font-bold text-terminal-accent">
                ${{ chartData.current_price?.toFixed(2) }}
              </div>
            </div>
          </div>
        </div>
      </TerminalCard>

      <!-- Loading -->
      <div v-if="loading" class="text-center py-16">
        <div class="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-terminal-accent mb-4"></div>
        <p class="text-gray-400 font-mono">Carregando gráfico...</p>
      </div>

      <!-- Error -->
      <TerminalCard v-else-if="error" class="border-terminal-error">
        <div class="flex items-center gap-3">
          <div class="w-2 h-2 rounded-full bg-terminal-error animate-pulse"></div>
          <p class="text-terminal-error font-mono">{{ error }}</p>
        </div>
      </TerminalCard>

      <!-- Chart -->
      <div v-else-if="chartData" class="space-y-6">
        <TerminalCard>
          <div id="chart-container" class="h-96 w-full"></div>
        </TerminalCard>
        
        <!-- Indicators Summary -->
        <TerminalCard v-if="chartData.indicators">
          <h2 class="text-xl font-mono font-bold mb-6 flex items-center gap-2">
            <span class="w-2 h-2 rounded-full bg-terminal-accent animate-pulse"></span>
            Indicators Summary
          </h2>
          <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <div class="text-xs text-gray-500 uppercase tracking-wider mb-2 font-mono">EMA 8</div>
              <div class="text-2xl font-mono font-bold text-terminal-info">
                ${{ chartData.indicators.ema8[chartData.indicators.ema8.length - 1]?.value?.toFixed(2) }}
              </div>
            </div>
            <div>
              <div class="text-xs text-gray-500 uppercase tracking-wider mb-2 font-mono">EMA 21</div>
              <div class="text-2xl font-mono font-bold text-terminal-warning">
                ${{ chartData.indicators.ema21[chartData.indicators.ema21.length - 1]?.value?.toFixed(2) }}
              </div>
            </div>
            <div>
              <div class="text-xs text-gray-500 uppercase tracking-wider mb-2 font-mono">RSI</div>
              <div class="text-2xl font-mono font-bold text-terminal-purple">
                {{ chartData.indicators.rsi[chartData.indicators.rsi.length - 1]?.value?.toFixed(2) }}
              </div>
            </div>
          </div>
        </TerminalCard>
      </div>

      <div v-else class="text-center py-16 text-gray-400 font-mono">
        Selecione um símbolo e clique em "Load Chart"
      </div>
    </div>
  </Layout>
</template>

<script setup lang="ts">
import { ref, onMounted, watch, onBeforeUnmount } from 'vue'
import api from '@/services/api'
import { createChart, ColorType, IChartApi } from 'lightweight-charts'
import Layout from '@/components/Layout.vue'
import TerminalCard from '@/components/TerminalCard.vue'
import TerminalButton from '@/components/TerminalButton.vue'

const symbol = ref('BTCUSDT')
const timeframe = ref('1h')
const loading = ref(false)
const error = ref<string | null>(null)
const chartData = ref<any>(null)
let chart: IChartApi | null = null

const loadChart = async () => {
  loading.value = true
  error.value = null
  
  try {
    const data = await api.getChartData(symbol.value, timeframe.value, 500)
    chartData.value = data
    
    renderChart(data)
  } catch (err: any) {
    error.value = err.message || 'Erro ao carregar gráfico'
  } finally {
    loading.value = false
  }
}

const renderChart = (data: any) => {
  const container = document.getElementById('chart-container')
  if (!container) return
  
  // Limpar gráfico anterior
  if (chart) {
    chart.remove()
  }
  
  // Criar novo gráfico
  chart = createChart(container, {
    layout: {
      background: { type: ColorType.Solid, color: '#1a1a1a' },
      textColor: '#d1d5db',
      fontSize: 12,
      fontFamily: 'JetBrains Mono, monospace'
    },
    width: container.clientWidth,
    height: 400,
    grid: {
      vertLines: { color: '#2a2a2a', style: 0 },
      horzLines: { color: '#2a2a2a', style: 0 }
    },
    crosshair: {
      mode: 0,
      vertLine: {
        color: '#00ff00',
        width: 1,
        style: 2
      },
      horzLine: {
        color: '#00ff00',
        width: 1,
        style: 2
      }
    },
    rightPriceScale: {
      borderColor: '#2a2a2a',
      textColor: '#d1d5db'
    },
    timeScale: {
      borderColor: '#2a2a2a',
      timeVisible: true,
      secondsVisible: false
    }
  })
  
  // Adicionar série de candles
  const candlestickSeries = chart.addCandlestickSeries({
    upColor: '#00ff88',
    downColor: '#ff4444',
    borderVisible: false,
    wickUpColor: '#00ff88',
    wickDownColor: '#ff4444'
  })
  
  // Converter candles para formato Lightweight Charts
  const candles = data.candles.map((c: any) => ({
    time: c.time as any,
    open: c.open,
    high: c.high,
    low: c.low,
    close: c.close
  }))
  
  candlestickSeries.setData(candles)
  
  // Adicionar EMA8
  if (data.indicators?.ema8?.length > 0) {
    const ema8Series = chart.addLineSeries({
      color: '#00aaff',
      lineWidth: 2,
      title: 'EMA 8',
      priceLineVisible: false,
      lastValueVisible: true
    })
    ema8Series.setData(data.indicators.ema8.map((i: any) => ({
      time: i.time as any,
      value: i.value
    })))
  }
  
  // Adicionar EMA21
  if (data.indicators?.ema21?.length > 0) {
    const ema21Series = chart.addLineSeries({
      color: '#ffaa00',
      lineWidth: 2,
      title: 'EMA 21',
      priceLineVisible: false,
      lastValueVisible: true
    })
    ema21Series.setData(data.indicators.ema21.map((i: any) => ({
      time: i.time as any,
      value: i.value
    })))
  }
  
  chart.timeScale().fitContent()
  
  // Responsive resize
  const resizeObserver = new ResizeObserver(() => {
    if (chart && container) {
      chart.applyOptions({ width: container.clientWidth })
    }
  })
  resizeObserver.observe(container)
}

watch([symbol, timeframe], () => {
  if (chartData.value) {
    loadChart()
  }
})

onMounted(() => {
  loadChart()
})

onBeforeUnmount(() => {
  if (chart) {
    chart.remove()
  }
})
</script>

<style scoped>
.chart-view {
  min-height: calc(100vh - 200px);
}
</style>
