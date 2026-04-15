import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { AlertTriangle, ArrowUpRight, RefreshCw, ShieldAlert, Waves } from 'lucide-react';

import { Badge, EmptyState, ErrorState, MobileButton, MobilePageShell, SurfaceCard } from '../../components/mobile';
import { IntelEntityIcon } from '../../components/IntelEntityIcon';
import { useRadarOverview } from '../../../hooks/useRadarData';
import { useSeoMeta } from '@/lib/seo/useSeoMeta';
import { buildSwapsHrefFromRadarSymbol } from '../../components/swaps/radarSwapPrefill';

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
  const focusAsset = overview?.focus_asset;
  const regime = overview?.market_regime;
  const hero = overview?.hero;
  const executionRisk = overview?.execution_risk;
  const nextAction = overview?.next_action;
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
    <MobilePageShell
      title="Radar"
      subtitle="Camada de decisao antes da execucao."
      showContext
    >
      <SurfaceCard variant="elevated">
        <div className="flex items-center justify-between gap-3 mb-3">
          <div>
            <div className="text-[var(--text-1)] mb-1">{hero?.headline ?? 'Regime sem ativo em foco.'}</div>
            <div className="text-sm text-[var(--text-2)]">{hero?.summary ?? 'Sem leitura suficiente para decidir.'}</div>
          </div>
          <button
            onClick={() => overviewQuery.refetch()}
            className="w-10 h-10 rounded-2xl border border-[var(--stroke-1)] bg-[var(--bg-2)] text-[var(--text-2)] flex items-center justify-center"
          >
            <RefreshCw className={`w-4 h-4 ${overviewQuery.isFetching ? 'animate-spin' : ''}`} />
          </button>
        </div>

        <div className="grid grid-cols-1 gap-3">
          {(hero?.metrics ?? []).slice(0, 4).map((metric) => (
            <div key={`${metric.label}-${metric.value}`} className="rounded-xl bg-[var(--bg-2)] border border-[var(--stroke-1)] p-3">
              <div className="flex items-center justify-between gap-3 mb-1">
                <div className="text-[10px] uppercase text-[var(--text-3)]">{metric.label}</div>
                <Badge variant={toBadgeVariant(metric.tone)} size="sm">
                  {metric.value}
                </Badge>
              </div>
              {metric.detail ? <div className="text-sm text-[var(--text-2)]">{metric.detail}</div> : null}
            </div>
          ))}
        </div>
      </SurfaceCard>

      <SurfaceCard>
        <div className="flex items-center gap-2 mb-3 text-[var(--text-1)]">
          <ShieldAlert className="w-4 h-4 text-[var(--accent-orange)]" />
          <span>Risco de execucao</span>
        </div>

        {overviewQuery.isLoading && !overview ? (
          <div className="text-sm text-[var(--text-2)]">Sincronizando risco de execucao...</div>
        ) : (overviewQuery.isError || !overview) && !overview ? (
          <ErrorState
            title="Radar indisponivel"
            description="Os dados de mercado nao carregaram agora."
            onRetry={() => overviewQuery.refetch()}
          />
        ) : (
          <>
            <div className="rounded-xl border border-[var(--stroke-1)] p-3 mb-3" style={{ backgroundColor: 'rgba(255,140,66,0.08)' }}>
              <div className="flex items-center justify-between gap-3 mb-2">
                <div className="text-[var(--text-1)]">Risco {executionRisk?.label ?? 'sem dados'}</div>
                <Badge variant={toBadgeVariant(executionRisk?.tone)} size="sm">
                  {executionRisk?.score ?? 0}
                </Badge>
              </div>
              <div className="text-sm text-[var(--text-2)]">{executionRisk?.summary ?? 'Sem leitura suficiente.'}</div>
            </div>

            <div className="space-y-2">
              {(executionRisk?.blockers ?? []).map((blocker) => (
                <div key={blocker} className="rounded-xl bg-[var(--bg-2)] border border-[var(--stroke-1)] p-3 text-sm text-[var(--text-2)]">
                  <div className="flex items-start gap-2">
                    <AlertTriangle className="w-4 h-4 mt-0.5 text-[var(--warning)] shrink-0" />
                    <span>{blocker}</span>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </SurfaceCard>

      <SurfaceCard>
        <div className="flex items-center justify-between gap-3 mb-3">
          <h3 className="text-[var(--text-1)]">Ativo em foco</h3>
          <Badge variant={toBadgeVariant(regime?.tone)} size="sm">
            {regime?.label ?? 'sem dados'}
          </Badge>
        </div>

        {focusAsset ? (
          <div className="space-y-3">
            <div className="rounded-xl bg-[var(--bg-2)] border border-[var(--stroke-1)] p-4">
              <div className="flex items-start justify-between gap-3 mb-4">
                <div className="flex items-start gap-3">
                  <IntelEntityIcon
                    symbol={toEntitySymbol(focusAsset.symbol)}
                    className="flex h-10 w-10 items-center justify-center rounded-2xl"
                    style={{ backgroundColor: 'rgba(255,255,255,0.06)' }}
                    iconClassName="h-5 w-5"
                  />
                  <div>
                    <div className="text-[var(--text-1)] mb-1">{focusAsset.symbol}</div>
                    <div className="text-sm text-[var(--text-2)]">
                      Score {focusAsset.score}, confianca {focusAsset.confidence.label}, liquidez {focusAsset.liquidity.label}.
                    </div>
                  </div>
                </div>
                <div className={focusAsset.change24h >= 0 ? 'text-[var(--success)]' : 'text-[var(--danger)]'}>
                  {focusAsset.change24h >= 0 ? '+' : ''}
                  {(focusAsset.change24h * 100).toFixed(1)}%
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-xl bg-[var(--bg-1)] border border-[var(--stroke-1)] p-3">
                  <div className="text-[10px] uppercase text-[var(--text-3)] mb-1">Preco</div>
                  <div className="text-[var(--text-1)]">${formatPrice(focusAsset.price)}</div>
                </div>
                <div className="rounded-xl bg-[var(--bg-1)] border border-[var(--stroke-1)] p-3">
                  <div className="text-[10px] uppercase text-[var(--text-3)] mb-1">Volume</div>
                  <div className="text-[var(--text-1)]">${compact(Number(focusAsset.volume))}</div>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <EmptyState
            title="Sem ativo em foco"
            description="O Radar nao retornou um ativo suficientemente liquido nesta janela."
          />
        )}
      </SurfaceCard>

      <SurfaceCard>
        <div className="flex items-center gap-2 mb-3 text-[var(--text-1)]">
          <Waves className="w-4 h-4 text-[var(--accent-orange)]" />
          <span>Proxima acao</span>
        </div>

        <div className="text-[var(--text-1)] mb-1">{nextAction?.title ?? 'Contexto antes da execucao.'}</div>
        <div className="text-sm text-[var(--text-2)] mb-4">{nextAction?.summary ?? 'Sem guidance state-based.'}</div>

        <div className="space-y-3">
          {(nextAction?.actions ?? []).map((action) => (
            <MobileButton
              key={`${action.label}-${action.href}`}
              variant={action.tone === 'accent' ? 'primary' : 'secondary'}
              className="w-full justify-between"
              onClick={() => navigate(action.href)}
            >
              <span>{action.label}</span>
              <ArrowUpRight className="w-4 h-4" />
            </MobileButton>
          ))}
        </div>
      </SurfaceCard>

      <SurfaceCard>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-[var(--text-1)]">{overview?.universe_summary.title ?? 'Universo monitorado'}</h3>
          <Badge variant="neutral" size="sm">{movers.length}</Badge>
        </div>
        <div className="text-sm text-[var(--text-2)] mb-3">
          {overview?.universe_summary.summary ?? 'Liquidez viva, regime relativo e selecao rapida do ativo em foco.'}
        </div>

        <div className="flex gap-2 overflow-x-auto pb-1 mb-3">
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

        {movers.length === 0 ? (
          <EmptyState
            title="Sem mercados ao vivo"
            description="O universo monitorado esta vazio agora."
          />
        ) : (
          <div className="space-y-3">
            {movers.map((item) => (
              <div key={item.symbol} className="rounded-xl bg-[var(--bg-2)] border border-[var(--stroke-1)] p-3">
                <button
                  onClick={() => {
                    setActiveSymbol(item.symbol);
                    navigate(`/radar/${item.symbol.toLowerCase()}`);
                  }}
                  className="w-full text-left"
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
                    </div>
                    <div className={item.change24h >= 0 ? 'text-[var(--success)]' : 'text-[var(--danger)]'}>
                      {item.change24h >= 0 ? '+' : ''}
                      {(item.change24h * 100).toFixed(1)}%
                    </div>
                  </div>
                  <div className="flex items-center justify-between gap-3 text-sm text-[var(--text-2)]">
                    <span>${formatPrice(item.price)}</span>
                    <span>Vol ${compact(Number(item.volume))}</span>
                  </div>
                </button>

                <MobileButton
                  variant="secondary"
                  className="w-full mt-3 justify-between"
                  onClick={() => navigate(buildSwapsHrefFromRadarSymbol(item.symbol))}
                >
                  <span>Executar com USDT</span>
                  <ArrowUpRight className="w-4 h-4" />
                </MobileButton>
              </div>
            ))}
          </div>
        )}
      </SurfaceCard>
    </MobilePageShell>
  );
}
