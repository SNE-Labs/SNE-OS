// ============================================
// SNE RADAR - CHART TYPES v2.2
// Tipos específicos para componentes de gráficos
// ============================================

import type { IChartApi, Time } from 'lightweight-charts'
import type { CandleData, LevelsData, AnalysisResult } from './analysis'

// ============================================
// LIGHTWEIGHT CHARTS ADAPTER
// ============================================

export interface LightweightCandle {
  time: Time
  open: number
  high: number
  low: number
  close: number
  volume?: number
}

export interface LightweightLevel {
  price: number
  color: string
  lineWidth: number
  lineStyle: number
  axisLabelVisible: boolean
  title?: string
}

// ============================================
// CHART COMPONENT PROPS
// ============================================

export interface ChartCoreProps {
  width: number
  height: number
  symbol: string
  timeframe: string
  onChartReady?: (chart: IChartApi) => void
  onChartError?: (error: Error) => void
}

export interface ChartDataProps {
  candles: LightweightCandle[]
  levels?: LightweightLevel[]
  currentPrice?: number
}

export interface ChartOverlaysProps {
  supports?: LightweightLevel[]
  resistances?: LightweightLevel[]
  currentPrice?: number
  analysisData?: {
    signal?: string
    entryPrice?: number
    score_0_100?: number
    timestamp?: number
    recommendation?: string
  }
}

// ============================================
// CHART STATE MANAGEMENT
// ============================================

export interface ChartState {
  isLoading: boolean
  error: string | null
  lastUpdate: number | null
  zoomLevel: number
  panOffset: number
}

export interface ChartActions {
  setLoading: (loading: boolean) => void
  setError: (error: string | null) => void
  updateLastUpdate: () => void
  setZoomLevel: (level: number) => void
  setPanOffset: (offset: number) => void
  reset: () => void
}

// ============================================
// CHART HOOKS TYPES
// ============================================

export interface UseChartDataOptions {
  symbol: string
  timeframe: string
  enabled?: boolean
  refetchInterval?: number
}

export interface UseChartDataResult {
  data: LightweightCandle[] | undefined
  isLoading: boolean
  error: Error | null
  refetch: () => Promise<unknown>
  lastUpdate: number | null
}

// ============================================
// CHART EVENTS
// ============================================

export interface ChartEventHandlers {
  onCrosshairMove?: (param: MouseEventParams) => void
  onClick?: (param: MouseEventParams) => void
  onVisibleRangeChange?: (range: TimeRange) => void
  onSizeChange?: (size: { width: number; height: number }) => void
}

export interface MouseEventParams {
  point: { x: number; y: number }
  time: Time
  seriesPrices: Record<string, number>
}

export interface TimeRange {
  from: Time
  to: Time
}

// ============================================
// CHART CONFIGURATION
// ============================================

export interface ChartConfig {
  width: number
  height: number
  backgroundColor: string
  textColor: string
  gridColor: string
  upColor: string
  downColor: string
  borderVisible: boolean
  gridVisible: boolean
  timeScale: {
    timeVisible: boolean
    secondsVisible: boolean
    borderColor: string
  }
  priceScale: {
    borderColor: string
    mode: number // PriceScaleMode
  }
}

export interface ChartTheme {
  background: string
  text: string
  grid: string
  up: string
  down: string
  border: string
}

// ============================================
// CHART ADAPTER FUNCTIONS
// ============================================

export interface ChartAdapter {
  adaptCandlesToLightweight: (candles: CandleData[]) => LightweightCandle[]
  adaptLevelsToLightweight: (levels: LevelsData) => {
    supports: LightweightLevel[]
    resistances: LightweightLevel[]
  }
  adaptPriceToLightweight: (price: number) => LightweightLevel
}

// ============================================
// ERROR TYPES
// ============================================

export class ChartError extends Error {
  constructor(
    message: string,
    public code: string,
    public originalError?: Error
  ) {
    super(message)
    this.name = 'ChartError'
  }
}

export const ChartErrorCodes = {
  LOAD_FAILED: 'LOAD_FAILED',
  PARSE_FAILED: 'PARSE_FAILED',
  NETWORK_ERROR: 'NETWORK_ERROR',
  TIMEOUT: 'TIMEOUT'
} as const

// ============================================
// UTILITY TYPES
// ============================================

export type ChartStatus = 'idle' | 'loading' | 'success' | 'error'

export interface ChartRetryConfig {
  maxAttempts: number
  delayMs: number
  backoffMultiplier: number
}

export interface ChartCacheConfig {
  ttl: number // time to live in milliseconds
  maxSize: number // max cached items
}
