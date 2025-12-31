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
 */
export const radarApi = {
  // Market summary (dados de mercado gerais)
  getMarketSummary: (): Promise<MarketSummary> =>
    apiGet('/api/dashboard/summary'),

  // Signals para um símbolo específico
  getSignals: (symbol: string, timeframe: string): Promise<{ signals: Signal[] }> =>
    apiPost('/api/analyze', { symbol, timeframe }),

  // Watchlist do usuário
  getWatchlist: (): Promise<WatchlistResponse> =>
    apiGet('/api/dashboard/watchlist'),

  addToWatchlist: (symbol: string): Promise<{ success: boolean }> =>
    apiPost('/api/dashboard/watchlist', { symbol }),

  removeFromWatchlist: (symbol: string): Promise<{ success: boolean }> =>
    apiDelete(`/api/dashboard/watchlist/${symbol}`),

  // Status do sistema
  getSystemStatus: () =>
    apiGet('/api/v1/system/status'),
};
