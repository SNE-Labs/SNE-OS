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
const scoreToWidth = (score?: number) => `${Math.max(12, Math.min(100, ((score ?? 0) / 30) * 100))}%`;
const deriveState = (change24h: number, score: number) => (score >= 22 || change24h >= 0.025 ? { label: 'BUY', tone: 'success' as const } : score <= 8 || change24h <= -0.02 ? { label: 'AVOID', tone: 'warning' as const } : { label: 'HOLD', tone: 'pending' as const });
const deriveLiquidity = (rank: number, volume: number) => (rank >= 0 && rank < 2 ? 'forte' : rank >= 0 && rank < 5 ? 'media' : volume > 100_000_000 ? 'media' : 'leve');
const fieldWidth = (score: number, index: number) => `${Math.max(180, Math.min(320, 168 + score * 4 + (index % 3) * 18))}px`;
const fieldHeight = (index: number, active: boolean) => `${active ? 164 : 132 + (index % 4) * 11}px`;
const fieldOffset = (index: number) => `${((index % 4) - 1.5) * 14}px`;

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
  const selectionLane = rows.slice(0, 12);
  const ecosystemField = rows.slice(0, 10);
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
    { label: 'Media 24h', value: formatPercent(regime?.avg_change_24h ?? 0), tone: (regime?.avg_change_24h ?? 0) >= 0 ? 'success' : 'warning' },
    { label: 'Execucao', value: marketState?.execution ?? 'intel-first', tone: overview?.execution.tone },
    { label: 'Update', value: formatUpdatedAt(overview?.last_updated) },
  ];
  const selectedMetrics = [
    { label: 'Preco', value: `$${formatPrice(activeRow?.price ?? 0)}`, tone: 'pending' as Tone },
    { label: '24h', value: formatPercent(activeRow?.change24h ?? 0), tone: (activeRow?.change24h ?? 0) >= 0 ? 'success' as Tone : 'warning' as Tone },
    { label: 'Score', value: String(activeRow?.score ?? 0), tone: activeRow?.state.tone ?? 'pending' as Tone },
    { label: 'Liquidez', value: focusLiquidityLabel, tone: focusLiquidityTone },
    { label: 'Confianca', value: focusConfidence.label, tone: focusConfidence.tone },
    { label: 'Volume', value: `$${compact(Number(activeRow?.volume ?? 0))}`, tone: 'pending' as Tone },
  ];
  const activeNarrative =
    activeRow?.symbol === focusAsset?.symbol
      ? `${focusAsset?.symbol} segue como leitura principal, com ${focusConfidence.label} e liquidez ${focusLiquidityLabel}.`
      : `${activeRow?.symbol ?? activeSymbol} foi selecionado manualmente para aprofundar leitura de score, risco e liquidez.`;

  function selectSymbol(symbol: string) {
    setActiveSymbol(symbol);
    navigate(`/radar/${symbol.toLowerCase()}`);
  }

  return (
    <div className="flex flex-1">
      <div className="flex-1 overflow-y-auto px-6 py-5 xl:px-8">
        <div className="mx-auto max-w-[1540px] space-y-6">
          <section
            className="relative overflow-hidden rounded-[34px] px-5 py-5 lg:px-6"
            style={{
              background:
                'radial-gradient(circle at 12% 0%, rgba(255,140,66,0.14), transparent 28%), radial-gradient(circle at 78% 22%, rgba(62,201,153,0.08), transparent 26%), linear-gradient(180deg, rgba(255,255,255,0.018), rgba(255,255,255,0.006))',
              boxShadow: 'var(--shadow-1)',
            }}
          >
            <div className="pointer-events-none absolute inset-x-6 top-0 h-px" style={{ background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.16), transparent)' }} />
            <div className="pointer-events-none absolute inset-y-10 left-0 w-px" style={{ background: 'linear-gradient(180deg, transparent, rgba(255,255,255,0.08), transparent)' }} />
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3 text-[11px] uppercase tracking-[0.22em]" style={{ color: 'var(--text-2)' }}>
                <Activity className="h-3.5 w-3.5" style={{ color: 'var(--accent-orange)' }} />
                <span style={{ color: 'var(--text-1)' }}>Radar</span>
                <span className={`inline-flex h-2.5 w-2.5 rounded-full ${overviewQuery.isFetching ? 'animate-pulse' : ''}`} style={{ backgroundColor: overviewQuery.isFetching ? 'var(--accent-orange)' : 'var(--ok-green)' }} />
                <span>{overviewQuery.isFetching ? 'sync' : 'ao vivo'}</span>
              </div>

              <div className="flex items-center gap-2">
                <StatusBadge status={toStatusBadge(overview?.execution.tone)}>{overview?.execution.label ?? 'offline'}</StatusBadge>
                <button
                  onClick={() => overviewQuery.refetch()}
                  className="inline-flex items-center gap-2 rounded-full border px-3 py-2 text-sm font-medium transition-colors hover:bg-white/[0.04]"
                  style={{ backgroundColor: 'rgba(255,255,255,0.02)', color: 'var(--text-1)', borderColor: 'rgba(255,255,255,0.08)' }}
                >
                  <RefreshCw className={`h-4 w-4 ${overviewQuery.isFetching ? 'animate-spin' : ''}`} />
                  Atualizar
                </button>
              </div>
            </div>

            <div className="mt-5 grid gap-6 xl:grid-cols-[minmax(0,1.45fr)_360px] xl:items-start">
              <div className="min-w-0">
                <div className="mb-3 text-[10px] uppercase tracking-[0.28em]" style={{ color: 'var(--text-3)' }}>
                  panorama tatico
                </div>
                <h1 className="max-w-4xl text-[34px] font-semibold leading-[0.98] tracking-[-0.055em] md:text-[46px]" style={{ color: 'var(--text-1)' }}>
                  {overview?.hero?.headline ?? 'Leitura ampla de regime, liquidez e rotação antes de escolher um ativo.'}
                </h1>
                <p className="mt-4 max-w-[52rem] text-[15px] leading-7" style={{ color: 'var(--text-2)' }}>
                  {overview?.hero?.summary ?? regime?.summary ?? 'Abra o Radar para ler o campo primeiro. Regime, liquidez e friccao aparecem antes do ativo; o detalhe entra so quando vale aprofundar.'}
                </p>

                <div className="mt-5 flex flex-wrap gap-2.5">
                  {headerStats.map((item) => (
                    <div
                      key={item.label}
                      className="rounded-full border px-3 py-2 text-[11px] uppercase tracking-[0.16em]"
                      style={{
                        borderColor: 'rgba(255,255,255,0.08)',
                        backgroundColor: 'rgba(255,255,255,0.02)',
                        color: item.tone ? toneColor(item.tone as Tone) : 'var(--text-2)',
                      }}
                    >
                      <span style={{ color: 'var(--text-3)' }}>{item.label}</span>
                      <span className="ml-2 font-semibold">{item.value}</span>
                    </div>
                  ))}

                  {(overview?.hero?.metrics ?? []).slice(0, 4).map((metric) => (
                    <div
                      key={metric.label}
                      className="rounded-full border px-3 py-2 text-[11px] uppercase tracking-[0.16em]"
                      style={{
                        borderColor: 'rgba(255,255,255,0.08)',
                        backgroundColor: 'rgba(255,255,255,0.02)',
                        color: toneColor(metric.tone),
                      }}
                    >
                      <span style={{ color: 'var(--text-3)' }}>{metric.label}</span>
                      <span className="ml-2 font-semibold">{metric.value}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 text-sm" style={{ fontVariantNumeric: 'tabular-nums' }}>
                <OverviewMetric label="clima" value={marketState?.label ?? '--'} />
                <OverviewMetric label="acesso" value={marketState?.access ?? '--'} />
                <OverviewMetric label="sob lupa" value={activeRow?.symbol ?? activeSymbol} tone={activeRow?.state.tone} />
                <OverviewMetric label="friccao" value={executionRisk?.label ?? '--'} tone={executionRisk?.tone} />
              </div>
            </div>
          </section>

          <section className="space-y-3">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <div className="text-[10px] uppercase tracking-[0.26em]" style={{ color: 'var(--text-3)' }}>
                  troca de foco
                </div>
                <div className="mt-1 text-sm" style={{ color: 'var(--text-2)' }}>
                  Gire entre ativos sem sair do campo. O detalhe acompanha a sua escolha, nao o contrario.
                </div>
              </div>
              <div className="text-[10px] uppercase tracking-[0.22em]" style={{ color: 'var(--text-3)' }}>
                em foco <span style={{ color: 'var(--accent-orange)' }}>{activeRow?.symbol ?? activeSymbol}</span>
              </div>
            </div>

            <div className="flex gap-2 overflow-x-auto pb-2">
              {selectionLane.map((item) => {
                const active = item.symbol === activeRow?.symbol;
                return (
                  <button
                    key={item.symbol}
                    onClick={() => selectSymbol(item.symbol)}
                    className="shrink-0 rounded-[24px] px-4 py-3 text-left transition-colors hover:bg-white/[0.03]"
                    style={{
                      minWidth: '170px',
                      background: active ? 'linear-gradient(135deg, rgba(255,140,66,0.12), rgba(255,255,255,0.03))' : 'rgba(255,255,255,0.02)',
                      boxShadow: active ? 'inset 0 0 0 1px rgba(255,140,66,0.18)' : 'inset 0 0 0 1px rgba(255,255,255,0.06)',
                      backdropFilter: 'blur(12px)',
                    }}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="text-[13px] font-semibold uppercase tracking-[0.16em]" style={{ color: active ? 'var(--accent-orange)' : 'var(--text-1)' }}>
                        {item.symbol}
                      </div>
                      <StatusBadge status={toStatusBadge(item.state.tone)}>{item.state.label}</StatusBadge>
                    </div>
                    <div className="mt-2 flex items-center justify-between gap-3 text-[11px] uppercase tracking-[0.16em]" style={{ color: 'var(--text-3)', fontVariantNumeric: 'tabular-nums' }}>
                      <span style={{ color: item.change24h >= 0 ? 'var(--ok-green)' : 'var(--error-red)' }}>{formatPercent(item.change24h)}</span>
                      <span>score {item.score}</span>
                      <span>liq {item.liquidityLabel}</span>
                    </div>
                  </button>
                );
              })}
            </div>
          </section>

          {moduleState !== 'ready' ? (
            <ModuleStateCard
              tone={moduleState === 'loading' ? 'loading' : moduleState === 'error' ? 'error' : 'empty'}
              title={moduleState === 'loading' ? 'Carregando Radar' : moduleState === 'error' ? 'Falha ao carregar Radar' : 'Sem mercado disponivel'}
              description={moduleState === 'loading' ? 'Sincronizando regime, liquidez e score do universo.' : moduleState === 'error' ? 'Os dados de mercado nao responderam como esperado.' : 'O universo monitorado esta vazio nesta janela.'}
              actionLabel={moduleState === 'error' ? 'Atualizar' : undefined}
              onAction={moduleState === 'error' ? () => overviewQuery.refetch() : undefined}
            />
          ) : (
            <section className="grid gap-7 xl:grid-cols-[minmax(0,1.5fr)_340px] xl:items-start">
              <div className="min-w-0 space-y-7">
                <section className="relative overflow-hidden py-4">
                  <div
                    className="pointer-events-none absolute inset-x-0 top-0 h-px"
                    style={{ background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.14), transparent)' }}
                  />
                  <div
                    className="pointer-events-none absolute inset-x-0 bottom-0 h-px"
                    style={{ background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.1), transparent)' }}
                  />
                  <div
                    className="pointer-events-none absolute left-[8%] top-10 h-32 w-32 rounded-full blur-3xl"
                    style={{ backgroundColor: 'rgba(255,140,66,0.07)' }}
                  />
                  <div
                    className="pointer-events-none absolute right-[12%] top-20 h-40 w-40 rounded-full blur-3xl"
                    style={{ backgroundColor: 'rgba(62, 201, 153, 0.05)' }}
                  />
                  <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
                    <div>
                      <div className="text-[10px] uppercase tracking-[0.26em]" style={{ color: 'var(--text-3)' }}>
                        campo de rotacao
                      </div>
                      <div className="mt-1 text-sm leading-6" style={{ color: 'var(--text-2)' }}>
                        {overview?.universe_summary.summary ?? 'Liquidez, score e direcao ficam espalhados pela surface para leitura rapida, sem forcar uma lista linear.'}
                      </div>
                    </div>
                    <div className="text-[10px] uppercase tracking-[0.22em]" style={{ color: 'var(--text-3)' }}>
                      {rows.length} ativos em orbita
                    </div>
                  </div>

                  <div className="relative mb-4 flex flex-wrap gap-2.5">
                    <div className="pointer-events-none absolute inset-x-0 top-1/2 hidden h-px -translate-y-1/2 lg:block" style={{ background: 'linear-gradient(90deg, rgba(255,255,255,0.02), rgba(255,255,255,0.08), rgba(255,255,255,0.02))' }} />
                    {headerStats.map((item) => (
                      <div
                        key={`field-${item.label}`}
                        className="relative rounded-full px-3 py-1.5 text-[10px] uppercase tracking-[0.16em]"
                        style={{ color: item.tone ? toneColor(item.tone as Tone) : 'var(--text-2)', backgroundColor: 'rgba(8,11,18,0.55)', backdropFilter: 'blur(12px)' }}
                      >
                        <span style={{ color: 'var(--text-3)' }}>{item.label}</span>
                        <span className="ml-2 font-semibold">{item.value}</span>
                      </div>
                    ))}
                  </div>

                  <div className="pointer-events-none absolute left-[16%] top-28 text-[10px] uppercase tracking-[0.22em]" style={{ color: 'rgba(255,255,255,0.12)' }}>
                    pulse map
                  </div>
                  <div className="pointer-events-none absolute right-[10%] top-40 text-[10px] uppercase tracking-[0.22em]" style={{ color: 'rgba(255,255,255,0.1)' }}>
                    liquidity pockets
                  </div>

                  <div className="columns-1 gap-3 md:columns-2 2xl:columns-3 [column-fill:_balance]">
                    {ecosystemField.map((row, index) => {
                      const active = row.symbol === activeRow?.symbol;
                      return (
                        <motion.button
                          layout
                          key={row.symbol}
                          onClick={() => selectSymbol(row.symbol)}
                          initial={{ opacity: 0, y: 8 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ duration: 0.22, ease: 'easeOut', delay: index * 0.02 }}
                          className="group relative mb-3 block w-full break-inside-avoid overflow-hidden rounded-[28px] px-4 py-4 text-left transition-transform duration-200 hover:-translate-y-0.5"
                          style={{
                            width: '100%',
                            maxWidth: fieldWidth(row.score, index),
                            minHeight: fieldHeight(index, active),
                            background: active
                              ? 'linear-gradient(135deg, rgba(255,140,66,0.14), rgba(255,255,255,0.03) 58%, rgba(255,255,255,0.01))'
                              : 'linear-gradient(135deg, rgba(255,255,255,0.035), rgba(255,255,255,0.015))',
                            boxShadow: active ? '0 18px 50px rgba(0,0,0,0.18)' : 'none',
                            transform: `translateY(${fieldOffset(index)})`,
                            backdropFilter: 'blur(16px)',
                            border: active ? '1px solid rgba(255,140,66,0.18)' : '1px solid rgba(255,255,255,0.08)',
                          }}
                        >
                          <div className="absolute inset-x-0 top-0 h-px" style={{ backgroundColor: toneColor(row.state.tone), opacity: 0.55 }} />
                          <div className="pointer-events-none absolute -right-8 -top-8 h-16 w-16 rounded-full blur-2xl" style={{ backgroundColor: active ? 'rgba(255,140,66,0.1)' : 'rgba(255,255,255,0.05)' }} />
                          <div className="pointer-events-none absolute inset-y-5 left-0 w-px" style={{ background: 'linear-gradient(180deg, transparent, rgba(255,255,255,0.08), transparent)' }} />
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <div className="flex items-center gap-2">
                                <IntelEntityIcon symbol={toEntitySymbol(row.symbol)} className="flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl" style={{ backgroundColor: 'rgba(255,255,255,0.05)' }} iconClassName="h-4.5 w-4.5" />
                                <div className="min-w-0">
                                  <div className="truncate text-[17px] font-semibold uppercase tracking-[0.12em]" style={{ color: 'var(--text-1)' }}>
                                    {row.symbol}
                                  </div>
                                  <div className="mt-1 text-[10px] uppercase tracking-[0.16em]" style={{ color: 'var(--text-3)' }}>
                                    {row.liquidityLabel} · score {row.score}
                                  </div>
                                </div>
                              </div>
                            </div>
                            {active ? <StatusBadge status="active">selecionado</StatusBadge> : <StatusBadge status={toStatusBadge(row.state.tone)}>{row.state.label}</StatusBadge>}
                          </div>

                          <div className="mt-6 flex items-end justify-between gap-3">
                            <div>
                              <div className="text-[26px] font-semibold leading-none" style={{ color: 'var(--text-1)', fontVariantNumeric: 'tabular-nums' }}>
                                {formatPercent(row.change24h)}
                              </div>
                              <div className="mt-2 text-sm" style={{ color: 'var(--text-2)', fontVariantNumeric: 'tabular-nums' }}>
                                ${formatPrice(row.price)}
                              </div>
                            </div>
                            <div className="text-right text-[11px] uppercase tracking-[0.16em]" style={{ color: 'var(--text-3)', fontVariantNumeric: 'tabular-nums' }}>
                              <div>vol ${compact(Number(row.volume))}</div>
                              <div className="mt-2 h-1.5 w-20 overflow-hidden rounded-full" style={{ backgroundColor: 'rgba(255,255,255,0.06)' }}>
                                <div className="h-full rounded-full" style={{ width: scoreToWidth(row.score), backgroundColor: toneColor(row.state.tone) }} />
                              </div>
                            </div>
                          </div>
                        </motion.button>
                      );
                    })}
                  </div>
                </section>

                <section className="grid gap-6 md:grid-cols-3">
                  <SignalStrip
                    title="fluxo mais liquido"
                    icon={Activity}
                    entries={liquidityLane}
                    toneResolver={(entry) => entry.state.tone}
                    activeSymbol={activeRow?.symbol}
                    onSelect={selectSymbol}
                    renderMeta={(entry) => `vol $${compact(Number(entry.volume))}`}
                    renderValue={(entry) => formatPercent(entry.change24h)}
                  />
                  <SignalStrip
                    title="pulso de momentum"
                    icon={Waves}
                    entries={momentumLane}
                    toneResolver={(entry) => entry.state.tone}
                    activeSymbol={activeRow?.symbol}
                    onSelect={selectSymbol}
                    renderMeta={(entry) => `score ${entry.score}`}
                    renderValue={(entry) => entry.liquidityLabel}
                  />
                  <SignalStrip
                    title="zona de cautela"
                    icon={ShieldAlert}
                    entries={cautionLane}
                    toneResolver={(entry) => entry.state.tone}
                    activeSymbol={activeRow?.symbol}
                    onSelect={selectSymbol}
                    renderMeta={(entry) => `score ${entry.score} · liq ${entry.liquidityLabel}`}
                    renderValue={(entry) => entry.state.label}
                    emptyMessage="Nenhum ativo entrou em faixa de cautela nesta janela."
                  />
                </section>
              </div>

              <aside className="space-y-6 xl:sticky xl:top-5">
                <section
                  className="overflow-hidden rounded-[30px] px-5 py-5"
                  style={{
                    background:
                      'linear-gradient(180deg, rgba(255,140,66,0.08), rgba(255,255,255,0.02) 44%, rgba(255,255,255,0.01))',
                    boxShadow: 'var(--shadow-1)',
                    border: '1px solid rgba(255,255,255,0.08)',
                  }}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="text-[11px] uppercase tracking-[0.18em]" style={{ color: 'var(--text-3)' }}>
                        ativo sob lupa
                      </div>
                      <div className="mt-2 flex items-center gap-3">
                        <IntelEntityIcon symbol={toEntitySymbol(activeRow?.symbol)} className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[18px]" style={{ backgroundColor: 'rgba(255,255,255,0.06)' }} iconClassName="h-6 w-6" />
                        <div>
                          <div className="text-[28px] font-semibold leading-none" style={{ color: 'var(--text-1)' }}>
                            {activeRow?.symbol ?? activeSymbol}
                          </div>
                          <div className="mt-2 flex flex-wrap gap-2">
                            <StatusBadge status={toStatusBadge(activeRow?.state.tone)}>{activeRow?.state.label ?? 'HOLD'}</StatusBadge>
                            <StatusBadge status={toStatusBadge(regime?.tone)}>{regime?.label ?? 'sem dados'}</StatusBadge>
                            {signal?.strength ? <StatusBadge status={toStatusBadge(signal.strength === 'Strong' ? 'success' : activeRow?.state.tone)}>{signal.strength}</StatusBadge> : null}
                          </div>
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={() => navigate(activeRow?.swapsHref ?? buildSwapsHrefFromRadarSymbol(activeSymbol))}
                      className="inline-flex items-center gap-2 rounded-full border px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.16em]"
                      style={{ borderColor: 'rgba(255,140,66,0.18)', color: 'var(--accent-orange)', backgroundColor: 'rgba(255,140,66,0.10)' }}
                    >
                      Abrir swaps
                      <ArrowUpRight className="h-3.5 w-3.5" />
                    </button>
                  </div>

                  <div className="mt-4 text-sm leading-6" style={{ color: 'var(--text-2)' }}>
                    {activeNarrative}
                  </div>

                  <div className="mt-5 grid grid-cols-2 gap-x-4 gap-y-3">
                    {selectedMetrics.map((item) => (
                      <div key={item.label} className="border-b pb-2" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
                        <div className="text-[10px] uppercase tracking-[0.16em]" style={{ color: 'var(--text-3)' }}>
                          {item.label}
                        </div>
                        <div className="mt-1 text-sm font-semibold uppercase tracking-[0.06em]" style={{ color: toneColor(item.tone), fontVariantNumeric: 'tabular-nums' }}>
                          {item.value}
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="mt-4 h-1.5 overflow-hidden rounded-full" style={{ backgroundColor: 'rgba(255,255,255,0.06)' }}>
                    <div className="h-full rounded-full" style={{ width: scoreToWidth(activeRow?.score), backgroundColor: toneColor(activeRow?.state.tone) }} />
                  </div>

                  <div className="mt-5 flex flex-wrap gap-2">
                    {primaryAction ? (
                      <button
                        onClick={() => navigate(primaryAction.href)}
                        className="inline-flex items-center gap-2 rounded-full border px-4 py-2.5 text-sm font-medium"
                        style={{ borderColor: 'rgba(255,255,255,0.08)', color: 'var(--text-1)', backgroundColor: 'rgba(255,255,255,0.03)' }}
                      >
                        {primaryAction.label}
                        <ArrowUpRight className="h-4 w-4" />
                      </button>
                    ) : null}
                    <button
                      onClick={() => navigate(activeRow?.swapsHref ?? buildSwapsHrefFromRadarSymbol(activeSymbol))}
                      className="inline-flex items-center gap-2 rounded-full border px-4 py-2.5 text-sm font-semibold uppercase tracking-[0.14em]"
                      style={{ borderColor: 'rgba(255,140,66,0.18)', color: 'var(--accent-orange)', backgroundColor: 'rgba(255,140,66,0.08)' }}
                    >
                      executar com USDT
                      <ArrowUpRight className="h-4 w-4" />
                    </button>
                  </div>
                </section>

                <section className="border-t pt-5" style={{ borderColor: 'rgba(255,255,255,0.08)' }}>
                  <div className="flex items-center gap-2 text-sm font-medium" style={{ color: 'var(--text-1)' }}>
                    <ShieldAlert className="h-4 w-4" style={{ color: toneColor(executionRisk?.tone) }} />
                    trilho sugerido
                  </div>
                  <div className="mt-3 text-lg font-semibold" style={{ color: 'var(--text-1)' }}>
                    {nextAction?.title ?? 'Contexto antes da execucao.'}
                  </div>
                  <div className="mt-2 text-sm leading-6" style={{ color: 'var(--text-2)' }}>
                    {nextAction?.summary ?? 'Leia o campo, escolha o ativo e so depois valide trilho, risco e execucao.'}
                  </div>

                  <div className="mt-4 space-y-2">
                    {(nextAction?.actions ?? []).slice(0, 3).map((action, index) => (
                      <button
                        key={`${action.label}-${action.href}`}
                        onClick={() => navigate(action.href)}
                        className="flex w-full items-center justify-between border-b py-3 text-left transition-colors hover:text-white"
                        style={{ borderColor: 'rgba(255,255,255,0.06)', color: action.recommended ? 'var(--text-1)' : 'var(--text-2)' }}
                      >
                        <div>
                          <div className="text-[10px] uppercase tracking-[0.16em]" style={{ color: action.recommended ? 'var(--accent-orange)' : 'var(--text-3)' }}>
                            {String(index + 1).padStart(2, '0')} · {action.kind}
                          </div>
                          <div className="mt-1 text-sm font-medium">{action.label}</div>
                        </div>
                        <ArrowUpRight className="h-4 w-4 shrink-0" />
                      </button>
                    ))}
                  </div>
                </section>

                <section className="border-t pt-5" style={{ borderColor: 'rgba(255,255,255,0.08)' }}>
                  <div className="text-[11px] uppercase tracking-[0.18em]" style={{ color: 'var(--text-3)' }}>
                    friccao de execucao
                  </div>
                  <div className="mt-2 text-sm leading-6" style={{ color: 'var(--text-2)' }}>
                    {executionRisk?.summary ?? 'Sem leitura suficiente para qualificar a friccao de execucao nesta janela.'}
                  </div>
                  {(executionRisk?.blockers ?? []).slice(0, 3).map((blocker) => (
                    <div key={blocker} className="mt-3 flex items-start gap-2 text-sm" style={{ color: 'var(--text-2)' }}>
                      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" style={{ color: 'var(--warn-amber)' }} />
                      <span>{blocker}</span>
                    </div>
                  ))}
                </section>
              </aside>
            </section>
          )}
        </div>
      </div>
    </div>
  );
}

function OverviewMetric({ label, value, tone }: { label: string; value: string; tone?: Tone }) {
  return (
    <div
      className="rounded-[22px] px-3 py-3"
      style={{
        backgroundColor: 'rgba(255,255,255,0.018)',
        boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.06)',
      }}
    >
      <div className="text-[10px] uppercase tracking-[0.16em]" style={{ color: 'var(--text-3)' }}>
        {label}
      </div>
      <div className="mt-2 text-sm font-semibold uppercase tracking-[0.06em]" style={{ color: tone ? toneColor(tone) : 'var(--text-1)' }}>
        {value}
      </div>
    </div>
  );
}

function SignalStrip({
  title,
  icon: Icon,
  entries,
  activeSymbol,
  onSelect,
  renderMeta,
  renderValue,
  toneResolver,
  emptyMessage,
}: {
  title: string;
  icon: typeof Activity;
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
  renderMeta: (entry: { symbol: string; score: number; liquidityLabel: string; volume: string | number; change24h: number }) => string;
  renderValue: (entry: { symbol: string; state: { label: string; tone: Tone }; liquidityLabel: string; volume: string | number; change24h: number }) => string;
  toneResolver: (entry: { state: { tone: Tone } }) => Tone;
  emptyMessage?: string;
}) {
  return (
    <section className="border-t pt-4" style={{ borderColor: 'rgba(255,255,255,0.08)' }}>
      <div className="mb-3 flex items-center gap-2 text-[11px] uppercase tracking-[0.18em]" style={{ color: 'var(--text-3)' }}>
        <Icon className="h-3.5 w-3.5" />
        {title}
      </div>

      {entries.length > 0 ? (
        <div className="space-y-0">
          {entries.map((entry) => {
            const active = entry.symbol === activeSymbol;
            return (
              <button
                key={entry.symbol}
                onClick={() => onSelect(entry.symbol)}
                className="flex w-full items-center justify-between gap-3 border-b py-3 text-left transition-colors hover:text-white"
                style={{ borderColor: 'rgba(255,255,255,0.06)', color: active ? 'var(--accent-orange)' : 'var(--text-2)' }}
              >
                <div className="min-w-0">
                  <div className="text-sm font-medium uppercase tracking-[0.12em]" style={{ color: active ? 'var(--accent-orange)' : 'var(--text-1)' }}>
                    {entry.symbol}
                  </div>
                  <div className="mt-1 text-[10px] uppercase tracking-[0.16em]" style={{ color: 'var(--text-3)' }}>
                    {renderMeta(entry)}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-[11px] uppercase tracking-[0.16em]" style={{ color: toneColor(toneResolver(entry)), fontVariantNumeric: 'tabular-nums' }}>
                    {renderValue(entry)}
                  </div>
                  <div className="mt-2 h-1 w-16 overflow-hidden rounded-full" style={{ backgroundColor: 'rgba(255,255,255,0.06)' }}>
                    <div className="h-full rounded-full" style={{ width: scoreToWidth(entry.score), backgroundColor: toneColor(entry.state.tone) }} />
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      ) : (
        <div className="text-sm" style={{ color: 'var(--text-2)' }}>
          {emptyMessage ?? 'Nenhum ativo disponivel nesta faixa.'}
        </div>
      )}
    </section>
  );
}
