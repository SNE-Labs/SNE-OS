// ============================================
// SNE RADAR - UI STORE (Zustand) v2.2
// Estado local da interface (client state)
// ============================================

import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { logger } from '../lib/logger'

const uiLogger = logger.child('UI-Store')

// ============================================
// TYPES
// ============================================

interface UIState {
  // Trading Interface
  symbol: string
  timeframe: string
  sidebarOpen: boolean

  // Theme
  theme: 'terminal'

  // User Preferences
  preferences: {
    autoRefresh: boolean
    refreshInterval: number // seconds
    soundEnabled: boolean
    compactMode: boolean
  }

  // UI State
  loadingStates: Record<string, boolean>
  errorStates: Record<string, string | null>
}

// ============================================
// STORE DEFINITION
// ============================================

interface UIActions {
  // Symbol & Timeframe
  setSymbol: (symbol: string) => void
  setTimeframe: (timeframe: string) => void

  // Sidebar
  toggleSidebar: () => void
  setSidebarOpen: (open: boolean) => void

  // Preferences
  updatePreferences: (preferences: Partial<UIState['preferences']>) => void
  resetPreferences: () => void

  // Loading States
  setLoading: (key: string, loading: boolean) => void
  clearLoading: (key: string) => void

  // Error States
  setError: (key: string, error: string | null) => void
  clearError: (key: string) => void
  clearAllErrors: () => void

  // Reset
  reset: () => void
}

type UIStore = UIState & UIActions

// ============================================
// DEFAULT STATE
// ============================================

const defaultState: UIState = {
  symbol: 'BTCUSDT',
  timeframe: '1h',
  sidebarOpen: false,
  theme: 'terminal',
  preferences: {
    autoRefresh: true,
    refreshInterval: 60,
    soundEnabled: true,
    compactMode: false
  },
  loadingStates: {},
  errorStates: {}
}

// ============================================
// STORE IMPLEMENTATION
// ============================================

export const useUIStore = create<UIStore>()(
  persist(
    (set, get) => ({
      ...defaultState,

      // Symbol & Timeframe
      setSymbol: (symbol) => {
        uiLogger.debug('Setting symbol', { symbol })
        set({ symbol })
      },

      setTimeframe: (timeframe) => {
        uiLogger.debug('Setting timeframe', { timeframe })
        set({ timeframe })
      },

      // Sidebar
      toggleSidebar: () => {
        const current = get().sidebarOpen
        uiLogger.debug('Toggling sidebar', { from: current, to: !current })
        set({ sidebarOpen: !current })
      },

      setSidebarOpen: (open) => {
        uiLogger.debug('Setting sidebar', { open })
        set({ sidebarOpen: open })
      },

      // Preferences
      updatePreferences: (preferences) => {
        const currentPrefs = get().preferences
        const newPrefs = { ...currentPrefs, ...preferences }
        uiLogger.debug('Updating preferences', { preferences, newPrefs })
        set({ preferences: newPrefs })
      },

      resetPreferences: () => {
        uiLogger.debug('Resetting preferences to defaults')
        set({ preferences: defaultState.preferences })
      },

      // Loading States
      setLoading: (key, loading) => {
        const currentStates = get().loadingStates
        const newStates = { ...currentStates, [key]: loading }
        set({ loadingStates: newStates })

        if (loading) {
          uiLogger.debug(`Started loading: ${key}`)
        } else {
          uiLogger.debug(`Finished loading: ${key}`)
        }
      },

      clearLoading: (key) => {
        const currentStates = get().loadingStates
        const { [key]: _, ...newStates } = currentStates
        set({ loadingStates: newStates })
        uiLogger.debug(`Cleared loading: ${key}`)
      },

      // Error States
      setError: (key, error) => {
        const currentStates = get().errorStates
        const newStates = { ...currentStates, [key]: error }
        set({ errorStates: newStates })

        if (error) {
          uiLogger.error(`Error set for ${key}`, { error })
        } else {
          uiLogger.debug(`Error cleared for ${key}`)
        }
      },

      clearError: (key) => {
        const currentStates = get().errorStates
        const { [key]: _, ...newStates } = currentStates
        set({ errorStates: newStates })
        uiLogger.debug(`Error cleared for ${key}`)
      },

      clearAllErrors: () => {
        uiLogger.debug('Clearing all errors')
        set({ errorStates: {} })
      },

      // Reset
      reset: () => {
        uiLogger.debug('Resetting UI store to defaults')
        set(defaultState)
      }
    }),
    {
      name: 'sne-ui-store',
      partialize: (state) => ({
        symbol: state.symbol,
        timeframe: state.timeframe,
        preferences: state.preferences,
        theme: state.theme
      })
    }
  )
)

// ============================================
// HOOKS CONVENIENCE
// ============================================

/**
 * Hook para acessar loading state de uma chave específica
 */
export const useLoadingState = (key: string) => {
  return useUIStore((state) => state.loadingStates[key] || false)
}

/**
 * Hook para acessar error state de uma chave específica
 */
export const useErrorState = (key: string) => {
  return useUIStore((state) => state.errorStates[key] || null)
}

/**
 * Hook para ações de loading/error combinadas
 */
export const useAsyncState = (key: string) => {
  const store = useUIStore()

  return {
    isLoading: store.loadingStates[key] || false,
    error: store.errorStates[key] || null,
    setLoading: (loading: boolean) => store.setLoading(key, loading),
    setError: (error: string | null) => store.setError(key, error),
    clear: () => {
      store.clearLoading(key)
      store.clearError(key)
    }
  }
}
