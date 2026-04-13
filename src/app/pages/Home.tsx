import { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { useAccount } from 'wagmi';
import {
  Activity,
  AlertTriangle,
  ArrowUpRight,
  BadgeCheck,
  Clock,
  Compass,
  FileText,
  KeyRound,
  Shield,
  Wallet,
  Waves,
  Zap,
} from 'lucide-react';
import { StatusBadge } from '../components/sne/StatusBadge';
import { WalletConnect } from '../components/passport/WalletConnect';
import { useConnectedBalance, useLookupAddress } from '../../hooks/usePassportData';
import { useMarketSummary } from '../../hooks/useRadarData';
import { apiGet } from '@/lib/api/http';
import { formatAddress } from '@/utils/format';

type DashboardPayload = {
  status: { overall_status: string; uptime_percentage: number | null };
  metrics: { latency_ms: number | null; uptime_percentage: number | null; last_proof_minutes: number | null };
  components: Array<{ name: string; status: string; last_check: string }>;
  activities: Array<{ event: string; component: string; time: string; status: string; timestamp: string }>;
  alerts: Array<{ message: string; type: string; time: string }>;
  last_updated: string;
};

type DashboardResponse = {
  data: DashboardPayload;
};

type IntelItem = {
  id: string;
  title: string;
  url: string;
  source: string;
  points: number;
  comments: number;
  author: string;
  created_at: string;
  module: string;
  agent_note: string;
};

type IntelResponse = {
  items: IntelItem[];
  last_updated: string;
};

const QUICK_ACTIONS = [
  { label: 'Radar', path: '/radar', icon: Waves },
  { label: 'Passport', path: '/pass', icon: BadgeCheck },
  { label: 'Vault', path: '/vault', icon: Shield },
  { label: 'Docs', path: '/docs', icon: FileText },
  { label: 'Explorar', path: '/docs#overview', icon: Compass },
];

export function Home() {
  const navigate = useNavigate();
  const { address, isConnected } = useAccount();
  const balanceQuery = useConnectedBalance();
  const lookupQuery = useLookupAddress(isConnected && address ? address : null);
  const marketQuery = useMarketSummary();
  const [now, setNow] = useState(new Date());

  const { data: dashboardResponse, isLoading, error } = useQuery({
    queryKey: ['dashboard'],
    queryFn: () => apiGet<DashboardResponse>('/api/dashboard/'),
    refetchInterval: 30000,
    retry: 3,
  });
  const intelQuery = useQuery({
    queryKey: ['intel', 'briefing'],
    queryFn: () => apiGet<IntelResponse>('/api/intel/briefing'),
    staleTime: 5 * 60 * 1000,
    refetchInterval: 5 * 60 * 1000,
    retry: 2,
  });

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 30000);
    return () => window.clearInterval(timer);
  }, []);

  const data = dashboardResponse?.data;
  const liveMovers = marketQuery.status === 'success' ? (marketQuery.data?.top_movers ?? []) : [];

  const formattedTime = useMemo(
    () =>
      new Intl.DateTimeFormat('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        month: 'short',
        day: 'numeric',
      }).format(now),
    [now]
  );

  const formatCompactNumber = (value: number) =>
    new Intl.NumberFormat('en-US', {
      notation: 'compact',
      maximumFractionDigits: 1,
    }).format(value);

  const formatMarketPrice = (value: number) => {
    if (value >= 1000) return value.toLocaleString('en-US', { maximumFractionDigits: 2 });
    if (value >= 1) return value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 4 });
    return value.toLocaleString('en-US', { minimumFractionDigits: 4, maximumFractionDigits: 6 });
  };

  const brief = useMemo(() => {
    const moverCount = liveMovers.length;

    if (!isConnected) {
      return {
        badge: 'sem carteira',
        badgeStatus: 'pending' as const,
        headline: 'Seu hub está pronto.',
        summary: moverCount > 0
          ? `Conecte uma carteira para carregar seu Passport e Vault. O Radar está monitorando ${moverCount} mercados ao vivo.`
          : 'Conecte uma carteira para acessar Passport e Vault.',
      };
    }

    if (lookupQuery.isLoading) {
      return {
        badge: 'sincronizando',
        badgeStatus: 'pending' as const,
        headline: 'Carregando seu perfil.',
        summary: 'Lendo estado on-chain para Passport e Vault.',
      };
    }

    if ((lookupQuery.data?.licenses?.length ?? 0) === 0) {
      return {
        badge: 'passport pendente',
        badgeStatus: 'warning' as const,
        headline: 'Carteira conectada.',
        summary: moverCount > 0
          ? `Nenhuma asserção de Passport encontrada ainda. O Radar está monitorando ${moverCount} mercados ao vivo.`
          : 'Nenhuma asserção de Passport encontrada ainda.',
      };
    }

    return {
      badge: 'hub ativo',
      badgeStatus: 'active' as const,
      headline: 'Tudo está ativo.',
      summary: moverCount > 0
        ? `${lookupQuery.data?.licenses.length ?? 0} asserção(ões) de Passport ativa(s). O Radar está monitorando ${moverCount} mercados.`
        : `${lookupQuery.data?.licenses.length ?? 0} asserção(ões) de Passport carregada(s).`,
    };
  }, [isConnected, liveMovers.length, lookupQuery.isLoading, lookupQuery.data]);

  const briefSignals = useMemo(
    () => [
      {
        label: 'Passport',
        value: isConnected ? ((lookupQuery.data?.licenses?.length ?? 0) > 0 ? 'verificado' : 'pendente') : 'offline',
      },
      {
        label: 'Vault',
        value: isConnected ? (balanceQuery.data?.eth?.formatted ?? 'carregando') : 'offline',
      },
      {
        label: 'Radar',
        value: liveMovers.length ? `${liveMovers.length} ao vivo` : 'inativo',
      },
    ],
    [balanceQuery.data?.eth?.formatted, isConnected, liveMovers.length, lookupQuery.data?.licenses?.length]
  );

  const moduleCards = useMemo(
    () => [
      {
        title: 'Passport',
        path: '/pass',
        icon: BadgeCheck,
        label: isConnected ? ((lookupQuery.data?.licenses?.length ?? 0) > 0 ? 'ativo' : 'pendente') : 'offline',
        status: isConnected ? ((lookupQuery.data?.licenses?.length ?? 0) > 0 ? 'success' : 'warning') : 'pending',
      },
      {
        title: 'Vault',
        path: '/vault',
        icon: Shield,
        label: isConnected ? 'pronto' : 'offline',
        status: isConnected ? 'active' : 'pending',
      },
      {
        title: 'Chaves',
        path: '/docs#keys',
        icon: KeyRound,
        label: (lookupQuery.data?.keys?.length ?? 0) > 0 ? 'carregado' : 'inativo',
        status: (lookupQuery.data?.keys?.length ?? 0) > 0 ? 'success' : 'pending',
      },
      {
        title: 'Radar',
        path: '/radar',
        icon: Waves,
        label: marketQuery.isLoading ? 'sincronizando' : liveMovers.length ? 'ao vivo' : 'inativo',
        status: marketQuery.isLoading ? 'pending' : liveMovers.length ? 'active' : 'pending',
      },
    ],
    [isConnected, liveMovers.length, lookupQuery.data?.keys?.length, lookupQuery.data?.licenses?.length, marketQuery.isLoading]
  );

  const intelItems = intelQuery.data?.items ?? [];
  const featuredIntel = intelItems[0];
  const secondaryIntel = intelItems.slice(1, 5);

  const marketPulse = useMemo(
    () => liveMovers.slice(0, 3),
    [liveMovers]
  );
  const featuredMover = marketPulse[0];
  const secondaryMovers = marketPulse.slice(1);

  const workspaceItems = useMemo(
    () => [
      { label: 'Latência', value: data?.metrics.latency_ms != null ? `${data.metrics.latency_ms} ms` : '--', icon: Zap },
      { label: 'Uptime', value: data?.metrics.uptime_percentage != null ? `${data.metrics.uptime_percentage}%` : '--', icon: Activity },
      { label: 'Última prova', value: data?.metrics.last_proof_minutes != null ? `${data.metrics.last_proof_minutes}m` : '--', icon: Clock },
      { label: 'Componentes', value: data ? `${data.components.length}` : '--', icon: BadgeCheck },
    ],
    [data]
  );

  const systemTags = useMemo(
    () => [
      { label: 'Rede', value: 'Scroll L2' },
      { label: 'Modo', value: isConnected ? 'Carteira vinculada' : 'Público' },
      { label: 'Passport', value: (lookupQuery.data?.licenses?.length ?? 0) > 0 ? 'Carregado' : 'Pendente' },
      { label: 'Radar', value: marketQuery.isLoading ? 'Sincronizando' : liveMovers.length ? `${liveMovers.length} ao vivo` : 'Sem dados' },
    ],
    [isConnected, liveMovers.length, lookupQuery.data?.licenses?.length, marketQuery.isLoading]
  );

  const systemActions = useMemo(
    () => [
      { label: 'Documentação', path: '/docs', icon: FileText },
      { label: 'Passport', path: '/pass', icon: BadgeCheck },
      { label: 'Radar', path: '/radar', icon: Waves },
    ],
    []
  );

  if (isLoading) {
    return (
      <div className="flex flex-1">
        <div className="flex-1 px-8 py-6 overflow-y-auto">
          <div className="text-center py-12">
            <div className="animate-pulse">
              <div className="h-4 bg-gray-300 rounded w-48 mx-auto mb-4"></div>
              <div className="h-8 bg-gray-300 rounded w-64 mx-auto"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex flex-1">
        <div className="flex-1 px-8 py-6 overflow-y-auto">
          <div className="text-center py-12">
            <div style={{ color: 'var(--warn-amber)' }}>
              <AlertTriangle size={48} className="mx-auto mb-4" />
              <p>Falha ao carregar dados do SNE OS</p>
              <p className="text-sm mt-2" style={{ color: 'var(--text-3)' }}>
                Por favor, tente novamente em instantes.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-1">
      <div className="flex-1 px-6 py-6 overflow-y-auto xl:px-8">
        <div className="mx-auto max-w-[1480px] space-y-5">
          <section
            className="rounded-xl px-4 py-3"
            style={{ backgroundColor: 'var(--bg-2)', borderWidth: '1px', borderColor: 'var(--stroke-1)', boxShadow: 'var(--shadow-1)' }}
          >
            <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
              <div className="flex flex-wrap items-center gap-2">
                <div className="px-3 py-1.5 rounded-full border text-sm" style={{ borderColor: 'var(--stroke-1)', color: 'var(--text-1)' }}>
                  {formattedTime}
                </div>
                <StatusBadge status={isConnected ? 'active' : 'pending'}>{isConnected ? 'carteira online' : 'sem carteira'}</StatusBadge>
                <StatusBadge status={marketQuery.isLoading ? 'pending' : 'active'}>
                  {marketQuery.isLoading ? 'radar sincronizando' : 'radar ao vivo'}
                </StatusBadge>
                <StatusBadge status={data.status.overall_status === 'All Systems Operational' ? 'success' : 'warning'}>
                  {data.status.overall_status}
                </StatusBadge>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {isConnected && address && (
                  <div className="px-3 py-1.5 rounded-full border text-sm" style={{ borderColor: 'var(--stroke-1)', color: 'var(--text-1)' }}>
                    {formatAddress(address)}
                  </div>
                )}
                {balanceQuery.data?.eth?.formatted && (
                  <div className="px-3 py-1.5 rounded-full border text-sm" style={{ borderColor: 'var(--stroke-1)', color: 'var(--text-1)' }}>
                    {balanceQuery.data.eth.formatted}
                  </div>
                )}
              </div>
            </div>
          </section>

          <section
            className="rounded-xl p-5"
            style={{
              background: 'radial-gradient(circle at top left, rgba(255,140,66,0.18), transparent 32%), linear-gradient(180deg, rgba(255,255,255,0.02), rgba(0,0,0,0.03))',
              backgroundColor: 'var(--bg-2)',
              borderWidth: '1px',
              borderColor: 'var(--stroke-1)',
              boxShadow: 'var(--shadow-1)',
            }}
          >
            <div className="grid grid-cols-1 xl:grid-cols-[0.68fr_0.32fr] gap-5">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2 mb-3">
                  <StatusBadge status={brief.badgeStatus}>{brief.badge}</StatusBadge>
                  <div className="text-sm" style={{ color: 'var(--text-3)' }}>Início</div>
                </div>

                <h1 className="text-3xl font-semibold mb-2 max-w-3xl" style={{ color: 'var(--text-1)' }}>
                  {brief.headline}
                </h1>
                <p className="mb-4 max-w-3xl text-balance" style={{ color: 'var(--text-2)', fontSize: '0.98rem' }}>
                  {brief.summary}
                </p>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {briefSignals.map((item) => (
                    <div
                      key={item.label}
                      className="rounded-lg px-4 py-3 min-w-0"
                      style={{ backgroundColor: 'var(--bg-3)', borderWidth: '1px', borderColor: 'var(--stroke-1)' }}
                    >
                      <div className="text-[11px] uppercase mb-1" style={{ color: 'var(--text-3)' }}>
                        {item.label}
                      </div>
                      <div className="font-semibold break-words" style={{ color: 'var(--text-1)' }}>
                        {item.value}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div
                className="rounded-xl p-4 h-full min-w-0"
                style={{ backgroundColor: 'var(--bg-3)', borderWidth: '1px', borderColor: 'var(--stroke-1)' }}
              >
                <div className="flex h-full flex-col justify-between gap-5">
                  <div className="flex items-start gap-3">
                    <div
                      className="w-11 h-11 rounded-xl flex items-center justify-center"
                      style={{ backgroundColor: 'rgba(255,140,66,0.12)', color: 'var(--accent-orange)' }}
                    >
                      <Wallet className="w-5 h-5" />
                    </div>
                    <div className="min-w-0">
                      <div className="font-semibold mb-1 break-all" style={{ color: 'var(--text-1)' }}>
                        {isConnected && address ? formatAddress(address) : 'Conecte sua carteira'}
                      </div>
                      <div className="text-sm break-words" style={{ color: 'var(--text-2)' }}>
                        {isConnected
                          ? 'Acesso completo habilitado.'
                          : 'Desbloqueie Passport, Vault e Radar.'}
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col gap-3">
                    <WalletConnect />
                    <div className="flex flex-wrap gap-3">
                      <button
                        onClick={() => navigate(isConnected ? '/radar' : '/pass')}
                        className="px-4 py-2 rounded-lg flex items-center gap-2 font-medium"
                        style={{ backgroundColor: 'var(--accent-orange)', color: '#FFFFFF' }}
                      >
                        {isConnected ? 'Radar' : 'Passport'}
                        <ArrowUpRight className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => navigate('/docs')}
                        className="px-4 py-2 rounded-lg flex items-center gap-2 font-medium"
                        style={{ backgroundColor: 'var(--bg-2)', color: 'var(--text-1)', borderWidth: '1px', borderColor: 'var(--stroke-1)' }}
                      >
                        Documentação
                        <ArrowUpRight className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>

          <section
            className="rounded-xl p-4"
            style={{ backgroundColor: 'var(--bg-2)', borderWidth: '1px', borderColor: 'var(--stroke-1)', boxShadow: 'var(--shadow-1)' }}
          >
            <div className="mb-3 text-sm font-semibold" style={{ color: 'var(--text-2)' }}>
              Módulos
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
              {moduleCards.map((item) => {
                const Icon = item.icon;
                return (
                  <button
                    key={item.title}
                    onClick={() => navigate(item.path)}
                    className="w-full rounded-lg p-4 text-left min-w-0 min-h-[112px]"
                    style={{ backgroundColor: 'var(--bg-3)', borderWidth: '1px', borderColor: 'var(--stroke-1)' }}
                  >
                    <div className="flex items-start justify-between gap-3 mb-4">
                      <div
                        className="w-10 h-10 rounded-xl flex items-center justify-center"
                        style={{ backgroundColor: 'rgba(255,140,66,0.10)', color: 'var(--accent-orange)' }}
                      >
                        <Icon className="w-4 h-4" />
                      </div>
                      <StatusBadge status={item.status as 'active' | 'success' | 'warning' | 'pending'}>{item.label}</StatusBadge>
                    </div>
                    <div className="flex items-center justify-between gap-3 min-w-0">
                      <div className="font-semibold min-w-0 truncate" style={{ color: 'var(--text-1)' }}>{item.title}</div>
                      <ArrowUpRight className="w-4 h-4" style={{ color: 'var(--text-3)' }} />
                    </div>
                  </button>
                );
              })}
            </div>
          </section>

          <section className="grid grid-cols-1 xl:grid-cols-[minmax(0,1.3fr)_minmax(320px,0.7fr)] gap-5">
            <div
              className="rounded-xl p-4"
              style={{ backgroundColor: 'var(--bg-2)', borderWidth: '1px', borderColor: 'var(--stroke-1)', boxShadow: 'var(--shadow-1)' }}
            >
              <div className="mb-3 text-sm font-semibold" style={{ color: 'var(--text-2)' }}>
                Inteligência
              </div>
              {featuredIntel ? (
                <div className="space-y-4">
                  <button
                    onClick={() => window.open(featuredIntel.url, '_blank', 'noopener,noreferrer')}
                    className="w-full rounded-xl p-5 text-left min-w-0"
                    style={{
                      background: 'linear-gradient(135deg, rgba(255,140,66,0.08), rgba(255,255,255,0.02))',
                      backgroundColor: 'var(--bg-3)',
                      borderWidth: '1px',
                      borderColor: 'var(--stroke-1)',
                    }}
                  >
                    <div className="flex flex-wrap items-center gap-2 mb-3">
                      <StatusBadge status="active">{featuredIntel.source}</StatusBadge>
                      <StatusBadge status="pending">{featuredIntel.module}</StatusBadge>
                    </div>
                    <div className="text-xl font-semibold mb-3 text-balance" style={{ color: 'var(--text-1)' }}>
                      {featuredIntel.title}
                    </div>
                    <div className="text-sm mb-4" style={{ color: 'var(--text-2)' }}>
                      {featuredIntel.agent_note}
                    </div>
                    <div className="flex flex-wrap items-center gap-4 text-xs" style={{ color: 'var(--text-3)' }}>
                      <span>{featuredIntel.points} points</span>
                      <span>{featuredIntel.comments} comments</span>
                      <span>@{featuredIntel.author}</span>
                    </div>
                  </button>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {secondaryIntel.map((item) => (
                      <button
                        key={item.id}
                        onClick={() => window.open(item.url, '_blank', 'noopener,noreferrer')}
                        className="w-full rounded-lg p-4 text-left min-w-0"
                        style={{ backgroundColor: 'var(--bg-3)', borderWidth: '1px', borderColor: 'var(--stroke-1)' }}
                      >
                        <div className="flex items-center justify-between gap-3 mb-2">
                          <div className="text-xs uppercase tracking-[0.16em]" style={{ color: 'var(--text-3)' }}>{item.module}</div>
                          <div className="text-xs" style={{ color: 'var(--text-3)' }}>{item.points} pts</div>
                        </div>
                        <div className="font-semibold mb-2 line-clamp-2" style={{ color: 'var(--text-1)' }}>{item.title}</div>
                        <div className="text-sm line-clamp-2" style={{ color: 'var(--text-2)' }}>{item.agent_note}</div>
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="text-sm" style={{ color: 'var(--text-2)' }}>
                  Nenhum briefing disponível no momento.
                </div>
              )}
            </div>

            <div className="space-y-5">
              <div
                className="rounded-xl p-4"
                style={{ backgroundColor: 'var(--bg-2)', borderWidth: '1px', borderColor: 'var(--stroke-1)', boxShadow: 'var(--shadow-1)' }}
              >
                <div className="mb-3 text-sm font-semibold" style={{ color: 'var(--text-2)' }}>
                  Acesso Rápido
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {QUICK_ACTIONS.map((action) => {
                    const Icon = action.icon;
                    return (
                      <button
                        key={action.label}
                        onClick={() => navigate(action.path)}
                        className="w-full rounded-lg p-3 text-left flex items-center justify-between gap-3 min-w-0 min-h-[56px]"
                        style={{ backgroundColor: 'var(--bg-3)', borderWidth: '1px', borderColor: 'var(--stroke-1)' }}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <Icon className="w-4 h-4" style={{ color: 'var(--accent-orange)' }} />
                          <span className="font-medium min-w-0 truncate" style={{ color: 'var(--text-1)' }}>{action.label}</span>
                        </div>
                        <ArrowUpRight className="w-4 h-4" style={{ color: 'var(--text-3)' }} />
                      </button>
                    );
                  })}
                </div>
              </div>

              <div
                className="rounded-xl p-4"
                style={{ backgroundColor: 'var(--bg-2)', borderWidth: '1px', borderColor: 'var(--stroke-1)', boxShadow: 'var(--shadow-1)' }}
              >
                <div className="mb-3 text-sm font-semibold" style={{ color: 'var(--text-2)' }}>
                  Status do Sistema
                </div>
                <div className="grid grid-cols-1 gap-3">
                  {systemTags.map((tag) => (
                    <div
                      key={tag.label}
                      className="flex items-center justify-between gap-3 rounded-lg px-3 py-2.5 min-w-0"
                      style={{ backgroundColor: 'var(--bg-3)', borderWidth: '1px', borderColor: 'var(--stroke-1)' }}
                    >
                      <span className="text-xs uppercase tracking-wide min-w-0 truncate" style={{ color: 'var(--text-3)' }}>{tag.label}</span>
                      <span className="text-sm font-medium min-w-0 truncate text-right" style={{ color: 'var(--text-1)' }}>{tag.value}</span>
                    </div>
                  ))}
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
                  <div className="text-sm font-semibold" style={{ color: 'var(--text-2)' }}>
                    Pulso de Mercado
                  </div>
                  <div className="text-sm" style={{ color: 'var(--text-3)' }}>Os maiores movedores do Radar nas últimas 24h.</div>
                </div>
                <button
                  onClick={() => navigate('/radar')}
                  className="text-sm font-medium"
                  style={{ color: 'var(--accent-orange)' }}
                >
                  Radar
                </button>
              </div>

              {marketPulse.length === 0 ? (
                <div style={{ color: 'var(--text-2)' }}>Dados de mercado indisponíveis. O Radar pode estar sincronizando.</div>
              ) : (
                <div className="space-y-4">
                  {featuredMover && (
                    <div
                      className="rounded-xl p-5 min-w-0"
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

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div
                          className="rounded-lg px-4 py-3"
                          style={{ backgroundColor: 'rgba(255,255,255,0.02)', borderWidth: '1px', borderColor: 'var(--stroke-1)' }}
                        >
                          <div className="text-[11px] uppercase mb-1" style={{ color: 'var(--text-3)' }}>Preço</div>
                          <div className="font-semibold" style={{ color: 'var(--text-1)' }}>
                            ${formatMarketPrice(featuredMover.price)}
                          </div>
                        </div>
                        <div
                          className="rounded-lg px-4 py-3"
                          style={{ backgroundColor: 'rgba(255,255,255,0.02)', borderWidth: '1px', borderColor: 'var(--stroke-1)' }}
                        >
                          <div className="text-[11px] uppercase mb-1" style={{ color: 'var(--text-3)' }}>Volume</div>
                          <div className="font-semibold" style={{ color: 'var(--text-1)' }}>
                            ${formatCompactNumber(Number(featuredMover.volume))}
                          </div>
                        </div>
                        <div
                          className="rounded-lg px-4 py-3"
                          style={{ backgroundColor: 'rgba(255,255,255,0.02)', borderWidth: '1px', borderColor: 'var(--stroke-1)' }}
                        >
                          <div className="text-[11px] uppercase mb-1" style={{ color: 'var(--text-3)' }}>Janela</div>
                          <div className="font-semibold" style={{ color: 'var(--text-1)' }}>
                            24H
                          </div>
                        </div>
                      </div>
                    </div>

                  )}

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {secondaryMovers.map((mover, index) => (
                      <div
                        key={mover.symbol}
                        className="rounded-lg p-4 min-w-0"
                        style={{ backgroundColor: 'var(--bg-3)', borderWidth: '1px', borderColor: 'var(--stroke-1)' }}
                      >
                        <div className="flex items-start justify-between gap-3 mb-3">
                          <div className="min-w-0">
                            <div className="text-[11px] uppercase tracking-[0.16em] mb-1" style={{ color: 'var(--text-3)' }}>
                              #{index + 2}
                            </div>
                            <div className="font-semibold truncate" style={{ color: 'var(--text-1)' }}>{mover.symbol}</div>
                          </div>
                          <div
                            className="text-sm font-semibold"
                            style={{ color: mover.change24h >= 0 ? 'var(--ok-green)' : 'var(--error-red)' }}
                          >
                            {mover.change24h >= 0 ? '+' : ''}{(mover.change24h * 100).toFixed(1)}%
                          </div>
                        </div>
                        <div className="flex items-center justify-between gap-3 text-sm">
                          <span style={{ color: 'var(--text-2)' }}>${formatMarketPrice(mover.price)}</span>
                          <span style={{ color: 'var(--text-3)' }}>Vol. ${formatCompactNumber(Number(mover.volume))}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="self-start space-y-5">
              <div
                className="rounded-xl p-4"
                style={{ backgroundColor: 'var(--bg-2)', borderWidth: '1px', borderColor: 'var(--stroke-1)', boxShadow: 'var(--shadow-1)' }}
              >
                <div className="mb-3 text-sm font-semibold" style={{ color: 'var(--text-2)' }}>
                  Área de Trabalho
                </div>
                <div className="grid grid-cols-2 gap-3">
                  {workspaceItems.map((item) => {
                    const Icon = item.icon;
                    return (
                      <div
                        key={item.label}
                        className="rounded-lg p-3 min-w-0 min-h-[88px]"
                        style={{ backgroundColor: 'var(--bg-3)', borderWidth: '1px', borderColor: 'var(--stroke-1)' }}
                      >
                        <div className="flex items-center justify-between gap-3 mb-2">
                          <span className="text-xs uppercase" style={{ color: 'var(--text-3)' }}>{item.label}</span>
                          <Icon className="w-4 h-4" style={{ color: 'var(--accent-orange)' }} />
                        </div>
                        <div className="font-semibold text-sm break-words" style={{ color: 'var(--text-1)' }}>{item.value}</div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div
                className="rounded-xl p-4"
                style={{ backgroundColor: 'var(--bg-2)', borderWidth: '1px', borderColor: 'var(--stroke-1)', boxShadow: 'var(--shadow-1)' }}
              >
                <div className="mb-3 text-sm font-semibold" style={{ color: 'var(--text-2)' }}>
                  Alertas
                </div>
                <div className="space-y-3">
                  {(data.alerts.length > 0 ? data.alerts.slice(0, 2) : [{ message: 'Nenhum alerta ativo no momento.', type: 'info', time: 'agora' }]).map((alert) => (
                    <div
                      key={`${alert.message}-${alert.time}`}
                      className="rounded-lg px-3 py-3"
                      style={{ backgroundColor: 'var(--bg-3)', borderWidth: '1px', borderColor: 'var(--stroke-1)' }}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="text-sm break-words" style={{ color: 'var(--text-1)' }}>{alert.message}</div>
                          <div className="text-xs mt-1" style={{ color: 'var(--text-3)' }}>{alert.time}</div>
                        </div>
                        <StatusBadge status={alert.type === 'success' ? 'success' : alert.type === 'warning' ? 'warning' : alert.type === 'error' ? 'pending' : 'active'}>
                          {alert.type}
                        </StatusBadge>
                      </div>
                    </div>
                  ))}

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {systemActions.map((action) => {
                      const Icon = action.icon;
                      return (
                        <button
                          key={action.label}
                          onClick={() => navigate(action.path)}
                          className="rounded-lg px-3 py-3 text-left flex items-center justify-between gap-3 min-w-0"
                          style={{ backgroundColor: 'var(--bg-3)', borderWidth: '1px', borderColor: 'var(--stroke-1)' }}
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <Icon className="w-4 h-4" style={{ color: 'var(--accent-orange)' }} />
                            <span className="text-sm font-medium truncate" style={{ color: 'var(--text-1)' }}>{action.label}</span>
                          </div>
                          <ArrowUpRight className="w-4 h-4" style={{ color: 'var(--text-3)' }} />
                        </button>
                      );
                    })}
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
