// ============================================
// SNE RADAR - DASHBOARD API SERVICE v2.2
// Serviços específicos para Dashboard/Métricas
// ============================================

import { api } from './api'
import type { GlobalMetrics } from '../types/analysis'

// ============================================
// DASHBOARD ENDPOINTS
// ============================================

export const dashboardApi = {
  /**
   * Busca resumo geral do dashboard
   */
  getSummary: () => api.get('/api/dashboard/summary'),

  /**
   * Busca métricas globais (já existe no marketApi, mas mantido aqui por consistência)
   */
  getGlobalMetrics: (): Promise<{ data: GlobalMetrics }> =>
    api.get('/api/market/global-metrics'),

  /**
   * Busca estatísticas de uso
   */
  getUsageStats: () => api.get('/api/dashboard/usage-stats'),

  /**
   * Busca alertas ativos
   */
  getActiveAlerts: () => api.get('/api/dashboard/alerts/active'),

  /**
   * Busca histórico de alertas
   */
  getAlertHistory: (limit: number = 50) =>
    api.get(`/api/dashboard/alerts/history?limit=${limit}`)
}
