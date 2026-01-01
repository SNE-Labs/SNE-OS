// ============================================
// SNE RADAR - MOCK DATA v2.2
// Dados de exemplo compatíveis com schemas TypeScript
// ============================================

import type {
  AnalysisResult,
  ChartData,
  GlobalMetrics
} from '../types/analysis'

// ============================================
// MOCK ANALYSIS RESULT
// ============================================

export const mockAnalysisResult: AnalysisResult = {
  signal: 'BUY',
  score_0_100: 75,
  recommendation: 'Entrada em pullback com confluência de médias',
  entryPrice: 45000,
  riskLevel: 'BAIXO',
  riskMessage: 'Stop loss próximo ao suporte semanal',
  signalType: 'LONG_TERM',
  timeframe: '1h',

  sintese: {
    acao: 'BUY',
    recomendacao: 'Entrada em pullback com confluência de médias',
    risco: 'BAIXO',
    score_combinado: 75,
    score_confianca: 80
  },

  confluencia: {
    score: 75,
    interpretacao: 'Confluência forte entre médias móveis e níveis de suporte',
    validacoes: [
      'EMA8 > EMA21',
      'Preço acima da média móvel de 200 períodos',
      'Suporte semanal validado',
      'Volume acima da média'
    ],
    confluencia_score: 75
  },

  estrutura: {
    tendencia: 'ALTA',
    tipo_estrutura: 'CANAL_PARALELO',
    suportes: [44000, 43500, 43000],
    resistencias: [46000, 46500, 47000]
  },

  contexto: {
    regime: 'BULLISH',
    volatilidade_status: 'MODERADA',
    volume_status: 'ACIMA_DA_MEDIA',
    preco_atual: 45250
  },

  indicadores: {
    rsi: 55,
    sinal_completo: {
      recomendacao: 'BUY'
    },
    confluencia_avancada: {
      confluencia_score: 75
    }
  },

  niveis_operacionais: {
    entry_price: 45000,
    stop_loss: 44200,
    take_profit: 46500
  }
}

// ============================================
// MOCK CHART DATA
// ============================================

export const mockChartData: ChartData = {
  symbol: 'BTCUSDT',
  timeframe: '1h',
  current_price: 45250,
  last_update: Date.now(),

  candles: [
    {
      timestamp: Date.now() - 5 * 60 * 60 * 1000, // 5 horas atrás
      open: 44800,
      high: 45200,
      low: 44700,
      close: 45100,
      volume: 1250000
    },
    {
      timestamp: Date.now() - 4 * 60 * 60 * 1000,
      open: 45100,
      high: 45300,
      low: 44900,
      close: 45200,
      volume: 1180000
    },
    {
      timestamp: Date.now() - 3 * 60 * 60 * 1000,
      open: 45200,
      high: 45500,
      low: 45100,
      close: 45350,
      volume: 1320000
    },
    {
      timestamp: Date.now() - 2 * 60 * 60 * 1000,
      open: 45350,
      high: 45600,
      low: 45200,
      close: 45400,
      volume: 1280000
    },
    {
      timestamp: Date.now() - 1 * 60 * 60 * 1000,
      open: 45400,
      high: 45700,
      low: 45300,
      close: 45250,
      volume: 1150000
    }
  ],

  levels: {
    supports: [
      { price: 44000, strength: 3, label: 'S3' },
      { price: 43500, strength: 2, label: 'S2' },
      { price: 43000, strength: 1, label: 'S1' }
    ],
    resistances: [
      { price: 46000, strength: 3, label: 'R3' },
      { price: 46500, strength: 2, label: 'R2' },
      { price: 47000, strength: 1, label: 'R1' }
    ]
  }
}

// ============================================
// MOCK GLOBAL METRICS
// ============================================

export const mockGlobalMetrics: GlobalMetrics = {
  market_cap: 1650000000000, // 1.65T
  volume_24h: 85000000000,   // 85B
  btc_dominance: 52.3,
  fear_greed_index: 65,
  total_cryptocurrencies: 12500,
  active_cryptocurrencies: 3200,
  last_update: Date.now()
}

// ============================================
// UTILITY FUNCTIONS
// ============================================

/**
 * Retorna mock data aleatório para desenvolvimento
 */
export const getRandomAnalysisResult = (): AnalysisResult => {
  const signals: Array<'BUY' | 'SELL' | 'NEUTRAL'> = ['BUY', 'SELL', 'NEUTRAL']
  const riskLevels: Array<'BAIXO' | 'MÉDIO' | 'ALTO'> = ['BAIXO', 'MÉDIO', 'ALTO']

  return {
    ...mockAnalysisResult,
    signal: signals[Math.floor(Math.random() * signals.length)],
    score_0_100: Math.floor(Math.random() * 100),
    riskLevel: riskLevels[Math.floor(Math.random() * riskLevels.length)]
  }
}

/**
 * Simula delay de API para desenvolvimento
 */
export const delay = (ms: number): Promise<void> => {
  return new Promise(resolve => setTimeout(resolve, ms))
}

/**
 * Wrapper para simular chamadas de API
 */
export const mockApiCall = async <T>(data: T, delayMs: number = 500): Promise<T> => {
  await delay(delayMs)
  return data
}
