export type AssetSwapAvailability = 'ready' | 'proxy';

export type AssetExecutionTarget = {
  kind: 'native' | 'wrapped' | 'proxy';
  chainId: number;
  symbol: string;
  address?: string;
  preferred?: boolean;
};

export type AssetRegistryItem = {
  key: string;
  order: number;
  radarSymbol: string;
  displaySymbol: string;
  displayName: string;
  iconSymbol: string;
  essential: boolean;
  radarEnabled: boolean;
  swapEnabled: boolean;
  swapAvailability: AssetSwapAvailability;
  executionHint: string;
  executionTargets: AssetExecutionTarget[];
};

type RadarMarketLike = {
  symbol: string;
  price: number;
  change24h: number;
  volume: string | number;
};

export const RADAR_ASSET_REGISTRY: AssetRegistryItem[] = [
  {
    key: 'btc',
    order: 10,
    radarSymbol: 'BTCUSDT',
    displaySymbol: 'BTC',
    displayName: 'Bitcoin',
    iconSymbol: 'btc',
    essential: true,
    radarEnabled: true,
    swapEnabled: true,
    swapAvailability: 'proxy',
    executionHint: 'Execucao via representacao wrapped em rota EVM suportada.',
    executionTargets: [
      {
        kind: 'wrapped',
        chainId: 1,
        symbol: 'WBTC',
        address: '0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599',
        preferred: true,
      },
      {
        kind: 'wrapped',
        chainId: 42161,
        symbol: 'WBTC',
        address: '0x2f2A2543B76A4166549F7aAB2e75Bef0aefC5B0f',
      },
    ],
  },
  {
    key: 'eth',
    order: 20,
    radarSymbol: 'ETHUSDT',
    displaySymbol: 'ETH',
    displayName: 'Ethereum',
    iconSymbol: 'eth',
    essential: true,
    radarEnabled: true,
    swapEnabled: true,
    swapAvailability: 'ready',
    executionHint: 'Execucao direta em rotas EVM suportadas.',
    executionTargets: [
      { kind: 'native', chainId: 1, symbol: 'ETH', preferred: true },
      { kind: 'native', chainId: 42161, symbol: 'ETH' },
      { kind: 'native', chainId: 10, symbol: 'ETH' },
      { kind: 'native', chainId: 8453, symbol: 'ETH' },
    ],
  },
  {
    key: 'sol',
    order: 30,
    radarSymbol: 'SOLUSDT',
    displaySymbol: 'SOL',
    displayName: 'Solana',
    iconSymbol: 'sol',
    essential: true,
    radarEnabled: true,
    swapEnabled: true,
    swapAvailability: 'proxy',
    executionHint: 'Execucao via representacao wrapped/proxy em rota suportada.',
    executionTargets: [
      { kind: 'proxy', chainId: 1, symbol: 'SOL', preferred: true },
      { kind: 'proxy', chainId: 8453, symbol: 'SOL' },
    ],
  },
  {
    key: 'xrp',
    order: 40,
    radarSymbol: 'XRPUSDT',
    displaySymbol: 'XRP',
    displayName: 'XRP',
    iconSymbol: 'xrp',
    essential: true,
    radarEnabled: true,
    swapEnabled: true,
    swapAvailability: 'proxy',
    executionHint: 'Execucao via representacao proxy em rota EVM suportada.',
    executionTargets: [
      { kind: 'proxy', chainId: 1, symbol: 'XRP', preferred: true },
      { kind: 'proxy', chainId: 42161, symbol: 'XRP' },
    ],
  },
  {
    key: 'arb',
    order: 50,
    radarSymbol: 'ARBUSDT',
    displaySymbol: 'ARB',
    displayName: 'Arbitrum',
    iconSymbol: 'arb',
    essential: true,
    radarEnabled: true,
    swapEnabled: true,
    swapAvailability: 'ready',
    executionHint: 'Execucao direta em Arbitrum.',
    executionTargets: [
      {
        kind: 'native',
        chainId: 42161,
        symbol: 'ARB',
        address: '0x912CE59144191C1204E64559FE8253a0e49E6548',
        preferred: true,
      },
    ],
  },
  {
    key: 'sui',
    order: 60,
    radarSymbol: 'SUIUSDT',
    displaySymbol: 'SUI',
    displayName: 'Sui',
    iconSymbol: 'sui',
    essential: true,
    radarEnabled: true,
    swapEnabled: true,
    swapAvailability: 'proxy',
    executionHint: 'Execucao via representacao proxy em rota suportada.',
    executionTargets: [
      { kind: 'proxy', chainId: 1, symbol: 'SUI', preferred: true },
      { kind: 'proxy', chainId: 8453, symbol: 'SUI' },
    ],
  },
  {
    key: 'bnb',
    order: 70,
    radarSymbol: 'BNBUSDT',
    displaySymbol: 'BNB',
    displayName: 'BNB',
    iconSymbol: 'bnb',
    essential: true,
    radarEnabled: true,
    swapEnabled: true,
    swapAvailability: 'proxy',
    executionHint: 'Execucao via representacao proxy ate abrir a camada BSC nativa.',
    executionTargets: [
      { kind: 'proxy', chainId: 1, symbol: 'BNB', preferred: true },
      { kind: 'proxy', chainId: 42161, symbol: 'BNB' },
    ],
  },
  {
    key: 'link',
    order: 80,
    radarSymbol: 'LINKUSDT',
    displaySymbol: 'LINK',
    displayName: 'Chainlink',
    iconSymbol: 'link',
    essential: false,
    radarEnabled: true,
    swapEnabled: true,
    swapAvailability: 'ready',
    executionHint: 'Execucao direta em rotas EVM suportadas.',
    executionTargets: [
      {
        kind: 'native',
        chainId: 1,
        symbol: 'LINK',
        address: '0x514910771AF9Ca656af840dff83E8264EcF986CA',
        preferred: true,
      },
      {
        kind: 'native',
        chainId: 42161,
        symbol: 'LINK',
        address: '0xf97f4df75117a78c1A5a0DBb814Af92458539FB4',
      },
    ],
  },
  {
    key: 'aave',
    order: 90,
    radarSymbol: 'AAVEUSDT',
    displaySymbol: 'AAVE',
    displayName: 'Aave',
    iconSymbol: 'aave',
    essential: false,
    radarEnabled: false,
    swapEnabled: true,
    swapAvailability: 'ready',
    executionHint: 'Execucao direta em rotas EVM suportadas.',
    executionTargets: [
      {
        kind: 'native',
        chainId: 1,
        symbol: 'AAVE',
        address: '0x7Fc66500c84A76Ad7e9C93437bFc5Ac33E2DDAE9',
        preferred: true,
      },
    ],
  },
  {
    key: 'uni',
    order: 100,
    radarSymbol: 'UNIUSDT',
    displaySymbol: 'UNI',
    displayName: 'Uniswap',
    iconSymbol: 'uni',
    essential: false,
    radarEnabled: true,
    swapEnabled: true,
    swapAvailability: 'ready',
    executionHint: 'Execucao direta em rotas EVM suportadas.',
    executionTargets: [
      {
        kind: 'native',
        chainId: 1,
        symbol: 'UNI',
        address: '0x1f9840A85d5aF5bf1D1762F925BDADdC4201F984',
        preferred: true,
      },
    ],
  },
];

