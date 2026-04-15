export function buildSwapsHrefFromRadarSymbol(symbol?: string | null) {
  const normalized = (symbol ?? '').replace('/', '').toUpperCase();
  const query = new URLSearchParams({
    mode: 'trade',
    origin: 'radar',
  });

  if (normalized) {
    query.set('symbol', normalized);
  }

  return `/swaps?${query.toString()}`;
}

export function hasRadarSwapPrefill(symbol?: string | null) {
  return Boolean((symbol ?? '').replace('/', '').trim());
}
