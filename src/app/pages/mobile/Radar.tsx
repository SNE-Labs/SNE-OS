import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Activity, AlertTriangle, ArrowUpRight, MoveRight, RefreshCw, ShieldAlert, Waves } from 'lucide-react';
import { useAccount } from 'wagmi';

import { Badge, EmptyState, ErrorState, MobileButton, MobilePageShell, SurfaceCard } from '../../components/mobile';
import { IntelEntityIcon } from '../../components/IntelEntityIcon';
import { useRadarOverview } from '../../../hooks/useRadarData';
import { useKeysEntitlement } from '../../../hooks/useKeysEntitlement';
import { getRadarAssetBySymbol, mergeRadarUniverse } from '../../../lib/assets/registry';
import { useSeoMeta } from '@/lib/seo/useSeoMeta';
import { formatAddress } from '@/utils/format';
import { buildSwapsHrefFromRadarSymbol } from '../../components/swaps/radarSwapPrefill';

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
const toBadgeVariant = (tone?: Tone): 'success' | 'warning' | 'neutral' | 'orange' => (tone === 'success' ? 'success' : tone === 'warning' ? 'warning' : tone === 'active' ? 'orange' : 'neutral');
const toneColor = (tone?: Tone) => (tone === 'success' ? 'var(--success)' : tone === 'warning' ? 'var(--warn-amber)' : tone === 'active' ? 'var(--accent-orange)' : 'var(--text-2)');
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