function normalizeRadarSymbol(symbol?: string | null) {
  return (symbol ?? '').replace('/', '').trim().toUpperCase();
}

export function getRadarAssetBySymbol(symbol?: string | null) {
  const normalized = normalizeRadarSymbol(symbol);
  return RADAR_ASSET_REGISTRY.find((item) => item.radarSymbol === normalized);
}

export function getRadarAssetByKey(key?: string | null) {
  const normalized = (key ?? '').trim().toLowerCase();
  return RADAR_ASSET_REGISTRY.find((item) => item.key === normalized);
}

export function getPreferredExecutionTarget(asset?: AssetRegistryItem | null) {
  if (!asset) return undefined;
  return asset.executionTargets.find((target) => target.preferred) ?? asset.executionTargets[0];
}

export function getPreferredExecutionTargetByKey(key?: string | null) {
  return getPreferredExecutionTarget(getRadarAssetByKey(key));
}

export function listRadarEnabledAssets() {
  return [...RADAR_ASSET_REGISTRY]
    .filter((item) => item.radarEnabled)
    .sort((left, right) => left.order - right.order);
}

export function listCoreRadarAssets() {
  return listRadarEnabledAssets().filter((item) => item.essential);
}

export function listSwapEnabledAssets() {
  return [...RADAR_ASSET_REGISTRY]
    .filter((item) => item.swapEnabled)
    .sort((left, right) => left.order - right.order);
}

export function listRadarFallbackSymbols() {
  return listRadarEnabledAssets().map((item) => item.radarSymbol);
}

export function mergeRadarUniverse<T extends RadarMarketLike>(universe: T[]) {
  const normalizedUniverse = Array.isArray(universe) ? universe : [];
  const enabledAssets = listRadarEnabledAssets();
  const enabledSet = new Set(enabledAssets.map((item) => item.radarSymbol));
  const lookup = new Map(normalizedUniverse.map((item) => [normalizeRadarSymbol(item.symbol), item]));
  const seen = new Set<string>();
  const merged: T[] = [];

  for (const asset of enabledAssets) {
    const existing = lookup.get(asset.radarSymbol);
    if (!existing) continue;
    merged.push(existing);
    seen.add(asset.radarSymbol);
  }

  for (const item of normalizedUniverse) {
    const normalized = normalizeRadarSymbol(item.symbol);
    if (!seen.has(normalized) && !enabledSet.has(normalized)) {
      merged.push(item);
      seen.add(normalized);
    }
  }

  return merged;
}
