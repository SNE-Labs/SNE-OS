import { getRadarAssetBySymbol } from '@/lib/assets/registry';

function normalizeRadarSymbol(symbol?: string | null) {
  return (symbol ?? '').replace('/', '').trim().toUpperCase();
}

export function buildRadarHrefFromSymbol(symbol?: string | null) {
  const normalized = normalizeRadarSymbol(symbol);
  return normalized ? `/radar/${normalized.toLowerCase()}` : '/radar';
}

export function buildSwapsHrefFromRadarSymbol(symbol?: string | null) {
  const normalized = normalizeRadarSymbol(symbol);
  const asset = getRadarAssetBySymbol(normalized);
  const query = new URLSearchParams({
    mode: 'trade',
    origin: 'radar',
  });

  if (normalized) {
    query.set('symbol', normalized);
  }

  if (asset?.key) {
    query.set('asset', asset.key);
  }

  return `/swaps?${query.toString()}`;
}

export function getRadarSwapContext(searchParams: URLSearchParams) {
  const origin = (searchParams.get('origin') ?? '').toLowerCase();
  const symbol = normalizeRadarSymbol(searchParams.get('symbol'));
  const assetKey = (searchParams.get('asset') ?? '').trim().toLowerCase() || undefined;
  const fromRadar = origin === 'radar';

  return {
    fromRadar,
    symbol: symbol || undefined,
    assetKey,
    radarHref: buildRadarHrefFromSymbol(symbol),
  };
}

export function hasRadarSwapPrefill(symbol?: string | null) {
  return Boolean(normalizeRadarSymbol(symbol));
}
