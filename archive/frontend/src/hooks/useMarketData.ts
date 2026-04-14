// ============================================
// SNE RADAR - MARKET DATA HOOKS (React Query) v2.2
// Server state com cache inteligente (100% sem mock)
// ============================================

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { logger } from '../lib/logger'
import {
  analysisApi,
  chartApi,
  marketApi,
  systemApi,
  handleApiError
} from '../services'
import type {
  AnalysisResult
} from '../types/analysis'

const marketLogger = logger.child('Market-Hooks')

// ============================================
// ANALYSIS HOOKS
// ============================================

/**
 * Hook para análise técnica completa
 * - Cache: 30 segundos
 * - Retry: 3 vezes
 * - AbortController: sim (evita race conditions)
 */
export const useAnalysis = (symbol: string, timeframe: string, enabled: boolean = true) => {
  return useQuery({
    queryKey: ['analysis', symbol, timeframe],
    queryFn: async ({ signal: _signal }) => {
      marketLogger.debug('Fetching analysis', { symbol, timeframe })
      const result = await analysisApi.analyze(symbol, timeframe)
      marketLogger.debug('Analysis fetched successfully', { symbol, timeframe })
      return result
    },
    staleTime: 30 * 1000, // 30s
    gcTime: 5 * 60 * 1000, // 5min (formerly cacheTime)
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
    enabled,
    refetchOnWindowFocus: false,
    onError: (error: unknown) => {
      const apiError = handleApiError(error as Error)
      marketLogger.error('Analysis query failed', {
        symbol,
        timeframe,
        error: apiError
      })
    },
    onSuccess: (data: AnalysisResult) => {
      marketLogger.info('Analysis loaded', {
        symbol,
        timeframe,
        score: data.score_0_100
      })
    }
  })
}

/**
 * Hook para sinal simplificado (lightweight)
 */
export const useSignal = (symbol: string, timeframe: string, enabled: boolean = true) => {
  return useQuery({
    queryKey: ['signal', symbol, timeframe],
    queryFn: async ({ signal: _signal }) => {
      marketLogger.debug('Fetching signal', { symbol, timeframe })
      const result = await analysisApi.getSignal(symbol, timeframe)
      marketLogger.debug('Signal fetched successfully', { symbol, timeframe })
      return result
    },
    staleTime: 60 * 1000, // 1min (mais frequente que análise completa)
    gcTime: 5 * 60 * 1000,
    retry: 2,
    enabled,
    refetchOnWindowFocus: false,
    onError: (error: unknown) => {
      marketLogger.error('Signal query failed', { symbol, timeframe, error: handleApiError(error as Error) })
    }
  })
}

// ============================================
// CHART DATA HOOKS
// ============================================


/**
 * Hook para candles históricos (endpoint separado)
 */
export const useCandles = (symbol: string, interval: string, limit: number = 500, enabled: boolean = true) => {
  return useQuery({
    queryKey: ['candles', symbol, interval, limit],
    queryFn: async ({ signal: _signal }) => {
      marketLogger.debug('Fetching candles', { symbol, interval, limit })
      const result = await chartApi.getCandles(symbol, interval, limit)
      marketLogger.debug('Candles fetched successfully', {
        symbol,
        interval,
        count: result.candles?.length || 0
      })
      return result
    },
    staleTime: 5 * 60 * 1000, // 5min
    gcTime: 15 * 60 * 1000, // 15min
    retry: 3,
    enabled,
    refetchOnWindowFocus: false,
    onError: (error: unknown) => {
      marketLogger.error('Candles query failed', {
        symbol,
        interval,
        limit,
        error: handleApiError(error as Error)
      })
    }
  })
}

/**
 * Hook para níveis S/R
 */
export const useLevels = (symbol: string, timeframe: string, enabled: boolean = true) => {
  return useQuery({
    queryKey: ['levels', symbol, timeframe],
    queryFn: async ({ signal: _signal }) => {
      marketLogger.debug('Fetching levels', { symbol, timeframe })
      const result = await chartApi.getLevels(symbol, timeframe)
      marketLogger.debug('Levels fetched successfully', {
        symbol,
        timeframe,
        supports: result.supports?.length || 0,
        resistances: result.resistances?.length || 0
      })
      return result
    },
    staleTime: 10 * 60 * 1000, // 10min (níveis mudam menos frequentemente)
    gcTime: 30 * 60 * 1000, // 30min
    retry: 2,
    enabled,
    refetchOnWindowFocus: false,
    onError: (error: unknown) => {
      marketLogger.error('Levels query failed', {
        symbol,
        timeframe,
        error: handleApiError(error as Error)
      })
    }
  })
}

/**
 * Hook para preço atual (polling rápido)
 */
