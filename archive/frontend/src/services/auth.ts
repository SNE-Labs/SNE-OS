// ============================================
// SNE RADAR - AUTH API SERVICE v2.2
// Serviços específicos para Autenticação/Wallet
// ============================================

import { api } from './api'

// ============================================
// AUTH ENDPOINTS
// ============================================

export const authApi = {
  /**
   * Login via wallet (SIWE)
   */
  login: (message: string, signature: string): Promise<{ data: { token: string; user: any } }> =>
    api.post('/api/auth/login', { message, signature }),

  /**
   * Logout
   */
  logout: () => api.post('/api/auth/logout'),

  /**
   * Refresh token
   */
  refreshToken: (): Promise<{ data: { token: string } }> =>
    api.post('/api/auth/refresh'),

  /**
   * Verifica autenticação atual
   */
  checkAuth: () => api.get('/api/auth/me'),

  /**
   * Busca tier/licença do usuário
   */
  getUserTier: () => api.get('/api/auth/tier'),

  /**
   * Atualiza tier/licença (upgrade)
   */
  upgradeTier: (tier: 'premium' | 'pro') =>
    api.post('/api/auth/upgrade', { tier }),

  /**
   * Busca histórico de uso
   */
  getUsageHistory: (limit: number = 30) =>
    api.get('/api/auth/usage', { params: { limit } }),

  /**
   * Valida licença SNELicense
   */
  validateLicense: (address: string) =>
    api.post('/api/auth/validate-license', { address }),

  /**
   * Busca configurações de notificação
   */
  getNotificationSettings: () => api.get('/api/auth/notifications'),

  /**
   * Atualiza configurações de notificação
   */
  updateNotificationSettings: (settings: any) =>
    api.put('/api/auth/notifications', settings)
}
