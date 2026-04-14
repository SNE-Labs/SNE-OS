// ============================================
// SNE RADAR - MARKET API SERVICE v2.2
// Serviços específicos para Dados de Mercado
// ============================================

import { api } from './api'
import type { GlobalMetrics } from '../types/analysis'

// ============================================
// MARKET ENDPOINTS
// ============================================

export const marketApi = {
  /**
   * Busca métricas globais do mercado
   */
  getGlobalMetrics: (): Promise<{ data: GlobalMetrics }> =>
    api.get('/api/market/global-metrics'),

  /**
   * Busca lista de símbolos disponíveis
   */
  getSymbols: () => api.get('/api/market/symbols'),

  /**
   * Busca busca de símbolos
   */
  searchSymbols: (query: string, limit: number = 10) =>
    api.get('/api/market/symbols/search', { params: { q: query, limit } }),

  /**
   * Busca informações detalhadas de um símbolo
   */
  getSymbolInfo: (symbol: string) =>
    api.get(`/api/market/symbols/${symbol}`),

  /**
   * Busca dados de mercado em tempo real
   */
  getRealtimeData: (symbols: string[]) =>
    api.post('/api/market/realtime', { symbols }),

  /**
   * Busca estatísticas de mercado
   */
  getMarketStats: () => api.get('/api/market/stats'),

  /**
   * Busca notícias relacionadas ao mercado
   */
  getMarketNews: (limit: number = 10) =>
    api.get('/api/market/news', { params: { limit } }),

  /**
   * Busca dados de liquidez
   */
  getLiquidityData: (symbol?: string) =>
    api.get('/api/market/liquidity', { params: { symbol } }),

  /**
   * Busca dados de volatilidade
   */
  getVolatilityData: (symbol?: string, timeframe: string = '1d') =>
    api.get('/api/market/volatility', { params: { symbol, timeframe } })
}
