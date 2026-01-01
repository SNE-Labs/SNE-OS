// ============================================
// SNE RADAR - SCHEMAS TYPESCRIPT v2.2
// Contratos padronizados para frontend React
// ============================================

// ============================================
// BASE TYPES
// ============================================

export interface CandleData {
  timestamp: number
  open: number
  high: number
  low: number
  close: number
  volume?: number
}

export interface LevelsData {
  supports: Array<{
    price: number
    strength: number
    label: string
  }>
  resistances: Array<{
    price: number
    strength: number
    label: string
  }>
}

// ============================================
// ANALYSIS RESULT - SCHEMA PRINCIPAL
// ============================================

export interface AnalysisResult {
  // Sinal principal (padronizado)
  signal: 'BUY' | 'SELL' | 'NEUTRAL'

  // Score padronizado 0-100 (não 0-10)
  score_0_100: number // 0-100 (confluência/confiança)

  // Dados operacionais
  recommendation?: string
  entryPrice?: number
  riskLevel?: 'BAIXO' | 'MÉDIO' | 'ALTO'
  riskMessage?: string
  signalType?: string
  timeframe?: string

  // Dados estruturados da análise
  sintese?: SynthesisData
  confluencia?: ConfluenceData
  estrutura?: StructureData
  contexto?: ContextData
  indicadores?: IndicatorsData
  niveis_operacionais?: OperationalLevels
}

// ============================================
// DADOS ESTRUTURADOS DA ANÁLISE
// ============================================

export interface SynthesisData {
  acao?: string
  recomendacao?: string
  risco?: string
  score_combinado?: number
  score_confianca?: number
}

export interface ConfluenceData {
  score?: number
  interpretacao?: string
  validacoes?: string[]
  confluencia_score?: number
}

export interface StructureData {
  tendencia?: string
  tipo_estrutura?: string
  suportes?: number[]
  resistencias?: number[]
}

export interface ContextData {
  regime?: string
  volatilidade_status?: string
  volume_status?: string
  preco_atual?: number
}

export interface IndicatorsData {
  rsi?: number
  sinal_completo?: {
    recomendacao?: string
  }
  confluencia_avancada?: {
    confluencia_score?: number
  }
}

export interface OperationalLevels {
  entry_price?: number
  stop_loss?: number
  take_profit?: number
}

// ============================================
// CHART DATA - SCHEMA PARA GRÁFICOS
// ============================================

export interface ChartData {
  symbol: string
  timeframe: string
  candles: CandleData[]
  levels?: LevelsData
  current_price?: number
  indicators?: IndicatorsData
  last_update?: number
}

// ============================================
// GLOBAL METRICS - SCHEMA PARA DASHBOARD
// ============================================

export interface GlobalMetrics {
  market_cap: number
  volume_24h: number
  btc_dominance: number
  fear_greed_index: number
  total_cryptocurrencies?: number
  active_cryptocurrencies?: number
  last_update?: number
}

// ============================================
// API RESPONSE TYPES
// ============================================

export interface ApiResponse<T> {
  success: boolean
  data: T
  error?: string
  timestamp?: number
}

export interface PaginatedResponse<T> {
  data: T[]
  total: number
  page: number
  limit: number
  has_more: boolean
}

// ============================================
// ERROR TYPES
// ============================================

export interface ApiError {
  message: string
  code?: string
  status?: number
  details?: Record<string, unknown>
}

// ============================================
// UTILITY TYPES
// ============================================

export type Timeframe = '1m' | '5m' | '15m' | '30m' | '1h' | '4h' | '1d' | '1w'

export type Symbol = string // ex: 'BTCUSDT', 'ETHUSDT'

export interface PricePoint {
  price: number
  timestamp: number
  volume?: number
}

export type ApiMethod = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH'

export interface RequestConfig {
  timeout?: number
  retries?: number
  headers?: Record<string, string>
}

// ============================================
// ENUMS E CONSTANTS
// ============================================

export const SIGNAL_TYPES = {
  BUY: 'BUY',
  SELL: 'SELL',
  NEUTRAL: 'NEUTRAL'
} as const

export const RISK_LEVELS = {
  BAIXO: 'BAIXO',
  MEDIO: 'MÉDIO',
  ALTO: 'ALTO'
} as const

export const TIMEFRAMES = {
  '1m': '1m',
  '5m': '5m',
  '15m': '15m',
  '30m': '30m',
  '1h': '1h',
  '4h': '4h',
  '1d': '1d',
  '1w': '1w'
} as const

// ============================================
// TYPE GUARDS
// ============================================

export const isValidSignal = (signal: string): signal is keyof typeof SIGNAL_TYPES => {
  return signal in SIGNAL_TYPES
}

export const isValidRiskLevel = (risk: string): risk is keyof typeof RISK_LEVELS => {
  return risk in RISK_LEVELS
}

export const isValidTimeframe = (timeframe: string): timeframe is Timeframe => {
  return timeframe in TIMEFRAMES
}
