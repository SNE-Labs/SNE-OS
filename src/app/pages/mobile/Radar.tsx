import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Activity, ArrowUpRight, RefreshCw, ShieldAlert } from 'lucide-react';

import { Badge, EmptyState, ErrorState, MobileButton, MobilePageShell, SurfaceCard } from '../../components/mobile';
import { IntelEntityIcon } from '../../components/IntelEntityIcon';
import { useRadarOverview } from '../../../hooks/useRadarData';
import { useSeoMeta } from '@/lib/seo/useSeoMeta';
import { buildSwapsHrefFromRadarSymbol } from '../../components/swaps/radarSwapPrefill';

const RADAR_SYMBOLS = ['ETHUSDT', 'BTCUSDT', 'SOLUSDT', 'LINKUSDT', 'AAVEUSDT', 'UNIUSDT'];
type Tone = 'active' | 'success' | 'warning' | 'pending';

const formatPrice = (value: number) =>
  value >= 1000
    ? value.toLocaleString('en-US', { maximumFractionDigits: 2 })
    : value >= 1
      ? value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 4 })
      : value.toLocaleString('en-US', { minimumFractionDigits: 4, maximumFractionDigits: 6 });

const compact = (value: number) =>
  new Intl.NumberFormat('en-US', { notation: 'compact', maximumFractionDigits: 1 }).format(value);

const formatPercent = (value: number, digits = 1) => `${value >= 0 ? '+' : ''}${(value * 100).toFixed(digits)}%`;

const formatUpdatedAt = (value?: string) => {
  if (!value) return '--';
  try {
    return new Intl.DateTimeFormat('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' }).format(new Date(value));
  } catch {
    return '--';
  }
};

const toEntitySymbol = (symbol?: string | null) => (symbol ?? '').replace(/USDT$/i, '') || undefined;
const toBadgeVariant = (tone?: Tone): 'success' | 'warning' | 'neutral' | 'orange' => (tone === 'success' ? 'success' : tone === 'warning' ? 'warning' : tone === 'active' ? 'orange' : 'neutral');
const deriveState = (change24h: number, score: number) => (score >= 22 || change24h >= 0.025 ? { label: 'BUY', tone: 'success' as const } : score <= 8 || change24h <= -0.02 ? { label: 'AVOID', tone: 'warning' as const } : { label: 'HOLD', tone: 'pending' as const });
const deriveLiquidity = (rank: number, volume: number) => (rank >= 0 && rank < 2 ? 'forte' : rank >= 0 && rank < 5 ? 'media' : volume > 100_000_000 ? 'media' : 'leve');

