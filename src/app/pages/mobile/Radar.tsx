import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Activity, AlertTriangle, ArrowUpRight, RefreshCw, ShieldAlert, Waves } from 'lucide-react';

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
const toneColor = (tone?: Tone) => (tone === 'success' ? 'var(--success)' : tone === 'warning' ? 'var(--warn-amber)' : tone === 'active' ? 'var(--accent-orange)' : 'var(--text-2)');
const scoreToWidth = (score?: number) => `${Math.max(12, Math.min(100, ((score ?? 0) / 30) * 100))}%`;
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
  const signal = overview?.signal;
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
  const focusConfidence =
    activeRow?.symbol === focusAsset?.symbol
      ? focusAsset?.confidence ?? { label: 'monitorando', tone: 'pending' as const }
      : { label: activeRow?.state.label === 'BUY' ? 'conviccao alta' : activeRow?.state.label === 'AVOID' ? 'conviccao baixa' : 'aguardando', tone: activeRow?.state.tone ?? 'pending' as Tone };
  const focusLiquidityLabel =
    activeRow?.symbol === focusAsset?.symbol
      ? (focusAsset?.liquidity.label ?? activeRow?.liquidityLabel ?? '--')
      : (activeRow?.liquidityLabel ?? '--');
  const selectionLane = rows.slice(0, 10);
  const ecosystemField = rows.slice(0, 8);
  const momentumLane = rows.slice(0, 4);
  const liquidityLane = liquidityRanking.slice(0, 4).map((entry) => {
    const matched = rows.find((row) => row.symbol === entry.symbol);
    return matched ?? {
      symbol: entry.symbol,
      price: Number(entry.price ?? 0),
      change24h: Number(entry.change24h ?? 0),
      volume: entry.volume,
      score: Number(entry.score ?? 0),
      state: deriveState(Number(entry.change24h ?? 0), Number(entry.score ?? 0)),
      liquidityLabel: 'forte',
      swapsHref: buildSwapsHrefFromRadarSymbol(entry.symbol),
    };
  });
  const cautionLane = [...rows]
    .filter((row) => row.state.label !== 'BUY')
    .sort((left, right) => (left.score - right.score) || (left.change24h - right.change24h))
    .slice(0, 3);
  const primaryAction = (nextAction?.actions ?? []).find((action) => action.recommended) ?? nextAction?.actions?.[0];

  function selectSymbol(symbol: string) {
    setActiveSymbol(symbol);
    navigate(`/radar/${symbol.toLowerCase()}`);
  }

  return (
    <MobilePageShell title="Radar" subtitle="Panorama do campo antes de puxar um ativo para perto." showContext>
      <SurfaceCard variant="elevated">
        <div className="mb-3 flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="mb-2 flex items-center gap-2 text-[10px] uppercase tracking-[0.18em] text-[var(--text-3)]">
              <Activity className="h-3.5 w-3.5 text-[var(--accent-orange)]" />
              <span>Radar</span>
              <span className={`inline-flex h-2 w-2 rounded-full ${overviewQuery.isFetching ? 'animate-pulse' : ''}`} style={{ backgroundColor: overviewQuery.isFetching ? 'var(--accent-orange)' : 'var(--success)' }} />
              <span>{overviewQuery.isFetching ? 'sync' : 'ao vivo'}</span>
            </div>
            <div className="text-[20px] leading-tight tracking-[-0.03em] text-[var(--text-1)]">
              {overview?.hero?.headline ?? 'Comece pelo panorama, depois escolha a moeda.'}
            </div>
            <div className="mt-2 text-sm leading-6 text-[var(--text-2)]">
              {overview?.hero?.summary ?? regime?.summary ?? 'Regime, liquidez e execucao entram primeiro. O ativo especifico vem como segunda camada de leitura.'}
            </div>
          </div>
          <button onClick={() => overviewQuery.refetch()} className="flex h-10 w-10 items-center justify-center rounded-2xl border border-[var(--stroke-1)] bg-[var(--bg-2)] text-[var(--text-2)]">
            <RefreshCw className={`h-4 w-4 ${overviewQuery.isFetching ? 'animate-spin' : ''}`} />
          </button>
        </div>

        <div className="flex flex-wrap gap-2 text-[10px] uppercase tracking-[0.16em]">
          <Badge variant={toBadgeVariant(regime?.tone)} size="sm">{regime?.label ?? 'sem dados'}</Badge>
          <Badge variant={toBadgeVariant(executionRisk?.tone)} size="sm">{executionRisk?.label ?? 'sem risco'}</Badge>
          <Badge variant="neutral" size="sm">{formatUpdatedAt(overview?.last_updated)}</Badge>
          <Badge variant="neutral" size="sm">{marketState?.execution ?? 'intel-first'}</Badge>
        </div>

        <div className="mt-4 flex gap-2 overflow-x-auto pb-1">
          {selectionLane.map((item) => (
            <button
              key={item.symbol}
              onClick={() => selectSymbol(item.symbol)}
              className="shrink-0 rounded-full border px-3 py-2 text-xs uppercase tracking-[0.14em]"
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
        <SurfaceCard>
          <div className="text-sm text-[var(--text-2)]">Sincronizando superficie de mercado...</div>
        </SurfaceCard>
      ) : (overviewQuery.isError || !overview) && !overview ? (
        <SurfaceCard>
          <ErrorState title="Radar indisponivel" description="Os dados de mercado nao carregaram agora." onRetry={() => overviewQuery.refetch()} />
        </SurfaceCard>
      ) : (
        <>
          <SurfaceCard className="overflow-hidden">
            <div className="mb-3 flex items-center justify-between gap-3">
              <div>
                <div className="text-[10px] uppercase tracking-[0.24em] text-[var(--text-3)]">campo de rotacao</div>
                <div className="mt-1 text-sm text-[var(--text-2)]">
                  Toque no ativo para puxar a leitura sob lupa.
                </div>
              </div>
              <Badge variant="neutral" size="sm">{rows.length}</Badge>
            </div>

            {rows.length === 0 ? (
              <EmptyState title="Sem mercados ao vivo" description="O universo monitorado esta vazio agora." />
            ) : (
              <div className="flex gap-3 overflow-x-auto pb-1">
                {ecosystemField.map((row, index) => {
                  const active = row.symbol === activeRow?.symbol;
                  return (
                    <button
                      key={row.symbol}
                      onClick={() => selectSymbol(row.symbol)}
                      className="shrink-0 rounded-[22px] border p-3 text-left"
                      style={{
                        width: `${active ? 196 : 172 + (index % 2) * 14}px`,
                        borderColor: active ? 'rgba(255,140,66,0.18)' : 'var(--stroke-1)',
                        background: active ? 'linear-gradient(135deg, rgba(255,140,66,0.10), rgba(255,255,255,0.03))' : 'var(--bg-2)',
                      }}
                    >
                      <div className="mb-3 flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <IntelEntityIcon symbol={toEntitySymbol(row.symbol)} className="flex h-8 w-8 items-center justify-center rounded-xl" style={{ backgroundColor: 'rgba(255,255,255,0.06)' }} iconClassName="h-4 w-4" />
                            <div className="min-w-0">
                              <div className="truncate text-sm text-[var(--text-1)]">{row.symbol}</div>
                              <div className="mt-1 text-[10px] uppercase tracking-[0.14em] text-[var(--text-3)]">{row.liquidityLabel}</div>
                            </div>
                          </div>
                        </div>
                        <Badge variant={toBadgeVariant(row.state.tone)} size="sm">{active ? 'focus' : row.state.label}</Badge>
                      </div>

                      <div className="text-base text-[var(--text-1)]" style={{ fontVariantNumeric: 'tabular-nums' }}>
                        {formatPercent(row.change24h)}
                      </div>
                      <div className="mt-1 text-xs text-[var(--text-2)]" style={{ fontVariantNumeric: 'tabular-nums' }}>
                        ${formatPrice(row.price)}
                      </div>
                      <div className="mt-3 flex items-center justify-between gap-2 text-[10px] uppercase tracking-[0.14em] text-[var(--text-3)]">
                        <span>score {row.score}</span>
                        <span>vol ${compact(Number(row.volume))}</span>
                      </div>
                      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/10">
                        <div className="h-full rounded-full" style={{ width: scoreToWidth(row.score), backgroundColor: toneColor(row.state.tone) }} />
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </SurfaceCard>

          <SurfaceCard variant="elevated" className="overflow-hidden">
            <div className="mb-3 text-[10px] uppercase tracking-[0.24em] text-[var(--text-3)]">ativo sob lupa</div>
            <div className="mb-4 flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="flex items-center gap-3">
                  <IntelEntityIcon symbol={toEntitySymbol(activeRow?.symbol)} className="flex h-11 w-11 items-center justify-center rounded-2xl" style={{ backgroundColor: 'rgba(255,255,255,0.06)' }} iconClassName="h-5 w-5" />
                  <div className="min-w-0">
                    <div className="truncate text-lg text-[var(--text-1)]">{activeRow?.symbol ?? activeSymbol}</div>
                    <div className="mt-1 text-sm text-[var(--text-2)]">
                      {focusConfidence.label} · liq {focusLiquidityLabel}
                    </div>
                  </div>
                </div>
              </div>
              <Badge variant={toBadgeVariant(activeRow?.state.tone)} size="sm">{activeRow?.state.label ?? 'HOLD'}</Badge>
            </div>

            <div className="grid grid-cols-3 gap-3 text-sm" style={{ fontVariantNumeric: 'tabular-nums' }}>
              <div>
                <div className="mb-1 text-[10px] uppercase text-[var(--text-3)]">preco</div>
                <div className="text-[var(--text-1)]">${formatPrice(activeRow?.price ?? 0)}</div>
              </div>
              <div>
                <div className="mb-1 text-[10px] uppercase text-[var(--text-3)]">24h</div>
                <div className={(activeRow?.change24h ?? 0) >= 0 ? 'text-[var(--success)]' : 'text-[var(--danger)]'}>
                  {formatPercent(activeRow?.change24h ?? 0)}
                </div>
              </div>
              <div>
                <div className="mb-1 text-[10px] uppercase text-[var(--text-3)]">score</div>
                <div className="text-[var(--text-1)]">{activeRow?.score ?? 0}</div>
              </div>
            </div>

            <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/10">
              <div className="h-full rounded-full" style={{ width: scoreToWidth(activeRow?.score), backgroundColor: toneColor(activeRow?.state.tone) }} />
            </div>

            <div className="mt-4 text-sm leading-6 text-[var(--text-2)]">
              {activeRow?.symbol === focusAsset?.symbol
                ? `${focusAsset?.symbol} continua como leitura principal do Radar nesta janela.`
                : `${activeRow?.symbol ?? activeSymbol} foi trazido para leitura detalhada a partir do panorama.`}
            </div>

            <div className="mt-4 space-y-3">
              {primaryAction ? (
                <MobileButton variant="secondary" className="w-full justify-between" onClick={() => navigate(primaryAction.href)}>
                  <span>{primaryAction.label}</span>
                  <ArrowUpRight className="h-4 w-4" />
                </MobileButton>
              ) : null}
              <MobileButton variant="primary" className="w-full justify-between" onClick={() => navigate(activeRow?.swapsHref ?? buildSwapsHrefFromRadarSymbol(activeSymbol))}>
                <span>Executar com USDT</span>
                <ArrowUpRight className="h-4 w-4" />
              </MobileButton>
            </div>

            <div className="mt-5 border-t pt-4" style={{ borderColor: 'rgba(255,255,255,0.08)' }}>
              <div className="mb-3 flex items-center gap-2 text-[var(--text-1)]">
                <Waves className="h-4 w-4 text-[var(--accent-orange)]" />
                <span>faixas de fluxo</span>
              </div>

              <CompactLane
                title="fluxo mais liquido"
                entries={liquidityLane}
                activeSymbol={activeRow?.symbol}
                onSelect={selectSymbol}
                rightValue={(entry) => `$${compact(Number(entry.volume))}`}
                subValue={(entry) => entry.liquidityLabel}
              />

              <CompactLane
                title="pulso de momentum"
                entries={momentumLane}
                activeSymbol={activeRow?.symbol}
                onSelect={selectSymbol}
                rightValue={(entry) => formatPercent(entry.change24h)}
                subValue={(entry) => `score ${entry.score}`}
              />

              <CompactLane
                title="zona de cautela"
                entries={cautionLane}
                activeSymbol={activeRow?.symbol}
                onSelect={selectSymbol}
                rightValue={(entry) => entry.state.label}
                subValue={(entry) => `score ${entry.score}`}
                emptyMessage="Sem ativos em faixa de cautela."
              />
            </div>

            <div className="mt-5 border-t pt-4" style={{ borderColor: 'rgba(255,255,255,0.08)' }}>
              <div className="mb-2 flex items-center gap-2 text-[var(--text-1)]">
                <ShieldAlert className="h-4 w-4 text-[var(--accent-orange)]" />
                <span>trilho e friccao</span>
              </div>
              <div className="text-sm text-[var(--text-1)]">{nextAction?.title ?? 'Contexto antes da execucao.'}</div>
              <div className="mt-2 text-sm leading-6 text-[var(--text-2)]">
                {nextAction?.summary ?? executionRisk?.summary ?? 'Leia o campo, escolha o ativo e valide a friccao antes de executar.'}
              </div>

              {(executionRisk?.blockers ?? []).slice(0, 2).map((blocker) => (
                <div key={blocker} className="mt-3 flex items-start gap-2 text-sm text-[var(--text-2)]">
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-[var(--warn-amber)]" />
                  <span>{blocker}</span>
                </div>
              ))}

              {signal?.symbol ? (
                <div className="mt-4 flex flex-wrap gap-2">
                  <Badge variant={toBadgeVariant(activeRow?.state.tone)} size="sm">{signal.signal}</Badge>
                  <Badge variant="neutral" size="sm">{signal.symbol}</Badge>
                  <Badge variant="neutral" size="sm">{marketState?.access ?? '--'}</Badge>
                </div>
              ) : null}
            </div>
          </SurfaceCard>
        </>
      )}
    </MobilePageShell>
  );
}

function CompactLane({
  title,
  entries,
  activeSymbol,
  onSelect,
  rightValue,
  subValue,
  emptyMessage,
}: {
  title: string;
  entries: Array<{
    symbol: string;
    state: { label: string; tone: Tone };
    score: number;
    liquidityLabel: string;
    volume: string | number;
    change24h: number;
  }>;
  activeSymbol?: string;
  onSelect: (symbol: string) => void;
  rightValue: (entry: { symbol: string; state: { label: string; tone: Tone }; score: number; volume: string | number; change24h: number }) => string;
  subValue: (entry: { score: number; liquidityLabel: string }) => string;
  emptyMessage?: string;
}) {
  return (
    <div className="mt-4 border-t pt-4" style={{ borderColor: 'rgba(255,255,255,0.08)' }}>
      <div className="mb-2 text-[10px] uppercase tracking-[0.18em] text-[var(--text-3)]">{title}</div>
      {entries.length > 0 ? (
        <div className="space-y-2">
          {entries.map((entry) => (
            <button key={entry.symbol} onClick={() => onSelect(entry.symbol)} className="flex w-full items-center justify-between gap-3 border-b pb-2 text-left text-sm" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
              <div className="min-w-0">
                <div className={entry.symbol === activeSymbol ? 'text-[var(--accent-orange)]' : 'text-[var(--text-1)]'}>{entry.symbol}</div>
                <div className="mt-1 text-[10px] uppercase tracking-[0.14em] text-[var(--text-3)]">{subValue(entry)}</div>
              </div>
              <div className="text-right">
                <div style={{ color: toneColor(entry.state.tone) }}>{rightValue(entry)}</div>
                <div className="mt-2 h-1 w-14 overflow-hidden rounded-full bg-white/10">
                  <div className="h-full rounded-full" style={{ width: scoreToWidth(entry.score), backgroundColor: toneColor(entry.state.tone) }} />
                </div>
              </div>
            </button>
          ))}
        </div>
      ) : (
        <div className="text-sm text-[var(--text-2)]">{emptyMessage ?? 'Sem ativos nesta faixa.'}</div>
      )}
    </div>
  );
}
