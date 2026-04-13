import { useMemo, useState } from 'react';
import { useAccount } from 'wagmi';
import { ArrowUpRight, Lock, RefreshCw, Waves } from 'lucide-react';

import { StatusBadge } from '../components/sne/StatusBadge';
import { useMarketSummary, useSignals } from '../../hooks/useRadarData';
import { useEntitlements } from '../../lib/auth/useEntitlements';

const RADAR_SYMBOLS = ['ETHUSDT', 'BTCUSDT', 'SOLUSDT', 'LINKUSDT', 'AAVEUSDT', 'UNIUSDT'];

export function Radar() {
  const { isConnected } = useAccount();
  const { entitlements } = useEntitlements();
  const hasAccess = entitlements?.features?.includes('radar.access') || false;

  const [activeSymbol, setActiveSymbol] = useState('ETHUSDT');

  const marketQuery = useMarketSummary();
  const signalsQuery = useSignals(activeSymbol, '24H', true);

  const movers = marketQuery.status === 'success' ? (marketQuery.data?.top_movers ?? []) : [];
  const featured = useMemo(
    () => movers.find((item) => item.symbol === activeSymbol) ?? movers[0],
    [activeSymbol, movers]
  );

  const formattedPrice = (value: number) => {
    if (value >= 1000) return value.toLocaleString('en-US', { maximumFractionDigits: 2 });
    if (value >= 1) return value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 4 });
    return value.toLocaleString('en-US', { minimumFractionDigits: 4, maximumFractionDigits: 6 });
  };

  const compact = (value: number) =>
    new Intl.NumberFormat('en-US', {
      notation: 'compact',
      maximumFractionDigits: 1,
    }).format(value);

  const signal = signalsQuery.data?.signals?.[0];

  const executionState = useMemo(() => {
    if (!isConnected) return { label: 'offline', tone: 'pending' as const };
    if (!hasAccess) return { label: 'leitura', tone: 'warning' as const };
    return { label: 'aguardando', tone: 'active' as const };
  }, [hasAccess, isConnected]);

  const handleRefresh = () => {
    marketQuery.refetch();
    signalsQuery.refetch();
  };

  const translateStrength = (value: string | undefined) => {
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
  };

  return (
    <div className="flex flex-1">
      <div className="flex-1 px-6 py-6 overflow-y-auto xl:px-8">
        <div className="mx-auto max-w-[1480px] space-y-5">
          <section
            className="rounded-xl p-5"
            style={{
              background: 'radial-gradient(circle at top left, rgba(255,140,66,0.16), transparent 30%), linear-gradient(180deg, rgba(255,255,255,0.02), rgba(0,0,0,0.03))',
              backgroundColor: 'var(--bg-2)',
              borderWidth: '1px',
              borderColor: 'var(--stroke-1)',
              boxShadow: 'var(--shadow-1)',
            }}
          >
            <div className="grid grid-cols-1 xl:grid-cols-[0.72fr_0.28fr] gap-5">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2 mb-3">
                  <StatusBadge status={executionState.tone}>{executionState.label}</StatusBadge>
                  <div className="text-sm" style={{ color: 'var(--text-3)' }}>Radar</div>
                </div>

                <h1 className="text-3xl font-semibold mb-2" style={{ color: 'var(--text-1)' }}>
                  Mercados líquidos. Sinais em tempo real.
                </h1>
                <p className="max-w-3xl text-sm" style={{ color: 'var(--text-2)' }}>
                  Acompanhe os pares mais ativos do universo SNE e leia sinais direcionais antes de executar.
                </p>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-5">
                  <div
                    className="rounded-lg px-4 py-3"
                    style={{ backgroundColor: 'var(--bg-3)', borderWidth: '1px', borderColor: 'var(--stroke-1)' }}
                  >
                    <div className="text-[11px] uppercase mb-1" style={{ color: 'var(--text-3)' }}>Pares ativos</div>
                    <div className="font-semibold" style={{ color: 'var(--text-1)' }}>{movers.length || 0} ao vivo</div>
                  </div>
                  <div
                    className="rounded-lg px-4 py-3"
                    style={{ backgroundColor: 'var(--bg-3)', borderWidth: '1px', borderColor: 'var(--stroke-1)' }}
                  >
                    <div className="text-[11px] uppercase mb-1" style={{ color: 'var(--text-3)' }}>Par em foco</div>
                    <div className="font-semibold" style={{ color: 'var(--text-1)' }}>{featured?.symbol ?? activeSymbol}</div>
                  </div>
                  <div
                    className="rounded-lg px-4 py-3"
                    style={{ backgroundColor: 'var(--bg-3)', borderWidth: '1px', borderColor: 'var(--stroke-1)' }}
                  >
                    <div className="text-[11px] uppercase mb-1" style={{ color: 'var(--text-3)' }}>Sinal</div>
                    <div className="font-semibold" style={{ color: 'var(--text-1)' }}>{signal?.signal ?? '--'}</div>
                  </div>
                </div>
              </div>

              <div
                className="rounded-xl p-4 min-w-0"
                style={{ backgroundColor: 'var(--bg-3)', borderWidth: '1px', borderColor: 'var(--stroke-1)' }}
              >
                <div className="flex items-center justify-between gap-3 mb-4">
                  <div>
                    <div className="font-semibold" style={{ color: 'var(--text-1)' }}>Dados de mercado</div>
                    <div className="text-sm" style={{ color: 'var(--text-2)' }}>
                      {marketQuery.isLoading ? 'Carregando...' : 'Ao vivo.'}
                    </div>
                  </div>
                  <button
                    onClick={handleRefresh}
                    className="px-3 py-2 rounded-lg inline-flex items-center gap-2 text-sm font-medium"
                    style={{ backgroundColor: 'var(--bg-2)', color: 'var(--text-1)', borderWidth: '1px', borderColor: 'var(--stroke-1)' }}
                  >
                    <RefreshCw className={`w-4 h-4 ${marketQuery.isFetching || signalsQuery.isFetching ? 'animate-spin' : ''}`} />
                    Atualizar
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-lg p-3" style={{ backgroundColor: 'var(--bg-2)', borderWidth: '1px', borderColor: 'var(--stroke-1)' }}>
                    <div className="text-[11px] uppercase mb-1" style={{ color: 'var(--text-3)' }}>Acesso</div>
                    <div className="font-semibold" style={{ color: 'var(--text-1)' }}>{hasAccess ? 'completo' : 'prévia'}</div>
                  </div>
                  <div className="rounded-lg p-3" style={{ backgroundColor: 'var(--bg-2)', borderWidth: '1px', borderColor: 'var(--stroke-1)' }}>
                    <div className="text-[11px] uppercase mb-1" style={{ color: 'var(--text-3)' }}>Execução</div>
                    <div className="font-semibold" style={{ color: 'var(--text-1)' }}>bloqueada</div>
                  </div>
                </div>
              </div>
            </div>
          </section>

          <section className="grid grid-cols-1 xl:grid-cols-[minmax(0,1.15fr)_minmax(320px,0.85fr)] gap-5">
            <div
              className="rounded-xl p-5"
              style={{ backgroundColor: 'var(--bg-2)', borderWidth: '1px', borderColor: 'var(--stroke-1)', boxShadow: 'var(--shadow-1)' }}
            >
              <div className="flex items-center justify-between gap-3 mb-4">
                <div>
                  <div className="text-sm font-semibold" style={{ color: 'var(--text-2)' }}>Par em destaque</div>
                  <div className="text-sm" style={{ color: 'var(--text-3)' }}>O par mais ativo agora.</div>
                </div>
                <button
                  onClick={() => featured && setActiveSymbol(featured.symbol)}
                  className="text-sm font-medium inline-flex items-center gap-2"
                  style={{ color: 'var(--accent-orange)' }}
                >
                  Selecionar
                  <ArrowUpRight className="w-4 h-4" />
                </button>
              </div>

              {featured ? (
                <div
                  className="rounded-xl p-5"
                  style={{
                    background: 'linear-gradient(135deg, rgba(255,140,66,0.10), rgba(255,255,255,0.02))',
                    backgroundColor: 'var(--bg-3)',
                    borderWidth: '1px',
                    borderColor: 'var(--stroke-1)',
                  }}
                >
                  <div className="flex items-start justify-between gap-4 mb-6">
                    <div className="min-w-0">
                      <div className="text-xs uppercase tracking-[0.18em] mb-2" style={{ color: 'var(--text-3)' }}>
                        Destaque
                      </div>
                      <div className="text-2xl font-semibold truncate" style={{ color: 'var(--text-1)' }}>
                        {featured.symbol}
                      </div>
                    </div>
                    <div
                      className="rounded-full px-3 py-1 text-sm font-semibold"
                      style={{
                        color: featured.change24h >= 0 ? 'var(--ok-green)' : 'var(--error-red)',
                        backgroundColor: featured.change24h >= 0 ? 'rgba(34,197,94,0.10)' : 'rgba(239,68,68,0.10)',
                      }}
                    >
                      {featured.change24h >= 0 ? '+' : ''}{(featured.change24h * 100).toFixed(1)}%
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div className="rounded-lg px-4 py-3" style={{ backgroundColor: 'rgba(255,255,255,0.02)', borderWidth: '1px', borderColor: 'var(--stroke-1)' }}>
                      <div className="text-[11px] uppercase mb-1" style={{ color: 'var(--text-3)' }}>Preço</div>
                      <div className="font-semibold" style={{ color: 'var(--text-1)' }}>
                        ${formattedPrice(featured.price)}
                      </div>
                    </div>
                    <div className="rounded-lg px-4 py-3" style={{ backgroundColor: 'rgba(255,255,255,0.02)', borderWidth: '1px', borderColor: 'var(--stroke-1)' }}>
                      <div className="text-[11px] uppercase mb-1" style={{ color: 'var(--text-3)' }}>Volume</div>
                      <div className="font-semibold" style={{ color: 'var(--text-1)' }}>
                        ${compact(Number(featured.volume))}
                      </div>
                    </div>
                    <div className="rounded-lg px-4 py-3" style={{ backgroundColor: 'rgba(255,255,255,0.02)', borderWidth: '1px', borderColor: 'var(--stroke-1)' }}>
                      <div className="text-[11px] uppercase mb-1" style={{ color: 'var(--text-3)' }}>Sinal</div>
                      <div className="font-semibold" style={{ color: 'var(--text-1)' }}>
                        {signal?.signal ?? 'Sem sinal'}
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-sm" style={{ color: 'var(--text-2)' }}>
                  O Radar não tem dados de mercado ao vivo agora.
                </div>
              )}
            </div>

            <div className="space-y-5">
              <div
                className="rounded-xl p-4"
                style={{ backgroundColor: 'var(--bg-2)', borderWidth: '1px', borderColor: 'var(--stroke-1)', boxShadow: 'var(--shadow-1)' }}
              >
                <div className="mb-3 text-sm font-semibold" style={{ color: 'var(--text-2)' }}>
                  Sinal
                </div>
                <div className="rounded-lg p-4" style={{ backgroundColor: 'var(--bg-3)', borderWidth: '1px', borderColor: 'var(--stroke-1)' }}>
                  <div className="flex items-center justify-between gap-3 mb-3">
                    <div className="font-semibold" style={{ color: 'var(--text-1)' }}>{activeSymbol}</div>
                    <StatusBadge status={signal?.signal === 'BUY' ? 'success' : signal?.signal === 'SELL' ? 'warning' : 'pending'}>
                      {signal?.signal ?? 'HOLD'}
                    </StatusBadge>
                  </div>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <div style={{ color: 'var(--text-3)' }}>Força</div>
                      <div style={{ color: 'var(--text-1)' }}>{translateStrength(signal?.strength)}</div>
                    </div>
                    <div>
                      <div style={{ color: 'var(--text-3)' }}>Variação</div>
                      <div style={{ color: 'var(--text-1)' }}>{signal?.change ?? '--'}</div>
                    </div>
                    <div>
                      <div style={{ color: 'var(--text-3)' }}>Pontuação</div>
                      <div style={{ color: 'var(--text-1)' }}>{signal?.score ?? '--'}</div>
                    </div>
                    <div>
                      <div style={{ color: 'var(--text-3)' }}>Janela</div>
                      <div style={{ color: 'var(--text-1)' }}>{signal?.timeframe ?? '--'}</div>
                    </div>
                  </div>
                </div>
              </div>

              <div
                className="rounded-xl p-4"
                style={{ backgroundColor: 'var(--bg-2)', borderWidth: '1px', borderColor: 'var(--stroke-1)', boxShadow: 'var(--shadow-1)' }}
              >
                <div className="mb-3 text-sm font-semibold" style={{ color: 'var(--text-2)' }}>
                  Execução
                </div>
                <div className="space-y-3">
                  <div className="rounded-lg p-4" style={{ backgroundColor: 'var(--bg-3)', borderWidth: '1px', borderColor: 'var(--stroke-1)' }}>
                    <div className="flex items-center gap-2 mb-2">
                      <Lock className="w-4 h-4" style={{ color: 'var(--accent-orange)' }} />
                      <div className="font-semibold" style={{ color: 'var(--text-1)' }}>Execução bloqueada</div>
                    </div>
                    <div className="text-sm" style={{ color: 'var(--text-2)' }}>
                      O Radar é somente leitura. Swap e roteamento entram após o contexto de protocolo estar definido.
                    </div>
                  </div>
                  <div className="rounded-lg p-4" style={{ backgroundColor: 'var(--bg-3)', borderWidth: '1px', borderColor: 'var(--stroke-1)' }}>
                    <div className="flex items-center gap-2 mb-2">
                      <Waves className="w-4 h-4" style={{ color: 'var(--accent-orange)' }} />
                      <div className="font-semibold" style={{ color: 'var(--text-1)' }}>Próxima etapa</div>
                    </div>
                    <div className="text-sm" style={{ color: 'var(--text-2)' }}>
                      A próxima camada é contexto DeFi real — não um botão de compra genérico.
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>

          <section
            className="rounded-xl p-5"
            style={{ backgroundColor: 'var(--bg-2)', borderWidth: '1px', borderColor: 'var(--stroke-1)', boxShadow: 'var(--shadow-1)' }}
          >
            <div className="mb-4 text-sm font-semibold" style={{ color: 'var(--text-2)' }}>
              Universo Radar
            </div>

            {movers.length === 0 ? (
              <div className="text-sm" style={{ color: 'var(--text-2)' }}>
                Nenhum mercado ao vivo disponível agora.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {movers.map((mover) => (
                  <button
                    key={mover.symbol}
                    onClick={() => setActiveSymbol(mover.symbol)}
                    className="rounded-lg p-4 text-left min-w-0 transition-all"
                    style={{
                      backgroundColor: activeSymbol === mover.symbol ? 'rgba(255,140,66,0.08)' : 'var(--bg-3)',
                      borderWidth: '1px',
                      borderColor: activeSymbol === mover.symbol ? 'var(--accent-orange)' : 'var(--stroke-1)',
                    }}
                  >
                    <div className="flex items-center justify-between gap-3 mb-3">
                      <div className="font-semibold truncate" style={{ color: 'var(--text-1)' }}>{mover.symbol}</div>
                      <div
                        className="text-sm font-semibold"
                        style={{ color: mover.change24h >= 0 ? 'var(--ok-green)' : 'var(--error-red)' }}
                      >
                        {mover.change24h >= 0 ? '+' : ''}{(mover.change24h * 100).toFixed(1)}%
                      </div>
                    </div>
                    <div className="flex items-center justify-between gap-3 text-sm">
                      <span style={{ color: 'var(--text-2)' }}>${formattedPrice(mover.price)}</span>
                      <span style={{ color: 'var(--text-3)' }}>Vol. ${compact(Number(mover.volume))}</span>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </section>

        </div>
      </div>
    </div>
  );
}
