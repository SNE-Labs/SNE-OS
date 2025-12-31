// ============================================
// SNE RADAR - CHART API SERVICE v2.2
// Serviços específicos para Dados de Gráfico
// ============================================

import { api } from './api'
import type { CandleData, LevelsData } from '../types/analysis'

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
    api.get('/api/chart/candles', { params: { symbol, tf: timeframe, limit } }),

  /**
   * Busca níveis de suporte/resistência
   */
  getLevels: (symbol: string, timeframe: string): Promise<{ data: LevelsData }> =>
    api.get('/api/chart/levels', { params: { symbol, timeframe } }),


  /**
   * Busca indicadores técnicos
   */
  getIndicators: (symbol: string, timeframe: string, type: 'basic' | 'advanced' = 'basic') =>
    api.get('/api/chart/indicators', { params: { symbol, timeframe, type } }),

  /**
   * Busca dados de volume
   */
  getVolumeData: (symbol: string, timeframe: string, limit: number = 100) =>
    api.get('/api/chart/volume', { params: { symbol, timeframe, limit } }),

  /**
   * Busca configurações de gráfico
   */
  getChartSettings: () => api.get('/api/chart/settings'),

  /**
   * Salva configurações de gráfico
   */
  saveChartSettings: (settings: any) => api.post('/api/chart/settings', settings)
}
