// ============================================
// SNE RADAR - API SERVICE v2.2
// Conexão REAL com backend no Render (100% sem mock)
// ============================================

import type { AxiosInstance, AxiosResponse } from 'axios';
import axios from 'axios'
import { logger } from '../lib/logger'
import type {
  AnalysisResult,
  ChartData,
  GlobalMetrics,
  ApiResponse,
  ApiError
} from '../types/analysis'

// ============================================
// CONFIGURAÇÃO DA API
// ============================================

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'https://api.snelabs.space'
const WS_URL = import.meta.env.VITE_WS_URL ?? 'wss://api.snelabs.space'

// Logger contextualizado para API
const apiLogger = logger.child('API')

// ============================================
// AXIOS INSTANCE CONFIG
// ============================================

const api: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000, // 30s timeout
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true, // Para cookies HttpOnly
})

// ============================================
// INTERCEPTORS - OBSERVABILIDADE
// ============================================

// Request Interceptor
api.interceptors.request.use(
  (config) => {
    apiLogger.debug(`→ ${config.method?.toUpperCase()} ${config.url}`, {
      params: config.params,
      data: config.data
    })
    return config
  },
  (error) => {
    apiLogger.error('Request interceptor error', error)
    return Promise.reject(error)
  }
)

// Response Interceptor
api.interceptors.response.use(
  (response: AxiosResponse) => {
    apiLogger.debug(`← ${response.status} ${response.config.url}`)
    return response
  },
  (error) => {
    const status = error.response?.status
    const url = error.config?.url
    const method = error.config?.method?.toUpperCase()

    apiLogger.error(`API Error: ${method} ${url}`, {
      status,
      message: error.message,
      data: error.response?.data
    })

    // Handle common errors
    if (status === 401) {
      // Token expired or invalid
      apiLogger.warn('Authentication error - token may be expired')
      // TODO: Trigger re-authentication flow
    } else if (status === 429) {
      apiLogger.warn('Rate limit exceeded')
    } else if (status >= 500) {
      apiLogger.error('Server error', { status, url })
    }

    return Promise.reject(error)
  }
)

// ============================================
// API METHODS - CONEXÃO REAL COM BACKEND
// ============================================

export const analysisApi = {
  /**
   * Executa análise técnica completa
   */
  async analyze(symbol: string, timeframe: string): Promise<AnalysisResult> {
    const response = await api.post<ApiResponse<AnalysisResult>>('/api/analyze', {
      symbol,
      timeframe
    })

    if (!response.data.success) {
      throw new Error(response.data.error ?? 'Análise falhou')
    }

    return response.data.data
  },

  /**
   * Busca sinal simplificado
   */
  async getSignal(symbol: string, timeframe: string): Promise<{ signal: string; score_0_100: number }> {
    const response = await api.get<ApiResponse<{ signal: string; score_0_100: number }>>('/api/signal', {
      params: { symbol, timeframe }
    })

    if (!response.data.success) {
      throw new Error(response.data.error ?? 'Busca de sinal falhou')
    }

    return response.data.data
  }
}

export const chartApi = {
  /**
   * Busca dados de gráfico consolidados
   */
  async getChartData(symbol: string, timeframe: string, limit: number = 500): Promise<ChartData> {
    const response = await api.get<ApiResponse<ChartData>>('/api/v1/chart-data', {
      params: { symbol, timeframe, limit }
    })

    if (!response.data.success) {
      throw new Error(response.data.error ?? 'Busca de dados do gráfico falhou')
    }

    return response.data.data
  },

  /**
   * Busca candles históricos
   */
  async getCandles(symbol: string, interval: string, limit: number = 500): Promise<ChartData> {
    const response = await api.get<ApiResponse<ChartData>>('/api/v1/candles', {
      params: { symbol, interval, limit }
    })

    if (!response.data.success) {
      throw new Error(response.data.error ?? 'Busca de candles falhou')
    }

    return response.data.data
  },

  /**
   * Busca níveis de suporte/resistência
   */
  async getLevels(symbol: string, timeframe: string): Promise<{ supports: number[], resistances: number[] }> {
    const response = await api.get<ApiResponse<{ supports: number[], resistances: number[] }>>('/api/chart/levels', {
      params: { symbol, timeframe }
    })

    if (!response.data.success) {
      throw new Error(response.data.error ?? 'Busca de níveis falhou')
    }

    return response.data.data
  },

  /**
   * Busca preço atual (lightweight)
   */
  async getLastPrice(symbol: string, interval: string): Promise<{ price: number; timestamp: number }> {
    const response = await api.get<ApiResponse<{ price: number; timestamp: number }>>('/api/v1/last-price', {
      params: { symbol, interval }
    })

    if (!response.data.success) {
      throw new Error(response.data.error ?? 'Busca de preço atual falhou')
    }

    return response.data.data
  }
}

