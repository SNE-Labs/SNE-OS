import { apiGet, apiPost, apiDelete } from '../lib/api/http';

export interface MarketSummary {
  btc_dominance?: number;
  market_cap?: string;
  volume_24h?: string;
  fear_greed_index?: number;
  top_movers?: Array<{
    symbol: string;
    price: number;
    change24h: number;
    volume: string;
  }>;
}

export interface Signal {
  symbol: string;
  signal: string;
  strength: 'Strong' | 'Moderate' | 'Weak';
  timeframe: string;
  updated: string;
  change: string;
  score?: number;
  price?: number;
}

export interface WatchlistItem {
  symbol: string;
  addedAt: number;
  lastSignal?: string;
  lastUpdate?: string;
}

export interface WatchlistResponse {
  watchlist: WatchlistItem[];
  total: number;
}

/**
 * API client para SNE Radar
 * Conecta aos endpoints reais do backend Flask
 * 
 * Endpoints disponíveis no backend:
 * - GET  /api/radar/market-summary (público)
 * - POST /api/radar/signals (público)
 * - GET  /api/dashboard/summary (requer auth)
 * - GET  /api/radar/markets (público)
 */
export const radarApi = {
  // Market summary público (não requer auth)
  getMarketSummary: (): Promise<MarketSummary> =>
    apiGet('/api/radar/market-summary'),

  // Market summary autenticado (dados completos)
  getMarketSummaryAuth: (): Promise<MarketSummary> =>
    apiGet('/api/dashboard/summary'),

  // Signals para um símbolo específico (público)
  getSignals: (symbol: string, timeframe: string): Promise<{ signals: Signal[] }> =>
    apiPost('/api/radar/signals', { symbol, timeframe }),

  // Análise completa (requer auth)
  analyzeSymbol: (symbol: string, timeframe: string, market: string = 'crypto') =>
    apiPost('/api/radar/analyze', { symbol, timeframe, market }),

  // Watchlist do usuário (requer auth)
  getWatchlist: (): Promise<WatchlistResponse> =>
    apiGet('/api/radar/watchlist'),

  addToWatchlist: (symbol: string, market: string = 'crypto'): Promise<{ success: boolean }> =>
    apiPost('/api/radar/watchlist', { action: 'add', symbol, market }),

  removeFromWatchlist: (symbol: string, market: string = 'crypto'): Promise<{ success: boolean }> =>
    apiPost('/api/radar/watchlist', { action: 'remove', symbol, market }),

  // Markets disponíveis (público)
  getMarkets: () =>
    apiGet('/api/radar/markets'),

  // Status do sistema
  getSystemStatus: () =>
    apiGet('/api/status/dashboard'),
};


