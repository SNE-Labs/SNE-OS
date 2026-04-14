import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowUpRight, Lock, RefreshCw, Sparkles, Waves } from 'lucide-react';

import { Badge, EmptyState, ErrorState, MobileButton, MobilePageShell, SurfaceCard } from '../../components/mobile';
import { IntelEntityIcon } from '../../components/IntelEntityIcon';
import { useRadarOverview } from '../../../hooks/useRadarData';
import { useSeoMeta } from '@/lib/seo/useSeoMeta';
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

function toBadgeVariant(
  tone?: 'active' | 'success' | 'warning' | 'pending'
): 'success' | 'warning' | 'neutral' | 'orange' {
  if (tone === 'success') return 'success';
  if (tone === 'warning') return 'warning';
  if (tone === 'active') return 'orange';
  return 'neutral';
}

export function MobileRadar() {
  const navigate = useNavigate();
  const { symbol: routeSymbol } = useParams();
  const normalizedRouteSymbol = (routeSymbol || 'ETHUSDT').replace('/', '').toUpperCase();
  const [activeSymbol, setActiveSymbol] = useState(normalizedRouteSymbol);

  useEffect(() => {
    setActiveSymbol(normalizedRouteSymbol);
  }, [normalizedRouteSymbol]);

  const overviewQuery = useRadarOverview(activeSymbol, '24H');
  const overview = overviewQuery.data;
  const movers = overview?.universe ?? [];
  const featured = overview?.featured ?? null;
  const regime = overview?.market_regime;
  const momentumRanking = overview?.rankings?.momentum ?? [];
  const liquidityRanking = overview?.rankings?.liquidity ?? [];
  const marketState = overview?.market_state;
  const hero = overview?.hero;
  const radarTitleSymbol = (featured?.symbol ?? activeSymbol).toUpperCase();
  const radarCanonicalPath = radarTitleSymbol ? `/radar/${radarTitleSymbol.toLowerCase()}` : '/radar';
  const radarDescription = featured
    ? `Radar do SNE OS para ${radarTitleSymbol}: preço ${formatPrice(featured.price)}, variação ${(featured.change24h * 100).toFixed(2)}% e leitura tática de liquidez.`
    : `Radar do SNE OS para ${radarTitleSymbol}: leitura tática de liquidez, momentum e direção do mercado.`;

  useSeoMeta({
    title: `${radarTitleSymbol} Radar | SNE OS`,
    description: radarDescription,
    canonicalPath: radarCanonicalPath,
    type: 'website',
    keywords: ['crypto radar', 'market intelligence', radarTitleSymbol, `${radarTitleSymbol} price`, 'liquidity', 'momentum'],
    structuredData: {
      '@context': 'https://schema.org',
      '@type': 'Dataset',
      name: `${radarTitleSymbol} Radar | SNE OS`,
      description: radarDescription,
      url: `https://snelabs.space${radarCanonicalPath}`,
    },
  });

  return (
    <MobilePageShell
      title="Radar"
      subtitle="Mercado líquido, leitura direcional e contexto antes da execução."
      showContext
    >
      <SurfaceCard variant="elevated">
        <div className="flex items-center justify-between gap-3 mb-3">
          <div>
            <div className="text-[var(--text-1)] mb-1">{hero?.headline ?? 'Mercados líquidos. Sinais em tempo real.'}</div>
            <div className="text-sm text-[var(--text-2)]">{hero?.summary ?? 'Acompanhe os pares mais ativos do universo SNE e leia sinais direcionais antes de executar.'}</div>
          </div>
          <button
            onClick={() => overviewQuery.refetch()}
            className="w-10 h-10 rounded-2xl border border-[var(--stroke-1)] bg-[var(--bg-2)] text-[var(--text-2)] flex items-center justify-center"
          >
            <RefreshCw className={`w-4 h-4 ${overviewQuery.isFetching ? 'animate-spin' : ''}`} />
          </button>
        </div>

        <div className="rounded-xl bg-[var(--bg-2)] border border-[var(--stroke-1)] p-3">
          <div className="flex items-center justify-between gap-3 mb-2">
            <div className="text-[var(--text-1)]">Regime de mercado</div>
            <Badge variant={toBadgeVariant(regime?.tone)} size="sm">{regime?.label ?? 'mixed'}</Badge>
          </div>
          <div className="text-sm text-[var(--text-2)]">{regime?.summary ?? 'O Radar classifica o mercado a partir de liquidez e direção recente.'}</div>
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
              onClick={() => navigate(`/radar/${symbol}`)}
              className="flex-shrink-0 rounded-full px-3 py-2 border text-sm"
              style={{
                backgroundColor: activeSymbol === symbol ? 'var(--accent-orange)' : 'var(--bg-2)',
                color: activeSymbol === symbol ? '#FFFFFF' : 'var(--text-1)',
                borderColor: activeSymbol === symbol ? 'var(--accent-orange)' : 'var(--stroke-1)',
              }}
            >
              <span className="inline-flex items-center gap-2">
                <IntelEntityIcon
                  symbol={toEntitySymbol(symbol)}
                  className="flex h-6 w-6 items-center justify-center rounded-full"
                  style={{ backgroundColor: activeSymbol === symbol ? 'rgba(255,255,255,0.16)' : 'rgba(255,255,255,0.06)' }}
                  iconClassName="h-3.5 w-3.5"
                />
                {symbol}
              </span>
            </button>
          ))}
        </div>
      </SurfaceCard>

      {overviewQuery.isLoading && !overview ? (
        <div className="space-y-3">
          <SurfaceCard className="h-32 animate-pulse bg-[var(--bg-1)]" />
          <SurfaceCard className="h-48 animate-pulse bg-[var(--bg-1)]" />
        </div>
      ) : (overviewQuery.isError || !overview) && !overview ? (
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
                  <div className="flex items-start gap-3">
                    <IntelEntityIcon
                      symbol={toEntitySymbol(featured.symbol)}
                      className="flex h-10 w-10 items-center justify-center rounded-2xl"
                      style={{ backgroundColor: 'rgba(255,255,255,0.06)' }}
                      iconClassName="h-5 w-5"
                    />
                    <div>
                      <div className="text-[var(--text-1)] mb-1">{featured.symbol}</div>
                      <div className="text-sm text-[var(--text-2)]">Ativo mais líquido dentro do universo Radar atual.</div>
                    </div>
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
                    <div className="flex items-center gap-2">
                      <IntelEntityIcon
                        symbol={toEntitySymbol(overview.signal.symbol)}
                        className="flex h-8 w-8 items-center justify-center rounded-xl"
                        style={{ backgroundColor: 'rgba(255,255,255,0.06)' }}
                        iconClassName="h-4 w-4"
                      />
                      <div className="text-[var(--text-1)]">{overview.signal.symbol}</div>
                    </div>
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
              <h3 className="text-[var(--text-1)]">Rankings</h3>
            </div>

            <div className="grid grid-cols-1 gap-3">
              <div className="rounded-xl bg-[var(--bg-2)] border border-[var(--stroke-1)] p-3">
                <div className="text-[10px] uppercase text-[var(--text-3)] mb-2">Momentum</div>
                <div className="space-y-2">
                  {momentumRanking.slice(0, 3).map((item, index) => (
                    <div key={`mobile-momentum-${item.symbol}`} className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2 min-w-0">
                        <div className="w-6 h-6 rounded-full bg-[rgba(255,140,66,0.10)] text-[var(--accent-orange)] text-xs flex items-center justify-center">{index + 1}</div>
                        <IntelEntityIcon
                          symbol={toEntitySymbol(item.symbol)}
                          className="flex h-7 w-7 items-center justify-center rounded-xl"
                          style={{ backgroundColor: 'rgba(255,255,255,0.06)' }}
                          iconClassName="h-4 w-4"
                        />
                        <div className="truncate text-[var(--text-1)]">{item.symbol}</div>
                      </div>
                      <div className={item.change24h >= 0 ? 'text-[var(--success)]' : 'text-[var(--danger)]'}>
                        {item.change24h >= 0 ? '+' : ''}{(item.change24h * 100).toFixed(1)}%
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-xl bg-[var(--bg-2)] border border-[var(--stroke-1)] p-3">
                <div className="text-[10px] uppercase text-[var(--text-3)] mb-2">Liquidez</div>
                <div className="space-y-2">
                  {liquidityRanking.slice(0, 3).map((item, index) => (
                    <div key={`mobile-liquidity-${item.symbol}`} className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2 min-w-0">
                        <div className="w-6 h-6 rounded-full bg-[rgba(255,255,255,0.06)] text-[var(--text-2)] text-xs flex items-center justify-center">{index + 1}</div>
                        <IntelEntityIcon
                          symbol={toEntitySymbol(item.symbol)}
                          className="flex h-7 w-7 items-center justify-center rounded-xl"
                          style={{ backgroundColor: 'rgba(255,255,255,0.06)' }}
                          iconClassName="h-4 w-4"
                        />
                        <div className="truncate text-[var(--text-1)]">{item.symbol}</div>
                      </div>
                      <div className="text-[var(--text-1)]">${compact(Number(item.volume))}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
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
                    onClick={() => navigate(`/radar/${item.symbol}`)}
                    className="w-full rounded-xl bg-[var(--bg-2)] border border-[var(--stroke-1)] p-3 text-left"
                  >
                    <div className="flex items-center justify-between gap-3 mb-2">
                      <div className="flex items-center gap-2">
                        <IntelEntityIcon
                          symbol={toEntitySymbol(item.symbol)}
                          className="flex h-8 w-8 items-center justify-center rounded-xl"
                          style={{ backgroundColor: 'rgba(255,255,255,0.06)' }}
                          iconClassName="h-4 w-4"
                        />
                        <div className="text-[var(--text-1)]">{item.symbol}</div>
                        {momentumRanking.findIndex((entry) => entry.symbol === item.symbol) >= 0 ? (
                          <Badge variant="neutral" size="sm">M#{momentumRanking.findIndex((entry) => entry.symbol === item.symbol) + 1}</Badge>
                        ) : null}
                      </div>
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
                <div className="text-sm text-[var(--text-2)]">{marketState?.access ?? 'prévia operacional'}</div>
              </div>
              <div className="rounded-xl bg-[var(--bg-2)] border border-[var(--stroke-1)] p-3">
                <div className="text-[var(--text-1)] mb-1">Execução</div>
                <div className="text-sm text-[var(--text-2)]">{marketState?.execution ?? 'bloqueada'}</div>
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
                Abrir Docs
              </MobileButton>
              <MobileButton variant="secondary" className="w-full" onClick={() => navigate('/vault')}>
                <ArrowUpRight className="w-4 h-4 mr-2" />
                Abrir Vault
              </MobileButton>
            </div>
          </SurfaceCard>
        </>
      )}
    </MobilePageShell>
  );
}
