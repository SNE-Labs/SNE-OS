import { useEffect, useMemo, useState, type CSSProperties } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import {
  Activity,
  ArrowUpRight,
  BadgeCheck,
  Clock,
  FileText,
  KeyRound,
  Shield,
  Waves,
  Zap,
} from 'lucide-react';
import { ModuleStateCard } from '../components/sne/ModuleStateCard';
import { StatusBadge } from '../components/sne/StatusBadge';
import { WalletConnect } from '../components/passport/WalletConnect';
import { apiGet } from '@/lib/api/http';
import { normalizeIntelRoute } from '@/services/intel-api';
import { buildHomeIntelSections, type HomeIntelSectionKey } from '@/services/home-intel';
import { formatAddress } from '@/utils/format';

type DashboardPayload = {
  status: { overall_status: string; uptime_percentage: number | null };
  metrics: { latency_ms: number | null; uptime_percentage: number | null; last_proof_minutes: number | null };
  components: Array<{ name: string; status: string; last_check: string }>;
  activities: Array<{ event: string; component: string; time: string; status: string; timestamp: string }>;
  alerts: Array<{ message: string; type: string; time: string }>;
  last_updated: string;
};

type IntelItem = {
  id: string;
  title: string;
  title_pt?: string;
  title_original?: string;
  summary?: string;
  summary_pt?: string;
  url: string;
  source: string;
  source_tier?: string;
  points: number;
  comments: number;
  author: string;
  created_at: string;
  module: string;
  agent_note: string;
  category?: string;
  editorial_kind?: string;
  impact?: {
    label: string;
    score: number;
    direction: string;
  };
  topics?: string[];
  chains?: string[];
  protocols?: string[];
  assets?: string[];
  why_it_matters?: string;
  watch_items?: string[];
};

type MarketMover = {
  symbol: string;
  price: number;
  change24h: number;
  volume: string | number;
  score?: number;
};

type MarketEditorial = {
  status: 'pending' | 'ready' | 'failed';
  headline: string;
  summary_pt: string;
  watch_items: string[];
  highlights: Array<{ symbol: string; note: string }>;
  generated_at: string | null;
};

type HomeResponse = {
  session: { authenticated: boolean; address: string | null };
  wallet: {
    address: string;
    status: string;
    balance_eth: number | null;
    tx_count: number | null;
    account_type: string | null;
    last_updated: string;
  } | null;
  brief: {
    badge: string;
    badge_status: 'active' | 'success' | 'warning' | 'pending';
    headline: string;
    summary: string;
  };
  brief_signals: Array<{ label: string; value: string }>;
  modules: Array<{ title: string; path: string; label: string; status: 'active' | 'success' | 'warning' | 'pending' }>;
  system: {
    tags: Array<{ label: string; value: string }>;
    workspace: Array<{ label: string; value: string }>;
  };
  dashboard: DashboardPayload;
  market: {
    top_movers: MarketMover[];
    top_losers: MarketMover[];
    volume_leaders: MarketMover[];
    regime: { label: string; tone: 'active' | 'success' | 'warning' | 'pending'; avg_change_24h: number };
    editorial: MarketEditorial;
    last_updated: string;
  };
  intel: { items: IntelItem[]; last_updated: string };
  last_updated: string;
};

const OS_NAV = [
  { label: 'Radar', path: '/radar', icon: Waves },
  { label: 'Passport', path: '/pass', icon: BadgeCheck },
  { label: 'Vault', path: '/vault', icon: Shield },
  { label: 'Keys', path: '/keys', icon: KeyRound },
  { label: 'Docs', path: '/docs', icon: FileText },
];

