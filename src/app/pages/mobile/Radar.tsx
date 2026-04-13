import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowUpRight, Lock, RefreshCw, Sparkles, Waves } from 'lucide-react';

import { Badge, EmptyState, ErrorState, MobileButton, MobilePageShell, SurfaceCard } from '../../components/mobile';
import { useRadarOverview } from '../../../hooks/useRadarData';

const RADAR_SYMBOLS = ['ETHUSDT', 'BTCUSDT', 'SOLUSDT', 'LINKUSDT', 'AAVEUSDT', 'UNIUSDT'];

function toBadgeVariant(
  tone?: 'active' | 'success' | 'warning' | 'pending'
): 'success' | 'warning' | 'neutral' | 'orange' {
  if (tone === 'success') return 'success';
  if (tone === 'warning') return 'warning';
  if (tone === 'active') return 'orange';
  return 'neutral';
}

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

function translateStrength(value?: string | null) {
  if (!value) return '--';
  const map: Record<string, string> = {
    Strong: 'Forte',
    Moderate: 'Moderado',
    Weak: 'Fraco',
    Neutral: 'Neutro',
  };
  return map[value] ?? value;
}

export function MobileRadar() {
  const navigate = useNavigate();
  const [activeSymbol, setActiveSymbol] = useState('ETHUSDT');
  const overviewQuery = useRadarOverview(activeSymbol, '24H');
  const overview = overviewQuery.data;
  const movers = overview?.universe ?? [];
  const featured = overview?.featured ?? null;

  return (
    <MobilePageShell
      title="Radar"
      subtitle="Mercado líquido, leitura direcional e contexto antes da execução."
      statusPill={{
        label: overview?.execution.label ?? 'loading',
        variant: toBadgeVariant(overview?.execution.tone),
      }}
      showContext
    >
      <SurfaceCard variant="elevated">
        <div className="flex items-center justify-between gap-3 mb-3">
          <div>
            <div className="text-[var(--text-1)] mb-1">{overview?.hero.headline ?? 'Mercados líquidos. Sinais em tempo real.'}</div>
            <div className="text-sm text-[var(--text-2)]">{overview?.hero.summary ?? 'Acompanhe os pares mais ativos do universo SNE e leia sinais direcionais antes de executar.'}</div>
          </div>
          <button
            onClick={() => overviewQuery.refetch()}
            className="w-10 h-10 rounded-2xl border border-[var(--stroke-1)] bg-[var(--bg-2)] text-[var(--text-2)] flex items-center justify-center"
          >
            <RefreshCw className={`w-4 h-4 ${overviewQuery.isFetching ? 'animate-spin' : ''}`} />
          </button>
        </div>

        <div className="grid grid-cols-3 gap-3">
          {(overview?.hero.metrics ?? []).slice(0, 3).map((metric) => (
            <div key={metric.label} className="rounded-xl bg-[var(--bg-2)] border border-[var(--stroke-1)] p-3">
              <div className="text-[10px] uppercase text-[var(--text-3)] mb-1">{metric.label}</div>
              <div className="text-[var(--text-1)]">{metric.value}</div>
            </div>
          ))}
        </div>
      </SurfaceCard>

      <SurfaceCard>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-[var(--text-1)]">Seleção rápida</h3>
          <Badge variant="neutral" size="sm">{RADAR_SYMBOLS.length}</Badge>
        </div>

        <div className="flex gap-2 overflow-x-auto pb-1">
          {RADAR_SYMBOLS.map((symbol) => (
            <button
              key={symbol}
              onClick={() => setActiveSymbol(symbol)}
              className="flex-shrink-0 rounded-full px-3 py-2 border text-sm"
              style={{
                backgroundColor: activeSymbol === symbol ? 'var(--accent-orange)' : 'var(--bg-2)',
                color: activeSymbol === symbol ? '#FFFFFF' : 'var(--text-1)',
                borderColor: activeSymbol === symbol ? 'var(--accent-orange)' : 'var(--stroke-1)',
              }}
            >
              {symbol}
            </button>
          ))}
        </div>
      </SurfaceCard>

      {overviewQuery.isLoading ? (
        <div className="space-y-3">
          <SurfaceCard className="h-32 animate-pulse bg-[var(--bg-1)]" />
          <SurfaceCard className="h-48 animate-pulse bg-[var(--bg-1)]" />
        </div>
      ) : overviewQuery.isError || !overview ? (
        <ErrorState
          title="Radar indisponível"
          description="Os dados de mercado não carregaram agora."
          onRetry={() => overviewQuery.refetch()}
        />
      ) : (
        <>
          <SurfaceCard>
            <div className="flex items-center justify-between gap-3 mb-3">
              <h3 className="text-[var(--text-1)]">Par em foco</h3>
              <Badge variant="neutral" size="sm">{featured?.symbol ?? activeSymbol}</Badge>
            </div>

            {featured ? (
              <div className="rounded-xl bg-[var(--bg-2)] border border-[var(--stroke-1)] p-4">
                <div className="flex items-start justify-between gap-3 mb-4">
                  <div>
                    <div className="text-[var(--text-1)] mb-1">{featured.symbol}</div>
                    <div className="text-sm text-[var(--text-2)]">Ativo mais líquido dentro do universo Radar atual.</div>
                  </div>
                  <div className={featured.change24h >= 0 ? 'text-[var(--success)]' : 'text-[var(--danger)]'}>
                    {featured.change24h >= 0 ? '+' : ''}{(featured.change24h * 100).toFixed(1)}%
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-xl bg-[var(--bg-1)] border border-[var(--stroke-1)] p-3">
                    <div className="text-[10px] uppercase text-[var(--text-3)] mb-1">Preço</div>
                    <div className="text-[var(--text-1)]">${formatPrice(featured.price)}</div>
                  </div>
                  <div className="rounded-xl bg-[var(--bg-1)] border border-[var(--stroke-1)] p-3">
                    <div className="text-[10px] uppercase text-[var(--text-3)] mb-1">Volume</div>
                    <div className="text-[var(--text-1)]">${compact(Number(featured.volume))}</div>
                  </div>
                </div>
              </div>
            ) : (
              <EmptyState
                title="Sem par em foco"
                description="O Radar não retornou um destaque agora."
              />
            )}
          </SurfaceCard>

          <SurfaceCard>
            <div className="flex items-center justify-between gap-3 mb-3">
              <h3 className="text-[var(--text-1)]">Sinal operacional</h3>
              <Badge
                variant={
                  overview.signal?.signal === 'BUY'
                    ? 'success'
                    : overview.signal?.signal === 'SELL'
                      ? 'warning'
                      : 'neutral'
                }
                size="sm"
              >
                {overview.signal?.signal ?? 'HOLD'}
              </Badge>
            </div>

            {overview.signal ? (
              <div className="space-y-3">
                <div className="rounded-xl border border-[var(--stroke-1)] bg-[rgba(255,140,66,0.08)] p-3">
                  <div className="flex items-center justify-between gap-3 mb-2">
                    <div className="text-[var(--text-1)]">{overview.signal.symbol}</div>
                    <Sparkles className="w-4 h-4 text-[var(--accent-orange)]" />
                  </div>
                  <div className="text-sm text-[var(--text-2)]">
                    {overview.signal.change} na janela {overview.signal.timeframe} com score {overview.signal.score ?? '--'}.
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                <div className="rounded-xl bg-[var(--bg-2)] border border-[var(--stroke-1)] p-3">
                  <div className="text-[10px] uppercase text-[var(--text-3)] mb-1">Força</div>
                  <div className="text-[var(--text-1)]">{translateStrength(overview.signal.strength)}</div>
                </div>
                <div className="rounded-xl bg-[var(--bg-2)] border border-[var(--stroke-1)] p-3">
                  <div className="text-[10px] uppercase text-[var(--text-3)] mb-1">Janela</div>
                  <div className="text-[var(--text-1)]">{overview.signal.timeframe}</div>
                </div>
                <div className="rounded-xl bg-[var(--bg-2)] border border-[var(--stroke-1)] p-3">
                  <div className="text-[10px] uppercase text-[var(--text-3)] mb-1">Variação</div>
                  <div className="text-[var(--text-1)]">{overview.signal.change}</div>
                </div>
                <div className="rounded-xl bg-[var(--bg-2)] border border-[var(--stroke-1)] p-3">
                  <div className="text-[10px] uppercase text-[var(--text-3)] mb-1">Pontuação</div>
                  <div className="text-[var(--text-1)]">{overview.signal.score ?? '--'}</div>
                </div>
                </div>
              </div>
            ) : (
              <EmptyState
                title="Sem sinal disponível"
                description="O ativo atual não retornou leitura direcional."
              />
            )}
          </SurfaceCard>

          <SurfaceCard>
            <div className="flex items-center justify-between gap-3 mb-3">
              <h3 className="text-[var(--text-1)]">Universo Radar</h3>
              <Badge variant="neutral" size="sm">{movers.length}</Badge>
            </div>

            {movers.length === 0 ? (
              <EmptyState
                title="Sem mercados ao vivo"
                description="O universo curado está vazio agora."
              />
            ) : (
              <div className="space-y-3">
                {movers.map((item) => (
                  <button
                    key={item.symbol}
                    onClick={() => setActiveSymbol(item.symbol)}
                    className="w-full rounded-xl bg-[var(--bg-2)] border border-[var(--stroke-1)] p-3 text-left"
                  >
                    <div className="flex items-center justify-between gap-3 mb-2">
                      <div className="text-[var(--text-1)]">{item.symbol}</div>
                      <div className={item.change24h >= 0 ? 'text-[var(--success)]' : 'text-[var(--danger)]'}>
                        {item.change24h >= 0 ? '+' : ''}{(item.change24h * 100).toFixed(1)}%
                      </div>
                    </div>
                    <div className="flex items-center justify-between gap-3 text-sm text-[var(--text-2)]">
                      <span>${formatPrice(item.price)}</span>
                      <span>Vol ${compact(Number(item.volume))}</span>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </SurfaceCard>

          <SurfaceCard>
            <div className="flex items-center gap-2 mb-3 text-[var(--text-1)]">
              <Lock className="w-4 h-4 text-[var(--accent-orange)]" />
              <span>Limite de execução</span>
            </div>

            <div className="space-y-3 mb-4">
              <div className="rounded-xl bg-[var(--bg-2)] border border-[var(--stroke-1)] p-3">
                <div className="text-[var(--text-1)] mb-1">Acesso</div>
                <div className="text-sm text-[var(--text-2)]">{overview.market_state.access}</div>
              </div>
              <div className="rounded-xl bg-[var(--bg-2)] border border-[var(--stroke-1)] p-3">
                <div className="text-[var(--text-1)] mb-1">Execução</div>
                <div className="text-sm text-[var(--text-2)]">{overview.market_state.execution}</div>
              </div>
              <div className="rounded-xl border border-[rgba(255,140,66,0.16)] bg-[rgba(255,140,66,0.08)] p-3">
                <div className="text-[var(--text-1)] mb-1">Próxima camada</div>
                <div className="text-sm text-[var(--text-2)]">
                  O passo seguinte é contexto DeFi e rota real, não um botão de compra genérico.
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <MobileButton variant="secondary" className="w-full" onClick={() => navigate('/docs')}>
                <Waves className="w-4 h-4 mr-2" />
                Open Docs
              </MobileButton>
              <MobileButton variant="secondary" className="w-full" onClick={() => navigate('/vault')}>
                <ArrowUpRight className="w-4 h-4 mr-2" />
                Open Vault
              </MobileButton>
            </div>
          </SurfaceCard>
        </>
      )}
    </MobilePageShell>
  );
}
