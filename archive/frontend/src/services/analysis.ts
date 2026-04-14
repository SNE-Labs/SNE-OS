// ============================================
// SNE RADAR - ANALYSIS API SERVICE v2.2
// Serviços específicos para Análise Técnica
// ============================================

import { api } from './api'
import type { AnalysisResult } from '../types/analysis'

// ============================================
// ANALYSIS ENDPOINTS
// ============================================

export const analysisApi = {
  /**
   * Executa análise técnica completa
   */
  analyze: (symbol: string, timeframe: string): Promise<{ data: AnalysisResult }> =>
    api.post('/api/analyze/auth', { symbol, timeframe }),

  /**
   * Busca resultado de análise por ID
   */
  getAnalysis: (id: string): Promise<{ data: AnalysisResult }> =>
    api.get(`/api/analysis/${id}`),

  /**
   * Busca histórico de análises
   */
  getAnalysisHistory: (symbol?: string, limit: number = 20) =>
    api.get('/api/analysis/history', { params: { symbol, limit } }),

  /**
   * Busca sinais ativos
   */
  getActiveSignals: (symbol?: string) =>
    api.get('/api/analysis/signals/active', { params: { symbol } }),

  /**
   * Valida sinal de análise
   */
  validateSignal: (signalId: string, validation: 'correct' | 'incorrect') =>
    api.post(`/api/analysis/signals/${signalId}/validate`, { validation }),

  /**
   * Busca configurações de análise
   */
  getAnalysisSettings: () => api.get('/api/analysis/settings'),

  /**
   * Atualiza configurações de análise
   */
  updateAnalysisSettings: (settings: any) =>
    api.put('/api/analysis/settings', settings)
}
