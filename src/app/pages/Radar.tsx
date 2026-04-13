import { useState } from 'react';
import { Activity, ArrowUpRight, Lock, RefreshCw, Sparkles, Waves } from 'lucide-react';

import { ModuleStateCard } from '../components/sne/ModuleStateCard';
import { StatusBadge } from '../components/sne/StatusBadge';
import { useRadarOverview } from '../../hooks/useRadarData';
import { resolveModuleState } from '../../lib/moduleState';
import { useEntitlements } from '../../lib/auth/useEntitlements';

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

function translateStrength(value: string | undefined) {
  if (!value) return '--';
  const map: Record<string, string> = {
    Strong: 'Forte',
    Moderate: 'Moderado',
    Weak: 'Fraco',
    'Very Strong': 'Muito forte',
    'Very Weak': 'Muito fraco',
    Neutral: 'Neutro',
  };
  return map[value] ?? value;
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

function deriveMicroSignal(change24h: number) {
  if (change24h >= 0.02) return 'BUY';
  if (change24h <= -0.02) return 'SELL';
  return 'HOLD';
}

function signalBadgeTone(signal?: string) {
  if (signal === 'BUY') return 'success';
  if (signal === 'SELL') return 'warning';
  return 'pending';
}

function signalAccent(signal?: string) {
  if (signal === 'BUY') {
    return {
      color: 'var(--ok-green)',
      backgroundColor: 'rgba(34,197,94,0.10)',
      borderColor: 'rgba(34,197,94,0.16)',
    };
  }
  if (signal === 'SELL') {
    return {
      color: 'var(--error-red)',
      backgroundColor: 'rgba(239,68,68,0.10)',
      borderColor: 'rgba(239,68,68,0.16)',
    };
  }
  return {
    color: 'var(--accent-orange)',
    backgroundColor: 'rgba(255,140,66,0.10)',
    borderColor: 'rgba(255,140,66,0.16)',
  };
}

export function Radar() {
  const { entitlements } = useEntitlements();
  const hasAccess = entitlements?.features?.includes('radar.access') || false;
  const [activeSymbol, setActiveSymbol] = useState('ETHUSDT');

  const overviewQuery = useRadarOverview(activeSymbol, '24H');
  const overview = overviewQuery.data;
  const moduleState = resolveModuleState({
    isConnected: true,
    allowDisconnectedRead: true,
    isLoading: overviewQuery.isLoading,
    isError: overviewQuery.isError,
    data: overview,
    isEmpty: (data) => !data.featured && data.universe.length === 0,
  });

  const movers = overview?.universe ?? [];
  const featured = overview?.featured ?? null;
  const signal = overview?.signal ?? null;
  const regime = overview?.market_regime;
  const momentumRanking = overview?.rankings?.momentum ?? [];
  const liquidityRanking = overview?.rankings?.liquidity ?? [];
  const executionState = overview?.execution ?? {
    label: hasAccess ? 'ready' : 'preview',
    tone: hasAccess ? ('active' as const) : ('warning' as const),
  };

  const selectedMarket = movers.find((item) => item.symbol === activeSymbol) ?? featured;
  const quickSelection = movers.length > 0 ? movers : RADAR_SYMBOLS.map((symbol) => ({
    symbol,
    price: 0,
    change24h: 0,
    volume: 0,
  }));

  const handleRefresh = () => {
    overviewQuery.refetch();
  };

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
            <div className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1.15fr)_360px]">
              <div className="min-w-0">
                <div className="mb-3 flex flex-wrap items-center gap-2">
                  <StatusBadge status={executionState.tone}>{executionState.label}</StatusBadge>
                  <div
                    className="inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs uppercase tracking-[0.18em]"
                    style={{ backgroundColor: 'rgba(255,255,255,0.04)', color: 'var(--text-3)' }}
                  >
                    <Activity className="h-3.5 w-3.5" />
                    Radar
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1fr)_320px]">
                  <div className="min-w-0">
                    <h1 className="mb-2 text-3xl font-semibold leading-tight" style={{ color: 'var(--text-1)' }}>
                      {overview?.hero.headline ?? 'Mercados líquidos. Sinais em tempo real.'}
                    </h1>
                    <p className="max-w-3xl text-sm leading-6" style={{ color: 'var(--text-2)' }}>
                      {overview?.hero.summary ?? 'Acompanhe os pares mais ativos do universo SNE e leia sinais direcionais antes de executar.'}
                    </p>
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
                          Contexto ativo
                        </div>
                        <div className="text-sm" style={{ color: 'var(--text-2)' }}>
                          Radar em modo leitura com mercado sincronizado.
                        </div>
                      </div>
                      <button
                        onClick={handleRefresh}
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
                      <div className="rounded-2xl p-3" style={{ backgroundColor: 'var(--bg-3)', borderWidth: '1px', borderColor: 'var(--stroke-1)' }}>
                        <div className="mb-1 text-[11px] uppercase tracking-[0.16em]" style={{ color: 'var(--text-3)' }}>
                          Acesso
                        </div>
                        <div className="font-semibold" style={{ color: 'var(--text-1)' }}>
                          {overview?.market_state.access ?? (hasAccess ? 'completo' : 'prévia')}
                        </div>
                      </div>
                      <div className="rounded-2xl p-3" style={{ backgroundColor: 'var(--bg-3)', borderWidth: '1px', borderColor: 'var(--stroke-1)' }}>
                        <div className="mb-1 text-[11px] uppercase tracking-[0.16em]" style={{ color: 'var(--text-3)' }}>
                          Execução
                        </div>
                        <div className="font-semibold" style={{ color: 'var(--text-1)' }}>
                          {overview?.market_state.execution ?? 'bloqueada'}
                        </div>
                      </div>
                      <div className="rounded-2xl p-3" style={{ backgroundColor: 'var(--bg-3)', borderWidth: '1px', borderColor: 'var(--stroke-1)' }}>
                        <div className="mb-1 text-[11px] uppercase tracking-[0.16em]" style={{ color: 'var(--text-3)' }}>
                          Janela
                        </div>
                        <div className="font-semibold" style={{ color: 'var(--text-1)' }}>
                          {signal?.timeframe ?? '24H'}
                        </div>
                      </div>
                      <div className="rounded-2xl p-3" style={{ backgroundColor: 'var(--bg-3)', borderWidth: '1px', borderColor: 'var(--stroke-1)' }}>
                        <div className="mb-1 text-[11px] uppercase tracking-[0.16em]" style={{ color: 'var(--text-3)' }}>
                          Atualizado
                        </div>
                        <div className="font-semibold" style={{ color: 'var(--text-1)' }}>
                          {formatUpdatedAt(overview?.last_updated)}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="mt-5">
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <div className="text-sm font-semibold" style={{ color: 'var(--text-2)' }}>
                      Tape de mercado
                    </div>
                    <div className="text-xs uppercase tracking-[0.18em]" style={{ color: 'var(--text-3)' }}>
                      {movers.length} pares em observação
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
                    {quickSelection.map((item) => {
                      const microSignal = deriveMicroSignal(item.change24h);
                      const active = selectedMarket?.symbol === item.symbol;
                      return (
                        <button
                          key={item.symbol}
                          onClick={() => setActiveSymbol(item.symbol)}
                          className="rounded-2xl p-4 text-left transition-all"
                          style={{
                            backgroundColor: active ? 'rgba(255,140,66,0.10)' : 'rgba(255,255,255,0.03)',
                            borderWidth: '1px',
                            borderColor: active ? 'var(--accent-orange)' : 'rgba(255,255,255,0.06)',
                          }}
                        >
                          <div className="mb-3 flex items-start justify-between gap-3">
                            <div>
                              <div className="text-sm font-semibold" style={{ color: 'var(--text-1)' }}>
                                {item.symbol}
                              </div>
                              <div className="text-xs uppercase tracking-[0.16em]" style={{ color: 'var(--text-3)' }}>
                                sinal {microSignal.toLowerCase()}
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
                          <div className="flex items-center justify-between gap-3 text-sm">
                            <span style={{ color: 'var(--text-1)' }}>
                              {item.price > 0 ? `$${formatPrice(item.price)}` : '--'}
                            </span>
                            <span style={{ color: 'var(--text-3)' }}>
                              Vol. {Number(item.volume) > 0 ? `$${compact(Number(item.volume))}` : '--'}
                            </span>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              <div
                className="rounded-[28px] p-5"
                style={{
                  backgroundColor: 'rgba(6,8,12,0.55)',
                  borderWidth: '1px',
                  borderColor: 'rgba(255,255,255,0.06)',
                }}
              >
                <div className="mb-4 flex items-center justify-between gap-3">
                  <div>
                    <div className="text-sm font-semibold" style={{ color: 'var(--text-1)' }}>
                      Par selecionado
                    </div>
                    <div className="text-sm" style={{ color: 'var(--text-2)' }}>
                      Leitura derivada do ativo que você escolheu no Radar.
                    </div>
                  </div>
                  <StatusBadge status={signalBadgeTone(signal?.signal)}>
                    {signal?.signal ?? deriveMicroSignal(selectedMarket?.change24h ?? 0)}
                  </StatusBadge>
                </div>

                <div className="mb-5 rounded-[24px] p-4" style={{ ...signalAccent(signal?.signal), borderWidth: '1px' }}>
                  <div className="mb-2 text-xs uppercase tracking-[0.2em]">ativo selecionado</div>
                  <div className="text-3xl font-semibold" style={{ color: 'inherit' }}>
                    {selectedMarket?.symbol ?? activeSymbol}
                  </div>
                  <div className="mt-2 text-sm" style={{ color: 'inherit' }}>
                    {signal?.signal === 'BUY'
                      ? 'Você selecionou este par, e o snapshot atual aponta fluxo positivo acima do limiar do Radar.'
                      : signal?.signal === 'SELL'
                        ? 'Você selecionou este par, e o snapshot atual mostra pressão negativa material na janela observada.'
                        : 'Você selecionou este par, e o Radar não encontrou gatilho forte na janela atual.'}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-2xl p-3" style={{ backgroundColor: 'var(--bg-3)', borderWidth: '1px', borderColor: 'var(--stroke-1)' }}>
                    <div className="mb-1 text-[11px] uppercase tracking-[0.16em]" style={{ color: 'var(--text-3)' }}>
                      Preço
                    </div>
                    <div className="font-semibold" style={{ color: 'var(--text-1)' }}>
                      {selectedMarket ? `$${formatPrice(selectedMarket.price)}` : '--'}
                    </div>
                  </div>
                  <div className="rounded-2xl p-3" style={{ backgroundColor: 'var(--bg-3)', borderWidth: '1px', borderColor: 'var(--stroke-1)' }}>
                    <div className="mb-1 text-[11px] uppercase tracking-[0.16em]" style={{ color: 'var(--text-3)' }}>
                      Variação
                    </div>
                    <div className="font-semibold" style={{ color: 'var(--text-1)' }}>
                      {selectedMarket ? `${selectedMarket.change24h >= 0 ? '+' : ''}${(selectedMarket.change24h * 100).toFixed(2)}%` : '--'}
                    </div>
                  </div>
                  <div className="rounded-2xl p-3" style={{ backgroundColor: 'var(--bg-3)', borderWidth: '1px', borderColor: 'var(--stroke-1)' }}>
                    <div className="mb-1 text-[11px] uppercase tracking-[0.16em]" style={{ color: 'var(--text-3)' }}>
                      Volume
                    </div>
                    <div className="font-semibold" style={{ color: 'var(--text-1)' }}>
                      {selectedMarket ? `$${compact(Number(selectedMarket.volume))}` : '--'}
                    </div>
                  </div>
                  <div className="rounded-2xl p-3" style={{ backgroundColor: 'var(--bg-3)', borderWidth: '1px', borderColor: 'var(--stroke-1)' }}>
                    <div className="mb-1 text-[11px] uppercase tracking-[0.16em]" style={{ color: 'var(--text-3)' }}>
                      Pontuação
                    </div>
                    <div className="font-semibold" style={{ color: 'var(--text-1)' }}>
                      {signal?.score ?? '--'}
                    </div>
                  </div>
                </div>

                <div className="mt-5 grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)]">
                  <div
                    className="rounded-[24px] p-4"
                    style={{ backgroundColor: 'rgba(255,255,255,0.03)', borderWidth: '1px', borderColor: 'rgba(255,255,255,0.06)' }}
                  >
                    <div className="mb-3 flex items-center justify-between gap-3">
                      <div>
                        <div className="text-sm font-semibold" style={{ color: 'var(--text-1)' }}>
                          Regime de mercado
                        </div>
                        <div className="text-sm" style={{ color: 'var(--text-2)' }}>
                          Direção agregada do universo líquido do Radar.
                        </div>
                      </div>
                      <StatusBadge status={regime?.tone ?? 'pending'}>{regime?.label ?? 'mixed'}</StatusBadge>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="rounded-2xl p-3" style={{ backgroundColor: 'var(--bg-3)', borderWidth: '1px', borderColor: 'var(--stroke-1)' }}>
                        <div className="mb-1 text-[11px] uppercase tracking-[0.16em]" style={{ color: 'var(--text-3)' }}>
                          Média 24h
                        </div>
                        <div className="font-semibold" style={{ color: 'var(--text-1)' }}>
                          {regime ? `${regime.avg_change_24h >= 0 ? '+' : ''}${(regime.avg_change_24h * 100).toFixed(2)}%` : '--'}
                        </div>
                      </div>
                      <div className="rounded-2xl p-3" style={{ backgroundColor: 'var(--bg-3)', borderWidth: '1px', borderColor: 'var(--stroke-1)' }}>
                        <div className="mb-1 text-[11px] uppercase tracking-[0.16em]" style={{ color: 'var(--text-3)' }}>
                          Snapshot
                        </div>
                        <div className="font-semibold" style={{ color: 'var(--text-1)' }}>
                          {formatUpdatedAt(overview?.last_updated)}
                        </div>
                      </div>
                    </div>

                    <div className="mt-3 text-sm leading-6" style={{ color: 'var(--text-2)' }}>
                      {regime?.summary ?? 'O Radar classifica o mercado a partir de liquidez relevante e variação recente.'}
                    </div>
                  </div>

                  <div
                    className="rounded-[24px] p-4"
                    style={{ backgroundColor: 'rgba(255,255,255,0.03)', borderWidth: '1px', borderColor: 'rgba(255,255,255,0.06)' }}
                  >
                    <div className="mb-3 flex items-center justify-between gap-3">
                      <div>
                        <div className="text-sm font-semibold" style={{ color: 'var(--text-1)' }}>
                          Rankings do Radar
                        </div>
                        <div className="text-sm" style={{ color: 'var(--text-2)' }}>
                          Leitura separada por velocidade de preço e profundidade de fluxo.
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
                      <div className="rounded-2xl p-3" style={{ backgroundColor: 'var(--bg-3)', borderWidth: '1px', borderColor: 'var(--stroke-1)' }}>
                        <div className="mb-3 text-[11px] uppercase tracking-[0.16em]" style={{ color: 'var(--text-3)' }}>
                          Momentum
                        </div>
                        <div className="space-y-2">
                          {momentumRanking.slice(0, 3).map((item, index) => (
                            <div key={`momentum-${item.symbol}`} className="flex items-center justify-between gap-3">
                              <div className="flex min-w-0 items-center gap-3">
                                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold" style={{ backgroundColor: 'rgba(255,140,66,0.10)', color: 'var(--accent-orange)' }}>
                                  {index + 1}
                                </div>
                                <div className="truncate text-sm" style={{ color: 'var(--text-1)' }}>
                                  {item.symbol}
                                </div>
                              </div>
                              <div className="text-sm font-semibold" style={{ color: item.change24h >= 0 ? 'var(--ok-green)' : 'var(--error-red)' }}>
                                {item.change24h >= 0 ? '+' : ''}
                                {(item.change24h * 100).toFixed(1)}%
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="rounded-2xl p-3" style={{ backgroundColor: 'var(--bg-3)', borderWidth: '1px', borderColor: 'var(--stroke-1)' }}>
                        <div className="mb-3 text-[11px] uppercase tracking-[0.16em]" style={{ color: 'var(--text-3)' }}>
                          Liquidez
                        </div>
                        <div className="space-y-2">
                          {liquidityRanking.slice(0, 3).map((item, index) => (
                            <div key={`liquidity-${item.symbol}`} className="flex items-center justify-between gap-3">
                              <div className="flex min-w-0 items-center gap-3">
                                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold" style={{ backgroundColor: 'rgba(255,255,255,0.06)', color: 'var(--text-2)' }}>
                                  {index + 1}
                                </div>
                                <div className="truncate text-sm" style={{ color: 'var(--text-1)' }}>
                                  {item.symbol}
                                </div>
                              </div>
                              <div className="text-sm font-semibold" style={{ color: 'var(--text-1)' }}>
                                ${compact(Number(item.volume))}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>

          <section className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1.2fr)_400px]">
            <div
              className="rounded-[28px] p-5"
              style={{ backgroundColor: 'var(--bg-2)', borderWidth: '1px', borderColor: 'var(--stroke-1)', boxShadow: 'var(--shadow-1)' }}
            >
              <div className="mb-4 flex items-center justify-between gap-3">
                <div>
                  <div className="text-sm font-semibold" style={{ color: 'var(--text-2)' }}>
                    Universo Radar
                  </div>
                  <div className="text-sm" style={{ color: 'var(--text-3)' }}>
                    Liquidez viva, destaque relativo e seleção rápida do ativo.
                  </div>
                </div>
                <div className="text-xs uppercase tracking-[0.18em]" style={{ color: 'var(--text-3)' }}>
                  {movers.length} ativos
                </div>
              </div>

              {moduleState === 'loading' ? (
                <ModuleStateCard
                  tone="loading"
                  title="Carregando Radar"
                  description="Buscando mercado, universo curado e sinal do ativo selecionado."
                />
              ) : moduleState === 'error' ? (
                <ModuleStateCard
                  tone="error"
                  title="Falha ao carregar Radar"
                  description="Os dados de mercado não responderam como esperado."
                  actionLabel="Atualizar"
                  onAction={handleRefresh}
                />
              ) : moduleState === 'empty' ? (
                <ModuleStateCard
                  tone="empty"
                  title="Sem mercado disponível"
                  description="O universo do Radar está vazio agora. Tente novamente em instantes."
                  actionLabel="Atualizar"
                  onAction={handleRefresh}
                />
              ) : (
                <div className="space-y-3">
                  {movers.map((mover, index) => {
                    const active = selectedMarket?.symbol === mover.symbol;
                    const liquidityRank = liquidityRanking.findIndex((item) => item.symbol === mover.symbol);
                    const momentumRank = momentumRanking.findIndex((item) => item.symbol === mover.symbol);
                    return (
                      <button
                        key={mover.symbol}
                        onClick={() => setActiveSymbol(mover.symbol)}
                        className="w-full rounded-[22px] p-4 text-left transition-all"
                        style={{
                          backgroundColor: active ? 'rgba(255,140,66,0.09)' : 'var(--bg-3)',
                          borderWidth: '1px',
                          borderColor: active ? 'var(--accent-orange)' : 'var(--stroke-1)',
                        }}
                      >
                        <div className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-4">
                          <div
                            className="flex h-10 w-10 items-center justify-center rounded-2xl text-sm font-semibold"
                            style={{
                              backgroundColor: active ? 'rgba(255,140,66,0.16)' : 'rgba(255,255,255,0.04)',
                              color: active ? 'var(--accent-orange)' : 'var(--text-2)',
                            }}
                          >
                            {index + 1}
                          </div>

                          <div className="min-w-0">
                            <div className="mb-1 flex items-center gap-2">
                              <div className="truncate font-semibold" style={{ color: 'var(--text-1)' }}>
                                {mover.symbol}
                              </div>
                              {momentumRank >= 0 ? <StatusBadge status="pending">M#{momentumRank + 1}</StatusBadge> : null}
                              {liquidityRank >= 0 ? <StatusBadge status="success">L#{liquidityRank + 1}</StatusBadge> : null}
                            </div>
                            <div className="grid grid-cols-1 gap-1 text-sm md:grid-cols-3">
                              <span style={{ color: 'var(--text-2)' }}>Preço ${formatPrice(mover.price)}</span>
                              <span style={{ color: 'var(--text-3)' }}>Vol. ${compact(Number(mover.volume))}</span>
                              <span style={{ color: 'var(--text-3)' }}>
                                Score {(Number(mover.score ?? 0)).toFixed(1)}
                              </span>
                            </div>
                          </div>

                          <div
                            className="rounded-full px-3 py-1 text-sm font-semibold"
                            style={{
                              color: mover.change24h >= 0 ? 'var(--ok-green)' : 'var(--error-red)',
                              backgroundColor: mover.change24h >= 0 ? 'rgba(34,197,94,0.10)' : 'rgba(239,68,68,0.10)',
                            }}
                          >
                            {mover.change24h >= 0 ? '+' : ''}
                            {(mover.change24h * 100).toFixed(1)}%
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="space-y-5">
              <div
                className="rounded-[28px] p-5"
                style={{ backgroundColor: 'var(--bg-2)', borderWidth: '1px', borderColor: 'var(--stroke-1)', boxShadow: 'var(--shadow-1)' }}
              >
                <div className="mb-4 flex items-center justify-between gap-3">
                  <div>
                    <div className="text-sm font-semibold" style={{ color: 'var(--text-2)' }}>
                      Sinal operacional
                    </div>
                    <div className="text-sm" style={{ color: 'var(--text-3)' }}>
                      Leitura direcional do ativo selecionado.
                    </div>
                  </div>
                  <Sparkles className="h-4 w-4" style={{ color: 'var(--accent-orange)' }} />
                </div>

                {moduleState !== 'ready' ? (
                  <ModuleStateCard
                    tone={moduleState === 'error' ? 'error' : moduleState === 'loading' ? 'loading' : 'empty'}
                    title="Sinal indisponível"
                    description="O sinal direcional depende do snapshot atual do ativo selecionado."
                    compact
                  />
                ) : (
                  <div className="space-y-3">
                    <div
                      className="rounded-[22px] p-4"
                      style={{ ...signalAccent(signal?.signal), borderWidth: '1px' }}
                    >
                      <div className="mb-2 flex items-center justify-between gap-3">
                        <div className="font-semibold" style={{ color: 'inherit' }}>
                          {selectedMarket?.symbol ?? activeSymbol}
                        </div>
                        <StatusBadge status={signalBadgeTone(signal?.signal)}>{signal?.signal ?? 'HOLD'}</StatusBadge>
                      </div>
                      <div className="text-sm" style={{ color: 'inherit' }}>
                        {signal?.change ?? '--'} na janela {signal?.timeframe ?? '24H'} com score {signal?.score ?? '--'}.
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div className="rounded-2xl p-3" style={{ backgroundColor: 'var(--bg-3)', borderWidth: '1px', borderColor: 'var(--stroke-1)' }}>
                        <div style={{ color: 'var(--text-3)' }}>Força</div>
                        <div style={{ color: 'var(--text-1)' }}>{translateStrength(signal?.strength)}</div>
                      </div>
                      <div className="rounded-2xl p-3" style={{ backgroundColor: 'var(--bg-3)', borderWidth: '1px', borderColor: 'var(--stroke-1)' }}>
                        <div style={{ color: 'var(--text-3)' }}>Janela</div>
                        <div style={{ color: 'var(--text-1)' }}>{signal?.timeframe ?? '--'}</div>
                      </div>
                      <div className="rounded-2xl p-3" style={{ backgroundColor: 'var(--bg-3)', borderWidth: '1px', borderColor: 'var(--stroke-1)' }}>
                        <div style={{ color: 'var(--text-3)' }}>Mudança</div>
                        <div style={{ color: 'var(--text-1)' }}>{signal?.change ?? '--'}</div>
                      </div>
                      <div className="rounded-2xl p-3" style={{ backgroundColor: 'var(--bg-3)', borderWidth: '1px', borderColor: 'var(--stroke-1)' }}>
                        <div style={{ color: 'var(--text-3)' }}>Atualizado</div>
                        <div style={{ color: 'var(--text-1)' }}>{formatUpdatedAt(signal?.updated)}</div>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div
                className="rounded-[28px] p-5"
                style={{ backgroundColor: 'var(--bg-2)', borderWidth: '1px', borderColor: 'var(--stroke-1)', boxShadow: 'var(--shadow-1)' }}
              >
                <div className="mb-4 flex items-center gap-2">
                  <Lock className="h-4 w-4" style={{ color: 'var(--accent-orange)' }} />
                  <div className="text-sm font-semibold" style={{ color: 'var(--text-2)' }}>
                    Limite de execução
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="rounded-[22px] p-4" style={{ backgroundColor: 'var(--bg-3)', borderWidth: '1px', borderColor: 'var(--stroke-1)' }}>
                    <div className="mb-2 font-semibold" style={{ color: 'var(--text-1)' }}>
                      Execução bloqueada
                    </div>
                    <div className="text-sm leading-6" style={{ color: 'var(--text-2)' }}>
                      O Radar segue somente leitura. Swap e roteamento entram depois que o contexto de protocolo estiver definido.
                    </div>
                  </div>

                  <div className="rounded-[22px] p-4" style={{ backgroundColor: 'var(--bg-3)', borderWidth: '1px', borderColor: 'var(--stroke-1)' }}>
                    <div className="mb-2 font-semibold" style={{ color: 'var(--text-1)' }}>
                      Próxima camada
                    </div>
                    <div className="text-sm leading-6" style={{ color: 'var(--text-2)' }}>
                      A evolução certa aqui é contexto DeFi real, risco por protocolo e rota viável, não um botão de compra genérico.
                    </div>
                  </div>

                  <div className="rounded-[22px] p-4" style={{ backgroundColor: 'rgba(255,140,66,0.08)', borderWidth: '1px', borderColor: 'rgba(255,140,66,0.16)' }}>
                    <div className="mb-2 flex items-center gap-2">
                      <Waves className="h-4 w-4" style={{ color: 'var(--accent-orange)' }} />
                      <div className="font-semibold" style={{ color: 'var(--text-1)' }}>
                        Universo de leitura
                      </div>
                    </div>
                    <div className="text-sm leading-6" style={{ color: 'var(--text-2)' }}>
                      O Radar prioriza liquidez, direção e contexto. A decisão de execução entra depois, em outra superfície.
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
