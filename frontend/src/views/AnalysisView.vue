<template>
  <Layout>
    <div class="analysis-view">
      <!-- Header -->
      <div class="mb-8">
        <h1 class="text-4xl font-mono font-bold mb-2 glow-green">Technical Analysis</h1>
        <p class="text-gray-400 font-mono">Análise técnica completa com níveis operacionais</p>
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
              <option value="1h">1h</option>
              <option value="4h">4h</option>
              <option value="1d">1d</option>
            </select>
          </div>
          
          <div class="flex items-end">
            <TerminalButton
              @click="loadAnalysis"
              :disabled="loading"
              variant="primary"
              class="w-full"
            >
              {{ loading ? 'Analyzing...' : 'Analyze' }}
            </TerminalButton>
          </div>
          
          <div v-if="analysis" class="flex items-end">
            <div class="w-full">
              <div class="text-xs text-gray-500 uppercase tracking-wider mb-1 font-mono">Score</div>
              <div class="text-3xl font-mono font-bold text-terminal-accent">
                {{ analysis.sintese?.score_combinado?.toFixed(1) || 'N/A' }}/10
              </div>
            </div>
          </div>
        </div>
      </TerminalCard>

      <!-- Loading -->
      <div v-if="loading" class="text-center py-16">
        <div class="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-terminal-accent mb-4"></div>
        <p class="text-gray-400 font-mono">Executando análise...</p>
      </div>

      <!-- Error -->
      <TerminalCard v-else-if="error" class="border-terminal-error">
        <div class="flex items-center gap-3">
          <div class="w-2 h-2 rounded-full bg-terminal-error animate-pulse"></div>
          <p class="text-terminal-error font-mono">{{ error }}</p>
        </div>
      </TerminalCard>

      <!-- Analysis Results -->
      <div v-else-if="analysis" class="space-y-6">
        <!-- Synthesis -->
        <TerminalCard v-if="analysis.sintese">
          <h2 class="text-2xl font-mono font-bold mb-6 flex items-center gap-2">
            <span class="w-2 h-2 rounded-full bg-terminal-accent animate-pulse"></span>
            Synthesis
          </h2>
          <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div>
              <div class="text-xs text-gray-500 uppercase tracking-wider mb-2 font-mono">Action</div>
              <div
                :class="[
                  'text-2xl font-mono font-bold',
                  analysis.sintese.acao === 'BUY' ? 'text-terminal-success' : '',
                  analysis.sintese.acao === 'SELL' ? 'text-terminal-error' : '',
                  analysis.sintese.acao === 'NEUTRAL' ? 'text-gray-400' : ''
                ]"
              >
                {{ analysis.sintese.acao }}
              </div>
            </div>
            <div>
              <div class="text-xs text-gray-500 uppercase tracking-wider mb-2 font-mono">Recommendation</div>
              <div class="text-lg font-mono">{{ analysis.sintese.recomendacao }}</div>
            </div>
            <div>
              <div class="text-xs text-gray-500 uppercase tracking-wider mb-2 font-mono">Score</div>
              <div class="text-2xl font-mono font-bold text-terminal-accent">
                {{ analysis.sintese.score_combinado?.toFixed(1) || 'N/A' }}/10
              </div>
            </div>
            <div>
              <div class="text-xs text-gray-500 uppercase tracking-wider mb-2 font-mono">Risk/Reward</div>
              <div class="text-lg font-mono">{{ analysis.sintese.rr_ratio || 'N/A' }}</div>
            </div>
          </div>
        </TerminalCard>

        <!-- Operational Levels -->
        <TerminalCard v-if="analysis.niveis_operacionais">
          <h2 class="text-2xl font-mono font-bold mb-6 flex items-center gap-2">
            <span class="w-2 h-2 rounded-full bg-terminal-accent animate-pulse"></span>
            Operational Levels
          </h2>
          <div class="grid grid-cols-2 md:grid-cols-5 gap-4">
            <div>
              <div class="text-xs text-gray-500 uppercase tracking-wider mb-2 font-mono">Entry</div>
              <div class="text-xl font-mono font-bold text-terminal-fg">
                ${{ analysis.niveis_operacionais.entry_price?.toFixed(2) }}
              </div>
            </div>
            <div>
              <div class="text-xs text-gray-500 uppercase tracking-wider mb-2 font-mono">Stop Loss</div>
              <div class="text-xl font-mono font-bold text-terminal-error">
                ${{ analysis.niveis_operacionais.stop_loss?.toFixed(2) }}
              </div>
            </div>
            <div>
              <div class="text-xs text-gray-500 uppercase tracking-wider mb-2 font-mono">TP1</div>
              <div class="text-xl font-mono font-bold text-terminal-success">
                ${{ analysis.niveis_operacionais.tp1?.toFixed(2) }}
              </div>
            </div>
            <div>
              <div class="text-xs text-gray-500 uppercase tracking-wider mb-2 font-mono">TP2</div>
              <div class="text-xl font-mono font-bold text-terminal-success">
                ${{ analysis.niveis_operacionais.tp2?.toFixed(2) }}
              </div>
            </div>
            <div>
              <div class="text-xs text-gray-500 uppercase tracking-wider mb-2 font-mono">TP3</div>
              <div class="text-xl font-mono font-bold text-terminal-success">
                ${{ analysis.niveis_operacionais.tp3?.toFixed(2) }}
              </div>
            </div>
          </div>
        </TerminalCard>

        <!-- Context -->
        <TerminalCard v-if="analysis.contexto">
          <h2 class="text-2xl font-mono font-bold mb-6 flex items-center gap-2">
            <span class="w-2 h-2 rounded-full bg-terminal-accent animate-pulse"></span>
            Market Context
          </h2>
          <div class="grid grid-cols-2 md:grid-cols-4 gap-6">
            <div>
              <div class="text-xs text-gray-500 uppercase tracking-wider mb-2 font-mono">Regime</div>
              <div class="text-lg font-mono">{{ analysis.contexto.regime }}</div>
            </div>
            <div>
              <div class="text-xs text-gray-500 uppercase tracking-wider mb-2 font-mono">Volatility</div>
              <div class="text-lg font-mono">{{ analysis.contexto.volatilidade }}%</div>
            </div>
            <div>
              <div class="text-xs text-gray-500 uppercase tracking-wider mb-2 font-mono">Trend (Short)</div>
              <div class="text-lg font-mono">{{ analysis.contexto.tendencia_curta }}</div>
            </div>
            <div>
              <div class="text-xs text-gray-500 uppercase tracking-wider mb-2 font-mono">Trend (Long)</div>
              <div class="text-lg font-mono">{{ analysis.contexto.tendencia_longa }}</div>
            </div>
          </div>
        </TerminalCard>

        <!-- Indicators -->
        <TerminalCard v-if="analysis.indicadores">
          <h2 class="text-2xl font-mono font-bold mb-6 flex items-center gap-2">
            <span class="w-2 h-2 rounded-full bg-terminal-accent animate-pulse"></span>
            Indicators
          </h2>
          <div class="grid grid-cols-2 md:grid-cols-4 gap-6">
            <div>
              <div class="text-xs text-gray-500 uppercase tracking-wider mb-2 font-mono">RSI</div>
              <div class="text-lg font-mono">{{ analysis.indicadores.rsi?.toFixed(2) }}</div>
            </div>
            <div>
              <div class="text-xs text-gray-500 uppercase tracking-wider mb-2 font-mono">EMA 8</div>
              <div class="text-lg font-mono">${{ analysis.indicadores.ema8?.toFixed(2) }}</div>
            </div>
            <div>
              <div class="text-xs text-gray-500 uppercase tracking-wider mb-2 font-mono">EMA 21</div>
              <div class="text-lg font-mono">${{ analysis.indicadores.ema21?.toFixed(2) }}</div>
            </div>
            <div>
              <div class="text-xs text-gray-500 uppercase tracking-wider mb-2 font-mono">Price</div>
              <div class="text-lg font-mono">${{ analysis.indicadores.preco?.toFixed(2) }}</div>
            </div>
          </div>
        </TerminalCard>
      </div>

      <div v-else class="text-center py-16 text-gray-400 font-mono">
        Selecione um símbolo e clique em "Analyze"
      </div>
    </div>
  </Layout>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import api from '@/services/api'
import Layout from '@/components/Layout.vue'
import TerminalCard from '@/components/TerminalCard.vue'
import TerminalButton from '@/components/TerminalButton.vue'

const symbol = ref('BTCUSDT')
const timeframe = ref('1h')
const loading = ref(false)
const error = ref<string | null>(null)
const analysis = ref<any>(null)

const loadAnalysis = async () => {
  loading.value = true
  error.value = null
  
  try {
    analysis.value = await api.analyze(symbol.value, timeframe.value)
  } catch (err: any) {
    error.value = err.message || 'Erro ao executar análise'
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.analysis-view {
  min-height: calc(100vh - 200px);
}
</style>
