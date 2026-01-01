// ============================================
// SNE RADAR - TYPES INDEX v2.2
// Export centralizado de todos os tipos
// ============================================

// Analysis types
export type {
  AnalysisResult,
  SynthesisData,
  ConfluenceData,
  StructureData,
  ContextData,
  IndicatorsData,
  OperationalLevels,
  ChartData,
  GlobalMetrics,
  ApiResponse,
  PaginatedResponse,
  ApiError,
  CandleData,
  LevelsData,
  PricePoint
} from './analysis'

export {
  SIGNAL_TYPES,
  RISK_LEVELS,
  TIMEFRAMES,
  isValidSignal,
  isValidRiskLevel,
  isValidTimeframe
} from './analysis'

// Chart types
export type {
  LightweightCandle,
  LightweightLevel,
  ChartCoreProps,
  ChartDataProps,
  ChartOverlaysProps,
  ChartState,
  ChartActions,
  UseChartDataOptions,
  UseChartDataResult,
  ChartEventHandlers,
  ChartConfig,
  ChartTheme,
  ChartAdapter
} from './chart'

export {
  ChartError,
  ChartErrorCodes
} from './chart'

// Type aliases for common usage
import type { Timeframe, Symbol } from './analysis'
import type { ChartStatus } from './chart'

export type { Timeframe, Symbol, ChartStatus }
