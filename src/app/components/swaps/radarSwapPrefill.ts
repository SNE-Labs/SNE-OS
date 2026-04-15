const AddressZero = '0x0000000000000000000000000000000000000000';

const RADAR_SWAP_DESTINATIONS: Record<string, { toChain: number; toToken: string }> = {
  ETH: {
    toChain: 1,
    toToken: AddressZero,
  },
  BTC: {
    toChain: 1,
    toToken: '0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599',
  },
  LINK: {
    toChain: 1,
    toToken: '0x514910771AF9Ca656af840dff83E8264EcF986CA',
  },
  AAVE: {
    toChain: 1,
    toToken: '0x7Fc66500c84A76Ad7e9c93437bFc5Ac33E2DDAE9',
  },
  UNI: {
    toChain: 1,
    toToken: '0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984',
  },
};

export function radarAssetSymbol(symbol?: string | null) {
  return `${symbol || ''}`.trim().toUpperCase().replace(/(USDT|USDC|USD)$/i, '');
}

export function buildSwapsHrefFromRadarSymbol(symbol?: string | null) {
  const asset = radarAssetSymbol(symbol);
  const params = new URLSearchParams();
  const destination = RADAR_SWAP_DESTINATIONS[asset];

  if (destination?.toChain) {
    params.set('toChain', String(destination.toChain));
  }

  if (destination?.toToken) {
    params.set('toToken', destination.toToken);
  }

  const query = params.toString();
  return query ? `/swaps?${query}` : '/swaps';
}

export function hasRadarSwapPrefill(symbol?: string | null) {
  return Boolean(RADAR_SWAP_DESTINATIONS[radarAssetSymbol(symbol)]);
}
