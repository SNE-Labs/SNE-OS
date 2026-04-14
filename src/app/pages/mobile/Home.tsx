import { useMemo, type CSSProperties } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Activity, ArrowUpRight, Shield, Waves, Wallet, Zap } from 'lucide-react';

import { Badge, EmptyState, ErrorState, LoadingSkeletonGroup, MobileButton, MobilePageShell, SurfaceCard } from '../../components/mobile';
import { apiGet } from '@/lib/api/http';
import { buildHomeIntelSections, type HomeIntelSectionKey } from '@/services/home-intel';
import { normalizeIntelRoute } from '@/services/intel-api';
import { formatAddress } from '@/utils/format';

type HomeResponse = {
  session: {
    authenticated: boolean;
    address: string | null;
  };
  brief: {
    badge: string;
    badge_status: 'active' | 'success' | 'warning' | 'pending';
    headline: string;
    summary: string;
  };
  brief_signals: Array<{ label: string; value: string }>;
  modules: Array<{
    title: string;
    path: string;
    label: string;
    status: 'active' | 'success' | 'warning' | 'pending';
  }>;
  market: {
    top_movers: Array<{
      symbol: string;
      price: number;
      change24h: number;
      volume: string | number;
    }>;
    top_losers?: Array<{
      symbol: string;
      price: number;
      change24h: number;
      volume: string | number;
    }>;
    volume_leaders?: Array<{
      symbol: string;
      price: number;
      change24h: number;
      volume: string | number;
    }>;
    regime?: {
      label: string;
      tone: 'active' | 'success' | 'warning' | 'pending';
      avg_change_24h: number;
    };
    editorial?: {
      status: 'pending' | 'ready' | 'failed';
      headline: string;
      summary_pt: string;
      watch_items: string[];
      highlights: Array<{ symbol: string; note: string }>;
      generated_at: string | null;
    };
  };
  intel: {
    items: Array<{
      id: string;
      title: string;
      title_pt?: string;
      title_original?: string;
      summary?: string;
      summary_pt?: string;
      url: string;
      source: string;
      module: string;
      category?: string;
      editorial_kind?: string;
      impact?: {
        label: string;
        score: number;
      };
      topics?: string[];
      chains?: string[];
      assets?: string[];
      why_it_matters?: string;
      watch_items?: string[];
    }>;
  };
  identity?: {
    status?: {
      label?: string;
      tone?: 'active' | 'success' | 'warning' | 'pending';
    };
    linked_accounts_count?: number;
    active_networks?: number;
  };
  capital?: {
    aggregate?: {
      total_value_display?: string;
      active_networks?: number;
    };
  };
  secrets?: {
    item_count?: number;
    ready_vaults?: number;
  };
};

function toBadgeVariant(
  tone?: 'active' | 'success' | 'warning' | 'pending'
): 'success' | 'warning' | 'neutral' | 'orange' {
  if (tone === 'success') return 'success';
  if (tone === 'warning') return 'warning';
  if (tone === 'active') return 'orange';
  return 'neutral';
}

function formatCompactNumber(value: number) {
  return new Intl.NumberFormat('en-US', {
    notation: 'compact',
    maximumFractionDigits: 1,
  }).format(value);
}

function formatPrice(value: number) {
  if (value >= 1000) return value.toLocaleString('en-US', { maximumFractionDigits: 2 });
  if (value >= 1) return value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 4 });
  return value.toLocaleString('en-US', { minimumFractionDigits: 4, maximumFractionDigits: 6 });
}