export function Home() {
  const navigate = useNavigate();
  const [now, setNow] = useState(new Date());

  const { data: homeData, isLoading, error } = useQuery({
    queryKey: ['home'],
    queryFn: () => apiGet<HomeResponse>('/api/home'),
    refetchInterval: 30000,
    retry: 3,
  });

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 30000);
    return () => window.clearInterval(timer);
  }, []);

  const liveMovers = homeData?.market.top_movers ?? [];
  const topLosers = homeData?.market.top_losers ?? [];
  const volumeLeaders = homeData?.market.volume_leaders ?? [];
  const marketEditorial = homeData?.market.editorial;
  const marketRegime = homeData?.market.regime;
  const intelItems = homeData?.intel.items ?? [];
  const intelSections = useMemo(() => buildHomeIntelSections(intelItems), [intelItems]);
  const featuredMover = liveMovers[0] ?? null;
  const secondaryMovers = liveMovers.slice(1, 4);
  const brief = homeData?.brief;
  const briefSignals = homeData?.brief_signals ?? [];
  const data = homeData?.dashboard;
  const latestAlert = data?.alerts[0] ?? null;

  const openIntelItem = (url: string) => {
    const normalized = normalizeIntelRoute(url);
    if (normalized.startsWith('/intel/')) {
      navigate(normalized);
      return;
    }
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const formattedTime = useMemo(
    () =>
      new Intl.DateTimeFormat('pt-BR', {
        hour: '2-digit',
        minute: '2-digit',
        weekday: 'short',
        day: 'numeric',
        month: 'short',
      }).format(now),
    [now]
  );

  const intelTitle = (item: IntelItem) => item.title_pt || item.title || item.title_original || 'Leitura Intel';
  const intelSummary = (item: IntelItem) => item.summary_pt || item.summary || item.why_it_matters || item.agent_note;
  const intelMeta = (item: IntelItem) => item.chains?.[0] || item.topics?.[0] || item.assets?.[0] || item.module;
  const intelSectionTheme: Record<
    HomeIntelSectionKey,
    {
      icon: typeof Activity;
      badge: 'active' | 'success' | 'warning' | 'pending';
      panelStyle: CSSProperties;
      toneStyle: CSSProperties;
    }
  > = {
    market: {
      icon: Activity,
      badge: 'warning',
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
      badge: 'active',
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
      badge: 'pending',
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
  const leadIntelSection = intelSections[0] ?? null;
  const leadIntelItem = leadIntelSection?.items[0] ?? null;
  const leadIntelTheme = leadIntelSection ? intelSectionTheme[leadIntelSection.key] : null;
  const secondaryIntelSections = leadIntelSection
    ? intelSections.filter((section) => section.key !== leadIntelSection.key)
    : [];
  const renderIntelTitle = (item: IntelItem, className: string) => {
    if (!item.url) {
      return (
        <div className={className} style={{ color: 'var(--text-1)' }}>
          {intelTitle(item)}
        </div>
      );
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
        className={`${className} inline-flex items-start gap-2 underline decoration-transparent transition-colors hover:decoration-current`}
        style={{ color: 'var(--text-1)' }}
      >
        <span>{intelTitle(item)}</span>
        <ArrowUpRight className="mt-0.5 h-4 w-4 shrink-0" />
      </a>
    );
  };

  const formatCompactNumber = (value: number) =>
    new Intl.NumberFormat('en-US', { notation: 'compact', maximumFractionDigits: 1 }).format(value);

  const formatMarketPrice = (value: number) => {
    if (value >= 1000) return value.toLocaleString('en-US', { maximumFractionDigits: 2 });
    if (value >= 1) return value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 4 });
    return value.toLocaleString('en-US', { minimumFractionDigits: 4, maximumFractionDigits: 6 });
  };

  const workspaceItems = useMemo(
    () =>
      (homeData?.system.workspace ?? [])
        .filter((item) => item.value && item.value !== '--' && item.label !== 'Componentes')
        .map((item, index) => ({
          ...item,
          icon: [Zap, Activity, Clock, BadgeCheck][index] ?? BadgeCheck,
        })),
    [homeData?.system.workspace]
  );

  if (isLoading) {
    return (
      <div className="flex flex-1">
        <div className="flex-1 px-8 py-6 overflow-y-auto">
          <div className="mx-auto max-w-[1480px] py-6">
            <ModuleStateCard
              tone="loading"
              title="Carregando base operacional"
              description="Buscando intel, mercado e contexto de sessão."
            />
          </div>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex flex-1">
        <div className="flex-1 px-8 py-6 overflow-y-auto">
          <div className="mx-auto max-w-[1480px] py-6">
            <ModuleStateCard
              tone="error"
              title="Base operacional indisponível"
              description="Intel, mercado e contexto não carregaram agora."
              actionLabel="Tentar novamente"
              onAction={() => window.location.reload()}
            />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-1">
      <div className="flex-1 px-6 py-4 overflow-y-auto xl:px-8">
        <div className="mx-auto max-w-[1480px] space-y-4">
          {/* ── Intel Hero ─────────────────────────────────────────── */}
          <section
            className="rounded-[28px] px-5 py-5 xl:px-7 xl:py-6"
            style={{
              background: 'radial-gradient(circle at top left, rgba(255,140,66,0.18), transparent 36%), linear-gradient(180deg, rgba(255,255,255,0.02), rgba(0,0,0,0.04))',
              backgroundColor: 'var(--bg-2)',
              borderWidth: '1px',
              borderColor: 'rgba(255,255,255,0.06)',
              boxShadow: 'var(--shadow-2)',
            }}
          >
            <div className="grid grid-cols-1 xl:grid-cols-[1.18fr_0.82fr] gap-6 xl:gap-7">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-3 mb-5">
                  <div className="text-[11px] uppercase tracking-[0.24em]" style={{ color: 'var(--text-3)' }}>
                    Intel Brief
                  </div>
                  <div className="text-sm" style={{ color: 'var(--text-3)' }}>
                    {formattedTime}
                  </div>
                  {homeData?.intel.last_updated ? (
                    <StatusBadge status="active">ao vivo</StatusBadge>
                  ) : null}
                </div>

                {!leadIntelSection || !leadIntelItem || !leadIntelTheme ? (
                  <div className="text-sm" style={{ color: 'var(--text-2)' }}>
                    Nenhum feed de inteligência disponível agora.
                  </div>
                ) : (
                  <>
                    <div className="flex items-center gap-3 mb-5">
                      <div
                        className="flex h-12 w-12 items-center justify-center rounded-[20px]"
                        style={leadIntelTheme.toneStyle}
                      >
                        {(() => {
                          const HeroIcon = intelSectionTheme[leadIntelSection.key].icon;
                          return <HeroIcon className="h-5 w-5" />;
                        })()}
                      </div>
                      <div>
                        <div className="text-xs uppercase tracking-[0.22em]" style={{ color: 'var(--text-3)' }}>
                          {leadIntelSection.kicker}
                        </div>
                        <div className="text-sm font-semibold" style={{ color: 'var(--text-1)' }}>
                          {leadIntelSection.title}
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 mb-4">
                      <StatusBadge status={leadIntelTheme.badge}>{leadIntelItem.source}</StatusBadge>
                      <StatusBadge status="pending">{leadIntelItem.module}</StatusBadge>
                      {leadIntelItem.impact?.label && (
                        <StatusBadge status={leadIntelItem.impact.label === 'alto' ? 'warning' : 'active'}>
                          impacto {leadIntelItem.impact.label}
                        </StatusBadge>
                      )}
                    </div>

                    {renderIntelTitle(leadIntelItem, 'text-3xl xl:text-[2.5rem] font-semibold leading-[1.05] tracking-[-0.03em] text-balance mb-4')}

                    <div className="max-w-3xl text-base xl:text-lg mb-4" style={{ color: 'var(--text-2)', lineHeight: 1.55 }}>
                      {intelSummary(leadIntelItem)}
                    </div>

                    <div className="max-w-3xl text-sm mb-5" style={{ color: 'var(--text-3)' }}>
                      {leadIntelItem.why_it_matters || leadIntelSection.description}
                    </div>

                    <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-xs uppercase tracking-[0.16em]" style={{ color: 'var(--text-3)' }}>
                      <span>{leadIntelItem.points} pts</span>
                      <span>{leadIntelItem.comments} comentários</span>
                      <span>@{leadIntelItem.author}</span>
                      <span>{intelMeta(leadIntelItem)}</span>
                    </div>
                  </>
                )}
              </div>

              <div className="space-y-4">
                <div
                  className="rounded-[24px] p-5"
                  style={{ backgroundColor: 'rgba(10,14,23,0.34)', borderWidth: '1px', borderColor: 'rgba(255,255,255,0.05)' }}
                >
                  <div className="flex items-center justify-between gap-3 mb-3">
                    <div className="text-[11px] uppercase tracking-[0.22em]" style={{ color: 'var(--text-3)' }}>
                      Vigilância imediata
                    </div>
                    <button
                      onClick={() => navigate('/intel')}
                      className="text-sm font-medium"
                      style={{ color: 'var(--accent-orange)' }}
                    >
                      Abrir Intel Brief ↗
                    </button>
                  </div>

                  <div className="space-y-2.5">
                    {(leadIntelItem?.watch_items?.slice(0, 3) ?? []).map((watchItem) => (
                      <div
                        key={watchItem}
                        className="px-1 py-2.5 text-sm border-b last:border-b-0"
                        style={{ borderColor: 'rgba(255,255,255,0.06)', color: 'var(--text-2)' }}
                      >
                        {watchItem}
                      </div>
                    ))}
                    {!leadIntelItem?.watch_items?.length && (
                      <div className="text-sm" style={{ color: 'var(--text-2)' }}>
                        {leadIntelSection?.description ?? 'Sem itens imediatos de monitoramento agora.'}
                      </div>
                    )}
                  </div>
                </div>

                <div className="rounded-[24px] px-5 py-3" style={{ backgroundColor: 'rgba(10,14,23,0.24)', borderWidth: '1px', borderColor: 'rgba(255,255,255,0.05)' }}>
                  {(leadIntelSection?.items.slice(1, 4) ?? []).map((item) => (
                    <div
                      key={item.id}
                      className="py-3 border-b last:border-b-0"
                      style={{ borderColor: 'rgba(255,255,255,0.06)' }}
                    >
                      <div className="flex items-center justify-between gap-3 mb-2">
                        <div className="text-[11px] uppercase tracking-[0.16em]" style={{ color: 'var(--text-3)' }}>
                          {intelMeta(item)}
                        </div>
                        <div className="text-xs" style={{ color: 'var(--text-3)' }}>
                          {item.points} pts
                        </div>
                      </div>
                      {renderIntelTitle(item, 'font-semibold mb-1.5 line-clamp-2')}
                      <div className="text-sm line-clamp-2" style={{ color: 'var(--text-2)' }}>
                        {intelSummary(item)}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </section>

          {/* ── Brief — since last session ─────────────────────────── */}
          {brief && (
            <section
              className="rounded-[24px] px-5 py-5"
              style={{
                background: 'linear-gradient(180deg, rgba(255,255,255,0.015), rgba(0,0,0,0.02))',
                backgroundColor: 'var(--bg-2)',
                borderWidth: '1px',
                borderColor: 'var(--stroke-1)',
              }}
            >
              <div className="grid grid-cols-1 xl:grid-cols-[1.08fr_0.92fr] gap-5">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2 mb-3">
                    <div className="text-[11px] uppercase tracking-[0.22em]" style={{ color: 'var(--text-3)' }}>
                      Desde a última sessão
                    </div>
                    <StatusBadge status={brief.badge_status}>{brief.badge}</StatusBadge>
                  </div>
                  <div className="text-2xl font-semibold mb-2 text-balance" style={{ color: 'var(--text-1)' }}>
                    {brief.headline}
                  </div>
                  <p className="text-sm xl:text-base" style={{ color: 'var(--text-2)' }}>{brief.summary}</p>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  {briefSignals.map((s) => (
                    <div
                      key={s.label}
                      className="rounded-[18px] px-4 py-4"
                      style={{ backgroundColor: 'var(--bg-3)', borderWidth: '1px', borderColor: 'rgba(255,255,255,0.06)' }}
                    >
                      <div className="text-[10px] uppercase mb-1 tracking-[0.16em]" style={{ color: 'var(--text-3)' }}>{s.label}</div>
                      <div className="font-semibold text-base" style={{ color: 'var(--text-1)' }}>{s.value}</div>
                    </div>
                  ))}
                  {briefSignals.length === 0 && (
                    <div className="col-span-2 text-sm" style={{ color: 'var(--text-2)' }}>
                      Sem sinais resumidos para esta sessão.
                    </div>
                  )}
                </div>
              </div>
            </section>
          )}

          {/* ── Intel Stream ──────────────────────────────────────── */}
          {secondaryIntelSections.length > 0 && (
            <section
              className="rounded-[24px] p-5"
              style={{ backgroundColor: 'var(--bg-2)', borderWidth: '1px', borderColor: 'var(--stroke-1)' }}
            >
              <div className="flex items-center justify-between gap-3 mb-4">
                <div>
                  <div className="text-[11px] uppercase tracking-[0.22em]" style={{ color: 'var(--text-3)' }}>
                    Fluxo Intel
                  </div>
                  <div className="text-lg font-semibold" style={{ color: 'var(--text-1)' }}>
                    Inteligência em monitoramento contínuo
                  </div>
                </div>
                <button
                  onClick={() => navigate('/intel')}
                  className="text-sm font-medium"
                  style={{ color: 'var(--accent-orange)' }}
                >
                  Abrir Intel Brief ↗
                </button>
              </div>

              <div className="space-y-3">
                {secondaryIntelSections.map((section) => {
                  const lead = section.items[0];
                  const rest = section.items.slice(1, 3);
                  const SectionIcon = intelSectionTheme[section.key].icon;

                  return (
                    <div
                      key={section.key}
                      className="rounded-[22px] p-4"
                      style={{
                        backgroundColor: 'var(--bg-3)',
                        borderWidth: '1px',
                        ...intelSectionTheme[section.key].panelStyle,
                      }}
                    >
                      <div className="grid grid-cols-1 lg:grid-cols-[0.32fr_0.68fr] gap-4 lg:gap-6">
                        <div className="lg:pr-2">
                          <div className="flex items-start justify-between gap-3 mb-4">
                            <div className="flex items-center gap-3">
                              <div
                                className="flex h-10 w-10 items-center justify-center rounded-2xl"
                                style={intelSectionTheme[section.key].toneStyle}
                              >
                                <SectionIcon className="h-4 w-4" />
                              </div>
                              <div>
                                <div className="text-xs uppercase tracking-[0.16em]" style={{ color: 'var(--text-3)' }}>
                                  {section.kicker}
                                </div>
                                <div className="text-sm font-semibold" style={{ color: 'var(--text-1)' }}>
                                  {section.title}
                                </div>
                              </div>
                            </div>
                            <StatusBadge status={intelSectionTheme[section.key].badge}>{section.items.length}</StatusBadge>
                          </div>

                          <div className="text-sm" style={{ color: 'var(--text-2)' }}>
                            {section.description}
                          </div>
                        </div>

                        <div className="grid grid-cols-1 xl:grid-cols-[1.1fr_0.9fr] gap-3">
                          {lead && (
                            <div
                              className="rounded-[20px] p-4"
                              style={{ backgroundColor: 'rgba(10,14,23,0.34)', borderWidth: '1px', borderColor: 'rgba(255,255,255,0.08)' }}
                            >
                              <div className="text-xs uppercase tracking-[0.14em] mb-1" style={{ color: 'var(--text-3)' }}>
                                {intelMeta(lead)}
                              </div>
                              {renderIntelTitle(lead, 'font-semibold mb-1.5 line-clamp-2')}
                              <div className="text-sm line-clamp-3" style={{ color: 'var(--text-2)' }}>
                                {intelSummary(lead)}
                              </div>
                            </div>
                          )}

                          {rest.length > 0 && (
                            <div className="space-y-2">
                              {rest.map((item) => (
                                <div
                                  key={item.id}
                                  className="rounded-[18px] p-4"
                                  style={{ backgroundColor: 'rgba(10,14,23,0.26)', borderWidth: '1px', borderColor: 'rgba(255,255,255,0.08)' }}
                                >
                                  <div className="text-xs uppercase tracking-[0.14em] mb-1" style={{ color: 'var(--text-3)' }}>
                                    {intelMeta(item)}
                                  </div>
                                  {renderIntelTitle(item, 'text-sm font-medium mb-1 line-clamp-2')}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          )}

          {/* ── Mercado — contexto, não protagonista ─────────────── */}
          <section
            className="rounded-[24px] p-5"
            style={{ backgroundColor: 'var(--bg-2)', borderWidth: '1px', borderColor: 'var(--stroke-1)' }}
          >
            <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
              <div>
                <div className="text-[11px] uppercase tracking-[0.22em]" style={{ color: 'var(--text-3)' }}>
                  Pulso de mercado
                </div>
                <div className="text-lg font-semibold" style={{ color: 'var(--text-1)' }}>
                  Contexto para validar a leitura
                </div>
              </div>
              <button
                onClick={() => navigate('/radar')}
                className="text-sm font-medium"
                style={{ color: 'var(--accent-orange)' }}
              >
                Abrir Radar ↗
              </button>
            </div>

            {!featuredMover ? (
              <div className="text-sm" style={{ color: 'var(--text-2)' }}>
                Dados de mercado indisponíveis. Radar sincronizando.
              </div>
            ) : (
              <div className="grid grid-cols-1 xl:grid-cols-[0.86fr_1.14fr] gap-4">
                <div className="space-y-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <StatusBadge status={marketRegime?.tone ?? 'pending'}>
                      {marketRegime?.label ?? 'sem dados'}
                    </StatusBadge>
                    {marketEditorial?.status === 'ready' && (
                      <StatusBadge status="active">editorial IA</StatusBadge>
                    )}
                  </div>

                  <div
                    className="rounded-[22px] p-5"
                    style={{
                      background: 'linear-gradient(135deg, rgba(255,140,66,0.08), transparent)',
                      backgroundColor: 'var(--bg-3)',
                      borderWidth: '1px',
                      borderColor: 'rgba(255,255,255,0.06)',
                    }}
                  >
                    <div className="flex items-start justify-between gap-3 mb-5">
                      <div>
                        <div className="text-[10px] uppercase tracking-[0.18em] mb-1" style={{ color: 'var(--text-3)' }}>
                          Destaque
                        </div>
                        <div className="text-3xl font-semibold" style={{ color: 'var(--text-1)' }}>
                          {featuredMover.symbol}
                        </div>
                      </div>
                      <div
                        className="rounded-full px-3 py-1 text-sm font-semibold"
                        style={{
                          color: featuredMover.change24h >= 0 ? 'var(--ok-green)' : 'var(--danger-red)',
                          backgroundColor: featuredMover.change24h >= 0 ? 'rgba(34,197,94,0.10)' : 'rgba(239,68,68,0.10)',
                        }}
                      >
                        {featuredMover.change24h >= 0 ? '+' : ''}{(featuredMover.change24h * 100).toFixed(1)}%
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="rounded-[18px] px-4 py-3" style={{ backgroundColor: 'rgba(255,255,255,0.03)' }}>
                        <div className="text-[10px] uppercase mb-1 tracking-[0.14em]" style={{ color: 'var(--text-3)' }}>Preço</div>
                        <div className="font-semibold text-lg" style={{ color: 'var(--text-1)' }}>
                          ${formatMarketPrice(featuredMover.price)}
                        </div>
                      </div>
                      <div className="rounded-[18px] px-4 py-3" style={{ backgroundColor: 'rgba(255,255,255,0.03)' }}>
                        <div className="text-[10px] uppercase mb-1 tracking-[0.14em]" style={{ color: 'var(--text-3)' }}>Volume</div>
                        <div className="font-semibold text-lg" style={{ color: 'var(--text-1)' }}>
                          ${formatCompactNumber(Number(featuredMover.volume))}
                        </div>
                      </div>
                    </div>
                  </div>

                  {marketEditorial && (marketEditorial.headline || marketEditorial.summary_pt || marketEditorial.watch_items.length > 0) && (
                    <div
                      className="rounded-[22px] p-4 space-y-3"
                      style={{ backgroundColor: 'var(--bg-3)', borderWidth: '1px', borderColor: 'rgba(255,255,255,0.06)' }}
                    >
                      <div className="text-[10px] uppercase tracking-[0.18em]" style={{ color: 'var(--text-3)' }}>
                        Narrativa do Mercado
                      </div>
                      {marketEditorial.headline && (
                        <div className="font-semibold text-sm" style={{ color: 'var(--text-1)' }}>
                          {marketEditorial.headline}
                        </div>
                      )}
                      {marketEditorial.summary_pt && (
                        <div className="text-sm" style={{ color: 'var(--text-2)' }}>
                          {marketEditorial.summary_pt}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                <div className="rounded-[22px] p-4" style={{ backgroundColor: 'var(--bg-3)', borderWidth: '1px', borderColor: 'rgba(255,255,255,0.06)' }}>
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
                    <div>
                      <div className="text-[10px] uppercase tracking-[0.18em] mb-3" style={{ color: 'var(--text-3)' }}>
                        Momentum
                      </div>
                      <div className="space-y-1">
                        {secondaryMovers.map((mover) => (
                          <div key={mover.symbol} className="flex items-center justify-between gap-3 py-3 border-b last:border-b-0" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
                            <div className="min-w-0">
                              <div className="font-semibold text-sm" style={{ color: 'var(--text-1)' }}>{mover.symbol}</div>
                              <div className="text-xs" style={{ color: 'var(--text-3)' }}>
                                ${formatMarketPrice(mover.price)}
                              </div>
                            </div>
                            <div className="text-sm font-semibold" style={{ color: mover.change24h >= 0 ? 'var(--ok-green)' : 'var(--danger-red)' }}>
                              {mover.change24h >= 0 ? '+' : ''}{(mover.change24h * 100).toFixed(1)}%
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div>
                      <div className="text-[10px] uppercase tracking-[0.18em] mb-3" style={{ color: 'var(--text-3)' }}>
                        Maiores quedas
                      </div>
                      <div className="space-y-1">
                        {topLosers.slice(0, 3).map((mover) => (
                          <div key={mover.symbol} className="flex items-center justify-between gap-3 py-3 border-b last:border-b-0" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
                            <div className="min-w-0">
                              <div className="font-semibold text-sm" style={{ color: 'var(--text-1)' }}>{mover.symbol}</div>
                              <div className="text-xs" style={{ color: 'var(--text-3)' }}>
                                ${formatMarketPrice(mover.price)}
                              </div>
                            </div>
                            <div className="text-sm font-semibold" style={{ color: 'var(--danger-red)' }}>
                              {(mover.change24h * 100).toFixed(1)}%
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div>
                      <div className="text-[10px] uppercase tracking-[0.18em] mb-3" style={{ color: 'var(--text-3)' }}>
                        Volume dominante
                      </div>
                      <div className="space-y-1">
                        {volumeLeaders.slice(0, 3).map((item) => (
                          <div key={item.symbol} className="py-3 border-b last:border-b-0" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
                            <div className="font-semibold text-sm mb-1" style={{ color: 'var(--text-1)' }}>{item.symbol}</div>
                            <div className="text-xs" style={{ color: 'var(--text-2)' }}>
                              Vol. ${formatCompactNumber(Number(item.volume))}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </section>

          {/* ── Operational Ribbon ────────────────────────────────── */}
          <section className="grid grid-cols-1 xl:grid-cols-[1fr_auto] gap-4">
            <div
              className="rounded-[22px] px-4 py-3"
              style={{ backgroundColor: 'var(--bg-2)', borderWidth: '1px', borderColor: 'var(--stroke-1)' }}
            >
              <div className="grid grid-cols-1 md:grid-cols-[auto_auto_auto_1fr_auto] gap-3 items-center">
                <div className="text-sm" style={{ color: 'var(--text-3)' }}>{formattedTime}</div>
                <div className="text-sm" style={{ color: 'var(--text-2)' }}>
                  {homeData?.session.authenticated ? 'sessão conectada' : 'sessão anônima'}
                </div>
                <div className="text-sm" style={{ color: 'var(--text-2)' }}>
                  {liveMovers.length > 0 ? 'mercado sincronizado' : 'mercado parcial'}
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  {workspaceItems.slice(0, 3).map((item) => (
                    <StatusBadge key={item.label} status="pending">
                      {item.label}: {item.value}
                    </StatusBadge>
                  ))}
                  {latestAlert ? (
                    <StatusBadge status={latestAlert.type === 'warning' ? 'warning' : latestAlert.type === 'error' ? 'pending' : 'active'}>
                      alerta: {latestAlert.message}
                    </StatusBadge>
                  ) : null}
                </div>
                <div className="flex items-center gap-3 justify-start md:justify-end">
                  {homeData?.session.address && (
                    <span className="text-sm font-mono" style={{ color: 'var(--text-2)' }}>
                      {formatAddress(homeData.session.address)}
                    </span>
                  )}
                  <WalletConnect />
                </div>
              </div>
            </div>

            <div
              className="rounded-[22px] p-4 self-start"
              style={{ backgroundColor: 'var(--bg-2)', borderWidth: '1px', borderColor: 'var(--stroke-1)' }}
            >
              <div className="mb-3 text-sm font-semibold" style={{ color: 'var(--text-2)' }}>OS</div>
              <div className="flex flex-col gap-2">
                {OS_NAV.map((item) => {
                  const Icon = item.icon;
                  return (
                    <button
                      key={item.path}
                      onClick={() => navigate(item.path)}
                      className="flex items-center justify-between gap-3 rounded-[16px] px-3 py-2.5 text-left"
                      style={{ backgroundColor: 'var(--bg-3)', borderWidth: '1px', borderColor: 'rgba(255,255,255,0.06)' }}
                    >
                      <div className="flex items-center gap-2.5">
                        <Icon className="w-3.5 h-3.5" style={{ color: 'var(--accent-orange)' }} />
                        <span className="text-sm font-medium" style={{ color: 'var(--text-1)' }}>{item.label}</span>
                      </div>
                      <ArrowUpRight className="w-3.5 h-3.5" style={{ color: 'var(--text-3)' }} />
                    </button>
                  );
                })}
              </div>
            </div>
          </section>

        </div>
      </div>
    </div>
  );
}
