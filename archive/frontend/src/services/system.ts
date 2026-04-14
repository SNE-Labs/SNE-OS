// ============================================
// SNE RADAR - SYSTEM API SERVICE v2.2
// Serviços específicos para Sistema/Health
// ============================================

import { api } from './api'

// ============================================
// SYSTEM ENDPOINTS
// ============================================

export const systemApi = {
  /**
   * Health check do sistema
   */
  health: () => api.get('/api/health'),

  /**
   * Status completo do sistema
   */
  getSystemStatus: () => api.get('/api/system/status'),

  /**
   * Informações da versão
   */
  getVersion: () => api.get('/api/system/version'),

  /**
   * Métricas do sistema
   */
  getSystemMetrics: () => api.get('/api/system/metrics'),

  /**
   * Logs do sistema (admin only)
   */
  getSystemLogs: (level: string = 'info', limit: number = 100) =>
    api.get('/api/system/logs', { params: { level, limit } }),

  /**
   * Configurações do sistema (admin only)
   */
  getSystemConfig: () => api.get('/api/system/config'),

  /**
   * Atualiza configurações do sistema (admin only)
   */
  updateSystemConfig: (config: any) => api.put('/api/system/config', config),

  /**
   * Reinicia serviços (admin only)
   */
  restartService: (serviceName: string) =>
    api.post('/api/system/restart', { service: serviceName }),

  /**
   * Backup do sistema (admin only)
   */
  createBackup: () => api.post('/api/system/backup'),

  /**
   * Status do backup (admin only)
   */
  getBackupStatus: () => api.get('/api/system/backup/status')
}