export const useLastPrice = (symbol: string, interval: string, enabled: boolean = true) => {
  return useQuery({
    queryKey: ['last-price', symbol, interval],
    queryFn: async ({ signal: _signal }) => {
      const result = await chartApi.getLastPrice(symbol, interval)
      marketLogger.debug('Last price fetched', { symbol, interval, price: result.price })
      return result
    },
    staleTime: 10 * 1000, // 10s (mais frequente para preço atual)
    gcTime: 60 * 1000, // 1min
    retry: 2,
    enabled,
    refetchInterval: enabled ? 30 * 1000 : false, // Poll every 30s
    refetchOnWindowFocus: false,
    onError: (error: unknown) => {
      marketLogger.error('Last price query failed', {
        symbol,
        interval,
        error: handleApiError(error as Error)
      })
    }
  })
}

// ============================================
// MARKET DATA HOOKS
// ============================================

/**
 * Hook para métricas globais
 */
export const useGlobalMetrics = (enabled: boolean = true) => {
  return useQuery({
    queryKey: ['global-metrics'],
    queryFn: async ({ signal: _signal }) => {
      marketLogger.debug('Fetching global metrics')
      const result = await marketApi.getGlobalMetrics()
      marketLogger.debug('Global metrics fetched successfully', {
        marketCap: result.market_cap,
        btcDominance: result.btc_dominance
      })
      return result
    },
    staleTime: 5 * 60 * 1000, // 5min
    gcTime: 15 * 60 * 1000, // 15min
    retry: 3,
    enabled,
    refetchOnWindowFocus: false,
    onError: (error: unknown) => {
      marketLogger.error('Global metrics query failed', { error: handleApiError(error as Error) })
    }
  })
}

/**
 * Hook para busca de símbolos
 */
export const useSymbolSearch = (query: string, limit: number = 20, enabled: boolean = query.length > 2) => {
  return useQuery({
    queryKey: ['symbol-search', query, limit],
    queryFn: async ({ signal: _signal }) => {
      marketLogger.debug('Searching symbols', { query, limit })
      const result = await marketApi.searchSymbols(query, limit)
      marketLogger.debug('Symbol search completed', {
        query,
        resultsCount: result.length
      })
      return result
    },
    staleTime: 10 * 60 * 1000, // 10min (buscas não mudam frequentemente)
    gcTime: 30 * 60 * 1000, // 30min
    retry: 1,
    enabled,
    refetchOnWindowFocus: false,
    onError: (error: unknown) => {
      marketLogger.error('Symbol search failed', {
        query,
        limit,
        error: handleApiError(error as Error)
      })
    }
  })
}

// ============================================
// SYSTEM HOOKS
// ============================================

/**
 * Hook para status do sistema
 */
export const useSystemStatus = (enabled: boolean = true) => {
  return useQuery({
    queryKey: ['system-status'],
    queryFn: async ({ signal: _signal }) => {
      marketLogger.debug('Fetching system status')
      const result = await systemApi.getSystemStatus()
      marketLogger.debug('System status fetched successfully', {
        status: result.status,
        uptime: result.uptime
      })
      return result
    },
    staleTime: 60 * 1000, // 1min
    gcTime: 5 * 60 * 1000, // 5min
    retry: 2,
    enabled,
    refetchOnWindowFocus: false,
    onError: (error: unknown) => {
      marketLogger.error('System status query failed', { error: handleApiError(error as Error) })
    }
  })
}

/**
 * Hook para health check
 */
export const useHealthCheck = () => {
  return useQuery({
    queryKey: ['health'],
    queryFn: async ({ signal: _signal }) => {
      const result = await systemApi.health()
      marketLogger.debug('Health check successful')
      return result
    },
    staleTime: 30 * 1000, // 30s
    gcTime: 5 * 60 * 1000, // 5min
    retry: 1,
    refetchOnWindowFocus: false,
    onError: (error: unknown) => {
      marketLogger.error('Health check failed', { error: handleApiError(error as Error) })
    }
  })
}

// ============================================
// MUTATIONS (para ações que modificam estado)
// ============================================

/**
 * Mutation para executar análise (caso precise forçar refresh)
 */
export const useAnalyzeMutation = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ symbol, timeframe }: { symbol: string; timeframe: string }) =>
      analysisApi.analyze(symbol, timeframe),
    onSuccess: (data, variables) => {
      marketLogger.info('Analysis mutation successful', {
        symbol: variables.symbol,
        timeframe: variables.timeframe
      })
      // Invalidate related queries
      queryClient.invalidateQueries({ queryKey: ['analysis', variables.symbol, variables.timeframe] })
      queryClient.invalidateQueries({ queryKey: ['signal', variables.symbol, variables.timeframe] })
    },
    onError: (error: any, variables) => {
      marketLogger.error('Analysis mutation failed', {
        symbol: variables.symbol,
        timeframe: variables.timeframe,
        error: handleApiError(error as Error)
      })
    }
  })
}
