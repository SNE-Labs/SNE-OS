import { useEffect, useState } from 'react';
import { Activity, AlertTriangle, ArrowUpRight, RefreshCw, ShieldAlert, Sparkles, Waves } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';

import { ModuleStateCard } from '../components/sne/ModuleStateCard';
import { StatusBadge } from '../components/sne/StatusBadge';
import { IntelEntityIcon } from '../components/IntelEntityIcon';
import { useRadarOverview } from '../../hooks/useRadarData';
import { resolveModuleState } from '../../lib/moduleState';
import { useSeoMeta } from '@/lib/seo/useSeoMeta';
import { buildSwapsHrefFromRadarSymbol } from '../components/swaps/radarSwapPrefill';

const RADAR_SYMBOLS = ['ETHUSDT', 'BTCUSDT', 'SOLUSDT', 'LINKUSDT', 'AAVEUSDT', 'UNIUSDT'];

function formatPrice(value: number) {
  if (value >= 1000) return value.toLocaleString('en-US', { maximumFractionDigits: 2 });
  if (value >= 1) return value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 4 });
  return value.toLocaleString('en-US', { minimumFractionDigits: 4, maximumFractionDigits: 6 });
}

function compact(value: number) {
  return new Intl.NumberFormat('en-US', {
    notation: 'compact',
    maximumFractionDigits: 1,
  }).format(value);
}

function toEntitySymbol(symbol?: string | null) {
  return (symbol ?? '').replace(/USDT$/i, '') || undefined;
}

function formatUpdatedAt(value?: string) {
  if (!value) return '--';
  try {
    return new Intl.DateTimeFormat('pt-BR', {
      hour: '2-digit',
      minute: '2-digit',
      day: '2-digit',
      month: '2-digit',
    }).format(new Date(value));
  } catch {
    return '--';
  }
}

function toStatusBadge(status?: 'active' | 'success' | 'warning' | 'pending') {
  if (status === 'success') return 'success';
  if (status === 'warning') return 'warning';
  if (status === 'active') return 'active';
  return 'pending';
}

function toneStyles(tone?: 'active' | 'success' | 'warning' | 'pending') {
  if (tone === 'success') {
    return {
      color: 'var(--ok-green)',
      backgroundColor: 'rgba(34,197,94,0.10)',
      borderColor: 'rgba(34,197,94,0.16)',
    };
  }
  if (tone === 'warning') {
    return {
      color: 'var(--warn-amber)',
      backgroundColor: 'rgba(255,176,32,0.10)',
      borderColor: 'rgba(255,176,32,0.18)',
    };
  }
  if (tone === 'active') {
    return {
      color: 'var(--accent-orange)',
      backgroundColor: 'rgba(255,140,66,0.10)',
      borderColor: 'rgba(255,140,66,0.18)',
    };
  }

  return {
    color: 'var(--text-3)',
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderColor: 'rgba(255,255,255,0.08)',
  };
}

function actionStyles(tone: 'accent' | 'neutral', recommended: boolean) {
  if (tone === 'accent') {
    return {
      backgroundColor: 'rgba(255,140,66,0.10)',
      borderColor: 'rgba(255,140,66,0.18)',
      color: 'var(--accent-orange)',
      boxShadow: recommended ? 'inset 0 0 0 1px rgba(255,140,66,0.18)' : 'none',
    };
  }

  return {
    backgroundColor: 'var(--bg-3)',
    borderColor: recommended ? 'rgba(255,255,255,0.14)' : 'var(--stroke-1)',
    color: 'var(--text-1)',
    boxShadow: 'none',
  };
}

function ToneMetric({
  label,
  value,
  detail,
  tone,
}: {
  label: string;
  value: string;
  detail?: string;
  tone?: 'active' | 'success' | 'warning' | 'pending';
}) {
  return (
    <div
      className="rounded-2xl p-3"
      style={{ backgroundColor: 'var(--bg-3)', borderWidth: '1px', borderColor: 'var(--stroke-1)' }}
    >
      <div className="mb-1 text-[11px] uppercase tracking-[0.16em]" style={{ color: 'var(--text-3)' }}>
        {label}
      </div>
      <div className="font-semibold mb-1" style={{ color: 'var(--text-1)' }}>
        {value}
      </div>
      {detail ? (
        <div className="text-sm leading-6" style={{ color: tone === 'warning' ? 'var(--text-2)' : 'var(--text-2)' }}>
          {detail}
        </div>
      ) : null}
    </div>
  );
}