export function MobileHome() {
  const navigate = useNavigate();
  const homeQuery = useQuery({
    queryKey: ['home', 'mobile'],
    queryFn: () => apiGet<HomeResponse>('/api/home'),
    retry: 2,
    refetchInterval: 30000,
  });

  const home = homeQuery.data;
  const movers = home?.market.top_movers?.slice(0, 3) ?? [];
  const losers = home?.market.top_losers?.slice(0, 2) ?? [];
  const volumeLeaders = home?.market.volume_leaders?.slice(0, 2) ?? [];
  const marketEditorial = home?.market.editorial;
  const marketRegime = home?.market.regime;
  const intelItems = home?.intel.items ?? [];
  const intelSections = useMemo(() => buildHomeIntelSections(intelItems), [intelItems]);
  const orderedModules = useMemo(() => {
    const priority: Record<string, number> = {
      '/radar': 0,
      '/vault': 1,
      '/pass': 2,
      '/keys': 3,
      '/secrets': 4,
      '/docs': 5,
    };
    return [...(home?.modules ?? [])].sort((left, right) => {
      const leftScore = priority[left.path] ?? 99;
      const rightScore = priority[right.path] ?? 99;
      return leftScore - rightScore;
    });
  }, [home?.modules]);
  const intelTitle = (item: NonNullable<HomeResponse['intel']>['items'][number]) =>
    item.title_pt || item.title || item.title_original || 'Intel item';
  const intelSummary = (item: NonNullable<HomeResponse['intel']>['items'][number]) =>
    item.summary_pt || item.summary || item.why_it_matters || 'Briefing operacional disponível.';
  const intelMeta = (item: NonNullable<HomeResponse['intel']>['items'][number]) =>
    item.chains?.[0] || item.topics?.[0] || item.assets?.[0] || item.module;
  const intelSectionTheme: Record<
    HomeIntelSectionKey,
    {
      icon: typeof Activity;
      badge: 'success' | 'warning' | 'neutral' | 'orange';
      panelStyle: CSSProperties;
      toneStyle: CSSProperties;
    }
  > = {
    market: {
      icon: Activity,
      badge: 'orange',
      panelStyle: {
        background: 'linear-gradient(135deg, rgba(255,140,66,0.14), rgba(255,255,255,0.02))',
        borderColor: 'rgba(255,140,66,0.24)',
      },
      toneStyle: {
        backgroundColor: 'rgba(255,140,66,0.12)',
        color: 'var(--accent-orange)',
      },
    },
    tech: {
      icon: Zap,
      badge: 'neutral',
      panelStyle: {
        background: 'linear-gradient(135deg, rgba(74,144,226,0.12), rgba(255,255,255,0.02))',
        borderColor: 'rgba(74,144,226,0.22)',
      },
      toneStyle: {
        backgroundColor: 'rgba(74,144,226,0.12)',
        color: '#7cb4ff',
      },
    },
    politica: {
      icon: Shield,
      badge: 'warning',
      panelStyle: {
        background: 'linear-gradient(135deg, rgba(201,173,93,0.12), rgba(255,255,255,0.02))',
        borderColor: 'rgba(201,173,93,0.22)',
      },
      toneStyle: {
        backgroundColor: 'rgba(201,173,93,0.12)',
        color: '#d9ba67',
      },
    },
    cripto: {
      icon: Waves,
      badge: 'success',
      panelStyle: {
        background: 'linear-gradient(135deg, rgba(77,201,144,0.12), rgba(255,255,255,0.02))',
        borderColor: 'rgba(77,201,144,0.22)',
      },
      toneStyle: {
        backgroundColor: 'rgba(77,201,144,0.12)',
        color: '#74dca8',
      },
    },
  };
  const metrics = useMemo(
    () => [
      { label: 'Identity', value: home?.identity?.status?.label ?? 'offline' },
      { label: 'Networks', value: `${home?.capital?.aggregate?.active_networks ?? home?.identity?.active_networks ?? 0}` },
      { label: 'Secrets', value: `${home?.secrets?.item_count ?? 0}` },
    ],
    [home]
  );

  const openIntelItem = (url: string) => {
    const normalized = normalizeIntelRoute(url);
    if (normalized.startsWith('/intel/')) {
      navigate(normalized);
      return;
    }
    window.location.assign(url);
  };

  const renderIntelTitle = (item: NonNullable<HomeResponse['intel']>['items'][number]) => {
    if (!item.url) {
      return <div className="text-[var(--text-1)] mb-2">{intelTitle(item)}</div>;
    }

    const href = normalizeIntelRoute(item.url);
    const isInternal = href.startsWith('/intel/');

    return (
      <a
        href={href}
        onClick={(event) => {
          if (isInternal) {
            event.preventDefault();
            navigate(href);
            return;
          }
          event.preventDefault();
          openIntelItem(item.url);
        }}
        target={isInternal ? undefined : '_blank'}
        rel={isInternal ? undefined : 'noopener noreferrer'}
        className="mb-2 inline-flex items-start gap-2 text-[var(--text-1)] underline decoration-transparent hover:decoration-current"
      >
        <span>{intelTitle(item)}</span>
        <ArrowUpRight className="mt-0.5 h-4 w-4 shrink-0" />
      </a>
    );
  };

  return (
    <MobilePageShell
      title="SNE OS"
      subtitle="Radar, intelligence e operações multichain."
      showContext
    >
      {homeQuery.isLoading ? (
        <LoadingSkeletonGroup count={4} />
      ) : homeQuery.isError || !home ? (
        <ErrorState
          title="Home indisponível"
          description="A superfície principal do OS não carregou agora."
          onRetry={() => homeQuery.refetch()}
        />
      ) : (
        <>
          <SurfaceCard variant="elevated">
            <div className="flex items-start gap-3 mb-4">
              <div className="w-11 h-11 rounded-2xl bg-[var(--accent-orange-dim)] text-[var(--accent-orange)] flex items-center justify-center">
                <Wallet className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <div className="text-[var(--text-1)] mb-1">
                  {home.session.address ? formatAddress(home.session.address) : 'Sessão sem carteira'}
                </div>
                <p className="text-sm text-[var(--text-2)]">{home.brief.summary}</p>
              </div>
            </div>

            <div className="text-[11px] uppercase tracking-[0.18em] text-[var(--text-3)] mb-1">Hub operacional</div>
            <h2 className="text-[var(--text-1)] mb-4">{home.brief.headline}</h2>

            <div className="grid grid-cols-3 gap-3 mb-4">
              {metrics.map((item) => (
                <div key={item.label} className="rounded-xl bg-[var(--bg-2)] border border-[var(--stroke-1)] p-3">
                  <div className="text-[10px] uppercase text-[var(--text-3)] mb-1">{item.label}</div>
                  <div className="text-[var(--text-1)]">{item.value}</div>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-1 gap-2 mb-4">
              {home.brief_signals.slice(0, 3).map((signal) => (
                <div key={signal.label} className="rounded-xl bg-[var(--bg-2)] border border-[var(--stroke-1)] px-3 py-2.5">
                  <div className="text-[10px] uppercase text-[var(--text-3)] mb-1">{signal.label}</div>
                  <div className="text-sm text-[var(--text-1)] break-words">{signal.value}</div>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <MobileButton className="w-full" onClick={() => navigate(home.session.authenticated ? '/vault' : '/pass')}>
                {home.session.authenticated ? 'Abrir Vault' : 'Conectar carteira'}
              </MobileButton>
              <MobileButton variant="secondary" className="w-full" onClick={() => navigate('/radar')}>
                Abrir Radar
              </MobileButton>
            </div>
          </SurfaceCard>

          <SurfaceCard>
            <div className="flex items-center justify-between mb-3">
              <div>
                <h3 className="text-[var(--text-1)]">Market Pulse</h3>
                <div className="text-xs text-[var(--text-3)] mt-1">Regime, fluxo e leitura tática para a próxima janela.</div>
              </div>
              <MobileButton variant="secondary" onClick={() => navigate('/radar')}>
                Radar
              </MobileButton>
            </div>

            {movers.length === 0 ? (
              <EmptyState
                title="Sem tape ao vivo"
                description="O market pulse volta a aparecer assim que o Radar trouxer novos dados."
              />
            ) : (
              <div className="space-y-3">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant={toBadgeVariant(marketRegime?.tone)} size="sm">{marketRegime?.label ?? 'sem dados'}</Badge>
                  {marketEditorial?.status === 'ready' && <Badge variant="orange" size="sm">editorial</Badge>}
                </div>

                {marketEditorial && (marketEditorial.headline || marketEditorial.summary_pt) && (
                  <div className="rounded-2xl bg-[var(--bg-2)] border border-[var(--stroke-1)] p-4 space-y-2">
                    {marketEditorial.headline && <div className="text-[var(--text-1)]">{marketEditorial.headline}</div>}
                    {marketEditorial.summary_pt && <div className="text-sm text-[var(--text-2)]">{marketEditorial.summary_pt}</div>}
                    {marketEditorial.watch_items?.length ? (
                      <div className="flex flex-wrap gap-2 pt-1">
                        {marketEditorial.watch_items.slice(0, 3).map((item) => (
                          <Badge key={item} variant="neutral" size="sm">{item}</Badge>
                        ))}
                      </div>
                    ) : null}
                  </div>
                )}

                {movers[0] && (
                  <div className="rounded-2xl bg-[var(--bg-2)] border border-[var(--stroke-1)] p-4">
                    <div className="flex items-center justify-between gap-3 mb-2">
                      <div>
                        <div className="text-[10px] uppercase tracking-[0.16em] text-[var(--text-3)] mb-1">Líder do fluxo</div>
                        <div className="text-[var(--text-1)]">{movers[0].symbol}</div>
                      </div>
                      <div className={movers[0].change24h >= 0 ? 'text-[var(--success)]' : 'text-[var(--danger)]'}>
                        {movers[0].change24h >= 0 ? '+' : ''}{(movers[0].change24h * 100).toFixed(1)}%
                      </div>
                    </div>
                    <div className="flex items-center justify-between gap-3 text-sm text-[var(--text-2)]">
                      <span>${formatPrice(movers[0].price)}</span>
                      <span>Vol ${formatCompactNumber(Number(movers[0].volume))}</span>
                    </div>
                  </div>
                )}

                {(movers.slice(1, 3).length > 0 || volumeLeaders.length > 0 || losers.length > 0) && (
                  <div className="grid grid-cols-1 gap-3">
                    {movers.slice(1, 3).length > 0 && (
                      <div className="rounded-xl bg-[var(--bg-2)] border border-[var(--stroke-1)] p-3">
                        <div className="text-xs uppercase text-[var(--text-3)] mb-2">Continuação do movimento</div>
                        <div className="space-y-2">
                          {movers.slice(1, 3).map((item) => (
                            <div key={item.symbol} className="flex items-center justify-between gap-3 text-sm">
                              <span className="text-[var(--text-1)]">{item.symbol}</span>
                              <span className={item.change24h >= 0 ? 'text-[var(--success)]' : 'text-[var(--danger)]'}>
                                {item.change24h >= 0 ? '+' : ''}{(item.change24h * 100).toFixed(1)}%
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {volumeLeaders.length > 0 && (
                      <div className="rounded-xl bg-[var(--bg-2)] border border-[var(--stroke-1)] p-3">
                        <div className="text-xs uppercase text-[var(--text-3)] mb-2">Volume dominante</div>
                        <div className="space-y-2">
                          {volumeLeaders.slice(0, 2).map((item) => (
                            <div key={item.symbol} className="flex items-center justify-between gap-3 text-sm">
                              <span className="text-[var(--text-1)]">{item.symbol}</span>
                              <span className="text-[var(--text-2)]">${formatCompactNumber(Number(item.volume))}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {losers.length > 0 && (
                      <div className="rounded-xl bg-[var(--bg-2)] border border-[var(--stroke-1)] p-3">
                        <div className="text-xs uppercase text-[var(--text-3)] mb-2">Pressão vendedora</div>
                        <div className="space-y-2">
                          {losers.slice(0, 2).map((item) => (
                            <div key={item.symbol} className="flex items-center justify-between gap-3 text-sm">
                              <span className="text-[var(--text-1)]">{item.symbol}</span>
                              <span className="text-[var(--danger)]">{(item.change24h * 100).toFixed(1)}%</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </SurfaceCard>

          <SurfaceCard>
            <div className="flex items-center justify-between mb-3">
              <div>
                <h3 className="text-[var(--text-1)]">Intelligence Layer</h3>
                <div className="text-xs text-[var(--text-3)] mt-1">Leitura editorial organizada por tema, não por ruído de feed.</div>
              </div>
              <MobileButton variant="secondary" onClick={() => navigate('/intel')}>
                Intel
              </MobileButton>
            </div>

            {intelSections.length === 0 ? (
              <EmptyState
                title="Sem briefing agora"
                description="O Intel aparece aqui assim que o feed editorial estiver disponível."
              />
            ) : (
              <div className="space-y-3">
                <div className="flex flex-wrap gap-2">
                  {intelSections.map((section) => (
                    <Badge key={section.key} variant={intelSectionTheme[section.key].badge} size="sm">
                      {section.shortTitle}
                    </Badge>
                  ))}
                </div>

                {intelSections.map((section) => {
                  const lead = section.items[0];
                  const rest = section.items.slice(1, 2);
                  const SectionIcon = intelSectionTheme[section.key].icon;

                  return (
                    <div
                      key={section.key}
                      className="w-full rounded-2xl border p-4 text-left"
                      style={intelSectionTheme[section.key].panelStyle}
                    >
                      <div className="flex items-start justify-between gap-3 mb-3">
                        <div className="flex items-center gap-3">
                          <div
                            className="flex h-10 w-10 items-center justify-center rounded-2xl"
                            style={intelSectionTheme[section.key].toneStyle}
                          >
                            <SectionIcon className="h-4 w-4" />
                          </div>
                          <div>
                            <div className="text-[10px] uppercase tracking-[0.18em] text-[var(--text-3)]">{section.kicker}</div>
                            <div className="text-[var(--text-1)]">{section.title}</div>
                          </div>
                        </div>
                        <Badge variant={intelSectionTheme[section.key].badge} size="sm">
                          {section.items.length}
                        </Badge>
                      </div>

                      <div className="text-sm text-[var(--text-2)] mb-3">{section.description}</div>

                      {lead && (
                        <div className="rounded-xl bg-[rgba(10,14,23,0.42)] border border-[rgba(255,255,255,0.08)] p-3 mb-3">
                          <div className="flex items-center justify-between gap-3 mb-1">
                            <div className="text-xs uppercase text-[var(--text-3)]">{lead.source}</div>
                            <Badge variant={lead.impact?.label === 'alto' ? 'warning' : intelSectionTheme[section.key].badge} size="sm">
                              {intelMeta(lead)}
                            </Badge>
                          </div>
                          {renderIntelTitle(lead)}
                          <div className="text-sm text-[var(--text-2)] mb-2">{intelSummary(lead)}</div>
                          {section.key === 'market' && lead.watch_items?.length ? (
                            <div className="space-y-2">
                              {lead.watch_items.slice(0, 2).map((watchItem) => (
                                <div key={watchItem} className="text-xs text-[var(--text-3)]">
                                  {watchItem}
                                </div>
                              ))}
                            </div>
                          ) : (
                            <div className="text-xs text-[var(--text-3)]">{lead.why_it_matters || intelMeta(lead)}</div>
                          )}
                        </div>
                      )}

                      {rest.length > 0 && (
                        <div className="space-y-2">
                          {rest.map((item) => (
                            <div
                              key={item.id}
                              className="rounded-xl bg-[rgba(10,14,23,0.32)] border border-[rgba(255,255,255,0.08)] p-3"
                            >
                              <div className="text-xs uppercase text-[var(--text-3)] mb-1">{intelMeta(item)}</div>
                              {renderIntelTitle(item)}
                              <div className="text-sm text-[var(--text-2)]">{intelSummary(item)}</div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </SurfaceCard>

          <SurfaceCard>
            <div className="flex items-center justify-between mb-3">
              <div>
                <h3 className="text-[var(--text-1)]">Espaços do OS</h3>
                <div className="text-xs text-[var(--text-3)] mt-1">Acesso secundário, utilidades e estados dos módulos.</div>
              </div>
              <Badge variant="neutral" size="sm">{orderedModules.length}</Badge>
            </div>

            <div className="space-y-3">
              {orderedModules.map((module) => (
                <button
                  key={module.path}
                  onClick={() => navigate(module.path)}
                  className="w-full rounded-xl bg-[var(--bg-2)] border border-[var(--stroke-1)] p-3 text-left"
                >
                  <div className="flex items-center justify-between gap-3 mb-1">
                    <div className="text-[var(--text-1)]">{module.title}</div>
                    <Badge variant={toBadgeVariant(module.status)} size="sm">{module.label}</Badge>
                  </div>
                  <div className="text-sm text-[var(--text-2)]">Abrir {module.title} dentro do OS.</div>
                </button>
              ))}
            </div>
          </SurfaceCard>
        </>
      )}
    </MobilePageShell>
  );
}
