import { useEffect, useMemo, useState } from 'react';
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
  const featuredIntel = intelItems[0];
  const secondaryIntel = intelItems.slice(1, 5);
  const featuredMover = liveMovers[0] ?? null;
  const secondaryMovers = liveMovers.slice(1, 4);
  const brief = homeData?.brief;
  const briefSignals = homeData?.brief_signals ?? [];
  const data = homeData?.dashboard;

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

  const intelTitle = (item: IntelItem) => item.title_pt || item.title || item.title_original || 'Intel item';
  const intelSummary = (item: IntelItem) => item.summary_pt || item.summary || item.why_it_matters || item.agent_note;
  const intelMeta = (item: IntelItem) => item.chains?.[0] || item.topics?.[0] || item.assets?.[0] || item.module;
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
      (homeData?.system.workspace ?? []).map((item, index) => ({
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

          {/* ── Status bar ─────────────────────────────────────────── */}
          <div
            className="rounded-xl px-4 py-2.5 flex flex-wrap items-center justify-between gap-3"
            style={{ backgroundColor: 'var(--bg-2)', borderWidth: '1px', borderColor: 'var(--stroke-1)' }}
          >
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm" style={{ color: 'var(--text-3)' }}>{formattedTime}</span>
              <StatusBadge status={homeData?.session.authenticated ? 'active' : 'pending'}>
                {homeData?.session.authenticated ? 'sessão ativa' : 'sem sessão'}
              </StatusBadge>
              <StatusBadge status={liveMovers.length > 0 ? 'active' : 'pending'}>
                {liveMovers.length > 0 ? 'mercado ao vivo' : 'mercado offline'}
              </StatusBadge>
              <StatusBadge status={data.status.overall_status === 'Operational' ? 'success' : 'warning'}>
                {data.status.overall_status}
              </StatusBadge>
            </div>
            <div className="flex items-center gap-3">
              {homeData?.session.address && (
                <span className="text-sm font-mono" style={{ color: 'var(--text-2)' }}>
                  {formatAddress(homeData.session.address)}
                </span>
              )}
              <WalletConnect />
            </div>
          </div>

          {/* ── Intel + Mercado (above the fold) ───────────────────── */}
          <section className="grid grid-cols-1 xl:grid-cols-[1.4fr_0.6fr] gap-4">

            {/* Intel Feed */}
            <div
              className="rounded-xl p-5"
              style={{ backgroundColor: 'var(--bg-2)', borderWidth: '1px', borderColor: 'var(--stroke-1)' }}
            >
              <div className="flex items-center justify-between mb-4">
                <div className="text-sm font-semibold" style={{ color: 'var(--text-2)' }}>Intel</div>
                <span className="text-xs" style={{ color: 'var(--text-3)' }}>
                  {homeData?.intel.last_updated ? 'ao vivo' : ''}
                </span>
              </div>

              {!featuredIntel ? (
                <div className="text-sm" style={{ color: 'var(--text-2)' }}>Nenhum feed disponível agora.</div>
              ) : (
                <div className="space-y-3">
                  {/* Featured */}
                  <div
                    className="w-full rounded-xl p-5 text-left"
                    style={{
                      background: 'linear-gradient(135deg, rgba(255,140,66,0.08), rgba(255,255,255,0.02))',
                      backgroundColor: 'var(--bg-3)',
                      borderWidth: '1px',
                      borderColor: 'var(--stroke-1)',
                    }}
                  >
                    <div className="flex flex-wrap items-center gap-2 mb-2">
                      <StatusBadge status="active">{featuredIntel.source}</StatusBadge>
                      <StatusBadge status="pending">{featuredIntel.module}</StatusBadge>
                      {featuredIntel.impact?.label && (
                        <StatusBadge status={featuredIntel.impact.label === 'alto' ? 'warning' : 'active'}>
                          impacto {featuredIntel.impact.label}
                        </StatusBadge>
                      )}
                    </div>
                    {renderIntelTitle(featuredIntel, 'text-lg font-semibold mb-2 text-balance')}
                    <div className="text-sm mb-3" style={{ color: 'var(--text-2)' }}>
                      {intelSummary(featuredIntel)}
                    </div>
                    {featuredIntel.title_original && featuredIntel.title_original !== intelTitle(featuredIntel) && (
                      <div className="text-xs mb-3 line-clamp-1" style={{ color: 'var(--text-3)' }}>
                        Original: {featuredIntel.title_original}
                      </div>
                    )}
                    <div className="text-xs mb-3" style={{ color: 'var(--text-3)' }}>
                      {featuredIntel.why_it_matters || 'Sem nota editorial adicional.'}
                    </div>
                    <div className="flex flex-wrap items-center gap-4 text-xs" style={{ color: 'var(--text-3)' }}>
                      <span>{featuredIntel.points} pts</span>
                      <span>{featuredIntel.comments} comentários</span>
                      <span>@{featuredIntel.author}</span>
                      <span>{intelMeta(featuredIntel)}</span>
                    </div>
                  </div>

                  {/* Secondary grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {secondaryIntel.map((item) => (
                      <div
                        key={item.id}
                        className="w-full rounded-lg p-4 text-left"
                        style={{ backgroundColor: 'var(--bg-3)', borderWidth: '1px', borderColor: 'var(--stroke-1)' }}
                      >
                        <div className="flex items-center justify-between gap-3 mb-2">
                          <div className="text-xs uppercase tracking-[0.14em]" style={{ color: 'var(--text-3)' }}>
                            {intelMeta(item)}
                          </div>
                          <div className="text-xs" style={{ color: 'var(--text-3)' }}>{item.points} pts</div>
                        </div>
                        {renderIntelTitle(item, 'font-semibold mb-1.5 line-clamp-2')}
                        <div className="text-sm line-clamp-2" style={{ color: 'var(--text-2)' }}>
                          {intelSummary(item)}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Mercado */}
            <div
              className="rounded-xl p-5"
              style={{ backgroundColor: 'var(--bg-2)', borderWidth: '1px', borderColor: 'var(--stroke-1)' }}
            >
              <div className="flex items-center justify-between mb-4">
                <div className="text-sm font-semibold" style={{ color: 'var(--text-2)' }}>Mercado</div>
                <button
                  onClick={() => navigate('/radar')}
                  className="text-sm font-medium"
                  style={{ color: 'var(--accent-orange)' }}
                >
                  Radar ↗
                </button>
              </div>

              {!featuredMover ? (
                <div className="text-sm" style={{ color: 'var(--text-2)' }}>
                  Dados de mercado indisponíveis. Radar sincronizando.
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <StatusBadge status={marketRegime?.tone ?? 'pending'}>
                      {marketRegime?.label ?? 'sem dados'}
                    </StatusBadge>
                    {marketEditorial?.status === 'ready' && (
                      <StatusBadge status="active">editorial IA</StatusBadge>
                    )}
                  </div>

                  {/* Featured mover */}
                  <div
                    className="rounded-xl p-4"
                    style={{
                      background: 'linear-gradient(135deg, rgba(255,140,66,0.09), transparent)',
                      backgroundColor: 'var(--bg-3)',
                      borderWidth: '1px',
                      borderColor: 'var(--stroke-1)',
                    }}
                  >
                    <div className="flex items-start justify-between gap-3 mb-4">
                      <div>
                        <div className="text-[10px] uppercase tracking-widest mb-1" style={{ color: 'var(--text-3)' }}>
                          Destaque
                        </div>
                        <div className="text-xl font-semibold" style={{ color: 'var(--text-1)' }}>
                          {featuredMover.symbol}
                        </div>
                      </div>
                      <div
                        className="rounded-full px-3 py-1 text-sm font-semibold"
                        style={{
                          color: featuredMover.change24h >= 0 ? 'var(--ok-green)' : 'var(--error-red)',
                          backgroundColor: featuredMover.change24h >= 0 ? 'rgba(34,197,94,0.10)' : 'rgba(239,68,68,0.10)',
                        }}
                      >
                        {featuredMover.change24h >= 0 ? '+' : ''}{(featuredMover.change24h * 100).toFixed(1)}%
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div
                        className="rounded-lg px-3 py-2"
                        style={{ backgroundColor: 'rgba(255,255,255,0.03)', borderWidth: '1px', borderColor: 'var(--stroke-1)' }}
                      >
                        <div className="text-[10px] uppercase mb-0.5" style={{ color: 'var(--text-3)' }}>Preço</div>
                        <div className="font-semibold text-sm" style={{ color: 'var(--text-1)' }}>
                          ${formatMarketPrice(featuredMover.price)}
                        </div>
                      </div>
                      <div
                        className="rounded-lg px-3 py-2"
                        style={{ backgroundColor: 'rgba(255,255,255,0.03)', borderWidth: '1px', borderColor: 'var(--stroke-1)' }}
                      >
                        <div className="text-[10px] uppercase mb-0.5" style={{ color: 'var(--text-3)' }}>Volume</div>
                        <div className="font-semibold text-sm" style={{ color: 'var(--text-1)' }}>
                          ${formatCompactNumber(Number(featuredMover.volume))}
                        </div>
                      </div>
                    </div>
                  </div>

                  {marketEditorial && (marketEditorial.headline || marketEditorial.summary_pt || marketEditorial.watch_items.length > 0) && (
                    <div
                      className="rounded-xl p-4 space-y-3"
                      style={{ backgroundColor: 'var(--bg-3)', borderWidth: '1px', borderColor: 'var(--stroke-1)' }}
                    >
                      <div className="text-[10px] uppercase tracking-widest" style={{ color: 'var(--text-3)' }}>
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
                      {marketEditorial.highlights.length > 0 && (
                        <div className="grid grid-cols-1 gap-2">
                          {marketEditorial.highlights.map((highlight) => (
                            <div key={highlight.symbol} className="rounded-lg px-3 py-2" style={{ backgroundColor: 'rgba(255,255,255,0.03)' }}>
                              <div className="text-xs font-semibold mb-1" style={{ color: 'var(--text-1)' }}>
                                {highlight.symbol}
                              </div>
                              <div className="text-xs" style={{ color: 'var(--text-2)' }}>
                                {highlight.note}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                      {marketEditorial.watch_items.length > 0 && (
                        <div className="flex flex-wrap gap-2">
                          {marketEditorial.watch_items.map((item) => (
                            <StatusBadge key={item} status="pending">{item}</StatusBadge>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Secondary movers */}
                  <div className="space-y-2">
                    {secondaryMovers.map((mover) => (
                      <div
                        key={mover.symbol}
                        className="rounded-lg px-4 py-3 flex items-center justify-between gap-3"
                        style={{ backgroundColor: 'var(--bg-3)', borderWidth: '1px', borderColor: 'var(--stroke-1)' }}
                      >
                        <div className="min-w-0">
                          <div className="font-semibold text-sm" style={{ color: 'var(--text-1)' }}>{mover.symbol}</div>
                          <div className="text-xs" style={{ color: 'var(--text-3)' }}>
                            Vol. ${formatCompactNumber(Number(mover.volume))}
                          </div>
                        </div>
                        <div className="text-right">
                          <div
                            className="text-sm font-semibold"
                            style={{ color: mover.change24h >= 0 ? 'var(--ok-green)' : 'var(--error-red)' }}
                          >
                            {mover.change24h >= 0 ? '+' : ''}{(mover.change24h * 100).toFixed(1)}%
                          </div>
                          <div className="text-xs" style={{ color: 'var(--text-2)' }}>
                            ${formatMarketPrice(mover.price)}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  {topLosers.length > 0 && (
                    <div className="space-y-2">
                      <div className="text-[10px] uppercase tracking-widest" style={{ color: 'var(--text-3)' }}>
                        Maiores Quedas
                      </div>
                      {topLosers.slice(0, 2).map((mover) => (
                        <div
                          key={mover.symbol}
                          className="rounded-lg px-4 py-3 flex items-center justify-between gap-3"
                          style={{ backgroundColor: 'var(--bg-3)', borderWidth: '1px', borderColor: 'var(--stroke-1)' }}
                        >
                          <div className="min-w-0">
                            <div className="font-semibold text-sm" style={{ color: 'var(--text-1)' }}>{mover.symbol}</div>
                            <div className="text-xs" style={{ color: 'var(--text-3)' }}>
                              ${formatCompactNumber(Number(mover.volume))}
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-sm font-semibold" style={{ color: 'var(--error-red)' }}>
                              {(mover.change24h * 100).toFixed(1)}%
                            </div>
                            <div className="text-xs" style={{ color: 'var(--text-2)' }}>
                              ${formatMarketPrice(mover.price)}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {volumeLeaders.length > 0 && (
                    <div className="space-y-2">
                      <div className="text-[10px] uppercase tracking-widest" style={{ color: 'var(--text-3)' }}>
                        Volume Dominante
                      </div>
                      <div className="grid grid-cols-1 gap-2">
                        {volumeLeaders.slice(0, 3).map((item) => (
                          <div
                            key={item.symbol}
                            className="rounded-lg px-4 py-3 flex items-center justify-between gap-3"
                            style={{ backgroundColor: 'var(--bg-3)', borderWidth: '1px', borderColor: 'var(--stroke-1)' }}
                          >
                            <div className="font-semibold text-sm" style={{ color: 'var(--text-1)' }}>{item.symbol}</div>
                            <div className="text-xs" style={{ color: 'var(--text-2)' }}>
                              Vol. ${formatCompactNumber(Number(item.volume))}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </section>

          {/* ── Brief — contexto do momento ────────────────────────── */}
          {brief && (
            <section
              className="rounded-xl px-5 py-4"
              style={{
                background: 'radial-gradient(circle at top left, rgba(255,140,66,0.12), transparent 40%)',
                backgroundColor: 'var(--bg-2)',
                borderWidth: '1px',
                borderColor: 'var(--stroke-1)',
              }}
            >
              <div className="flex flex-col xl:flex-row xl:items-start gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2 mb-2">
                    <StatusBadge status={brief.badge_status}>{brief.badge}</StatusBadge>
                  </div>
                  <div className="text-xl font-semibold mb-1 text-balance" style={{ color: 'var(--text-1)' }}>
                    {brief.headline}
                  </div>
                  <p className="text-sm" style={{ color: 'var(--text-2)' }}>{brief.summary}</p>
                </div>
                {briefSignals.length > 0 && (
                  <div className="flex flex-wrap gap-3">
                    {briefSignals.map((s) => (
                      <div
                        key={s.label}
                        className="rounded-lg px-4 py-3 min-w-[120px]"
                        style={{ backgroundColor: 'var(--bg-3)', borderWidth: '1px', borderColor: 'var(--stroke-1)' }}
                      >
                        <div className="text-[10px] uppercase mb-1" style={{ color: 'var(--text-3)' }}>{s.label}</div>
                        <div className="font-semibold" style={{ color: 'var(--text-1)' }}>{s.value}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </section>
          )}

          {/* ── Sistema + OS nav ───────────────────────────────────── */}
          <section className="grid grid-cols-1 xl:grid-cols-[1fr_auto] gap-4">

            {/* Sistema */}
            {workspaceItems.length > 0 && (
              <div
                className="rounded-xl p-4"
                style={{ backgroundColor: 'var(--bg-2)', borderWidth: '1px', borderColor: 'var(--stroke-1)' }}
              >
                <div className="mb-3 text-sm font-semibold" style={{ color: 'var(--text-2)' }}>Sistema</div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {workspaceItems.map((item) => {
                    const Icon = item.icon;
                    return (
                      <div
                        key={item.label}
                        className="rounded-lg p-3"
                        style={{ backgroundColor: 'var(--bg-3)', borderWidth: '1px', borderColor: 'var(--stroke-1)' }}
                      >
                        <div className="flex items-center justify-between gap-2 mb-2">
                          <span className="text-[10px] uppercase" style={{ color: 'var(--text-3)' }}>{item.label}</span>
                          <Icon className="w-3.5 h-3.5" style={{ color: 'var(--accent-orange)' }} />
                        </div>
                        <div className="text-sm font-semibold break-words" style={{ color: 'var(--text-1)' }}>{item.value}</div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* OS nav compacto */}
            <div
              className="rounded-xl p-4 self-start"
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
                      className="flex items-center justify-between gap-3 rounded-lg px-3 py-2.5 text-left"
                      style={{ backgroundColor: 'var(--bg-3)', borderWidth: '1px', borderColor: 'var(--stroke-1)' }}
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