export function Radar() {
  const navigate = useNavigate();
  const { symbol: routeSymbol } = useParams();
  const normalizedRouteSymbol = (routeSymbol || 'ETHUSDT').replace('/', '').toUpperCase();
  const [activeSymbol, setActiveSymbol] = useState(normalizedRouteSymbol);

  useEffect(() => {
    setActiveSymbol(normalizedRouteSymbol);
  }, [normalizedRouteSymbol]);

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
  const regime = overview?.market_regime;
  const hero = overview?.hero;
  const focusAsset = overview?.focus_asset;
  const signal = overview?.signal;
  const executionRisk = overview?.execution_risk;
  const nextAction = overview?.next_action;
  const momentumRanking = overview?.rankings?.momentum ?? [];
  const liquidityRanking = overview?.rankings?.liquidity ?? [];
  const marketState = overview?.market_state;
  const quickSelection = movers.length > 0 ? movers : RADAR_SYMBOLS.map((symbol) => ({
    symbol,
    price: 0,
    change24h: 0,
    volume: 0,
  }));

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
    structuredData: {
      '@context': 'https://schema.org',
      '@type': 'Dataset',
      name: `${radarTitleSymbol} Radar | SNE OS`,
      description: radarDescription,
      url: `https://snelabs.space${radarCanonicalPath}`,
    },
  });

  return (
    <div className="flex flex-1">
      <div className="flex-1 overflow-y-auto px-6 py-6 xl:px-8">
        <div className="mx-auto max-w-[1480px] space-y-5">
          <section
            className="overflow-hidden rounded-[28px] p-5"
            style={{
              background:
                'radial-gradient(circle at top left, rgba(255,140,66,0.16), transparent 32%), radial-gradient(circle at 85% 18%, rgba(255,255,255,0.07), transparent 22%), linear-gradient(180deg, rgba(255,255,255,0.02), rgba(0,0,0,0.04))',
              backgroundColor: 'var(--bg-2)',
              borderWidth: '1px',
              borderColor: 'var(--stroke-1)',
              boxShadow: 'var(--shadow-1)',
            }}
          >
            <div className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1.18fr)_360px]">
              <div className="min-w-0">
                <div className="mb-3 flex flex-wrap items-center gap-2">
                  <div
                    className="inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs uppercase tracking-[0.18em]"
                    style={{ backgroundColor: 'rgba(255,255,255,0.04)', color: 'var(--text-3)' }}
                  >
                    <Activity className="h-3.5 w-3.5" />
                    Radar
                  </div>
                  <StatusBadge status={toStatusBadge(regime?.tone)}>{regime?.label ?? 'sem dados'}</StatusBadge>
                </div>

                <h1 className="mb-2 text-3xl font-semibold leading-tight" style={{ color: 'var(--text-1)' }}>
                  {hero?.headline ?? 'Regime sem ativo em foco.'}
                </h1>
                <p className="max-w-3xl text-sm leading-6" style={{ color: 'var(--text-2)' }}>
                  {hero?.summary ?? 'O Radar esta sincronizando o universo monitorado antes de sugerir uma decisao.'}
                </p>

                <div className="mt-5 grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
                  {(hero?.metrics ?? []).map((metric) => (
                    <ToneMetric
                      key={`${metric.label}-${metric.value}`}
                      label={metric.label}
                      value={metric.value}
                      detail={metric.detail}
                      tone={metric.tone}
                    />
                  ))}
                </div>
              </div>

              <div
                className="rounded-[24px] p-4"
                style={{
                  backgroundColor: 'rgba(8,10,16,0.28)',
                  borderWidth: '1px',
                  borderColor: 'rgba(255,255,255,0.06)',
                }}
              >
                <div className="mb-3 flex items-center justify-between gap-3">
                  <div>
                    <div className="text-sm font-semibold" style={{ color: 'var(--text-1)' }}>
                      Camada de decisao
                    </div>
                    <div className="text-sm" style={{ color: 'var(--text-2)' }}>
                      Estado operacional antes de qualquer rota.
                    </div>
                  </div>
                  <button
                    onClick={() => overviewQuery.refetch()}
                    className="inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium"
                    style={{
                      backgroundColor: 'var(--bg-2)',
                      color: 'var(--text-1)',
                      borderWidth: '1px',
                      borderColor: 'var(--stroke-1)',
                    }}
                  >
                    <RefreshCw className={`h-4 w-4 ${overviewQuery.isFetching ? 'animate-spin' : ''}`} />
                    Atualizar
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <ToneMetric label="Acesso" value={marketState?.access ?? '--'} />
                  <ToneMetric label="Execucao" value={marketState?.execution ?? '--'} />
                  <ToneMetric label="Janela" value={signal?.timeframe ?? '24H'} />
                  <ToneMetric label="Atualizado" value={formatUpdatedAt(overview?.last_updated)} />
                </div>
              </div>
            </div>
          </section>

          <section className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1.08fr)_400px]">
            <div className="space-y-5">
              <div
                className="rounded-[28px] p-5"
                style={{ backgroundColor: 'var(--bg-2)', borderWidth: '1px', borderColor: 'var(--stroke-1)', boxShadow: 'var(--shadow-1)' }}
              >
                <div className="mb-4 flex items-center justify-between gap-3">
                  <div>
                    <div className="text-sm font-semibold" style={{ color: 'var(--text-2)' }}>
                      Risco de execucao
                    </div>
                    <div className="text-sm" style={{ color: 'var(--text-3)' }}>
                      Este bloco qualifica o quanto a leitura atual suporta uma rota.
                    </div>
                  </div>
                  <StatusBadge status={toStatusBadge(executionRisk?.tone)}>{executionRisk?.label ?? 'sem dados'}</StatusBadge>
                </div>

                {moduleState === 'loading' ? (
                  <ModuleStateCard
                    tone="loading"
                    title="Carregando Radar"
                    description="Buscando regime, ativo em foco e risco de execucao."
                    compact
                  />
                ) : moduleState === 'error' ? (
                  <ModuleStateCard
                    tone="error"
                    title="Falha ao carregar Radar"
                    description="Os dados de mercado nao responderam como esperado."
                    actionLabel="Atualizar"
                    onAction={() => overviewQuery.refetch()}
                    compact
                  />
                ) : moduleState === 'empty' ? (
                  <ModuleStateCard
                    tone="empty"
                    title="Sem mercado disponivel"
                    description="O universo monitorado esta vazio nesta janela."
                    compact
                  />
                ) : (
                  <div className="space-y-4">
                    <div
                      className="rounded-[24px] p-4"
                      style={{ ...toneStyles(executionRisk?.tone), borderWidth: '1px' }}
                    >
                      <div className="mb-2 flex items-center gap-2 text-sm font-semibold">
                        <ShieldAlert className="h-4 w-4" />
                        Risco {executionRisk?.label ?? 'sem dados'}
                      </div>
                      <div className="text-sm leading-6" style={{ color: 'inherit' }}>
                        {executionRisk?.summary ?? 'Sem leitura suficiente para qualificar risco de execucao.'}
                      </div>
                      <div className="mt-3 text-xs uppercase tracking-[0.18em]" style={{ color: 'inherit' }}>
                        score {executionRisk?.score ?? 0}
                      </div>
                    </div>

                    <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                      {(executionRisk?.blockers ?? []).map((blocker) => (
                        <div
                          key={blocker}
                          className="rounded-2xl p-3"
                          style={{ backgroundColor: 'var(--bg-3)', borderWidth: '1px', borderColor: 'var(--stroke-1)' }}
                        >
                          <div className="flex items-start gap-2 text-sm leading-6" style={{ color: 'var(--text-2)' }}>
                            <AlertTriangle className="mt-1 h-4 w-4 shrink-0" style={{ color: 'var(--warn-amber)' }} />
                            <span>{blocker}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div
                className="rounded-[28px] p-5"
                style={{ backgroundColor: 'var(--bg-2)', borderWidth: '1px', borderColor: 'var(--stroke-1)', boxShadow: 'var(--shadow-1)' }}
              >
                <div className="mb-4 flex items-center justify-between gap-3">
                  <div>
                    <div className="text-sm font-semibold" style={{ color: 'var(--text-2)' }}>
                      Ativo em foco
                    </div>
                    <div className="text-sm" style={{ color: 'var(--text-3)' }}>
                      Evidencia principal que sustenta a leitura de regime.
                    </div>
                  </div>
                  {signal ? <StatusBadge status={toStatusBadge(signal.signal === 'BUY' ? 'success' : signal.signal === 'SELL' ? 'warning' : 'pending')}>{signal.signal}</StatusBadge> : null}
                </div>

                {focusAsset ? (
                  <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
                    <div
                      className="rounded-[24px] p-4"
                      style={{ backgroundColor: 'rgba(255,255,255,0.03)', borderWidth: '1px', borderColor: 'rgba(255,255,255,0.06)' }}
                    >
                      <div className="mb-3 flex items-start justify-between gap-3">
                        <div className="flex items-start gap-3">
                          <IntelEntityIcon
                            symbol={toEntitySymbol(focusAsset.symbol)}
                            className="flex h-12 w-12 items-center justify-center rounded-2xl"
                            style={{ backgroundColor: 'rgba(255,255,255,0.06)' }}
                            iconClassName="h-6 w-6"
                          />
                          <div>
                            <div className="text-xs uppercase tracking-[0.16em]" style={{ color: 'var(--text-3)' }}>
                              ativo em foco
                            </div>
                            <div className="text-3xl font-semibold" style={{ color: 'var(--text-1)' }}>
                              {focusAsset.symbol}
                            </div>
                          </div>
                        </div>
                        <div
                          className="rounded-full px-3 py-1 text-sm font-semibold"
                          style={{
                            color: focusAsset.change24h >= 0 ? 'var(--ok-green)' : 'var(--error-red)',
                            backgroundColor: focusAsset.change24h >= 0 ? 'rgba(34,197,94,0.10)' : 'rgba(239,68,68,0.10)',
                          }}
                        >
                          {focusAsset.change24h >= 0 ? '+' : ''}
                          {(focusAsset.change24h * 100).toFixed(2)}%
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <ToneMetric label="Preco" value={`$${formatPrice(focusAsset.price)}`} />
                        <ToneMetric label="Volume" value={`$${compact(Number(focusAsset.volume))}`} />
                        <ToneMetric label="Score" value={String(focusAsset.score)} />
                        <ToneMetric label="Confianca" value={focusAsset.confidence.label} />
                      </div>
                    </div>

                    <div className="space-y-3">
                      <div
                        className="rounded-[24px] p-4"
                        style={{ backgroundColor: 'var(--bg-3)', borderWidth: '1px', borderColor: 'var(--stroke-1)' }}
                      >
                        <div className="mb-2 text-sm font-semibold" style={{ color: 'var(--text-1)' }}>
                          Liquidez
                        </div>
                        <div className="text-sm leading-6" style={{ color: 'var(--text-2)' }}>
                          {focusAsset.liquidity.label} dentro do universo monitorado.
                        </div>
                      </div>
                      <div
                        className="rounded-[24px] p-4"
                        style={{ backgroundColor: 'var(--bg-3)', borderWidth: '1px', borderColor: 'var(--stroke-1)' }}
                      >
                        <div className="mb-2 text-sm font-semibold" style={{ color: 'var(--text-1)' }}>
                          Sinal
                        </div>
                        <div className="text-sm leading-6" style={{ color: 'var(--text-2)' }}>
                          {signal ? `${signal.change} na janela ${signal.timeframe}.` : 'Sem sinal direcional forte nesta janela.'}
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <ModuleStateCard
                    tone="empty"
                    title="Sem ativo em foco"
                    description="O Radar nao retornou um ativo suficientemente liquido para esta janela."
                    compact
                  />
                )}
              </div>
            </div>

            <div className="space-y-5">
              <div
                className="rounded-[28px] p-5"
                style={{ backgroundColor: 'var(--bg-2)', borderWidth: '1px', borderColor: 'var(--stroke-1)', boxShadow: 'var(--shadow-1)' }}
              >
                <div className="mb-4 flex items-center gap-2">
                  <Waves className="h-4 w-4" style={{ color: 'var(--accent-orange)' }} />
                  <div className="text-sm font-semibold" style={{ color: 'var(--text-2)' }}>
                    Proxima acao
                  </div>
                </div>

                <div className="mb-2 text-base font-semibold" style={{ color: 'var(--text-1)' }}>
                  {nextAction?.title ?? 'Contexto antes da execucao.'}
                </div>
                <div className="mb-4 text-sm leading-6" style={{ color: 'var(--text-2)' }}>
                  {nextAction?.summary ?? 'Sem guidance state-based disponivel.'}
                </div>

                <div className="space-y-3">
                  {(nextAction?.actions ?? []).map((action) => (
                    <button
                      key={`${action.label}-${action.href}`}
                      onClick={() => navigate(action.href)}
                      className="flex w-full items-center justify-between rounded-[22px] border px-4 py-3 text-left transition-all"
                      style={actionStyles(action.tone, action.recommended)}
                    >
                      <div className="min-w-0">
                        <div className="mb-1 text-sm font-semibold">{action.label}</div>
                        <div className="text-sm leading-6" style={{ color: action.tone === 'accent' ? 'inherit' : 'var(--text-2)' }}>
                          {action.kind === 'execute'
                            ? `Abrir o rail de execucao com contexto vindo de ${focusAsset?.symbol ?? activeSymbol}.`
                            : action.kind === 'intel'
                              ? 'Abrir a camada editorial para ampliar o contexto antes da rota.'
                              : action.kind === 'observe'
                                ? 'Continuar monitorando o ativo em foco dentro do regime atual.'
                                : 'Suspender a ideia de execucao ate o contexto melhorar.'}
                        </div>
                      </div>
                      <ArrowUpRight className="h-4 w-4 shrink-0" />
                    </button>
                  ))}
                </div>
              </div>

              <div
                className="rounded-[28px] p-5"
                style={{ backgroundColor: 'var(--bg-2)', borderWidth: '1px', borderColor: 'var(--stroke-1)', boxShadow: 'var(--shadow-1)' }}
              >
                <div className="mb-4 flex items-center gap-2">
                  <Sparkles className="h-4 w-4" style={{ color: 'var(--accent-orange)' }} />
                  <div className="text-sm font-semibold" style={{ color: 'var(--text-2)' }}>
                    Regime e foco
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="rounded-[22px] p-4" style={{ backgroundColor: 'var(--bg-3)', borderWidth: '1px', borderColor: 'var(--stroke-1)' }}>
                    <div className="mb-1 text-[11px] uppercase tracking-[0.16em]" style={{ color: 'var(--text-3)' }}>
                      Regime atual
                    </div>
                    <div className="font-semibold" style={{ color: 'var(--text-1)' }}>
                      {regime?.label ?? '--'}
                    </div>
                    <div className="mt-2 text-sm leading-6" style={{ color: 'var(--text-2)' }}>
                      {regime?.summary ?? 'Sem leitura de regime disponivel.'}
                    </div>
                  </div>

                  <div className="rounded-[22px] p-4" style={{ backgroundColor: 'var(--bg-3)', borderWidth: '1px', borderColor: 'var(--stroke-1)' }}>
                    <div className="mb-1 text-[11px] uppercase tracking-[0.16em]" style={{ color: 'var(--text-3)' }}>
                      Ativo em foco
                    </div>
                    <div className="font-semibold" style={{ color: 'var(--text-1)' }}>
                      {focusAsset?.symbol ?? activeSymbol}
                    </div>
                    <div className="mt-2 text-sm leading-6" style={{ color: 'var(--text-2)' }}>
                      {focusAsset
                        ? `Score ${focusAsset.score}, confianca ${focusAsset.confidence.label} e liquidez ${focusAsset.liquidity.label}.`
                        : 'Aguardando ativo em foco.'}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>

          <section
            className="rounded-[28px] p-5"
            style={{ backgroundColor: 'var(--bg-2)', borderWidth: '1px', borderColor: 'var(--stroke-1)', boxShadow: 'var(--shadow-1)' }}
          >
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <div className="text-sm font-semibold" style={{ color: 'var(--text-2)' }}>
                  {overview?.universe_summary.title ?? 'Universo monitorado'}
                </div>
                <div className="text-sm" style={{ color: 'var(--text-3)' }}>
                  {overview?.universe_summary.summary ?? 'Liquidez viva, regime relativo e selecao rapida do ativo em foco.'}
                </div>
              </div>
              <div className="text-xs uppercase tracking-[0.18em]" style={{ color: 'var(--text-3)' }}>
                {movers.length} ativos
              </div>
            </div>

            {moduleState === 'ready' && quickSelection.length > 0 ? (
              <div className="space-y-3">
                {quickSelection.map((item) => {
                  const active = (focusAsset?.symbol ?? activeSymbol) === item.symbol;
                  const swapsHref = buildSwapsHrefFromRadarSymbol(item.symbol);
                  const liquidityRank = liquidityRanking.findIndex((entry) => entry.symbol === item.symbol);
                  const momentumRank = momentumRanking.findIndex((entry) => entry.symbol === item.symbol);

                  return (
                    <div
                      key={item.symbol}
                      className="rounded-[22px] p-4"
                      style={{
                        backgroundColor: active ? 'rgba(255,140,66,0.08)' : 'var(--bg-3)',
                        borderWidth: '1px',
                        borderColor: active ? 'rgba(255,140,66,0.18)' : 'var(--stroke-1)',
                      }}
                    >
                      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_220px]">
                        <button
                          onClick={() => {
                            setActiveSymbol(item.symbol);
                            navigate(`/radar/${item.symbol.toLowerCase()}`);
                          }}
                          className="text-left"
                        >
                          <div className="mb-3 flex items-start justify-between gap-3">
                            <div className="flex min-w-0 items-start gap-3">
                              <IntelEntityIcon
                                symbol={toEntitySymbol(item.symbol)}
                                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl"
                                style={{ backgroundColor: 'rgba(255,255,255,0.04)' }}
                                iconClassName="h-5 w-5"
                              />
                              <div className="min-w-0">
                                <div className="text-sm font-semibold" style={{ color: 'var(--text-1)' }}>
                                  {item.symbol}
                                </div>
                                <div className="mt-1 flex flex-wrap items-center gap-2">
                                  {momentumRank >= 0 ? <StatusBadge status="warning">M#{momentumRank + 1}</StatusBadge> : null}
                                  {liquidityRank >= 0 ? <StatusBadge status="success">L#{liquidityRank + 1}</StatusBadge> : null}
                                  {active ? <StatusBadge status="active">em foco</StatusBadge> : null}
                                </div>
                              </div>
                            </div>
                            <div
                              className="rounded-full px-2.5 py-1 text-xs font-semibold"
                              style={{
                                color: item.change24h >= 0 ? 'var(--ok-green)' : 'var(--error-red)',
                                backgroundColor: item.change24h >= 0 ? 'rgba(34,197,94,0.10)' : 'rgba(239,68,68,0.10)',
                              }}
                            >
                              {item.change24h >= 0 ? '+' : ''}
                              {(item.change24h * 100).toFixed(1)}%
                            </div>
                          </div>

                          <div className="grid grid-cols-1 gap-1 text-sm md:grid-cols-3">
                            <span style={{ color: 'var(--text-2)' }}>Preco ${formatPrice(item.price)}</span>
                            <span style={{ color: 'var(--text-3)' }}>Vol. ${compact(Number(item.volume))}</span>
                            <span style={{ color: 'var(--text-3)' }}>
                              Rota {liquidityRank >= 0 && liquidityRank < 3 ? 'mais liquida' : 'em observacao'}
                            </span>
                          </div>
                        </button>

                        <div className="flex items-center">
                          <button
                            onClick={() => navigate(swapsHref)}
                            className="flex w-full items-center justify-between rounded-[18px] border px-4 py-3 text-left"
                            style={{
                              backgroundColor: 'rgba(255,140,66,0.08)',
                              borderColor: 'rgba(255,140,66,0.16)',
                              color: 'var(--text-1)',
                            }}
                          >
                            <div>
                              <div className="mb-1 text-sm font-semibold">Executar com USDT</div>
                              <div className="text-sm" style={{ color: 'var(--text-2)' }}>
                                Abrir o rail com origem Radar.
                              </div>
                            </div>
                            <ArrowUpRight className="h-4 w-4 shrink-0" style={{ color: 'var(--text-3)' }} />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <ModuleStateCard
                tone={moduleState === 'error' ? 'error' : moduleState === 'loading' ? 'loading' : 'empty'}
                title="Universo indisponivel"
                description="O universo monitorado aparece quando o Radar consegue sincronizar liquidez e regime."
                compact
              />
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
