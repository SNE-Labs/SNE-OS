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
  const headerStats = [
    { label: 'Regime', value: regime?.label ?? 'sem dados', tone: regime?.tone },
    { label: 'Janela', value: signal?.timeframe ?? '24H' },
    { label: 'Update', value: formatUpdatedAt(overview?.last_updated) },
    { label: 'Media', value: formatPercent(regime?.avg_change_24h ?? 0), tone: (regime?.avg_change_24h ?? 0) >= 0 ? 'success' : 'warning' },
    { label: 'Execucao', value: marketState?.execution ?? 'intel-first', tone: overview?.execution.tone },
  ];
  const tape = rows.length > 0 ? [...rows.slice(0, 6), ...rows.slice(0, 6)] : [];

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
                  {overviewQuery.isFetching ? 'sync' : 'live'}
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

            <div className="grid grid-cols-1 gap-4 px-4 py-4 lg:grid-cols-[minmax(0,1.35fr)_repeat(6,minmax(0,1fr))]">
              <div className="min-w-0">
                <div className="mb-2 text-[11px] uppercase tracking-[0.18em]" style={{ color: 'var(--text-3)' }}>foco atual</div>
                <div className="flex items-center gap-3">
                  <IntelEntityIcon symbol={toEntitySymbol(activeRow?.symbol)} className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl" style={{ backgroundColor: 'rgba(255,255,255,0.06)' }} iconClassName="h-6 w-6" />
                  <div className="min-w-0">
                    <div className="truncate text-[28px] font-semibold leading-none" style={{ color: 'var(--text-1)' }}>{activeRow?.symbol ?? activeSymbol}</div>
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      <StatusBadge status={toStatusBadge(activeRow?.state.tone)}>{activeRow?.state.label ?? 'HOLD'}</StatusBadge>
                      <StatusBadge status={toStatusBadge(regime?.tone)}>{regime?.label ?? 'sem dados'}</StatusBadge>
                    </div>
                  </div>
                </div>
              </div>
              {[
                ['Preco', `$${formatPrice(activeRow?.price ?? 0)}`, 'pending' as Tone],
                ['24H', formatPercent(activeRow?.change24h ?? 0), (activeRow?.change24h ?? 0) >= 0 ? 'success' : 'warning'],
                ['Volume', `$${compact(Number(activeRow?.volume ?? 0))}`, 'pending' as Tone],
                ['Score', String(activeRow?.score ?? 0), activeRow?.state.tone ?? 'pending'],
                ['Liquidez', activeRow?.liquidityLabel ?? '--', activeRow?.state.tone ?? 'pending'],
                ['Risco', executionRisk?.label ?? '--', executionRisk?.tone ?? 'pending'],
              ].map(([label, value, tone]) => (
                <div key={label}>
                  <div className="mb-2 text-[11px] uppercase tracking-[0.18em]" style={{ color: 'var(--text-3)' }}>{label}</div>
                  <div className="truncate text-base font-semibold" style={{ color: toneColor(tone as Tone), fontVariantNumeric: 'tabular-nums' }}>{value}</div>
                </div>
              ))}
            </div>
          </section>

          <section className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_340px]">
            <div className="overflow-hidden rounded-[24px] border" style={{ backgroundColor: 'var(--bg-2)', borderColor: 'var(--stroke-1)', boxShadow: 'var(--shadow-1)' }}>
              <div className="flex items-center justify-between gap-3 px-4 py-3" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                <div>
                  <div className="text-[11px] uppercase tracking-[0.18em]" style={{ color: 'var(--text-3)' }}>{overview?.universe_summary.title ?? 'Universo monitorado'}</div>
                  <div className="text-sm" style={{ color: 'var(--text-2)' }}>{overview?.universe_summary.summary ?? 'Liquidez, score e rota em tempo operacional.'}</div>
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
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[980px]" style={{ fontVariantNumeric: 'tabular-nums' }}>
                    <thead>
                      <tr className="text-left text-[11px] uppercase tracking-[0.18em]" style={{ color: 'var(--text-3)' }}>
                        {['#', 'Ativo', 'Preco', '24H', 'Volume', 'Score', 'Liq', 'Estado', 'Acao'].map((label) => <th key={label} className="px-4 py-3 font-medium" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>{label}</th>)}
                      </tr>
                    </thead>
                    <tbody>
                      {rows.map((row, index) => {
                        const active = row.symbol === activeRow?.symbol;
                        return (
                          <motion.tr layout key={row.symbol} onClick={() => { setActiveSymbol(row.symbol); navigate(`/radar/${row.symbol.toLowerCase()}`); }} className="cursor-pointer transition-colors" style={{ backgroundColor: active ? 'rgba(255,140,66,0.08)' : 'transparent' }}>
                            <td className="px-4 py-3 text-sm" style={{ color: 'var(--text-3)', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>{String(index + 1).padStart(2, '0')}</td>
                            <td className="px-4 py-3" style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                              <div className="flex min-w-0 items-center gap-3">
                                <IntelEntityIcon symbol={toEntitySymbol(row.symbol)} className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl" style={{ backgroundColor: 'rgba(255,255,255,0.05)' }} iconClassName="h-4.5 w-4.5" />
                                <div className="min-w-0">
                                  <div className="truncate text-sm font-semibold" style={{ color: 'var(--text-1)' }}>{row.symbol}</div>
                                  <div className="mt-1 flex items-center gap-2 text-[11px] uppercase tracking-[0.16em]" style={{ color: 'var(--text-3)' }}>{row.liquidityRank >= 0 ? <span>L#{row.liquidityRank + 1}</span> : null}{active ? <span>focus</span> : null}</div>
                                </div>
                              </div>
                            </td>
                            <td className="px-4 py-3 text-sm font-medium" style={{ color: 'var(--text-1)', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>${formatPrice(row.price)}</td>
                            <td className="px-4 py-3 text-sm font-medium" style={{ color: row.change24h >= 0 ? 'var(--ok-green)' : 'var(--error-red)', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>{formatPercent(row.change24h)}</td>
                            <td className="px-4 py-3 text-sm" style={{ color: 'var(--text-2)', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>${compact(Number(row.volume))}</td>
                            <td className="px-4 py-3 text-sm font-semibold" style={{ color: toneColor(row.state.tone), borderBottom: '1px solid rgba(255,255,255,0.04)' }}>{row.score}</td>
                            <td className="px-4 py-3 text-sm" style={{ color: 'var(--text-2)', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>{row.liquidityLabel}</td>
                            <td className="px-4 py-3" style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}><StatusBadge status={toStatusBadge(row.state.tone)}>{row.state.label}</StatusBadge></td>
                            <td className="px-4 py-3" style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                              <button onClick={(event) => { event.stopPropagation(); navigate(row.swapsHref); }} className="inline-flex items-center gap-2 rounded-full border px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.16em]" style={{ borderColor: 'rgba(255,140,66,0.18)', color: 'var(--accent-orange)', backgroundColor: 'rgba(255,140,66,0.08)' }}>
                                USDT
                                <ArrowUpRight className="h-3.5 w-3.5" />
                              </button>
                            </td>
                          </motion.tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            <aside className="overflow-hidden rounded-[24px] border" style={{ backgroundColor: 'var(--bg-2)', borderColor: 'var(--stroke-1)', boxShadow: 'var(--shadow-1)' }}>
              <div className="px-4 py-4" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                <div className="mb-3 flex items-center justify-between gap-3">
                  <div className="text-[11px] uppercase tracking-[0.18em]" style={{ color: 'var(--text-3)' }}>proxima rota</div>
                  <StatusBadge status={toStatusBadge(activeRow?.state.tone)}>{activeRow?.state.label ?? 'HOLD'}</StatusBadge>
                </div>
                <div className="text-2xl font-semibold" style={{ color: 'var(--text-1)' }}>{activeRow?.symbol ?? activeSymbol}</div>
                <div className="mt-3 grid grid-cols-2 gap-3 text-sm" style={{ fontVariantNumeric: 'tabular-nums' }}>
                  <div><div className="mb-1 text-[11px] uppercase tracking-[0.16em]" style={{ color: 'var(--text-3)' }}>score</div><div style={{ color: 'var(--text-1)' }}>{activeRow?.score ?? 0}</div></div>
                  <div><div className="mb-1 text-[11px] uppercase tracking-[0.16em]" style={{ color: 'var(--text-3)' }}>liq</div><div style={{ color: 'var(--text-1)' }}>{activeRow?.liquidityLabel ?? '--'}</div></div>
                  <div><div className="mb-1 text-[11px] uppercase tracking-[0.16em]" style={{ color: 'var(--text-3)' }}>risco</div><div style={{ color: toneColor(executionRisk?.tone) }}>{executionRisk?.label ?? '--'}</div></div>
                  <div><div className="mb-1 text-[11px] uppercase tracking-[0.16em]" style={{ color: 'var(--text-3)' }}>execucao</div><div style={{ color: 'var(--text-1)' }}>{marketState?.execution ?? 'intel-first'}</div></div>
                </div>
              </div>

              <div style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                {(nextAction?.actions ?? []).map((action) => (
                  <button key={`${action.label}-${action.href}`} onClick={() => navigate(action.href)} className="flex w-full items-center justify-between border-b px-4 py-3 text-left transition-colors hover:bg-white/[0.03]" style={{ borderColor: 'rgba(255,255,255,0.06)', color: action.recommended ? 'var(--text-1)' : 'var(--text-2)', backgroundColor: action.recommended ? 'rgba(255,140,66,0.06)' : 'transparent' }}>
                    <span className="text-sm font-medium uppercase tracking-[0.16em]">{action.label}</span>
                    <ArrowUpRight className="h-4 w-4 shrink-0" />
                  </button>
                ))}
              </div>

              <div className="px-4 py-4" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                <div className="mb-3 flex items-center gap-2 text-sm font-medium" style={{ color: 'var(--text-1)' }}>
                  <ShieldAlert className="h-4 w-4" style={{ color: toneColor(executionRisk?.tone) }} />
                  Risco de execucao
                </div>
                <div className="text-sm leading-6" style={{ color: 'var(--text-2)' }}>{executionRisk?.summary ?? 'Sem leitura suficiente para qualificar risco de execucao.'}</div>
                {(executionRisk?.blockers ?? []).slice(0, 3).map((blocker) => (
                  <div key={blocker} className="mt-2 flex items-start gap-2 text-sm" style={{ color: 'var(--text-2)' }}>
                    <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" style={{ color: 'var(--warn-amber)' }} />
                    <span>{blocker}</span>
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-2 gap-3 px-4 py-4">
                <div className="rounded-xl px-3 py-3" style={{ backgroundColor: 'rgba(255,255,255,0.02)' }}>
                  <div className="mb-2 text-[11px] uppercase tracking-[0.16em]" style={{ color: 'var(--text-3)' }}>top liquidez</div>
                  {(liquidityRanking.slice(0, 3)).map((entry, index) => <button key={entry.symbol} onClick={() => { setActiveSymbol(entry.symbol); navigate(`/radar/${entry.symbol.toLowerCase()}`); }} className="flex w-full items-center justify-between py-1 text-left text-sm" style={{ color: index === 0 ? 'var(--text-1)' : 'var(--text-2)' }}><span>{entry.symbol}</span><span>${compact(Number(entry.volume))}</span></button>)}
                </div>
                <div className="rounded-xl px-3 py-3" style={{ backgroundColor: 'rgba(255,255,255,0.02)' }}>
                  <div className="mb-2 flex items-center gap-2 text-[11px] uppercase tracking-[0.16em]" style={{ color: 'var(--text-3)' }}>
                    <Waves className="h-3.5 w-3.5" />
                    top momentum
                  </div>
                  {rows.slice(0, 3).map((entry, index) => <button key={entry.symbol} onClick={() => { setActiveSymbol(entry.symbol); navigate(`/radar/${entry.symbol.toLowerCase()}`); }} className="flex w-full items-center justify-between py-1 text-left text-sm" style={{ color: index === 0 ? 'var(--text-1)' : 'var(--text-2)' }}><span>{entry.symbol}</span><span>{formatPercent(entry.change24h)}</span></button>)}
                </div>
              </div>
            </aside>
          </section>
        </div>
      </div>
    </div>
  );
}