export function MobileRadar() {
  const navigate = useNavigate();
  const { symbol: routeSymbol } = useParams();
  const normalizedRouteSymbol = (routeSymbol || 'ETHUSDT').replace('/', '').toUpperCase();
  const [activeSymbol, setActiveSymbol] = useState(normalizedRouteSymbol);

  useEffect(() => setActiveSymbol(normalizedRouteSymbol), [normalizedRouteSymbol]);

  const overviewQuery = useRadarOverview(activeSymbol, '24H');
  const overview = overviewQuery.data;
  const movers = overview?.universe ?? [];
  const focusAsset = overview?.focus_asset;
  const regime = overview?.market_regime;
  const executionRisk = overview?.execution_risk;
  const nextAction = overview?.next_action;
  const marketState = overview?.market_state;
  const momentumRanking = overview?.rankings?.momentum ?? [];
  const liquidityRanking = overview?.rankings?.liquidity ?? [];
  const quickSelection = movers.length > 0 ? movers : RADAR_SYMBOLS.map((symbol) => ({ symbol, price: 0, change24h: 0, volume: 0 }));

  const radarTitleSymbol = focusAsset?.symbol ?? activeSymbol;
  const radarCanonicalPath = radarTitleSymbol ? `/radar/${radarTitleSymbol.toLowerCase()}` : '/radar';
  const radarDescription = focusAsset
    ? `Radar do SNE OS com ${regime?.label ?? 'regime monitorado'} e ${focusAsset.symbol} em foco: score ${focusAsset.score}, confianca ${focusAsset.confidence.label} e liquidez ${focusAsset.liquidity.label}.`
    : 'Radar do SNE OS com regime, risco de execucao e universo monitorado antes da execucao.';

  useSeoMeta({
    title: `${radarTitleSymbol} Radar | SNE OS`,
    description: radarDescription,
    canonicalPath: radarCanonicalPath,
    type: 'website',
    keywords: ['crypto radar', 'market intelligence', radarTitleSymbol, 'execution risk', 'market regime', 'liquidity'],
    structuredData: { '@context': 'https://schema.org', '@type': 'Dataset', name: `${radarTitleSymbol} Radar | SNE OS`, description: radarDescription, url: `https://snelabs.space${radarCanonicalPath}` },
  });

  const rows = useMemo(() => {
    const momentumMap = new Map(momentumRanking.map((entry) => [entry.symbol, entry]));
    const liquidityMap = new Map(liquidityRanking.map((entry, index) => [entry.symbol, index]));
    return quickSelection
      .map((item) => {
        const score = item.symbol === focusAsset?.symbol ? focusAsset.score : momentumMap.get(item.symbol)?.score ?? Math.max(0, Math.round(Math.abs(item.change24h) * 1000));
        const liquidityRank = liquidityMap.get(item.symbol) ?? -1;
        return {
          ...item,
          score,
          state: deriveState(item.change24h, score),
          liquidityLabel: item.symbol === focusAsset?.symbol ? focusAsset.liquidity.label.toLowerCase() : deriveLiquidity(liquidityRank, Number(item.volume)),
          swapsHref: buildSwapsHrefFromRadarSymbol(item.symbol),
        };
      })
      .sort((left, right) => (right.score - left.score) || (Number(right.volume) - Number(left.volume)));
  }, [focusAsset, liquidityRanking, momentumRanking, quickSelection]);

  const activeRow = rows.find((row) => row.symbol === activeSymbol) ?? rows[0];

  return (
    <MobilePageShell title="Radar" subtitle="Regime, liquidez e rota em fluxo." showContext>
      <SurfaceCard variant="elevated">
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.18em] text-[var(--text-3)] mb-2">
              <Activity className="w-3.5 h-3.5 text-[var(--accent-orange)]" />
              <span>Radar</span>
              <span className={`inline-flex h-2 w-2 rounded-full ${overviewQuery.isFetching ? 'animate-pulse' : ''}`} style={{ backgroundColor: overviewQuery.isFetching ? 'var(--accent-orange)' : 'var(--success)' }} />
            </div>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[10px] uppercase tracking-[0.16em] text-[var(--text-3)]">
              <span>Regime <span className="text-[var(--text-1)]">{regime?.label ?? 'sem dados'}</span></span>
              <span>24H</span>
              <span>Update <span className="text-[var(--text-1)]">{formatUpdatedAt(overview?.last_updated)}</span></span>
            </div>
          </div>
          <button onClick={() => overviewQuery.refetch()} className="w-10 h-10 rounded-2xl border border-[var(--stroke-1)] bg-[var(--bg-2)] text-[var(--text-2)] flex items-center justify-center">
            <RefreshCw className={`w-4 h-4 ${overviewQuery.isFetching ? 'animate-spin' : ''}`} />
          </button>
        </div>

        <div className="flex gap-2 overflow-x-auto pb-1">
          {(rows.length > 0 ? rows : quickSelection).slice(0, 6).map((item) => (
            <button
              key={item.symbol}
              onClick={() => {
                setActiveSymbol(item.symbol);
                navigate(`/radar/${item.symbol.toLowerCase()}`);
              }}
              className="flex-shrink-0 rounded-full px-3 py-2 border text-xs uppercase tracking-[0.14em]"
              style={{
                backgroundColor: activeRow?.symbol === item.symbol ? 'rgba(255,140,66,0.10)' : 'var(--bg-2)',
                color: activeRow?.symbol === item.symbol ? 'var(--accent-orange)' : 'var(--text-2)',
                borderColor: activeRow?.symbol === item.symbol ? 'rgba(255,140,66,0.18)' : 'var(--stroke-1)',
              }}
            >
              {item.symbol}
            </button>
          ))}
        </div>
      </SurfaceCard>

      {overviewQuery.isLoading && !overview ? (
        <SurfaceCard><div className="text-sm text-[var(--text-2)]">Sincronizando superficie de mercado...</div></SurfaceCard>
      ) : (overviewQuery.isError || !overview) && !overview ? (
        <SurfaceCard><ErrorState title="Radar indisponivel" description="Os dados de mercado nao carregaram agora." onRetry={() => overviewQuery.refetch()} /></SurfaceCard>
      ) : (
        <>
          <SurfaceCard>
            <div className="grid grid-cols-[minmax(0,1fr)_auto] gap-3 items-start mb-4">
              <div className="min-w-0">
                <div className="text-[10px] uppercase tracking-[0.18em] text-[var(--text-3)] mb-2">foco atual</div>
                <div className="flex items-center gap-3">
                  <IntelEntityIcon symbol={toEntitySymbol(activeRow?.symbol)} className="flex h-11 w-11 items-center justify-center rounded-2xl" style={{ backgroundColor: 'rgba(255,255,255,0.06)' }} iconClassName="h-5 w-5" />
                  <div className="min-w-0">
                    <div className="text-lg text-[var(--text-1)] truncate">{activeRow?.symbol ?? activeSymbol}</div>
                    <div className="text-sm text-[var(--text-2)]">${formatPrice(activeRow?.price ?? 0)}  {formatPercent(activeRow?.change24h ?? 0)}</div>
                  </div>
                </div>
              </div>
              <Badge variant={toBadgeVariant(activeRow?.state.tone ?? executionRisk?.tone)} size="sm">{activeRow?.state.label ?? 'HOLD'}</Badge>
            </div>

            <div className="grid grid-cols-3 gap-3 text-sm" style={{ fontVariantNumeric: 'tabular-nums' }}>
              <div><div className="text-[10px] uppercase text-[var(--text-3)] mb-1">score</div><div className="text-[var(--text-1)]">{activeRow?.score ?? focusAsset?.score ?? 0}</div></div>
              <div><div className="text-[10px] uppercase text-[var(--text-3)] mb-1">liq</div><div className="text-[var(--text-1)]">{activeRow?.liquidityLabel ?? focusAsset?.liquidity.label?.toLowerCase() ?? '--'}</div></div>
              <div><div className="text-[10px] uppercase text-[var(--text-3)] mb-1">volume</div><div className="text-[var(--text-1)]">${compact(Number(activeRow?.volume ?? focusAsset?.volume ?? 0))}</div></div>
            </div>
          </SurfaceCard>

          <SurfaceCard>
            <div className="flex items-center gap-2 mb-3 text-[var(--text-1)]">
              <ShieldAlert className="w-4 h-4 text-[var(--accent-orange)]" />
              <span>Rota</span>
            </div>
            <div className="grid grid-cols-2 gap-3 mb-4 text-sm">
              <div><div className="text-[10px] uppercase text-[var(--text-3)] mb-1">risco</div><div className="text-[var(--text-1)]">{executionRisk?.label ?? '--'}</div></div>
              <div><div className="text-[10px] uppercase text-[var(--text-3)] mb-1">execucao</div><div className="text-[var(--text-1)]">{marketState?.execution ?? 'intel-first'}</div></div>
            </div>
            <div className="text-sm text-[var(--text-2)] mb-4">{executionRisk?.summary ?? 'Sem leitura suficiente.'}</div>
            <div className="space-y-3">
              {(nextAction?.actions ?? []).map((action) => (
                <MobileButton key={`${action.label}-${action.href}`} variant={action.tone === 'accent' ? 'primary' : 'secondary'} className="w-full justify-between" onClick={() => navigate(action.href)}>
                  <span>{action.label}</span>
                  <ArrowUpRight className="w-4 h-4" />
                </MobileButton>
              ))}
            </div>
          </SurfaceCard>

          <SurfaceCard>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-[var(--text-1)]">Universo monitorado</h3>
              <Badge variant="neutral" size="sm">{rows.length}</Badge>
            </div>

            {rows.length === 0 ? (
              <EmptyState title="Sem mercados ao vivo" description="O universo monitorado esta vazio agora." />
            ) : (
              <div className="space-y-2">
                {rows.map((row, index) => (
                  <div key={row.symbol} className="rounded-xl border p-3" style={{ borderColor: row.symbol === activeRow?.symbol ? 'rgba(255,140,66,0.18)' : 'var(--stroke-1)', backgroundColor: row.symbol === activeRow?.symbol ? 'rgba(255,140,66,0.08)' : 'var(--bg-2)' }}>
                    <button onClick={() => { setActiveSymbol(row.symbol); navigate(`/radar/${row.symbol.toLowerCase()}`); }} className="w-full text-left">
                      <div className="grid grid-cols-[28px_minmax(0,1fr)_auto] gap-3 items-center mb-3" style={{ fontVariantNumeric: 'tabular-nums' }}>
                        <div className="text-[10px] uppercase tracking-[0.16em] text-[var(--text-3)]">{String(index + 1).padStart(2, '0')}</div>
                        <div className="flex min-w-0 items-center gap-2">
                          <IntelEntityIcon symbol={toEntitySymbol(row.symbol)} className="flex h-8 w-8 items-center justify-center rounded-xl" style={{ backgroundColor: 'rgba(255,255,255,0.06)' }} iconClassName="h-4 w-4" />
                          <div className="min-w-0">
                            <div className="truncate text-[var(--text-1)]">{row.symbol}</div>
                            <div className="text-xs text-[var(--text-3)] uppercase tracking-[0.14em]">{row.liquidityLabel}  score {row.score}</div>
                          </div>
                        </div>
                        <Badge variant={toBadgeVariant(row.state.tone)} size="sm">{row.state.label}</Badge>
                      </div>
                      <div className="grid grid-cols-3 gap-3 text-sm text-[var(--text-2)]" style={{ fontVariantNumeric: 'tabular-nums' }}>
                        <span>${formatPrice(row.price)}</span>
                        <span className={row.change24h >= 0 ? 'text-[var(--success)]' : 'text-[var(--danger)]'}>{formatPercent(row.change24h)}</span>
                        <span>Vol ${compact(Number(row.volume))}</span>
                      </div>
                    </button>
                    <MobileButton variant="secondary" className="w-full mt-3 justify-between" onClick={() => navigate(row.swapsHref)}>
                      <span>Executar com USDT</span>
                      <ArrowUpRight className="w-4 h-4" />
                    </MobileButton>
                  </div>
                ))}
              </div>
            )}
          </SurfaceCard>
        </>
      )}
    </MobilePageShell>
  );
}