export function MobileRadar() {
  const navigate = useNavigate();
  const { address, isConnected } = useAccount();
  const entitlementQuery = useKeysEntitlement(isConnected && address ? address : null);
  const entitlement = entitlementQuery.data;
  const { symbol: routeSymbol } = useParams();
  const normalizedRouteSymbol = (routeSymbol || 'ETHUSDT').replace('/', '').toUpperCase();
  const [querySymbol] = useState(() => normalizedRouteSymbol);
  const [pinnedSymbol, setPinnedSymbol] = useState(normalizedRouteSymbol);
  const stableOrderRef = useRef<string[]>([]);

  useEffect(() => {
    setPinnedSymbol(normalizedRouteSymbol);
  }, [normalizedRouteSymbol]);

  const overviewQuery = useRadarOverview(querySymbol, '24H');
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
  const quickSelection = useMemo(
    () => mergeRadarUniverse(movers),
    [movers]
  );

  const radarTitleSymbol = pinnedSymbol || querySymbol;
  const radarCanonicalPath = radarTitleSymbol ? `/radar/${radarTitleSymbol.toLowerCase()}` : '/radar';

  useSeoMeta({
    title: `${radarTitleSymbol} Radar | SNE OS`,
    description: 'Radar do SNE OS com campo estavel de ativos, leitura de regime e friccao antes da execucao.',
    canonicalPath: radarCanonicalPath,
    type: 'website',
    keywords: ['crypto radar', 'market field', radarTitleSymbol, 'execution risk', 'market regime', 'liquidity'],
    structuredData: { '@context': 'https://schema.org', '@type': 'Dataset', name: `${radarTitleSymbol} Radar | SNE OS`, description: 'Radar do SNE OS com campo estavel de ativos.', url: `https://snelabs.space${radarCanonicalPath}` },
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
  const fieldRows = rows.slice(0, 8);
  const liquidityLane = [...rows].sort((left, right) => Number(right.volume) - Number(left.volume)).slice(0, 4);
  const momentumLane = [...rows].sort((left, right) => right.score - left.score).slice(0, 4);
  const cautionLane = [...rows].filter((row) => row.state.label !== 'BUY').sort((left, right) => left.score - right.score).slice(0, 3);
  const routeActions = (nextAction?.actions ?? []).slice(0, 2);
  const operatorActive = Boolean(entitlement?.effectiveAccess);
  const accessBannerTitle = !isConnected
    ? 'Radar Web em discovery'
    : operatorActive
      ? 'Classe Operator ativa'
      : 'Preview web ativo';
  const accessBannerDescription = !isConnected
    ? 'Conecte a wallet para verificar posse ou delegação válida do Operator Key.'
    : entitlementQuery.isLoading
      ? 'Resolvendo entitlement soberano desta wallet.'
      : operatorActive
        ? entitlement?.delegateWallet
          ? `Esta wallet opera por delegação de ${formatAddress(entitlement.ownerWallet)}.`
          : 'Esta wallet segura o Operator Key diretamente.'
        : 'O Radar Web continua livre. O Operator Key libera a classe Operator no ecossistema.';

  function pinSymbol(symbol: string) {
    setPinnedSymbol(symbol);
    navigate(`/radar/${symbol.toLowerCase()}`);
  }

  return (
    <MobilePageShell title="Radar" subtitle="Campo estavel de ativos antes da execucao." showContext>
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
              Leia o campo antes de puxar um ativo para perto.
            </div>
            <div className="mt-2 text-sm leading-6 text-[var(--text-2)]">
              Visao geral do mercado com selecao direta de ativos.
            </div>
          </div>
          <button onClick={() => overviewQuery.refetch()} className="flex h-10 w-10 items-center justify-center rounded-2xl border border-[var(--stroke-1)] bg-[var(--bg-2)] text-[var(--text-2)]">
            <RefreshCw className={`h-4 w-4 ${overviewQuery.isFetching ? 'animate-spin' : ''}`} />
          </button>
        </div>

        <div className="flex flex-wrap gap-2 text-[10px] uppercase tracking-[0.16em]">
          <Badge variant={toBadgeVariant(regime?.tone)} size="sm">{regime?.label ?? 'sem dados'}</Badge>
          <Badge variant={toBadgeVariant(executionRisk?.tone)} size="sm">{executionRisk?.label ?? 'sem friccao'}</Badge>
          <Badge variant="neutral" size="sm">{formatUpdatedAt(overview?.last_updated)}</Badge>
          <Badge variant="neutral" size="sm">{marketState?.execution ?? 'intel-first'}</Badge>
          <Badge variant={operatorActive ? 'success' : 'neutral'} size="sm">{operatorActive ? 'operator' : 'discovery'}</Badge>
        </div>

      </SurfaceCard>

      <SurfaceCard>
        <div className="mb-2 flex items-center justify-between gap-3">
          <div>
            <div className="text-[10px] uppercase tracking-[0.18em] text-[var(--text-3)]">classe de acesso</div>
            <div className="mt-1 text-[var(--text-1)]">{accessBannerTitle}</div>
          </div>
          <Badge variant={operatorActive ? 'success' : 'neutral'} size="sm">
            {operatorActive ? 'operator' : 'web'}
          </Badge>
        </div>
        <div className="text-sm leading-6 text-[var(--text-2)]">
          {accessBannerDescription}
        </div>
        <MobileButton variant="secondary" className="mt-4 w-full" onClick={() => navigate('/keys')}>
          <ArrowUpRight className="mr-2 h-4 w-4" />
          {operatorActive ? 'Abrir Keys' : 'Resolver Keys'}
        </MobileButton>
      </SurfaceCard>

      {overviewQuery.isLoading && !overview ? (
        <SurfaceCard>
          <div className="text-sm text-[var(--text-2)]">Sincronizando campo...</div>
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
                <div className="text-[10px] uppercase tracking-[0.24em] text-[var(--text-3)]">campo</div>
                <div className="mt-1 text-sm text-[var(--text-2)]">
                  O campo segue estavel; so o detalhe muda quando voce fixa um ativo.
                </div>
              </div>
              <Badge variant="neutral" size="sm">{fieldRows.length}</Badge>
            </div>

            {fieldRows.length === 0 ? (
              <EmptyState title="Sem mercados ao vivo" description="O universo monitorado esta vazio agora." />
            ) : (
              <div className="flex gap-3 overflow-x-auto pb-1">
                {fieldRows.map((row) => {
                  const pinned = row.symbol === pinnedRow?.symbol;
                  return (
                    <button
                      key={row.symbol}
                      onClick={() => pinSymbol(row.symbol)}
                      className="shrink-0 rounded-[22px] p-3 text-left"
                      style={{
                        width: '188px',
                        background: pinned ? 'linear-gradient(135deg, rgba(255,140,66,0.12), rgba(255,255,255,0.03))' : 'var(--bg-2)',
                        boxShadow: pinned ? 'inset 0 0 0 1px rgba(255,140,66,0.18)' : 'inset 0 0 0 1px rgba(255,255,255,0.08)',
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
                        <Badge variant={toBadgeVariant(row.state.tone)} size="sm">{row.state.label}</Badge>
                      </div>

                      <div className="text-base text-[var(--text-1)]" style={{ fontVariantNumeric: 'tabular-nums' }}>
                        {formatPercent(row.change24h)}
                      </div>
                      <div className="mt-1 text-xs text-[var(--text-2)]" style={{ fontVariantNumeric: 'tabular-nums' }}>
                        ${formatPrice(row.price)}
                      </div>
                      <div className="mt-3 flex items-center justify-between gap-2 text-[10px] uppercase tracking-[0.14em] text-[var(--text-3)]">
                        <span>score {formatScore(row.score)}</span>
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
            <div className="mb-3 text-[10px] uppercase tracking-[0.24em] text-[var(--text-3)]">ativo em leitura</div>
            <div className="mb-4 flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="flex items-center gap-3">
                  <IntelEntityIcon symbol={toEntitySymbol(pinnedRow?.symbol)} className="flex h-11 w-11 items-center justify-center rounded-2xl" style={{ backgroundColor: 'rgba(255,255,255,0.06)' }} iconClassName="h-5 w-5" />
                  <div className="min-w-0">
                    <div className="truncate text-lg text-[var(--text-1)]">{pinnedRow?.symbol ?? '--'}</div>
                    <div className="mt-1 text-sm text-[var(--text-2)]">
                      {pinnedRow?.confidenceLabel ?? '--'} · liq {pinnedRow?.liquidityLabel ?? '--'}
                    </div>
                  </div>
                </div>
              </div>
              <Badge variant={toBadgeVariant(pinnedRow?.state.tone)} size="sm">{pinnedRow?.state.label ?? 'HOLD'}</Badge>
            </div>

            <div className="grid grid-cols-3 gap-3 text-sm" style={{ fontVariantNumeric: 'tabular-nums' }}>
              <div>
                <div className="mb-1 text-[10px] uppercase text-[var(--text-3)]">preco</div>
                <div className="text-[var(--text-1)]">${formatPrice(pinnedRow?.price ?? 0)}</div>
              </div>
              <div>
                <div className="mb-1 text-[10px] uppercase text-[var(--text-3)]">24h</div>
                <div className={(pinnedRow?.change24h ?? 0) >= 0 ? 'text-[var(--success)]' : 'text-[var(--danger)]'}>
                  {formatPercent(pinnedRow?.change24h ?? 0)}
                </div>
              </div>
              <div>
                <div className="mb-1 text-[10px] uppercase text-[var(--text-3)]">score</div>
                <div className="text-[var(--text-1)]">{formatScore(pinnedRow?.score)}</div>
              </div>
            </div>

            <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/10">
              <div className="h-full rounded-full" style={{ width: scoreToWidth(pinnedRow?.score), backgroundColor: toneColor(pinnedRow?.state.tone) }} />
            </div>

            <div className="mt-4 text-sm leading-6 text-[var(--text-2)]">
              Preco, variacao, score, liquidez e volume do ativo selecionado.
            </div>

            <div className="mt-4 space-y-3">
              {routeActions.map((action) => (
                <MobileButton key={`${action.label}-${action.href}`} variant="secondary" className="w-full justify-between" onClick={() => navigate(action.href)}>
                  <span>{action.label}</span>
                  <ArrowUpRight className="h-4 w-4" />
                </MobileButton>
              ))}
              <MobileButton variant="primary" className="w-full justify-between" onClick={() => navigate(pinnedRow?.swapsHref ?? buildSwapsHrefFromRadarSymbol(pinnedRow?.symbol))}>
                <span>{pinnedRow?.swapAvailability === 'proxy' ? 'Abrir rota proxy' : 'Executar com USDT'}</span>
                <ArrowUpRight className="h-4 w-4" />
              </MobileButton>
            </div>

            <div className="mt-4 text-sm leading-6 text-[var(--text-3)]">
              {pinnedRow?.executionHint ?? 'Execucao em rota de swap suportada.'}
            </div>

            <div className="mt-5 border-t pt-4" style={{ borderColor: 'rgba(255,255,255,0.08)' }}>
              <Lane title="fluxo mais liquido" icon={Activity} entries={liquidityLane} activeSymbol={pinnedRow?.symbol} onPin={pinSymbol} rightValue={(entry) => `$${compact(Number(entry.volume))}`} meta={(entry) => entry.liquidityLabel} />
              <Lane title="pulso de momentum" icon={Waves} entries={momentumLane} activeSymbol={pinnedRow?.symbol} onPin={pinSymbol} rightValue={(entry) => formatPercent(entry.change24h)} meta={(entry) => `score ${formatScore(entry.score)}`} />
              <Lane title="zona de cautela" icon={ShieldAlert} entries={cautionLane} activeSymbol={pinnedRow?.symbol} onPin={pinSymbol} rightValue={(entry) => entry.state.label} meta={(entry) => `score ${formatScore(entry.score)}`} emptyMessage="Sem ativos em zona de cautela." />
            </div>

            <div className="mt-5 border-t pt-4" style={{ borderColor: 'rgba(255,255,255,0.08)' }}>
              <div className="mb-2 flex items-center gap-2 text-[var(--text-1)]">
                <MoveRight className="h-4 w-4 text-[var(--accent-orange)]" />
                <span>trilho e friccao</span>
              </div>
              <div className="text-sm text-[var(--text-1)]">{nextAction?.title ?? 'Contexto antes da execucao.'}</div>
              <div className="mt-2 text-sm leading-6 text-[var(--text-2)]">
                {nextAction?.summary ?? executionRisk?.summary ?? 'Fixe o ativo e valide a friccao antes de executar.'}
              </div>

              {(executionRisk?.blockers ?? []).slice(0, 2).map((blocker) => (
                <div key={blocker} className="mt-3 flex items-start gap-2 text-sm text-[var(--text-2)]">
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-[var(--warn-amber)]" />
                  <span>{blocker}</span>
                </div>
              ))}

              {signal?.symbol ? (
                <div className="mt-4 flex flex-wrap gap-2">
                  <Badge variant={toBadgeVariant(pinnedRow?.state.tone)} size="sm">{formatSignalStrength(signal.signal) ?? signal.signal}</Badge>
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

function Lane({
  title,
  icon: Icon,
  entries,
  activeSymbol,
  onPin,
  rightValue,
  meta,
  emptyMessage,
}: {
  title: string;
  icon: typeof Activity;
  entries: RadarRow[];
  activeSymbol?: string;
  onPin: (symbol: string) => void;
  rightValue: (entry: RadarRow) => string;
  meta: (entry: RadarRow) => string;
  emptyMessage?: string;
}) {
  return (
    <div className="mt-4 border-t pt-4" style={{ borderColor: 'rgba(255,255,255,0.08)' }}>
      <div className="mb-2 flex items-center gap-2 text-[10px] uppercase tracking-[0.18em] text-[var(--text-3)]">
        <Icon className="h-3.5 w-3.5" />
        {title}
      </div>
      {entries.length > 0 ? (
        <div className="space-y-2">
          {entries.map((entry) => (
            <button key={entry.symbol} onClick={() => onPin(entry.symbol)} className="flex w-full items-center justify-between gap-3 border-b pb-2 text-left text-sm" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
              <div className="min-w-0">
                <div className={entry.symbol === activeSymbol ? 'text-[var(--accent-orange)]' : 'text-[var(--text-1)]'}>{entry.symbol}</div>
                <div className="mt-1 text-[10px] uppercase tracking-[0.14em] text-[var(--text-3)]">{meta(entry)}</div>
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
