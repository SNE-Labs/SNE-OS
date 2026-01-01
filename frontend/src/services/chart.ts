// ============================================
// SNE RADAR - CHART API SERVICE v2.2
// Serviços específicos para Dados de Gráfico
// ============================================

import { api } from './api'
import type { CandleData, LevelsData } from '../types/analysis'

// ============================================
// UTILITY FUNCTIONS
// ============================================

const clampLimit = (n: number, min = 200, max = 1000) =>
  Math.max(min, Math.min(max, Number.isFinite(n) ? n : min))

// ============================================
// CHART ENDPOINTS
// ============================================

export const chartApi = {
  /**
   * Busca candles históricos (endpoint principal)
   */
  getCandles: (symbol: string, timeframe: string, limit: number = 500): Promise<{
    data: { candles: CandleData[] }
  }> =>
    api.get('/api/chart/candles', {
      params: { symbol, tf: timeframe, limit: clampLimit(limit) },
    }),

  /**
   * Busca níveis de suporte/resistência
   */
  getLevels: (symbol: string, timeframe: string): Promise<{ data: LevelsData }> =>
    api.get('/api/chart/levels', { params: { symbol, tf: timeframe } }),


  /**
   * Busca indicadores técnicos
   */
  getIndicators: (symbol: string, timeframe: string, type: 'basic' | 'advanced' = 'basic') =>
    api.get('/api/chart/indicators', { params: { symbol, tf: timeframe, type } }),

  /**
   * Busca dados de volume
   */
  getVolumeData: (symbol: string, timeframe: string, limit: number = 200) =>
    api.get('/api/chart/volume', { params: { symbol, tf: timeframe, limit: clampLimit(limit) } }),

  /**
   * Busca configurações de gráfico
   */
  getChartSettings: () => api.get('/api/chart/settings'),

  /**
   * Salva configurações de gráfico
   */
  saveChartSettings: (settings: any) => api.post('/api/chart/settings', settings)
}
