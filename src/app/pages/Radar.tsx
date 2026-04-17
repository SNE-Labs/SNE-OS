import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Activity, AlertTriangle, ArrowUpRight, RefreshCw, ShieldAlert, Waves } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';

import { ModuleStateCard } from '../components/sne/ModuleStateCard';
import { StatusBadge } from '../components/sne/StatusBadge';
import { IntelEntityIcon } from '../components/IntelEntityIcon';
import { useRadarOverview } from '../../hooks/useRadarData';
import { resolveModuleState } from '../../lib/moduleState';
import { useSeoMeta } from '@/lib/seo/useSeoMeta';
import { buildSwapsHrefFromRadarSymbol } from '../components/swaps/radarSwapPrefill';

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
const toStatusBadge = (tone?: Tone) => (tone === 'success' ? 'success' : tone === 'warning' ? 'warning' : tone === 'active' ? 'active' : 'pending');
const toneColor = (tone?: Tone) => (tone === 'success' ? 'var(--ok-green)' : tone === 'warning' ? 'var(--warn-amber)' : tone === 'active' ? 'var(--accent-orange)' : 'var(--text-2)');
const toneSurface = (tone?: Tone) => (tone === 'success' ? 'rgba(62, 201, 153, 0.12)' : tone === 'warning' ? 'rgba(255, 184, 0, 0.12)' : tone === 'active' ? 'rgba(255,140,66,0.12)' : 'rgba(255,255,255,0.04)');
const toneBorder = (tone?: Tone) => (tone === 'success' ? 'rgba(62, 201, 153, 0.2)' : tone === 'warning' ? 'rgba(255, 184, 0, 0.2)' : tone === 'active' ? 'rgba(255,140,66,0.2)' : 'rgba(255,255,255,0.08)');
const scoreToWidth = (score?: number) => `${Math.max(12, Math.min(100, ((score ?? 0) / 30) * 100))}%`;
const deriveState = (change24h: number, score: number) => (score >= 22 || change24h >= 0.025 ? { label: 'BUY', tone: 'success' as const } : score <= 8 || change24h <= -0.02 ? { label: 'AVOID', tone: 'warning' as const } : { label: 'HOLD', tone: 'pending' as const });
const deriveLiquidity = (rank: number, volume: number) => (rank >= 0 && rank < 2 ? 'forte' : rank >= 0 && rank < 5 ? 'media' : volume > 100_000_000 ? 'media' : 'leve');

