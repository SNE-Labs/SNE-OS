import { useEffect, useMemo, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { Activity, AlertTriangle, ArrowUpRight, MoveRight, RefreshCw, ShieldAlert, Waves } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';

import { ModuleStateCard } from '../components/sne/ModuleStateCard';
import { StatusBadge } from '../components/sne/StatusBadge';
import { IntelEntityIcon } from '../components/IntelEntityIcon';
import { useRadarOverview } from '../../hooks/useRadarData';
import { resolveModuleState } from '../../lib/moduleState';
import { getRadarAssetBySymbol, mergeRadarUniverse } from '../../lib/assets/registry';
import { useSeoMeta } from '@/lib/seo/useSeoMeta';
import { buildSwapsHrefFromRadarSymbol } from '../components/swaps/radarSwapPrefill';

type Tone = 'active' | 'success' | 'warning' | 'pending';

type RadarRow = {
  symbol: string;
  price: number;
  change24h: number;
  volume: string | number;
  score: number;
  state: { label: string; tone: Tone };
  liquidityLabel: string;
  confidenceLabel: string;
  confidenceTone: Tone;
  swapAvailability: 'ready' | 'proxy';
  executionHint: string;
  swapsHref: string;
};

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
const normalizeScore = (score?: number) => {
  const value = Number(score ?? 0);
  if (!Number.isFinite(value) || value <= 0) return 0;
  return value <= 1 ? value * 100 : value;
};
const formatScore = (score?: number) => {
  const normalized = normalizeScore(score);
  if (normalized >= 10) return normalized.toFixed(0);
  if (normalized > 0) return normalized.toFixed(1);
  return '0';
};
const formatSignalStrength = (value?: string | null) => {
  const normalized = (value ?? '').trim().toLowerCase();
  if (!normalized) return undefined;
  if (normalized.includes('moder')) return 'moderada';
  if (normalized.includes('strong')) return 'forte';
  if (normalized.includes('weak')) return 'fraca';
  return value ?? undefined;
};
const scoreToWidth = (score?: number) => `${Math.max(12, Math.min(100, (normalizeScore(score) / 30) * 100))}%`;
const deriveState = (change24h: number, score: number) => (score >= 22 || change24h >= 0.025 ? { label: 'BUY', tone: 'success' as const } : score <= 8 || change24h <= -0.02 ? { label: 'AVOID', tone: 'warning' as const } : { label: 'HOLD', tone: 'pending' as const });
const deriveLiquidity = (rank: number, volume: number) => (rank >= 0 && rank < 2 ? 'forte' : rank >= 0 && rank < 5 ? 'media' : volume > 100_000_000 ? 'media' : 'leve');

export function Radar() {
  const navigate = useNavigate();
  const { symbol: routeSymbol } = useParams();
  const normalizedRouteSymbol = (routeSymbol || 'ETHUSDT').replace('/', '').toUpperCase();
  const [querySymbol] = useState(() => normalizedRouteSymbol);
  const [pinnedSymbol, setPinnedSymbol] = useState(normalizedRouteSymbol);
  const [hoveredSymbol, setHoveredSymbol] = useState<string | null>(null);
  const stableOrderRef = useRef<string[]>([]);

  useEffect(() => {
    setPinnedSymbol(normalizedRouteSymbol);
  }, [normalizedRouteSymbol]);

  const overviewQuery = useRadarOverview(querySymbol, '24H');
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
  const quickSelection = useMemo(
    () => mergeRadarUniverse(movers),
    [movers]
  );

  const radarTitleSymbol = pinnedSymbol || focusAsset?.symbol || querySymbol;
  const radarCanonicalPath = radarTitleSymbol ? `/radar/${radarTitleSymbol.toLowerCase()}` : '/radar';
  const radarDescription = `Radar do SNE OS com regime, liquidez, friccao de execucao e campo estavel de ativos antes da execucao.`;

  useSeoMeta({
    title: `${radarTitleSymbol} Radar | SNE OS`,
    description: radarDescription,
    canonicalPath: radarCanonicalPath,
    type: 'website',
    keywords: ['crypto radar', 'market field', radarTitleSymbol, 'execution risk', 'market regime', 'liquidity'],
    structuredData: { '@context': 'https://schema.org', '@type': 'Dataset', name: `${radarTitleSymbol} Radar | SNE OS`, description: radarDescription, url: `https://snelabs.space${radarCanonicalPath}` },
  });

  const rows = useMemo(() => {
    const momentumMap = new Map(momentumRanking.map((entry) => [entry.symbol, entry]));
    const liquidityMap = new Map(liquidityRanking.map((entry, index) => [entry.symbol, index]));
    const rawRows: RadarRow[] = quickSelection.map((item) => {
      const asset = getRadarAssetBySymbol(item.symbol);
      const rankedScore = normalizeScore(momentumMap.get(item.symbol)?.score ?? Math.max(0, Math.round(Math.abs(item.change24h) * 1000)));
      const focusConfidence = item.symbol === focusAsset?.symbol ? focusAsset.confidence : undefined;
      const focusLiquidity = item.symbol === focusAsset?.symbol ? focusAsset.liquidity : undefined;
      const focusScore = normalizeScore(focusAsset?.score);
      const score = item.symbol === focusAsset?.symbol ? Math.max(rankedScore, focusScore) : rankedScore;
      const state = deriveState(Number(item.change24h ?? 0), score);
      const liquidityRank = liquidityMap.get(item.symbol) ?? -1;
      const liquidityLabel = focusLiquidity?.label?.toLowerCase() ?? deriveLiquidity(liquidityRank, Number(item.volume));
      const confidenceLabel = focusConfidence?.label ?? (state.label === 'BUY' ? 'conviccao alta' : state.label === 'AVOID' ? 'conviccao baixa' : 'aguardando');
      const confidenceTone = focusConfidence?.tone ?? state.tone;

      return {
        ...item,
        score,
        state,
        liquidityLabel,
        confidenceLabel,
        confidenceTone,
        swapAvailability: asset?.swapAvailability ?? 'proxy',
        executionHint: asset?.executionHint ?? 'Execucao via rota de swap em preparacao.',
        swapsHref: buildSwapsHrefFromRadarSymbol(item.symbol),
      };
    });

    for (const row of rawRows) {
      if (!stableOrderRef.current.includes(row.symbol)) {
        stableOrderRef.current.push(row.symbol);
      }
    }

    const orderMap = new Map(stableOrderRef.current.map((symbol, index) => [symbol, index]));
    return rawRows.sort((left, right) => (orderMap.get(left.symbol) ?? 999) - (orderMap.get(right.symbol) ?? 999));
  }, [focusAsset, liquidityRanking, momentumRanking, quickSelection]);

  const pinnedRow = rows.find((row) => row.symbol === pinnedSymbol) ?? rows[0];
  const hoveredRow = rows.find((row) => row.symbol === hoveredSymbol);
  const detailRow = hoveredRow ?? pinnedRow;
  const fieldRows = rows.slice(0, 10);
  const momentumLane = [...rows].sort((left, right) => right.score - left.score).slice(0, 5);
  const liquidityLane = [...rows].sort((left, right) => Number(right.volume) - Number(left.volume)).slice(0, 5);
  const cautionLane = [...rows].filter((row) => row.state.label !== 'BUY').sort((left, right) => left.score - right.score).slice(0, 4);
  const routeActions = (nextAction?.actions ?? []).slice(0, 3);
  const detailMetrics = [
    { label: 'Preco', value: `$${formatPrice(detailRow?.price ?? 0)}`, tone: 'pending' as Tone },
    { label: '24h', value: formatPercent(detailRow?.change24h ?? 0), tone: (detailRow?.change24h ?? 0) >= 0 ? 'success' as Tone : 'warning' as Tone },
    { label: 'Score', value: formatScore(detailRow?.score), tone: detailRow?.state.tone ?? 'pending' as Tone },
    { label: 'Liquidez', value: detailRow?.liquidityLabel ?? '--', tone: detailRow?.liquidityLabel === 'forte' ? 'success' as Tone : detailRow?.liquidityLabel === 'media' ? 'active' as Tone : 'pending' as Tone },
    { label: 'Confianca', value: detailRow?.confidenceLabel ?? '--', tone: detailRow?.confidenceTone ?? 'pending' as Tone },
    { label: 'Volume', value: `$${compact(Number(detailRow?.volume ?? 0))}`, tone: 'pending' as Tone },
  ];

  function pinSymbol(symbol: string) {
    setPinnedSymbol(symbol);
    setHoveredSymbol(null);
    navigate(`/radar/${symbol.toLowerCase()}`);
  }

  function previewSymbol(symbol: string | null) {
    setHoveredSymbol(symbol);
  }

  return (
    <div className="flex flex-1">
      <div className="flex-1 overflow-y-auto px-6 py-5 xl:px-8">
        <div className="mx-auto max-w-[1540px] space-y-6">
          <section className="border-b pb-4" style={{ borderColor: 'rgba(255,255,255,0.08)' }}>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
                <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.24em]" style={{ color: 'var(--text-2)' }}>
                  <Activity className="h-3.5 w-3.5" style={{ color: 'var(--accent-orange)' }} />
                  <span style={{ color: 'var(--text-1)' }}>Radar</span>
                  <span className={`inline-flex h-2.5 w-2.5 rounded-full ${overviewQuery.isFetching ? 'animate-pulse' : ''}`} style={{ backgroundColor: overviewQuery.isFetching ? 'var(--accent-orange)' : 'var(--ok-green)' }} />
                  <span>{overviewQuery.isFetching ? 'sync' : 'ao vivo'}</span>
                </div>

                <TopStat label="Regime" value={regime?.label ?? 'sem dados'} tone={regime?.tone} />
                <TopStat label="Media 24h" value={formatPercent(regime?.avg_change_24h ?? 0)} tone={(regime?.avg_change_24h ?? 0) >= 0 ? 'success' : 'warning'} />
                <TopStat label="Friccao" value={executionRisk?.label ?? '--'} tone={executionRisk?.tone} />
                <TopStat label="Update" value={formatUpdatedAt(overview?.last_updated)} />
              </div>

              <button
                onClick={() => overviewQuery.refetch()}
                className="inline-flex items-center gap-2 rounded-full px-3 py-2 text-sm font-medium transition-colors hover:bg-white/[0.04]"
                style={{ backgroundColor: 'rgba(255,255,255,0.02)', color: 'var(--text-1)', boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.08)' }}
              >
                <RefreshCw className={`h-4 w-4 ${overviewQuery.isFetching ? 'animate-spin' : ''}`} />
                Atualizar
              </button>
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
            <section className="grid gap-7 xl:grid-cols-[minmax(0,1fr)_320px] xl:items-start">
              <div className="min-w-0 space-y-5">
                <section
                  className="relative overflow-hidden rounded-[30px] px-5 py-5"
                  style={{
                    background:
                      'radial-gradient(circle at 18% 16%, rgba(255,140,66,0.08), transparent 22%), radial-gradient(circle at 80% 24%, rgba(62,201,153,0.06), transparent 22%), linear-gradient(180deg, rgba(255,255,255,0.02), rgba(255,255,255,0.008))',
                    boxShadow: 'var(--shadow-1)',
                    border: '1px solid rgba(255,255,255,0.08)',
                  }}
                >
                  <div className="pointer-events-none absolute inset-x-0 top-0 h-px" style={{ background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.16), transparent)' }} />
                  <div className="flex flex-wrap items-end justify-between gap-3">
                    <div>
                      <div className="text-[10px] uppercase tracking-[0.28em]" style={{ color: 'var(--text-3)' }}>
                        campo
                      </div>
                      <div className="mt-2 text-[15px] leading-7" style={{ color: 'var(--text-2)' }}>
                        Visao geral do mercado com selecao direta de ativos.
                      </div>
                    </div>
                    <div className="flex items-center gap-3 text-[10px] uppercase tracking-[0.22em]" style={{ color: 'var(--text-3)' }}>
                      <span>{fieldRows.length} ativos em campo</span>
                      <span style={{ color: 'var(--accent-orange)' }}>{detailRow?.symbol ?? '--'}</span>
                    </div>
                  </div>

                  <div className="mt-5 grid grid-cols-12 auto-rows-[92px] gap-3">
                    {fieldRows.map((row, index) => {
                      const pinned = row.symbol === pinnedRow?.symbol;
                      const preview = row.symbol === hoveredRow?.symbol;
                      return (
                        <motion.button
                          key={row.symbol}
                          layout
                          onMouseEnter={() => previewSymbol(row.symbol)}
                          onMouseLeave={() => previewSymbol(null)}
                          onFocus={() => previewSymbol(row.symbol)}
                          onBlur={() => previewSymbol(null)}
                          onClick={() => pinSymbol(row.symbol)}
                          initial={{ opacity: 0, y: 8 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ duration: 0.22, ease: 'easeOut', delay: index * 0.02 }}
                          className="group relative overflow-hidden rounded-[26px] px-4 py-4 text-left transition-transform duration-200 hover:-translate-y-0.5"
                          style={{
                            gridColumn: 'span 4',
                            gridRow: 'span 2',
                            background: pinned
                              ? 'linear-gradient(135deg, rgba(255,140,66,0.14), rgba(255,255,255,0.03))'
                              : preview
                                ? 'linear-gradient(135deg, rgba(255,255,255,0.08), rgba(255,255,255,0.03))'
                                : 'linear-gradient(135deg, rgba(255,255,255,0.035), rgba(255,255,255,0.015))',
                            border: pinned ? '1px solid rgba(255,140,66,0.18)' : preview ? '1px solid rgba(255,255,255,0.12)' : '1px solid rgba(255,255,255,0.08)',
                            boxShadow: pinned ? '0 18px 50px rgba(0,0,0,0.18)' : 'none',
                          }}
                        >
                          <div className="absolute inset-x-0 top-0 h-px" style={{ backgroundColor: toneColor(row.state.tone), opacity: 0.65 }} />
                          <div className="flex h-full flex-col justify-between gap-4">
                            <div className="flex items-start justify-between gap-3">
                              <div className="min-w-0">
                                <div className="flex items-center gap-2">
                                  <IntelEntityIcon symbol={toEntitySymbol(row.symbol)} className="flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl" style={{ backgroundColor: 'rgba(255,255,255,0.05)' }} iconClassName="h-4.5 w-4.5" />
                                  <div className="min-w-0">
                                    <div className="text-[16px] font-semibold uppercase tracking-[0.12em]" style={{ color: 'var(--text-1)' }}>
                                      {row.symbol}
                                    </div>
                                  <div className="mt-1 text-[10px] uppercase tracking-[0.16em]" style={{ color: 'var(--text-3)' }}>
                                      {row.liquidityLabel} · {row.confidenceLabel}
                                    </div>
                                  </div>
                                </div>
                              </div>
                              <StatusBadge status={toStatusBadge(row.state.tone)}>{row.state.label}</StatusBadge>
                            </div>

                            <div className="flex items-end justify-between gap-3">
                              <div>
                                <div className="text-[24px] font-semibold leading-none" style={{ color: 'var(--text-1)', fontVariantNumeric: 'tabular-nums' }}>
                                  {formatPercent(row.change24h)}
                                </div>
                                <div className="mt-2 text-sm" style={{ color: 'var(--text-2)', fontVariantNumeric: 'tabular-nums' }}>
                                  ${formatPrice(row.price)}
                                </div>
                              </div>
                              <div className="text-right text-[11px] uppercase tracking-[0.16em]" style={{ color: 'var(--text-3)', fontVariantNumeric: 'tabular-nums' }}>
                                <div>score {formatScore(row.score)}</div>
                                <div className="mt-1">vol ${compact(Number(row.volume))}</div>
                                <div className="mt-2 h-1.5 w-20 overflow-hidden rounded-full" style={{ backgroundColor: 'rgba(255,255,255,0.06)' }}>
                                  <div className="h-full rounded-full" style={{ width: scoreToWidth(row.score), backgroundColor: toneColor(row.state.tone) }} />
                                </div>
                              </div>
                            </div>
                          </div>
                        </motion.button>
                      );
                    })}
                  </div>
                </section>

                <section className="grid gap-6 md:grid-cols-3">
                  <StripList
                    title="fluxo mais liquido"
                    icon={Activity}
                    entries={liquidityLane}
                    activeSymbol={detailRow?.symbol}
                    onPreview={previewSymbol}
                    onPin={pinSymbol}
                    meta={(entry) => `vol $${compact(Number(entry.volume))}`}
                    value={(entry) => formatPercent(entry.change24h)}
                  />
                  <StripList
                    title="pulso de momentum"
                    icon={Waves}
                    entries={momentumLane}
                    activeSymbol={detailRow?.symbol}
                    onPreview={previewSymbol}
                    onPin={pinSymbol}
                    meta={(entry) => `score ${formatScore(entry.score)}`}
                    value={(entry) => entry.state.label}
                  />
                  <StripList
                    title="zona de cautela"
                    icon={ShieldAlert}
                    entries={cautionLane}
                    activeSymbol={detailRow?.symbol}
                    onPreview={previewSymbol}
                    onPin={pinSymbol}
                    meta={(entry) => `score ${formatScore(entry.score)} · liq ${entry.liquidityLabel}`}
                    value={(entry) => entry.state.label}
                    emptyMessage="Nenhum ativo entrou em zona de cautela nesta janela."
                  />
                </section>
              </div>

              <aside className="space-y-5 xl:sticky xl:top-5">
                <section
                  className="overflow-hidden rounded-[28px] px-5 py-5"
                      style={{
                    background: hoveredRow
                      ? 'linear-gradient(180deg, rgba(255,255,255,0.06), rgba(255,255,255,0.018) 44%, rgba(255,255,255,0.01))'
                      : 'linear-gradient(180deg, rgba(255,140,66,0.08), rgba(255,255,255,0.02) 44%, rgba(255,255,255,0.01))',
                    border: hoveredRow ? '1px solid rgba(255,255,255,0.12)' : '1px solid rgba(255,255,255,0.08)',
                    boxShadow: 'var(--shadow-1)',
                  }}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="text-[10px] uppercase tracking-[0.24em]" style={{ color: 'var(--text-3)' }}>
                        ativo em leitura
                      </div>
                      <div className="mt-3 flex items-center gap-3">
                        <IntelEntityIcon symbol={toEntitySymbol(detailRow?.symbol)} className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[18px]" style={{ backgroundColor: 'rgba(255,255,255,0.06)' }} iconClassName="h-6 w-6" />
                        <div>
                          <div className="text-[28px] font-semibold leading-none" style={{ color: 'var(--text-1)' }}>
                            {detailRow?.symbol ?? '--'}
                          </div>
                          <div className="mt-2 flex flex-wrap gap-2">
                            <StatusBadge status={toStatusBadge(detailRow?.state.tone)}>{detailRow?.state.label ?? 'HOLD'}</StatusBadge>
                            {signal?.strength ? <StatusBadge status={toStatusBadge(detailRow?.state.tone)}>{formatSignalStrength(signal.strength)}</StatusBadge> : null}
                          </div>
                        </div>
                      </div>
                    </div>

                    <button
                      onClick={() => navigate(detailRow?.swapsHref ?? buildSwapsHrefFromRadarSymbol(detailRow?.symbol))}
                      className="inline-flex items-center gap-2 rounded-full px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.16em]"
                      style={{ color: 'var(--accent-orange)', backgroundColor: 'rgba(255,140,66,0.10)', boxShadow: 'inset 0 0 0 1px rgba(255,140,66,0.18)' }}
                    >
                      {detailRow?.swapAvailability === 'proxy' ? 'Abrir rota proxy' : 'Abrir swaps'}
                      <ArrowUpRight className="h-3.5 w-3.5" />
                    </button>
                  </div>

                  <div className="mt-4 text-sm leading-6" style={{ color: 'var(--text-2)' }}>
                    Preco, variacao, score, liquidez e volume do ativo selecionado.
                  </div>

                  <div className="mt-3 text-sm leading-6" style={{ color: 'var(--text-3)' }}>
                    {detailRow?.executionHint ?? 'Execucao em rota de swap suportada.'}
                  </div>

                  <div className="mt-5 grid grid-cols-2 gap-x-4 gap-y-3">
                    {detailMetrics.map((metric) => (
                      <div key={metric.label} className="border-b pb-2" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
                        <div className="text-[10px] uppercase tracking-[0.16em]" style={{ color: 'var(--text-3)' }}>
                          {metric.label}
                        </div>
                        <div className="mt-1 text-sm font-semibold uppercase tracking-[0.06em]" style={{ color: toneColor(metric.tone), fontVariantNumeric: 'tabular-nums' }}>
                          {metric.value}
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="mt-4 h-1.5 overflow-hidden rounded-full" style={{ backgroundColor: 'rgba(255,255,255,0.06)' }}>
                    <div className="h-full rounded-full" style={{ width: scoreToWidth(detailRow?.score), backgroundColor: toneColor(detailRow?.state.tone) }} />
                  </div>
                </section>

                <section className="border-t pt-4" style={{ borderColor: 'rgba(255,255,255,0.08)' }}>
                  <div className="mb-2 flex items-center gap-2 text-sm font-medium" style={{ color: 'var(--text-1)' }}>
                    <MoveRight className="h-4 w-4" style={{ color: 'var(--accent-orange)' }} />
                    Trilho sugerido
                  </div>
                  <div className="text-sm leading-6" style={{ color: 'var(--text-2)' }}>
                    {nextAction?.summary ?? 'Leia o campo, fixe o ativo que vale aprofundar e depois valide o trilho de execucao.'}
                  </div>

                  <div className="mt-4 space-y-1">
                    {routeActions.map((action, index) => (
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

                <section className="border-t pt-4" style={{ borderColor: 'rgba(255,255,255,0.08)' }}>
                  <div className="mb-2 flex items-center gap-2 text-sm font-medium" style={{ color: 'var(--text-1)' }}>
                    <ShieldAlert className="h-4 w-4" style={{ color: toneColor(executionRisk?.tone) }} />
                    Friccao de execucao
                  </div>
                  <div className="text-sm leading-6" style={{ color: 'var(--text-2)' }}>
                    {executionRisk?.summary ?? 'Sem leitura suficiente para qualificar a friccao de execucao.'}
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

function TopStat({ label, value, tone }: { label: string; value: string; tone?: Tone }) {
  return (
    <div className="text-[11px] uppercase tracking-[0.18em]" style={{ color: 'var(--text-3)' }}>
      {label} <span style={{ color: tone ? toneColor(tone) : 'var(--text-1)' }}>{value}</span>
    </div>
  );
}

function StripList({
  title,
  icon: Icon,
  entries,
  activeSymbol,
  onPreview,
  onPin,
  meta,
  value,
  emptyMessage,
}: {
  title: string;
  icon: typeof Activity;
  entries: RadarRow[];
  activeSymbol?: string;
  onPreview: (symbol: string | null) => void;
  onPin: (symbol: string) => void;
  meta: (entry: RadarRow) => string;
  value: (entry: RadarRow) => string;
  emptyMessage?: string;
}) {
  return (
    <section className="border-t pt-4" style={{ borderColor: 'rgba(255,255,255,0.08)' }}>
      <div className="mb-3 flex items-center gap-2 text-[10px] uppercase tracking-[0.24em]" style={{ color: 'var(--text-3)' }}>
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
                onMouseEnter={() => onPreview(entry.symbol)}
                onMouseLeave={() => onPreview(null)}
                onFocus={() => onPreview(entry.symbol)}
                onBlur={() => onPreview(null)}
                onClick={() => onPin(entry.symbol)}
                className="flex w-full items-center justify-between gap-3 border-b py-3 text-left transition-colors hover:text-white"
                style={{ borderColor: 'rgba(255,255,255,0.06)', color: active ? 'var(--accent-orange)' : 'var(--text-2)' }}
              >
                <div className="min-w-0">
                  <div className="text-sm font-medium uppercase tracking-[0.12em]" style={{ color: active ? 'var(--accent-orange)' : 'var(--text-1)' }}>
                    {entry.symbol}
                  </div>
                  <div className="mt-1 text-[10px] uppercase tracking-[0.16em]" style={{ color: 'var(--text-3)' }}>
                    {meta(entry)}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-[11px] uppercase tracking-[0.16em]" style={{ color: toneColor(entry.state.tone), fontVariantNumeric: 'tabular-nums' }}>
                    {value(entry)}
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