export const marketApi = {
  /**
   * Busca métricas globais do mercado
   */
  async getGlobalMetrics(): Promise<GlobalMetrics> {
    const response = await api.get<ApiResponse<GlobalMetrics>>('/api/v1/global-metrics')

    if (!response.data.success) {
      throw new Error(response.data.error ?? 'Busca de métricas globais falhou')
    }

    return response.data.data
  },

  /**
   * Busca dados de derivativos
   */
  async getDerivatives(): Promise<Record<string, unknown>> {
    const response = await api.get<ApiResponse<Record<string, unknown>>>('/api/v1/derivatives')

    if (!response.data.success) {
      throw new Error(response.data.error ?? 'Busca de derivativos falhou')
    }

    return response.data.data
  },

  /**
   * Busca TA Summary
   */
  async getTASummary(symbol: string): Promise<Record<string, unknown>> {
    const response = await api.get<ApiResponse<Record<string, unknown>>>(`/api/v1/ta-summary`, {
      params: { symbol }
    })

    if (!response.data.success) {
      throw new Error(response.data.error ?? 'Busca de TA Summary falhou')
    }

    return response.data.data
  },

  /**
   * Busca símbolos para autocomplete
   */
  async searchSymbols(query: string, limit: number = 20): Promise<Array<{ symbol: string; name: string }>> {
    const response = await api.get<ApiResponse<Array<{ symbol: string; name: string }>>>('/api/v1/symbols/search', {
      params: { q: query, limit }
    })

    if (!response.data.success) {
      throw new Error(response.data.error ?? 'Busca de símbolos falhou')
    }

    return response.data.data
  }
}

export const systemApi = {
  /**
   * Verifica saúde do sistema
   */
  async getSystemStatus(): Promise<{
    status: string
    uptime: number
    version: string
    circuit_breakers?: Record<string, unknown>
  }> {
    const response = await api.get<ApiResponse<{
      status: string
      uptime: number
      version: string
      circuit_breakers?: Record<string, unknown>
    }>>('/api/v1/system/status')

    if (!response.data.success) {
      throw new Error(response.data.error ?? 'Busca de status do sistema falhou')
    }

    return response.data.data
  },

  /**
   * Health check básico
   */
  async health(): Promise<{ status: string; timestamp: number }> {
    const response = await api.get<{ status: string; timestamp: number }>('/health')
    return response.data
  }
}

// ============================================
// UTILITY FUNCTIONS
// ============================================

/**
 * Testa conectividade com o backend
 */
export async function testConnection(): Promise<boolean> {
  try {
    await systemApi.health()
    apiLogger.info('✅ Backend connection successful')
    return true
  } catch (error) {
    apiLogger.error('❌ Backend connection failed', error)
    return false
  }
}

/**
 * Handle API errors consistently
 */
export function handleApiError(error: unknown): ApiError {
  if (error.response?.data?.error) {
    return {
      message: error.response.data.error,
      code: error.response.data.code,
      status: error.response.status
    }
  }

  if (error.code === 'ECONNABORTED') {
    return {
      message: 'Timeout: Servidor não respondeu',
      code: 'TIMEOUT',
      status: 408
    }
  }

  if (!error.response) {
    return {
      message: 'Erro de conexão: Verifique sua internet',
      code: 'NETWORK_ERROR',
      status: 0
    }
  }

  return {
    message: error.message ?? 'Erro desconhecido',
    code: 'UNKNOWN_ERROR',
    status: error.response?.status
  }
}

// ============================================
// EXPORTS
// ============================================

export { API_BASE_URL, WS_URL, api }
export default {
  analysis: analysisApi,
  chart: chartApi,
  market: marketApi,
  system: systemApi,
  testConnection,
  handleApiError
}
