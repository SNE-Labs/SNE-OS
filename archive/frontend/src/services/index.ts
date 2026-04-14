// ============================================
// SNE RADAR - SERVICES BARREL EXPORT v2.2
// Export centralizado de todos os serviços
// ============================================

// Core API configuration
export { api, handleApiError } from './api'

// Domain-specific services
export * from './auth'
export * from './analysis'
export * from './chart'
export * from './dashboard'
export * from './market'
export * from './system'

// Legacy exports (para compatibilidade)
export { analysisApi } from './analysis'
export { chartApi } from './chart'
export { marketApi } from './market'
export { systemApi } from './system'
export { dashboardApi } from './dashboard'
export { authApi } from './auth'
