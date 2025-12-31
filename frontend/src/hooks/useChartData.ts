// ============================================
// SNE RADAR - CHART DATA HOOK v2.2
// Gerenciamento de dados do gráfico com React Query
// ============================================

import { useQuery } from '@tanstack/react-query'
import { logger } from '../lib/logger'
import { chartApi } from '../services'
import { adaptCandlesToLightweight, adaptLevelsToLightweight, validateCandles } from '../lib/chartAdapter'
import type { UseChartDataResult } from '../types/chart'

const chartLogger = logger.child('Chart-Data')

// ============================================
// MAIN HOOK - DADOS CONSOLIDADOS DO GRÁFICO
// ============================================

export const useChartData = (
  symbol: string,
  timeframe: string,
  enabled: boolean = true
): UseChartDataResult => {
  return useQuery({
    queryKey: ['chart-data', symbol, timeframe],
    queryFn: async ({ signal }) => {
      chartLogger.debug('Fetching chart data', { symbol, timeframe })

      try {
        // Fetch candles (main data source)
        const rawData = await chartApi.getCandles(symbol, timeframe, 500)
        const validCandles = validateCandles(rawData.candles || [])

        if (validCandles.length === 0) {
          chartLogger.warn('No valid candles found', { symbol, timeframe })
          return {
            candles: [],
            levels: { supports: [], resistances: [] },
            currentPrice: 0,
            timestamp: Date.now(),
            metadata: {
              symbol,
              timeframe,
              candleCount: 0,
              hasLevels: false
            }
          }
        }

        // Adapt to Lightweight Charts format
        const candles = adaptCandlesToLightweight(validCandles)

        // Derive current price from last candle
        const lastCandle = validCandles[validCandles.length - 1]
        const currentPrice = lastCandle?.close || 0

        // For now, no levels (can be added later when endpoint exists)
        const levels = { supports: [], resistances: [] }

        const result = {
          candles,
          levels,
          currentPrice,
          timestamp: Date.now(),
          metadata: {
            symbol,
            timeframe,
            candleCount: candles.length,
            hasLevels: false
          }
        }

        chartLogger.debug('Chart data processed successfully', {
          symbol,
          timeframe,
          candleCount: candles.length,
          hasLevels: result.metadata.hasLevels
        })

        return result

      } catch (error) {
        chartLogger.error('Chart data fetch failed', {
          symbol,
          timeframe,
          error: error instanceof Error ? error.message : 'Unknown error'
        })
        throw error
      }
    },
    staleTime: 60 * 1000, // 1min
    gcTime: 10 * 60 * 1000, // 10min
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
    enabled,
    refetchOnWindowFocus: false,
    onError: (error: unknown) => {
      chartLogger.error('Chart data query failed', {
        symbol,
        timeframe,
        error: error instanceof Error ? error.message : 'Unknown error'
      })
    }
  })
}

// ============================================
// HOOK PARA CANDLES SÓ
// ============================================

export const useCandlesOnly = (
  symbol: string,
  timeframe: string,
  limit: number = 500,
  enabled: boolean = true
) => {
  return useQuery({
    queryKey: ['candles-only', symbol, timeframe, limit],
    queryFn: async ({ signal }) => {
      chartLogger.debug('Fetching candles only', { symbol, timeframe, limit })

      const rawData = await chartApi.getCandles(symbol, timeframe, limit)
      const validCandles = validateCandles(rawData.candles || [])
      const candles = adaptCandlesToLightweight(validCandles)

      chartLogger.debug('Candles fetched successfully', {
        symbol,
        timeframe,
        limit,
        actualCount: candles.length
      })

      return candles
    },
    staleTime: 5 * 60 * 1000, // 5min
    gcTime: 15 * 60 * 1000, // 15min
    retry: 3,
    enabled,
    refetchOnWindowFocus: false
  })
}

// ============================================
// HOOK PARA LEVELS SÓ
// ============================================

export const useLevelsOnly = (
  symbol: string,
  timeframe: string,
  enabled: boolean = true
) => {
  return useQuery({
    queryKey: ['levels-only', symbol, timeframe],
    queryFn: async ({ signal }) => {
      chartLogger.debug('Fetching levels only', { symbol, timeframe })

      const levelsData = await chartApi.getLevels(symbol, timeframe)
      const levels = adaptLevelsToLightweight(levelsData)

      chartLogger.debug('Levels fetched successfully', {
        symbol,
        timeframe,
        supports: levels.supports.length,
        resistances: levels.resistances.length
      })

      return levels
    },
    staleTime: 10 * 60 * 1000, // 10min (levels change less frequently)
    gcTime: 30 * 60 * 1000, // 30min
    retry: 2,
    enabled,
    refetchOnWindowFocus: false
  })
}

// ============================================
// HOOK PARA PREÇO ATUAL (POLLING)
// ============================================

export const useCurrentPrice = (
  symbol: string,
  timeframe: string,
  enabled: boolean = true
) => {
  return useQuery({
    queryKey: ['current-price', symbol, timeframe],
    queryFn: async ({ signal }) => {
      // Get latest candle to derive current price
      const rawData = await chartApi.getCandles(symbol, timeframe, 1)
      const validCandles = validateCandles(rawData.candles || [])

      if (validCandles.length === 0) {
        throw new Error('No candles available for price')
      }

      const lastCandle = validCandles[validCandles.length - 1]
      const price = lastCandle?.close || 0

      const result = {
        price,
        timestamp: lastCandle?.time || Date.now()
      }

      chartLogger.debug('Current price derived from candle', {
        symbol,
        timeframe,
        price: result.price
      })

      return result
    },
    staleTime: 10 * 1000, // 10s
    gcTime: 60 * 1000, // 1min
    retry: 2,
    enabled,
    refetchInterval: enabled ? 30 * 1000 : false, // Poll every 30s
    refetchOnWindowFocus: false,
    onError: (error: unknown) => {
      chartLogger.error('Current price fetch failed', {
        symbol,
        timeframe,
        error: error instanceof Error ? error.message : 'Unknown error'
      })
    }
  })
}

// ============================================
// UTILITY HOOKS
// ============================================

/**
 * Hook que combina dados do gráfico com indicadores calculados
 */
export const useChartWithIndicators = (
  symbol: string,
  timeframe: string,
  enabled: boolean = true
) => {
  const chartData = useChartData(symbol, timeframe, enabled)
  const currentPrice = useCurrentPrice(symbol, timeframe, enabled && chartData.isSuccess)

  return {
    ...chartData,
    currentPrice: currentPrice.data,
    isLoading: chartData.isLoading || currentPrice.isLoading,
    error: chartData.error || currentPrice.error
  }
}

/**
 * Hook para detectar se dados estão stale demais
 */
export const useChartDataFreshness = (timestamp?: number, maxAge: number = 5 * 60 * 1000) => {
  const now = Date.now()
  const age = timestamp ? now - timestamp : 0
  const isStale = age > maxAge

  return {
    age,
    isStale,
    freshness: Math.max(0, 1 - (age / maxAge)), // 0-1 (1 = fresh)
    timeUntilStale: Math.max(0, maxAge - age)
  }
}
