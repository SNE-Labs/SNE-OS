import { apiGet, apiPost, apiDelete } from '../lib/api/http';

export interface MarketSummary {
  btc_dominance?: number;
  market_cap?: string | number | null;
  volume_24h?: string | number | null;
  fear_greed_index?: number;
  top_movers?: Array<{
    symbol: string;
    price: number;
    change24h: number;
    volume: string | number;
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

export interface RadarOverview {
  execution: {
    label: string;
    tone: 'active' | 'success' | 'warning' | 'pending';
  };
  hero: {
    headline: string;
    summary: string;
    metrics: Array<{ label: string; value: string }>;
  };
  market_regime: {
    label: string;
    tone: 'active' | 'success' | 'warning' | 'pending';
    avg_change_24h: number;
    summary: string;
  };
  rankings: {
    momentum: Array<{
      symbol: string;
      price: number;
      change24h: number;
      volume: string | number;
      score?: number;
    }>;
    liquidity: Array<{
      symbol: string;
      price: number;
      change24h: number;
      volume: string | number;
      score?: number;
    }>;
  };
  market_state: {
    label: string;
    access: string;
    execution: string;
  };
  featured: {
    symbol: string;
    price: number;
    change24h: number;
    volume: string | number;
  } | null;
  signal: Signal | null;
  universe: Array<{
    symbol: string;
    price: number;
    change24h: number;
    volume: string | number;
  }>;
  last_updated: string;
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

const DEFAULT_RADAR_HERO = {
  headline: 'Mercados líquidos. Sinais em tempo real.',
  summary: 'Acompanhe os pares mais ativos do universo SNE e leia sinais direcionais antes de executar.',
  metrics: [] as Array<{ label: string; value: string }>,
};

const DEFAULT_MARKET_REGIME = {
  label: 'sem dados',
  tone: 'pending' as const,
  avg_change_24h: 0,
  summary: 'O Radar ainda nao tem snapshot suficiente para classificar o mercado.',
};

const DEFAULT_MARKET_STATE = {
  label: 'Sem dados.',
  access: 'prévia',
  execution: 'bloqueada',
};

function normalizeMarketItem(item: any) {
  if (!item || typeof item !== 'object') return null;
  const symbol = typeof item.symbol === 'string' ? item.symbol : '';
  if (!symbol) return null;

  return {
    symbol,
    price: Number(item.price ?? 0),
    change24h: Number(item.change24h ?? 0),
    volume: item.volume ?? 0,
    score: item.score == null ? undefined : Number(item.score),
  };
}

function normalizeSignal(signal: any): Signal | null {
  if (!signal || typeof signal !== 'object' || typeof signal.symbol !== 'string') return null;

  return {
    symbol: signal.symbol,
    signal: typeof signal.signal === 'string' ? signal.signal : 'HOLD',
    strength: (typeof signal.strength === 'string' ? signal.strength : 'Weak') as Signal['strength'],
    timeframe: typeof signal.timeframe === 'string' ? signal.timeframe : '24H',
    updated: typeof signal.updated === 'string' ? signal.updated : '',
    change: typeof signal.change === 'string' ? signal.change : '0.00%',
    score: signal.score == null ? undefined : Number(signal.score),
    price: signal.price == null ? undefined : Number(signal.price),
  };
}

function normalizeRadarOverview(payload: any): RadarOverview {
  const universe = Array.isArray(payload?.universe)
    ? payload.universe.map(normalizeMarketItem).filter(Boolean)
    : [];
  const featured = normalizeMarketItem(payload?.featured);

  return {
    execution: {
      label: typeof payload?.execution?.label === 'string' ? payload.execution.label : 'offline',
      tone: payload?.execution?.tone ?? 'pending',
    },
    hero: {
      headline: typeof payload?.hero?.headline === 'string' ? payload.hero.headline : DEFAULT_RADAR_HERO.headline,
      summary: typeof payload?.hero?.summary === 'string' ? payload.hero.summary : DEFAULT_RADAR_HERO.summary,
      metrics: Array.isArray(payload?.hero?.metrics) ? payload.hero.metrics : DEFAULT_RADAR_HERO.metrics,
    },
    market_regime: {
      label: typeof payload?.market_regime?.label === 'string' ? payload.market_regime.label : DEFAULT_MARKET_REGIME.label,
      tone: payload?.market_regime?.tone ?? DEFAULT_MARKET_REGIME.tone,
      avg_change_24h: Number(payload?.market_regime?.avg_change_24h ?? DEFAULT_MARKET_REGIME.avg_change_24h),
      summary: typeof payload?.market_regime?.summary === 'string' ? payload.market_regime.summary : DEFAULT_MARKET_REGIME.summary,
    },
    rankings: {
      momentum: Array.isArray(payload?.rankings?.momentum)
        ? payload.rankings.momentum.map(normalizeMarketItem).filter(Boolean)
        : [],
      liquidity: Array.isArray(payload?.rankings?.liquidity)
        ? payload.rankings.liquidity.map(normalizeMarketItem).filter(Boolean)
        : [],
    },
    market_state: {
      label: typeof payload?.market_state?.label === 'string' ? payload.market_state.label : DEFAULT_MARKET_STATE.label,
      access: typeof payload?.market_state?.access === 'string' ? payload.market_state.access : DEFAULT_MARKET_STATE.access,
      execution:
        typeof payload?.market_state?.execution === 'string'
          ? payload.market_state.execution
          : DEFAULT_MARKET_STATE.execution,
    },
    featured,
    signal: normalizeSignal(payload?.signal),
    universe,
    last_updated: typeof payload?.last_updated === 'string' ? payload.last_updated : '',
  };
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
  getOverview: async (symbol: string, timeframe: string = '24H'): Promise<RadarOverview> =>
    normalizeRadarOverview(
      await apiGet(`/api/radar/overview?symbol=${encodeURIComponent(symbol)}&timeframe=${encodeURIComponent(timeframe)}`)
    ),

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