export function Radar() {
  const navigate = useNavigate();
  const { symbol: routeSymbol } = useParams();
  const normalizedRouteSymbol = (routeSymbol || 'ETHUSDT').replace('/', '').toUpperCase();
  const [activeSymbol, setActiveSymbol] = useState(normalizedRouteSymbol);

  useEffect(() => setActiveSymbol(normalizedRouteSymbol), [normalizedRouteSymbol]);

  const overviewQuery = useRadarOverview(activeSymbol, '24H');
  const overview = overviewQuery.data;
  const moduleState = resolveModuleState({
    isConnected: true,
    allowDisconnectedRead: true,
    isLoading: overviewQuery.isLoading,
    isError: overviewQuery.isError,
    data: overview,
    isEmpty: (data) => !data.focus_asset && data.universe.length === 0,
  });

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
          liquidityRank,
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
  const focusLiquidityTone: Tone =
    activeRow?.symbol === focusAsset?.symbol
      ? (focusAsset?.liquidity.tone ?? 'pending')
      : activeRow?.liquidityLabel === 'forte'
        ? 'success'
        : activeRow?.liquidityLabel === 'media'
          ? 'active'
          : 'pending';
  const focusLiquidityLabel =
    activeRow?.symbol === focusAsset?.symbol
      ? (focusAsset?.liquidity.label ?? activeRow?.liquidityLabel ?? '--')
      : (activeRow?.liquidityLabel ?? '--');
  const primaryAction = (nextAction?.actions ?? []).find((action) => action.recommended) ?? nextAction?.actions?.[0];
  const momentumLane = rows.slice(0, 5);
  const liquidityLane = liquidityRanking.slice(0, 5).map((entry) => {
    const matched = rows.find((row) => row.symbol === entry.symbol);
    return matched ?? {
      symbol: entry.symbol,
      price: Number(entry.price ?? 0),
      change24h: Number(entry.change24h ?? 0),
      volume: entry.volume,
      score: Number(entry.score ?? 0),
      state: deriveState(Number(entry.change24h ?? 0), Number(entry.score ?? 0)),
      liquidityRank: 0,
      liquidityLabel: 'forte',
      swapsHref: buildSwapsHrefFromRadarSymbol(entry.symbol),
    };
  });
  const cautionLane = [...rows]
    .filter((row) => row.state.label !== 'BUY')
    .sort((left, right) => (left.score - right.score) || (left.change24h - right.change24h))
    .slice(0, 4);
  const headerStats = [
    { label: 'Regime', value: regime?.label ?? 'sem dados', tone: regime?.tone },
    { label: 'Janela', value: signal?.timeframe ?? '24H' },
    { label: 'Update', value: formatUpdatedAt(overview?.last_updated) },
    { label: 'Media', value: formatPercent(regime?.avg_change_24h ?? 0), tone: (regime?.avg_change_24h ?? 0) >= 0 ? 'success' : 'warning' },
    { label: 'Execucao', value: marketState?.execution ?? 'intel-first', tone: overview?.execution.tone },
  ];
  const tape = rows.length > 0 ? [...rows.slice(0, 6), ...rows.slice(0, 6)] : [];
  const focusMetrics = [
    { label: 'Preco', value: `$${formatPrice(activeRow?.price ?? 0)}`, tone: 'pending' as Tone },
    { label: '24H', value: formatPercent(activeRow?.change24h ?? 0), tone: (activeRow?.change24h ?? 0) >= 0 ? 'success' as Tone : 'warning' as Tone },
    { label: 'Score', value: String(activeRow?.score ?? 0), tone: activeRow?.state.tone ?? 'pending' as Tone },
    { label: 'Confianca', value: focusConfidence.label, tone: focusConfidence.tone },
    { label: 'Liquidez', value: focusLiquidityLabel, tone: focusLiquidityTone },
    { label: 'Risco', value: executionRisk?.label ?? '--', tone: executionRisk?.tone ?? 'pending' as Tone },
  ];

  return (
    <div className="flex flex-1">
      <div className="flex-1 overflow-y-auto px-6 py-5 xl:px-8">
        <div className="mx-auto max-w-[1520px] space-y-4">
          <section className="overflow-hidden rounded-[24px] border" style={{ backgroundColor: 'var(--bg-2)', borderColor: 'var(--stroke-1)', boxShadow: 'var(--shadow-1)' }}>
            <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
              <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
                <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.22em]" style={{ color: 'var(--text-1)' }}>
                  <Activity className="h-3.5 w-3.5" style={{ color: 'var(--accent-orange)' }} />
                  Radar
                </div>
                {headerStats.map((item) => (
                  <div key={item.label} className="flex items-center gap-2 text-[11px] uppercase tracking-[0.18em]" style={{ color: 'var(--text-3)' }}>
                    <span>{item.label}</span>
                    <span className="font-semibold" style={{ color: toneColor(item.tone) }}>{item.value}</span>
                  </div>
                ))}
              </div>
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.18em]" style={{ color: 'var(--text-3)' }}>
                  <span className={`inline-flex h-2.5 w-2.5 rounded-full ${overviewQuery.isFetching ? 'animate-pulse' : ''}`} style={{ backgroundColor: overviewQuery.isFetching ? 'var(--accent-orange)' : 'var(--ok-green)' }} />
                  {overviewQuery.isFetching ? 'sync' : 'ao vivo'}
                </div>
                <button onClick={() => overviewQuery.refetch()} className="inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-sm font-medium transition-colors hover:bg-white/[0.04]" style={{ backgroundColor: 'rgba(255,255,255,0.02)', color: 'var(--text-1)', borderColor: 'rgba(255,255,255,0.08)' }}>
                  <RefreshCw className={`h-4 w-4 ${overviewQuery.isFetching ? 'animate-spin' : ''}`} />
                  Atualizar
                </button>
              </div>
            </div>

            <div className="overflow-hidden px-4 py-3" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
              {tape.length > 0 ? (
                <div className="overflow-hidden">
                  <motion.div className="flex min-w-max items-center gap-3" animate={{ x: ['0%', '-50%'] }} transition={{ duration: 28, repeat: Infinity, ease: 'linear' }}>
                    {tape.map((item, index) => (
                      <div key={`${item.symbol}-${index}`} className="flex items-center gap-3 rounded-full border px-3 py-2" style={{ backgroundColor: 'rgba(255,255,255,0.02)', borderColor: 'rgba(255,255,255,0.08)', fontVariantNumeric: 'tabular-nums' }}>
                        <span className="text-[11px] uppercase tracking-[0.16em]" style={{ color: 'var(--text-3)' }}>{item.symbol}</span>
                        <span className="text-sm font-medium" style={{ color: 'var(--text-1)' }}>{formatPercent(item.change24h)}</span>
                        <span className="text-sm" style={{ color: 'var(--text-2)' }}>score {item.score}</span>
                        <span className="text-sm" style={{ color: 'var(--text-2)' }}>liq {item.liquidityLabel}</span>
                      </div>
                    ))}
                  </motion.div>
                </div>
              ) : null}
            </div>

            <div className="grid grid-cols-1 gap-4 px-4 py-4 xl:grid-cols-[minmax(0,1.3fr)_360px]">
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.28, ease: 'easeOut' }}
                className="min-w-0 rounded-[22px] border px-5 py-5"
                style={{ background: 'linear-gradient(135deg, rgba(255,140,66,0.14), rgba(255,255,255,0.03) 55%)', borderColor: 'rgba(255,140,66,0.14)', boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.04)' }}
              >
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="min-w-0">
                    <div className="mb-2 text-[11px] uppercase tracking-[0.22em]" style={{ color: 'var(--text-3)' }}>regime em leitura</div>
                    <div className="text-[28px] font-semibold leading-none md:text-[34px]" style={{ color: 'var(--text-1)' }}>
                      {overview?.hero?.headline ?? 'Leia o regime antes de mover capital.'}
                    </div>
                    <div className="mt-3 max-w-2xl text-sm leading-6" style={{ color: 'var(--text-2)' }}>
                      {overview?.hero?.summary ?? regime?.summary ?? 'O Radar organiza o contexto de liquidez, momentum e risco antes da execucao.'}
                    </div>
                  </div>
                  <StatusBadge status={toStatusBadge(overview?.execution.tone)}>{overview?.execution.label ?? 'offline'}</StatusBadge>
                </div>

                <div className="mt-6 flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
                  <div className="min-w-0 flex-1">
                    <div className="mb-2 text-[11px] uppercase tracking-[0.18em]" style={{ color: 'var(--text-3)' }}>ativo em foco</div>
                    <div className="flex items-center gap-3">
                      <IntelEntityIcon symbol={toEntitySymbol(activeRow?.symbol)} className="flex h-14 w-14 shrink-0 items-center justify-center rounded-[18px]" style={{ backgroundColor: 'rgba(255,255,255,0.06)' }} iconClassName="h-7 w-7" />
                      <div className="min-w-0">
                        <div className="truncate text-[30px] font-semibold leading-none" style={{ color: 'var(--text-1)' }}>{activeRow?.symbol ?? activeSymbol}</div>
                        <div className="mt-2 flex flex-wrap items-center gap-2">
                          <StatusBadge status={toStatusBadge(activeRow?.state.tone)}>{activeRow?.state.label ?? 'HOLD'}</StatusBadge>
                          <StatusBadge status={toStatusBadge(regime?.tone)}>{regime?.label ?? 'sem dados'}</StatusBadge>
                          {signal?.strength ? <StatusBadge status={toStatusBadge(activeRow?.state.tone)}>{signal.strength}</StatusBadge> : null}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={() => navigate(activeRow?.swapsHref ?? buildSwapsHrefFromRadarSymbol(activeSymbol))}
                      className="inline-flex items-center gap-2 rounded-full border px-4 py-3 text-sm font-semibold uppercase tracking-[0.16em]"
                      style={{ borderColor: 'rgba(255,140,66,0.18)', color: 'var(--accent-orange)', backgroundColor: 'rgba(255,140,66,0.10)' }}
                    >
                      Executar com USDT
                      <ArrowUpRight className="h-4 w-4" />
                    </button>
                    {primaryAction ? (
                      <button
                        onClick={() => navigate(primaryAction.href)}
                        className="inline-flex items-center gap-2 rounded-full border px-4 py-3 text-sm font-medium"
                        style={{ borderColor: 'rgba(255,255,255,0.08)', color: 'var(--text-1)', backgroundColor: 'rgba(255,255,255,0.03)' }}
                      >
                        {primaryAction.label}
                        <ArrowUpRight className="h-4 w-4" />
                      </button>
                    ) : null}
                  </div>
                </div>

                <div className="mt-6 grid grid-cols-2 gap-3 md:grid-cols-3">
                  {focusMetrics.map((item) => (
                    <div key={item.label} className="relative overflow-hidden rounded-2xl border px-4 py-3" style={{ backgroundColor: toneSurface(item.tone), borderColor: toneBorder(item.tone) }}>
                      <div className="absolute inset-x-0 top-0 h-px" style={{ backgroundColor: toneColor(item.tone), opacity: 0.55 }} />
                      <div className="mb-2 text-[10px] uppercase tracking-[0.18em]" style={{ color: 'var(--text-3)' }}>{item.label}</div>
                      <div className="truncate text-sm font-semibold uppercase tracking-[0.06em]" style={{ color: toneColor(item.tone), fontVariantNumeric: 'tabular-nums' }}>{item.value}</div>
                    </div>
                  ))}
                </div>

                {overview?.hero?.metrics?.length ? (
                  <div className="mt-4 flex flex-wrap gap-3">
                    {overview.hero.metrics.slice(0, 4).map((metric) => (
                      <div key={metric.label} className="rounded-full border px-3 py-2 text-xs uppercase tracking-[0.16em]" style={{ borderColor: 'rgba(255,255,255,0.08)', color: toneColor(metric.tone), backgroundColor: 'rgba(255,255,255,0.02)' }}>
                        <span style={{ color: 'var(--text-3)' }}>{metric.label}</span>
                        <span className="ml-2 font-semibold">{metric.value}</span>
                      </div>
                    ))}
                  </div>
                ) : null}
              </motion.div>

              <motion.aside
                initial={{ opacity: 0, x: 12 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.28, ease: 'easeOut', delay: 0.04 }}
                className="overflow-hidden rounded-[22px] border"
                style={{ backgroundColor: 'rgba(255,255,255,0.02)', borderColor: 'rgba(255,255,255,0.08)' }}
              >
                <div className="px-4 py-4" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                  <div className="mb-2 text-[11px] uppercase tracking-[0.18em]" style={{ color: 'var(--text-3)' }}>rota sugerida</div>
                  <div className="text-xl font-semibold" style={{ color: 'var(--text-1)' }}>{nextAction?.title ?? 'Contexto antes da execucao.'}</div>
                  <div className="mt-2 text-sm leading-6" style={{ color: 'var(--text-2)' }}>{nextAction?.summary ?? 'Leia primeiro o regime, depois valide liquidez e risco.'}</div>
                </div>

                <div style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                  {(nextAction?.actions ?? []).slice(0, 4).map((action, index) => (
                    <button
                      key={`${action.label}-${action.href}`}
                      onClick={() => navigate(action.href)}
                      className="flex w-full items-center justify-between border-b px-4 py-3 text-left transition-colors hover:bg-white/[0.03]"
                      style={{ borderColor: 'rgba(255,255,255,0.06)', color: action.recommended ? 'var(--text-1)' : 'var(--text-2)', backgroundColor: action.recommended ? 'rgba(255,140,66,0.06)' : 'transparent' }}
                    >
                      <div className="flex items-center gap-3">
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border text-[11px] font-semibold" style={{ borderColor: action.recommended ? 'rgba(255,140,66,0.22)' : 'rgba(255,255,255,0.08)', color: action.recommended ? 'var(--accent-orange)' : 'var(--text-3)', backgroundColor: action.recommended ? 'rgba(255,140,66,0.12)' : 'rgba(255,255,255,0.03)' }}>
                          {String(index + 1).padStart(2, '0')}
                        </div>
                        <div className="text-[11px] uppercase tracking-[0.16em]" style={{ color: action.recommended ? 'var(--accent-orange)' : 'var(--text-3)' }}>{action.kind}</div>
                        <div className="mt-1 text-sm font-medium uppercase tracking-[0.12em]">{action.label}</div>
                      </div>
                      <ArrowUpRight className="h-4 w-4 shrink-0" />
                    </button>
                  ))}
                </div>

                <div className="px-4 py-4">
                  <div className="mb-3 flex items-center gap-2 text-sm font-medium" style={{ color: 'var(--text-1)' }}>
                    <ShieldAlert className="h-4 w-4" style={{ color: toneColor(executionRisk?.tone) }} />
                    Risco de execucao
                  </div>
                  <div className="rounded-2xl border px-3 py-3 text-sm leading-6" style={{ borderColor: 'rgba(255,255,255,0.06)', backgroundColor: 'rgba(0,0,0,0.14)', color: 'var(--text-2)' }}>
                    {executionRisk?.summary ?? 'Sem leitura suficiente para qualificar risco de execucao.'}
                  </div>
                  {(executionRisk?.blockers ?? []).slice(0, 3).map((blocker) => (
                    <div key={blocker} className="mt-3 flex items-start gap-2 text-sm" style={{ color: 'var(--text-2)' }}>
                      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" style={{ color: 'var(--warn-amber)' }} />
                      <span>{blocker}</span>
                    </div>
                  ))}
                  <div className="mt-4 grid grid-cols-2 gap-3 text-sm" style={{ fontVariantNumeric: 'tabular-nums' }}>
                    <div className="rounded-2xl border px-3 py-3" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
                      <div className="mb-1 text-[10px] uppercase tracking-[0.16em]" style={{ color: 'var(--text-3)' }}>mercado</div>
                      <div style={{ color: 'var(--text-1)' }}>{marketState?.label ?? '--'}</div>
                    </div>
                    <div className="rounded-2xl border px-3 py-3" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
                      <div className="mb-1 text-[10px] uppercase tracking-[0.16em]" style={{ color: 'var(--text-3)' }}>acesso</div>
                      <div style={{ color: 'var(--text-1)' }}>{marketState?.access ?? '--'}</div>
                    </div>
                  </div>
                </div>
              </motion.aside>
            </div>
          </section>

          <section className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_340px]">
            <div className="overflow-hidden rounded-[24px] border" style={{ backgroundColor: 'var(--bg-2)', borderColor: 'var(--stroke-1)', boxShadow: 'var(--shadow-1)' }}>
              <div className="flex items-center justify-between gap-3 px-4 py-3" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                <div>
                  <div className="text-[11px] uppercase tracking-[0.18em]" style={{ color: 'var(--text-3)' }}>{overview?.universe_summary.title ?? 'Universo monitorado'}</div>
                  <div className="text-sm" style={{ color: 'var(--text-2)' }}>{overview?.universe_summary.summary ?? 'Liquidez viva, score ativo e rota disponivel em leitura operacional.'}</div>
                </div>
                <div className="text-[11px] uppercase tracking-[0.18em]" style={{ color: 'var(--text-3)', fontVariantNumeric: 'tabular-nums' }}>{rows.length} ativos</div>
              </div>

              {moduleState !== 'ready' ? (
                <div className="p-4">
                  <ModuleStateCard
                    tone={moduleState === 'loading' ? 'loading' : moduleState === 'error' ? 'error' : 'empty'}
                    title={moduleState === 'loading' ? 'Carregando Radar' : moduleState === 'error' ? 'Falha ao carregar Radar' : 'Sem mercado disponivel'}
                    description={moduleState === 'loading' ? 'Sincronizando regime, liquidez e score do universo.' : moduleState === 'error' ? 'Os dados de mercado nao responderam como esperado.' : 'O universo monitorado esta vazio nesta janela.'}
                    actionLabel={moduleState === 'error' ? 'Atualizar' : undefined}
                    onAction={moduleState === 'error' ? () => overviewQuery.refetch() : undefined}
                    compact
                  />
                </div>
              ) : (
                <div className="px-4 py-4">
                  <div className="mb-4 flex gap-2 overflow-x-auto pb-1">
                    {quickSelection.slice(0, 8).map((item) => {
                      const active = item.symbol === activeRow?.symbol;
                      return (
                        <button
                          key={item.symbol}
                          onClick={() => { setActiveSymbol(item.symbol); navigate(`/radar/${item.symbol.toLowerCase()}`); }}
                          className="shrink-0 rounded-full border px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.16em]"
                          style={{ borderColor: active ? 'rgba(255,140,66,0.18)' : 'rgba(255,255,255,0.08)', color: active ? 'var(--accent-orange)' : 'var(--text-2)', backgroundColor: active ? 'rgba(255,140,66,0.08)' : 'rgba(255,255,255,0.02)' }}
                        >
                          {item.symbol}
                        </button>
                      );
                    })}
                  </div>

                  <div className="space-y-3">
                    {rows.map((row, index) => {
                      const active = row.symbol === activeRow?.symbol;
                      return (
                        <motion.div
                          layout
                          key={row.symbol}
                          initial={{ opacity: 0, y: 8 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ duration: 0.22, ease: 'easeOut', delay: index * 0.02 }}
                          className="relative overflow-hidden rounded-[22px] border px-4 py-4 transition-colors"
                          style={{ borderColor: active ? 'rgba(255,140,66,0.18)' : 'rgba(255,255,255,0.08)', backgroundColor: active ? 'rgba(255,140,66,0.08)' : 'rgba(255,255,255,0.02)' }}
                        >
                          <div className="absolute inset-y-4 left-0 w-[3px] rounded-r-full" style={{ backgroundColor: toneColor(row.state.tone), opacity: active ? 1 : 0.75 }} />
                          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                            <button onClick={() => { setActiveSymbol(row.symbol); navigate(`/radar/${row.symbol.toLowerCase()}`); }} className="flex min-w-0 flex-1 items-center gap-3 text-left">
                              <div className="text-[11px] uppercase tracking-[0.16em]" style={{ color: 'var(--text-3)', fontVariantNumeric: 'tabular-nums' }}>{String(index + 1).padStart(2, '0')}</div>
                              <IntelEntityIcon symbol={toEntitySymbol(row.symbol)} className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl" style={{ backgroundColor: 'rgba(255,255,255,0.05)' }} iconClassName="h-5 w-5" />
                              <div className="min-w-0 flex-1">
                                <div className="flex flex-wrap items-center gap-2">
                                  <div className="truncate text-base font-semibold uppercase tracking-[0.08em]" style={{ color: 'var(--text-1)' }}>{row.symbol}</div>
                                  <StatusBadge status={toStatusBadge(row.state.tone)}>{row.state.label}</StatusBadge>
                                  {active ? <StatusBadge status="active">focus</StatusBadge> : null}
                                </div>
                                <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[11px] uppercase tracking-[0.16em]" style={{ color: 'var(--text-3)', fontVariantNumeric: 'tabular-nums' }}>
                                  <span>preco <span style={{ color: 'var(--text-1)' }}>${formatPrice(row.price)}</span></span>
                                  <span>24h <span style={{ color: row.change24h >= 0 ? 'var(--ok-green)' : 'var(--error-red)' }}>{formatPercent(row.change24h)}</span></span>
                                  <span>score <span style={{ color: toneColor(row.state.tone) }}>{row.score}</span></span>
                                  <span>liq <span style={{ color: 'var(--text-1)' }}>{row.liquidityLabel}</span></span>
                                  <span>vol <span style={{ color: 'var(--text-1)' }}>${compact(Number(row.volume))}</span></span>
                                </div>
                                <div className="mt-3 h-1.5 overflow-hidden rounded-full" style={{ backgroundColor: 'rgba(255,255,255,0.06)' }}>
                                  <div className="h-full rounded-full" style={{ width: scoreToWidth(row.score), backgroundColor: toneColor(row.state.tone) }} />
                                </div>
                              </div>
                            </button>

                            <div className="flex shrink-0 flex-wrap gap-2">
                              <button
                                onClick={() => { setActiveSymbol(row.symbol); navigate(`/radar/${row.symbol.toLowerCase()}`); }}
                                className="inline-flex items-center gap-2 rounded-full border px-3 py-2 text-[11px] font-medium uppercase tracking-[0.16em]"
                                style={{ borderColor: 'rgba(255,255,255,0.08)', color: 'var(--text-1)', backgroundColor: 'rgba(255,255,255,0.03)' }}
                              >
                                Focar ativo
                              </button>
                              <button
                                onClick={() => navigate(row.swapsHref)}
                                className="inline-flex items-center gap-2 rounded-full border px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.16em]"
                                style={{ borderColor: 'rgba(255,140,66,0.18)', color: 'var(--accent-orange)', backgroundColor: 'rgba(255,140,66,0.08)' }}
                              >
                                Abrir swaps
                                <ArrowUpRight className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          </div>
                        </motion.div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            <aside className="space-y-4">
              <div className="overflow-hidden rounded-[24px] border" style={{ backgroundColor: 'var(--bg-2)', borderColor: 'var(--stroke-1)', boxShadow: 'var(--shadow-1)' }}>
                <div className="px-4 py-3" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                  <div className="text-[11px] uppercase tracking-[0.18em]" style={{ color: 'var(--text-3)' }}>top liquidez</div>
                </div>
                <div className="px-4 py-3">
                  <div className="space-y-2">
                    {liquidityLane.map((entry, index) => (
                      <button key={entry.symbol} onClick={() => { setActiveSymbol(entry.symbol); navigate(`/radar/${entry.symbol.toLowerCase()}`); }} className="flex w-full items-center justify-between rounded-2xl border px-3 py-3 text-left transition-colors hover:bg-white/[0.03]" style={{ borderColor: 'rgba(255,255,255,0.06)', backgroundColor: index === 0 ? 'rgba(255,140,66,0.06)' : 'rgba(255,255,255,0.02)' }}>
                        <div>
                          <div className="text-sm font-medium uppercase tracking-[0.12em]" style={{ color: 'var(--text-1)' }}>{entry.symbol}</div>
                          <div className="mt-1 text-[11px] uppercase tracking-[0.16em]" style={{ color: 'var(--text-3)' }}>vol ${compact(Number(entry.volume))}</div>
                        </div>
                        <div className="text-right">
                          <StatusBadge status={toStatusBadge(entry.state.tone)}>{entry.liquidityLabel}</StatusBadge>
                          <div className="mt-1 text-[11px]" style={{ color: toneColor(entry.state.tone) }}>{formatPercent(entry.change24h)}</div>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="overflow-hidden rounded-[24px] border" style={{ backgroundColor: 'var(--bg-2)', borderColor: 'var(--stroke-1)', boxShadow: 'var(--shadow-1)' }}>
                <div className="px-4 py-3" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                  <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.18em]" style={{ color: 'var(--text-3)' }}>
                    <Waves className="h-3.5 w-3.5" />
                    top momentum
                  </div>
                </div>
                <div className="px-4 py-3">
                  <div className="space-y-2">
                    {momentumLane.map((entry, index) => (
                      <button key={entry.symbol} onClick={() => { setActiveSymbol(entry.symbol); navigate(`/radar/${entry.symbol.toLowerCase()}`); }} className="flex w-full items-center justify-between rounded-2xl border px-3 py-3 text-left transition-colors hover:bg-white/[0.03]" style={{ borderColor: 'rgba(255,255,255,0.06)', backgroundColor: index === 0 ? 'rgba(255,140,66,0.06)' : 'rgba(255,255,255,0.02)' }}>
                        <div>
                          <div className="text-sm font-medium uppercase tracking-[0.12em]" style={{ color: 'var(--text-1)' }}>{entry.symbol}</div>
                          <div className="mt-1 text-[11px] uppercase tracking-[0.16em]" style={{ color: 'var(--text-3)' }}>score {entry.score}</div>
                        </div>
                        <div className="text-right">
                          <div className="text-sm font-semibold" style={{ color: entry.change24h >= 0 ? 'var(--ok-green)' : 'var(--error-red)' }}>{formatPercent(entry.change24h)}</div>
                          <div className="mt-1 h-1 w-16 overflow-hidden rounded-full" style={{ backgroundColor: 'rgba(255,255,255,0.06)' }}>
                            <div className="h-full rounded-full" style={{ width: scoreToWidth(entry.score), backgroundColor: toneColor(entry.state.tone) }} />
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="overflow-hidden rounded-[24px] border" style={{ backgroundColor: 'var(--bg-2)', borderColor: 'var(--stroke-1)', boxShadow: 'var(--shadow-1)' }}>
                <div className="px-4 py-3" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                  <div className="text-[11px] uppercase tracking-[0.18em]" style={{ color: 'var(--text-3)' }}>pedem cautela</div>
                </div>
                <div className="px-4 py-3">
                  {cautionLane.length > 0 ? (
                    <div className="space-y-2">
                      {cautionLane.map((entry) => (
                        <button key={entry.symbol} onClick={() => { setActiveSymbol(entry.symbol); navigate(`/radar/${entry.symbol.toLowerCase()}`); }} className="flex w-full items-center justify-between rounded-2xl border px-3 py-3 text-left transition-colors hover:bg-white/[0.03]" style={{ borderColor: 'rgba(255,255,255,0.06)', backgroundColor: 'rgba(255,255,255,0.02)' }}>
                          <div>
                            <div className="text-sm font-medium uppercase tracking-[0.12em]" style={{ color: 'var(--text-1)' }}>{entry.symbol}</div>
                            <div className="mt-1 text-[11px] uppercase tracking-[0.16em]" style={{ color: 'var(--text-3)' }}>score {entry.score}  liq {entry.liquidityLabel}</div>
                          </div>
                          <StatusBadge status={toStatusBadge(entry.state.tone)}>{entry.state.label}</StatusBadge>
                        </button>
                      ))}
                    </div>
                  ) : (
                    <div className="text-sm" style={{ color: 'var(--text-2)' }}>Nenhum ativo entrou em faixa de cautela nesta janela.</div>
                  )}
                </div>
              </div>
            </aside>
          </section>
        </div>
      </div>
    </div>
  );
}
