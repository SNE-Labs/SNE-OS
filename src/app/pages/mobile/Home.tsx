import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowUpRight, BadgeCheck, FileText, KeyRound, LockKeyhole, Shield, Waves, Wallet } from 'lucide-react';

import { Badge, EmptyState, ErrorState, LoadingSkeletonGroup, MobileButton, MobilePageShell, SurfaceCard } from '../../components/mobile';
import { apiGet } from '@/lib/api/http';
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
  };
  intel: {
    items: Array<{
      id: string;
      title: string;
      url: string;
      source: string;
      module: string;
    }>;
  };
  identity?: {
    status?: string;
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

const QUICK_ACTIONS = [
  { label: 'Passport', path: '/pass', icon: BadgeCheck },
  { label: 'Vault', path: '/vault', icon: Shield },
  { label: 'Radar', path: '/radar', icon: Waves },
  { label: 'Secrets', path: '/secrets', icon: LockKeyhole },
  { label: 'Keys', path: '/keys', icon: KeyRound },
  { label: 'Docs', path: '/docs', icon: FileText },
] as const;

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
  const intelItems = home?.intel.items?.slice(0, 2) ?? [];
  const metrics = useMemo(
    () => [
      { label: 'Identity', value: home?.identity?.status ?? 'offline' },
      { label: 'Networks', value: `${home?.capital?.aggregate?.active_networks ?? home?.identity?.active_networks ?? 0}` },
      { label: 'Secrets', value: `${home?.secrets?.item_count ?? 0}` },
    ],
    [home]
  );

  return (
    <MobilePageShell
      title="SNE OS"
      subtitle="Multi-chain identity, capital, secrets and intel."
      statusPill={{
        label: home?.brief.badge ?? 'loading',
        variant: toBadgeVariant(home?.brief.badge_status),
      }}
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
                  {home.session.address ? formatAddress(home.session.address) : 'No wallet linked'}
                </div>
                <p className="text-sm text-[var(--text-2)]">{home.brief.summary}</p>
              </div>
            </div>

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
                {home.session.authenticated ? 'Open Vault' : 'Connect Wallet'}
              </MobileButton>
              <MobileButton variant="secondary" className="w-full" onClick={() => navigate('/radar')}>
                Open Radar
              </MobileButton>
            </div>
          </SurfaceCard>

          <SurfaceCard>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-[var(--text-1)]">Quick Launch</h3>
              <Badge variant="neutral" size="sm">{QUICK_ACTIONS.length}</Badge>
            </div>

            <div className="grid grid-cols-2 gap-3">
              {QUICK_ACTIONS.map((item) => {
                const Icon = item.icon;
                return (
                  <button
                    key={item.path}
                    onClick={() => navigate(item.path)}
                    className="rounded-xl bg-[var(--bg-2)] border border-[var(--stroke-1)] p-3 text-left"
                  >
                    <div className="flex items-center justify-between gap-3 mb-2">
                      <Icon className="w-4 h-4 text-[var(--accent-orange)]" />
                      <ArrowUpRight className="w-4 h-4 text-[var(--text-3)]" />
                    </div>
                    <div className="text-[var(--text-1)]">{item.label}</div>
                  </button>
                );
              })}
            </div>
          </SurfaceCard>

          <SurfaceCard>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-[var(--text-1)]">Modules</h3>
              <Badge variant="neutral" size="sm">{home.modules.length}</Badge>
            </div>

            <div className="space-y-3">
              {home.modules.map((module) => (
                <button
                  key={module.path}
                  onClick={() => navigate(module.path)}
                  className="w-full rounded-xl bg-[var(--bg-2)] border border-[var(--stroke-1)] p-3 text-left"
                >
                  <div className="flex items-center justify-between gap-3 mb-1">
                    <div className="text-[var(--text-1)]">{module.title}</div>
                    <Badge variant={toBadgeVariant(module.status)} size="sm">{module.label}</Badge>
                  </div>
                  <div className="text-sm text-[var(--text-2)]">Open {module.title} inside the OS.</div>
                </button>
              ))}
            </div>
          </SurfaceCard>

          <SurfaceCard>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-[var(--text-1)]">Market Pulse</h3>
              <MobileButton variant="secondary" onClick={() => navigate('/radar')}>
                Radar
              </MobileButton>
            </div>

            {movers.length === 0 ? (
              <EmptyState
                title="No live movers"
                description="The market pulse is waiting for fresh market data."
              />
            ) : (
              <div className="space-y-3">
                {movers.map((item) => (
                  <div key={item.symbol} className="rounded-xl bg-[var(--bg-2)] border border-[var(--stroke-1)] p-3">
                    <div className="flex items-center justify-between gap-3 mb-2">
                      <div className="text-[var(--text-1)]">{item.symbol}</div>
                      <div className={item.change24h >= 0 ? 'text-[var(--success)]' : 'text-[var(--danger)]'}>
                        {item.change24h >= 0 ? '+' : ''}{(item.change24h * 100).toFixed(1)}%
                      </div>
                    </div>
                    <div className="flex items-center justify-between gap-3 text-sm text-[var(--text-2)]">
                      <span>${formatPrice(item.price)}</span>
                      <span>Vol ${formatCompactNumber(Number(item.volume))}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </SurfaceCard>

          <SurfaceCard>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-[var(--text-1)]">Intel</h3>
              <Badge variant="neutral" size="sm">{intelItems.length}</Badge>
            </div>

            {intelItems.length === 0 ? (
              <EmptyState
                title="No briefing yet"
                description="Intel will appear here as soon as the feed is available."
              />
            ) : (
              <div className="space-y-3">
                {intelItems.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => window.location.assign(item.url)}
                    className="w-full rounded-xl bg-[var(--bg-2)] border border-[var(--stroke-1)] p-3 text-left"
                  >
                    <div className="flex items-center justify-between gap-3 mb-1">
                      <div className="text-xs uppercase text-[var(--text-3)]">{item.source}</div>
                      <Badge variant="neutral" size="sm">{item.module}</Badge>
                    </div>
                    <div className="text-[var(--text-1)] mb-2">{item.title}</div>
                    <div className="text-sm text-[var(--text-2)]">Open source briefing.</div>
                  </button>
                ))}
              </div>
            )}
          </SurfaceCard>
        </>
      )}
    </MobilePageShell>
  );
}
