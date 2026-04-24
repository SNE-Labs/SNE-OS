import { useEffect, useMemo, useState } from 'react';
import {
  ArrowUpRight,
  BadgeCheck,
  Clock3,
  Link2,
  LogOut,
  Search,
  Wallet,
} from 'lucide-react';
import { isAddress } from 'viem';

import { FieldSurface } from '../components/field/FieldSurface';
import { ModuleStateCard } from '../components/sne/ModuleStateCard';
import { StatusBadge } from '../components/sne/StatusBadge';
import { WalletConnect } from '../components/passport/WalletConnect';
import { PassportIdentityProfilePanel } from '../components/passport/PassportIdentityProfilePanel';
import { PassportWalletLinkPanel } from '../components/passport/PassportWalletLinkPanel';
import {
  usePassportIdentity,
  usePassportOverview,
  usePassportPublicProfile,
  useUpdatePassportProfile,
} from '../../hooks/usePassportData';
import { useAuth } from '@/lib/auth/AuthProvider';
import type { PassportOverviewIdentity, PassportProfileInput } from '@/types/passport';
import { formatAddress } from '@/utils/format';

type PassportTab = 'account' | 'wallets' | 'lookup';

type LinkedAccount = {
  network: string;
  address: string;
  primary?: boolean;
  status?: string;
  account_type?: string;
};

type NetworkScope = {
  network: { label?: string; family?: string } | string;
  link_strategy?: string;
  enabled?: boolean;
};

type OverviewProfile = {
  assertions?: Array<{ id: string; label: string; status: string; value?: string | null; source?: string }>;
  linked_accounts?: LinkedAccount[];
  network_scope?: NetworkScope[];
  identity?: {
    address?: string;
    accountType?: string;
    txCount?: number;
    checkedAt?: string;
    hasActivity?: boolean;
  };
  passport?: PassportOverviewIdentity | null;
  metadata?: { source?: string };
};

type LookupTarget = {
  kind: 'address' | 'identity';
  value: string;
};

const RECENT_LOOKUPS_KEY = 'sne-passport-recent-lookups-v2';
const PASSPORT_IDENTITY_PATTERN = /^pid_[a-z0-9]{32}$/i;

function readRecentLookups(): string[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(RECENT_LOOKUPS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === 'string') : [];
  } catch {
    return [];
  }
}

function writeRecentLookups(values: string[]) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(RECENT_LOOKUPS_KEY, JSON.stringify(values.slice(0, 8)));
}

function formatDate(value?: string | null) {
  if (!value) return '--';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '--';
  return date.toLocaleString('pt-BR');
}

function formatPassportDisplayLabel(
  profile?: { display_name?: string | null; handle?: string | null } | null,
  fallbackAddress?: string | null
) {
  const displayName = `${profile?.display_name ?? ''}`.trim();
  if (displayName) return displayName;

  const handle = `${profile?.handle ?? ''}`.trim();
  if (handle) return handle.startsWith('@') ? handle : `@${handle}`;

  return fallbackAddress ? formatAddress(fallbackAddress) : 'Conecte sua wallet';
}

function resolveLookupInput(value: string): LookupTarget | null {
  const candidate = value.trim();
  if (!candidate) return null;
  if (isAddress(candidate)) return { kind: 'address', value: candidate };
  if (PASSPORT_IDENTITY_PATTERN.test(candidate)) return { kind: 'identity', value: candidate };
  return null;
}

function lookupPlaceholder() {
  return '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb ou pid_7fd0...';
}

function walletRoleLabel(wallet: { is_primary: boolean; address: string }, anchorAddress?: string | null) {
  if (wallet.address.toLowerCase() === `${anchorAddress ?? ''}`.toLowerCase()) return 'ancora';
  if (wallet.is_primary) return 'principal';
  return 'vinculada';
}

function latestTimestamp(values: Array<string | null | undefined>) {
  const valid = values
    .map((value) => (value ? new Date(value).getTime() : Number.NaN))
    .filter((value) => Number.isFinite(value));
  if (!valid.length) return null;
  return new Date(Math.max(...valid)).toISOString();
}

export function Pass() {
  const { address, authStatus, isAuthenticated, logout } = useAuth();
  const [activeTab, setActiveTab] = useState<PassportTab>('account');
  const [lookupInput, setLookupInput] = useState('');
  const [lookupTarget, setLookupTarget] = useState<LookupTarget | null>(null);
  const [lookupError, setLookupError] = useState<string | null>(null);
  const [profileSaveError, setProfileSaveError] = useState<string | null>(null);
  const [showLinkPanel, setShowLinkPanel] = useState(false);
  const [recentLookups, setRecentLookups] = useState<string[]>(() => readRecentLookups());

  const identityQuery = usePassportIdentity(isAuthenticated);
  const connectedOverviewQuery = usePassportOverview(isAuthenticated && address ? address : null);
  const updateProfileMutation = useUpdatePassportProfile();
  const addressLookupQuery = usePassportOverview(lookupTarget?.kind === 'address' ? lookupTarget.value : null);
  const identityLookupCheckpointQuery = usePassportPublicProfile(lookupTarget?.kind === 'identity' ? lookupTarget.value : null);
  const identityLookupAddress =
    identityLookupCheckpointQuery.data?.primary_wallet?.address ?? identityLookupCheckpointQuery.data?.identity.anchor_address ?? null;
  const identityLookupOverviewQuery = usePassportOverview(lookupTarget?.kind === 'identity' ? identityLookupAddress : null);

  const identity = identityQuery.data;
  const connectedProfile = connectedOverviewQuery.data?.profile as OverviewProfile | null;
  const connectedLinkedAccounts = connectedProfile?.linked_accounts ?? [];
  const connectedNetworkScope = connectedOverviewQuery.data?.network_scope ?? connectedProfile?.network_scope ?? [];

  const publicProfile =
    lookupTarget?.kind === 'address'
      ? ((addressLookupQuery.data?.profile as OverviewProfile | null) ?? null)
      : ((identityLookupOverviewQuery.data?.profile as OverviewProfile | null) ?? null);
  const publicPassport =
    lookupTarget?.kind === 'identity'
      ? (identityLookupCheckpointQuery.data ?? null)
      : (publicProfile?.passport ?? null);

  const publicLinkedAccounts =
    publicProfile?.linked_accounts ??
    publicPassport?.wallets.map((wallet) => ({
      network: wallet.chain_family.toUpperCase(),
      address: wallet.address,
      primary: wallet.is_primary,
      status: wallet.status,
    })) ??
    [];

  const sessionIdentityLabel = formatPassportDisplayLabel(identity?.profile, address);
  const isAuthBusy =
    authStatus === 'connecting' ||
    authStatus === 'signing' ||
    authStatus === 'verifying' ||
    authStatus === 'restoring';

  const latestAccountActivity = latestTimestamp([
    ...(identity?.wallets.map((wallet) => wallet.last_login_at) ?? []),
    ...(identity?.events.map((event) => event.created_at) ?? []),
  ]);

  const identityStatus = useMemo(() => {
    if (!isAuthenticated) {
      return { label: 'offline', tone: 'pending' as const };
    }
    if (identityQuery.isLoading) {
      return { label: 'sincronizando', tone: 'pending' as const };
    }
    if (identityQuery.isError) {
      return { label: 'degraded', tone: 'warning' as const };
    }
    if ((identity?.stats.wallets_total ?? 0) > 1) {
      return { label: 'conta expandida', tone: 'success' as const };
    }
    return { label: 'ativa', tone: 'active' as const };
  }, [identity?.stats.wallets_total, identityQuery.isError, identityQuery.isLoading, isAuthenticated]);

  useEffect(() => {
    writeRecentLookups(recentLookups);
  }, [recentLookups]);

  useEffect(() => {
    if (!lookupTarget) return;
    const key = lookupTarget.value;
    const shouldPersist =
      (lookupTarget.kind === 'address' && addressLookupQuery.isSuccess) ||
      (lookupTarget.kind === 'identity' && identityLookupCheckpointQuery.isSuccess);
    if (!shouldPersist) return;
    setRecentLookups((current) => [key, ...current.filter((item) => item.toLowerCase() !== key.toLowerCase())].slice(0, 8));
  }, [addressLookupQuery.isSuccess, identityLookupCheckpointQuery.isSuccess, lookupTarget]);

  const tabs = [
    { id: 'account', label: 'Conta', icon: BadgeCheck },
    { id: 'wallets', label: 'Wallets', icon: Wallet },
    { id: 'lookup', label: 'Lookup Público', icon: Search },
  ] as const;

  const handleLookupSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    const resolved = resolveLookupInput(lookupInput);

    if (!resolved) {
      setLookupError('Informe um endereco 0x... ou um identity id valido.');
      return;
    }

    setLookupTarget(resolved);
    setLookupError(null);
    setActiveTab('lookup');
  };

  const handleProfileSave = async (payload: PassportProfileInput) => {
    setProfileSaveError(null);
    try {
      await updateProfileMutation.mutateAsync(payload);
    } catch (error) {
      setProfileSaveError(error instanceof Error ? error.message : 'Falha ao salvar a presenca publica.');
    }
  };

  const statCardStyle = {
    backgroundColor: 'var(--bg-3)',
    borderWidth: '1px',
    borderColor: 'var(--stroke-1)',
  } as const;

  const lookupIsLoading =
    lookupTarget?.kind === 'address'
      ? addressLookupQuery.isLoading && !publicProfile
      : identityLookupCheckpointQuery.isLoading || (identityLookupAddress != null && identityLookupOverviewQuery.isLoading && !publicProfile);

  const lookupHasError =
    lookupTarget?.kind === 'address'
      ? (addressLookupQuery.isError || !publicProfile) && !publicProfile
      : (identityLookupCheckpointQuery.isError || !publicPassport) && !publicPassport;

  return (
    <div className="flex flex-1">
      <div className="flex-1 px-6 py-5 overflow-y-auto xl:px-8">
        <div className="mx-auto max-w-[1480px] space-y-4">
          <FieldSurface
            as="section"
            motif="identity-mesh"
            density="compact"
            surface="hero"
            className="rounded-xl p-5"
            style={{
              background: 'radial-gradient(circle at top left, rgba(255,140,66,0.16), transparent 30%), linear-gradient(180deg, rgba(255,255,255,0.02), rgba(0,0,0,0.03))',
              backgroundColor: 'var(--bg-2)',
              borderWidth: '1px',
              borderColor: 'var(--stroke-1)',
              boxShadow: 'var(--shadow-1)',
            }}
          >
            <div className="grid grid-cols-1 xl:grid-cols-[0.78fr_0.22fr] gap-4">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2 mb-3">
                  <div className="text-sm" style={{ color: 'var(--text-3)' }}>Passport</div>
                  {identityQuery.isFetching && identity ? <StatusBadge status="pending">sincronizando</StatusBadge> : null}
                </div>

                <h1 className="text-2xl font-semibold mb-2" style={{ color: 'var(--text-1)' }}>
                  Sua conta no SNE OS.
                </h1>
                <p className="max-w-3xl text-sm" style={{ color: 'var(--text-2)' }}>
                  O Passport unifica a conta, as wallets vinculadas e a resolucao publica do OS. A ancora continua sendo
                  a primeira wallet autenticada, mas o valor aqui e continuidade de conta, nao perfil social.
                </p>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mt-5">
                  <div className="rounded-lg px-4 py-3" style={statCardStyle}>
                    <div className="text-[11px] uppercase mb-1" style={{ color: 'var(--text-3)' }}>Conta</div>
                    <div className="font-semibold break-all" style={{ color: 'var(--text-1)' }}>
                      {sessionIdentityLabel}
                    </div>
                  </div>
                  <div className="rounded-lg px-4 py-3" style={statCardStyle}>
                    <div className="text-[11px] uppercase mb-1" style={{ color: 'var(--text-3)' }}>Identity ID</div>
                    <div className="font-semibold break-all" style={{ color: 'var(--text-1)' }}>
                      {identity?.identity_id ?? identity?.identity.id ?? '--'}
                    </div>
                  </div>
                  <div className="rounded-lg px-4 py-3" style={statCardStyle}>
                    <div className="text-[11px] uppercase mb-1" style={{ color: 'var(--text-3)' }}>Wallets ativas</div>
                    <div className="font-semibold" style={{ color: 'var(--text-1)' }}>
                      {identity?.stats.active_wallets ?? 0}
                    </div>
                  </div>
                  <div className="rounded-lg px-4 py-3" style={statCardStyle}>
                    <div className="text-[11px] uppercase mb-1" style={{ color: 'var(--text-3)' }}>Resolucao publica</div>
                    <div className="font-semibold" style={{ color: 'var(--text-1)' }}>
                      {identity?.identity.id ? 'ativa' : 'pendente'}
                    </div>
                  </div>
                </div>
              </div>

              <div
                className="rounded-xl p-4 min-w-0"
                style={{ backgroundColor: 'var(--bg-3)', borderWidth: '1px', borderColor: 'var(--stroke-1)' }}
              >
                <div className="flex items-start gap-3">
                  <div
                    className="w-11 h-11 rounded-xl flex items-center justify-center"
                    style={{ backgroundColor: 'rgba(255,140,66,0.12)', color: 'var(--accent-orange)' }}
                  >
                    <Wallet className="w-5 h-5" />
                  </div>
                  <div className="min-w-0">
                    <div className="font-semibold mb-1 break-all" style={{ color: 'var(--text-1)' }}>
                      {isAuthenticated ? sessionIdentityLabel : 'Conta ainda nao ancorada'}
                    </div>
                    <div className="text-sm" style={{ color: 'var(--text-2)' }}>
                      {isAuthenticated
                        ? 'Use qualquer wallet vinculada para voltar a esta mesma conta.'
                        : 'Autentique a primeira wallet para ancorar a conta no OS.'}
                    </div>
                    {isAuthenticated && address ? (
                      <div className="mt-2 text-xs uppercase tracking-wide break-all" style={{ color: 'var(--text-3)' }}>
                        Sessao atual • {formatAddress(address)}
                      </div>
                    ) : null}
                  </div>
                </div>

                <div className="mt-5 space-y-3">
                  {isAuthenticated ? (
                    <button
                      onClick={() => setShowLinkPanel((current) => !current)}
                      className="w-full px-4 py-2 rounded-lg flex items-center justify-between gap-3 text-sm font-medium"
                      style={{ backgroundColor: 'var(--bg-2)', color: 'var(--text-1)', borderWidth: '1px', borderColor: 'var(--stroke-1)' }}
                    >
                      Adicionar wallet
                      <ArrowUpRight className="w-4 h-4" />
                    </button>
                  ) : (
                    <WalletConnect showConnectButton connectButtonLabel="Ancorar conta" fullWidth />
                  )}
                  <button
                    onClick={() => setActiveTab('lookup')}
                    className="w-full px-4 py-2 rounded-lg flex items-center justify-between gap-3 text-sm font-medium"
                    style={{ backgroundColor: 'var(--bg-2)', color: 'var(--text-1)', borderWidth: '1px', borderColor: 'var(--stroke-1)' }}
                  >
                    Abrir lookup publico
                    <Search className="w-4 h-4" />
                  </button>
                  {isAuthenticated ? (
                    <button
                      onClick={() => void logout()}
                      disabled={isAuthBusy}
                      className="w-full px-4 py-2 rounded-lg flex items-center justify-between gap-3 text-sm font-medium disabled:opacity-60"
                      style={{ backgroundColor: 'var(--bg-2)', color: 'var(--text-1)', borderWidth: '1px', borderColor: 'var(--stroke-1)' }}
                    >
                      Trocar wallet / desconectar
                      <LogOut className="w-4 h-4" />
                    </button>
                  ) : null}
                </div>
              </div>
            </div>
          </FieldSurface>

          <FieldSurface
            as="section"
            motif="identity-mesh"
            density="compact"
            surface="strip"
            className="rounded-xl p-4"
            style={{ backgroundColor: 'var(--bg-2)', borderWidth: '1px', borderColor: 'var(--stroke-1)', boxShadow: 'var(--shadow-1)' }}
          >
            <div className="flex flex-wrap gap-2">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                const active = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className="px-4 py-2 rounded-lg flex items-center gap-2 text-sm font-medium transition-all"
                    style={{
                      backgroundColor: active ? 'var(--accent-orange)' : 'var(--bg-3)',
                      color: active ? '#FFFFFF' : 'var(--text-1)',
                      borderWidth: active ? '0px' : '1px',
                      borderColor: 'var(--stroke-1)',
                    }}
                  >
                    <Icon className="w-4 h-4" />
                    {tab.label}
                  </button>
                );
              })}
            </div>
          </FieldSurface>

          {activeTab === 'account' && (
            <>
              {!isAuthenticated ? (
                <FieldSurface
                  motif="identity-mesh"
                  density="compact"
                  surface="panel"
                  className="rounded-xl p-5 space-y-4"
                  style={{ backgroundColor: 'var(--bg-2)', borderWidth: '1px', borderColor: 'var(--stroke-1)', boxShadow: 'var(--shadow-1)' }}
                >
                  <ModuleStateCard
                    tone="disconnected"
                    title="Conecte a primeira wallet"
                    description="O Passport ancora a conta a partir da primeira autenticacao SIWE. Depois disso, novas wallets entram na mesma conta."
                  />
                  <WalletConnect showConnectButton connectButtonLabel="Conectar wallet e assinar SIWE" fullWidth />
                </FieldSurface>
              ) : identityQuery.isLoading && !identity ? (
                <ModuleStateCard
                  tone="loading"
                  title="Resolvendo conta"
                  description="Carregando ancora, wallets vinculadas e continuidade recente."
                />
              ) : (identityQuery.isError || !identity) && !identity ? (
                <ModuleStateCard
                  tone="error"
                  title="Falha ao carregar o Passport"
                  description="A conta autenticada nao pode ser resolvida agora."
                  actionLabel="Tentar novamente"
                  onAction={() => identityQuery.refetch()}
                />
              ) : (
                <>
                  <section className="grid grid-cols-1 xl:grid-cols-[minmax(0,1.15fr)_minmax(320px,0.85fr)] gap-5">
                    <FieldSurface
                      motif="identity-mesh"
                      as="section"
                      density="compact"
                      surface="panel"
                      className="rounded-xl p-5"
                      style={{ backgroundColor: 'var(--bg-2)', borderWidth: '1px', borderColor: 'var(--stroke-1)', boxShadow: 'var(--shadow-1)' }}
                    >
                      <div className="mb-4 text-sm font-semibold" style={{ color: 'var(--text-2)' }}>
                        Conta
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
                        <div className="rounded-lg p-4" style={statCardStyle}>
                          <div className="text-[11px] uppercase mb-1" style={{ color: 'var(--text-3)' }}>Identity ID</div>
                          <div className="font-semibold break-all" style={{ color: 'var(--text-1)' }}>
                            {identity.identity.id}
                          </div>
                        </div>
                        <div className="rounded-lg p-4" style={statCardStyle}>
                          <div className="text-[11px] uppercase mb-1" style={{ color: 'var(--text-3)' }}>Wallet ancora</div>
                          <div className="font-semibold break-all" style={{ color: 'var(--text-1)' }}>
                            {formatAddress(identity.identity.anchor_address)}
                          </div>
                        </div>
                        <div className="rounded-lg p-4" style={statCardStyle}>
                          <div className="text-[11px] uppercase mb-1" style={{ color: 'var(--text-3)' }}>Wallet da sessao</div>
                          <div className="font-semibold break-all" style={{ color: 'var(--text-1)' }}>
                            {address ? formatAddress(address) : '--'}
                          </div>
                        </div>
                        <div className="rounded-lg p-4" style={statCardStyle}>
                          <div className="text-[11px] uppercase mb-1" style={{ color: 'var(--text-3)' }}>Criada em</div>
                          <div className="font-semibold" style={{ color: 'var(--text-1)' }}>
                            {formatDate(identity.identity.created_at)}
                          </div>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 xl:grid-cols-4 gap-3">
                        <div className="rounded-lg p-4" style={statCardStyle}>
                          <div className="text-[11px] uppercase mb-1" style={{ color: 'var(--text-3)' }}>Status</div>
                          <div className="font-semibold" style={{ color: 'var(--text-1)' }}>
                            {identityStatus.label}
                          </div>
                        </div>
                        <div className="rounded-lg p-4" style={statCardStyle}>
                          <div className="text-[11px] uppercase mb-1" style={{ color: 'var(--text-3)' }}>Resolucao publica</div>
                          <div className="font-semibold" style={{ color: 'var(--text-1)' }}>
                            {identity.identity.id ? 'ativa' : 'pendente'}
                          </div>
                        </div>
                        <div className="rounded-lg p-4" style={statCardStyle}>
                          <div className="text-[11px] uppercase mb-1" style={{ color: 'var(--text-3)' }}>Ultima atividade</div>
                          <div className="font-semibold" style={{ color: 'var(--text-1)' }}>
                            {formatDate(latestAccountActivity)}
                          </div>
                        </div>
                        <div className="rounded-lg p-4" style={statCardStyle}>
                          <div className="text-[11px] uppercase mb-1" style={{ color: 'var(--text-3)' }}>Escopo multichain</div>
                          <div className="font-semibold" style={{ color: 'var(--text-1)' }}>
                            {connectedNetworkScope.length || 0} redes
                          </div>
                        </div>
                      </div>
                    </FieldSurface>

                    <div
                      className="rounded-xl p-5"
                      style={{ backgroundColor: 'var(--bg-2)', borderWidth: '1px', borderColor: 'var(--stroke-1)', boxShadow: 'var(--shadow-1)' }}
                    >
                      <div className="mb-4 text-sm font-semibold" style={{ color: 'var(--text-2)' }}>
                        Prontidao da conta
                      </div>
                      <div className="space-y-3">
                        <div className="rounded-lg p-4" style={statCardStyle}>
                          <div className="font-semibold mb-2" style={{ color: 'var(--text-1)' }}>Login continuo</div>
                          <div className="text-sm" style={{ color: 'var(--text-2)' }}>
                            {identity.stats.wallets_total > 1
                              ? 'Qualquer wallet ativa desta conta deve reabrir a mesma identidade.'
                              : 'A ancora ja esta criada. Agora voce pode expandir a conta com novas wallets.'}
                          </div>
                        </div>
                        <div className="rounded-lg p-4" style={statCardStyle}>
                          <div className="font-semibold mb-2" style={{ color: 'var(--text-1)' }}>Lookup publico</div>
                          <div className="text-sm" style={{ color: 'var(--text-2)' }}>
                            O Passport resolve tanto por endereco quanto por identity id, sem depender de uma interface social.
                          </div>
                        </div>
                        <div className="rounded-lg p-4" style={statCardStyle}>
                          <div className="font-semibold mb-2" style={{ color: 'var(--text-1)' }}>Escopo atual</div>
                          <div className="text-sm" style={{ color: 'var(--text-2)' }}>
                            Wallet graph, checkpoint publico e continuidade ja estao ativos. Execucao financeira continua fora do Passport.
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
                      <div className="mb-4 text-sm font-semibold" style={{ color: 'var(--text-2)' }}>
                        Continuidade da conta
                      </div>
                      {identity.events.length === 0 ? (
                        <div className="text-sm" style={{ color: 'var(--text-2)' }}>
                          Novos vinculos, trocas de wallet e checkpoints aparecem aqui.
                        </div>
                      ) : (
                        <div className="space-y-3">
                          {identity.events.map((event) => (
                            <div key={event.id} className="rounded-lg p-4" style={statCardStyle}>
                              <div className="flex items-start justify-between gap-3 mb-2">
                                <div className="font-semibold" style={{ color: 'var(--text-1)' }}>
                                  {event.type.replaceAll('_', ' ')}
                                </div>
                                <Clock3 className="w-4 h-4 shrink-0" style={{ color: 'var(--text-3)' }} />
                              </div>
                              <div className="text-sm break-words" style={{ color: 'var(--text-2)' }}>
                                {event.target_address ? formatAddress(event.target_address) : 'Evento de checkpoint'}
                              </div>
                              <div className="text-[11px] uppercase tracking-wide mt-2" style={{ color: 'var(--text-3)' }}>
                                {formatDate(event.created_at)}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    <div
                      className="rounded-xl p-5"
                      style={{ backgroundColor: 'var(--bg-2)', borderWidth: '1px', borderColor: 'var(--stroke-1)', boxShadow: 'var(--shadow-1)' }}
                    >
                      <div className="mb-4 text-sm font-semibold" style={{ color: 'var(--text-2)' }}>
                        Fronteiras do Passport
                      </div>
                      <div className="grid grid-cols-1 gap-3">
                        <div className="rounded-lg p-4" style={statCardStyle}>
                          <div className="font-semibold mb-2" style={{ color: 'var(--text-1)' }}>O que o Passport resolve</div>
                          <div className="text-sm" style={{ color: 'var(--text-2)' }}>
                            Conta, wallets vinculadas, checkpoint publico e lookup persistente por endereco ou identity id.
                          </div>
                        </div>
                        <div className="rounded-lg p-4" style={statCardStyle}>
                          <div className="font-semibold mb-2" style={{ color: 'var(--text-1)' }}>O que fica fora</div>
                          <div className="text-sm" style={{ color: 'var(--text-2)' }}>
                            Vault le postura e saldo. Swaps executa. Secrets guarda memoria privada. O Passport unifica identidade.
                          </div>
                        </div>
                      </div>
                    </div>
                  </section>

                  <PassportIdentityProfilePanel
                    profile={identity.profile}
                    identityId={identity.identity.id}
                    primaryAddress={identity.primary_wallet?.address ?? identity.identity.anchor_address}
                    walletsTotal={identity.stats.wallets_total}
                    editable
                    isSaving={updateProfileMutation.isPending}
                    errorMessage={profileSaveError}
                    title="Presenca publica"
                    subtitle="Edite como esta conta aparece quando alguem resolve seu endereco ou identity id no Passport."
                    onSave={handleProfileSave}
                  />
                </>
              )}
            </>
          )}

          {activeTab === 'wallets' && (
            <>
              {!isAuthenticated ? (
                <div
                  className="rounded-xl p-5 space-y-4"
                  style={{ backgroundColor: 'var(--bg-2)', borderWidth: '1px', borderColor: 'var(--stroke-1)', boxShadow: 'var(--shadow-1)' }}
                >
                  <ModuleStateCard
                    tone="disconnected"
                    title="Conecte a primeira wallet"
                    description="A conta precisa de uma wallet ancora antes de aceitar novos vinculos."
                  />
                  <WalletConnect showConnectButton connectButtonLabel="Conectar wallet e assinar SIWE" fullWidth />
                </div>
              ) : identityQuery.isLoading && !identity ? (
                <ModuleStateCard
                  tone="loading"
                  title="Carregando wallets"
                  description="Resolvendo wallets vinculadas e presenca multi-network."
                />
              ) : (identityQuery.isError || !identity) && !identity ? (
                <ModuleStateCard
                  tone="error"
                  title="Falha ao carregar wallets"
                  description="A conta autenticada nao devolveu a topologia de wallets agora."
                  actionLabel="Tentar novamente"
                  onAction={() => identityQuery.refetch()}
                />
              ) : (
                <>
                  <section
                    className="rounded-xl p-5"
                    style={{ backgroundColor: 'var(--bg-2)', borderWidth: '1px', borderColor: 'var(--stroke-1)', boxShadow: 'var(--shadow-1)' }}
                  >
                    <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                      <div>
                        <div className="text-sm font-semibold" style={{ color: 'var(--text-1)' }}>
                          Wallets vinculadas
                        </div>
                        <div className="text-sm mt-1" style={{ color: 'var(--text-2)' }}>
                          A conta permanece a mesma. O que muda aqui e quais wallets podem reabrir esse mesmo checkpoint.
                        </div>
                      </div>
                      <button
                        onClick={() => setShowLinkPanel((current) => !current)}
                        className="px-4 py-2 rounded-lg inline-flex items-center gap-2 text-sm font-medium"
                        style={{ backgroundColor: 'var(--bg-3)', color: 'var(--text-1)', borderWidth: '1px', borderColor: 'var(--stroke-1)' }}
                      >
                        <Link2 className="w-4 h-4" />
                        {showLinkPanel ? 'Fechar vinculo' : 'Adicionar wallet'}
                      </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                      {identity.wallets.map((wallet) => (
                        <div key={wallet.id} className="rounded-lg p-4 min-w-0" style={statCardStyle}>
                          <div className="flex items-center justify-between gap-3 mb-3">
                            <div className="font-semibold" style={{ color: 'var(--text-1)' }}>
                              {wallet.label}
                            </div>
                            <StatusBadge status={wallet.is_primary ? 'success' : wallet.status === 'active' ? 'active' : wallet.status === 'revoked' ? 'warning' : 'pending'}>
                              {walletRoleLabel(wallet, identity.identity.anchor_address)}
                            </StatusBadge>
                          </div>
                          <div className="text-sm font-mono break-all mb-3" style={{ color: 'var(--text-2)' }}>
                            {wallet.address}
                          </div>
                          <div className="grid grid-cols-2 gap-3 text-sm">
                            <div>
                              <div className="text-[11px] uppercase mb-1" style={{ color: 'var(--text-3)' }}>Familia</div>
                              <div style={{ color: 'var(--text-1)' }}>{wallet.chain_family}</div>
                            </div>
                            <div>
                              <div className="text-[11px] uppercase mb-1" style={{ color: 'var(--text-3)' }}>Ultimo login</div>
                              <div style={{ color: 'var(--text-1)' }}>{formatDate(wallet.last_login_at)}</div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </section>

                  {showLinkPanel ? (
                    <PassportWalletLinkPanel
                      currentAddress={address}
                      onLinked={() => {
                        setShowLinkPanel(false);
                        identityQuery.refetch();
                      }}
                    />
                  ) : null}

                  <section className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] gap-5">
                    <div
                      className="rounded-xl p-5"
                      style={{ backgroundColor: 'var(--bg-2)', borderWidth: '1px', borderColor: 'var(--stroke-1)', boxShadow: 'var(--shadow-1)' }}
                    >
                      <div className="mb-4 text-sm font-semibold" style={{ color: 'var(--text-2)' }}>
                        Resolucao por rede
                      </div>
                      {connectedLinkedAccounts.length === 0 ? (
                        <div className="text-sm" style={{ color: 'var(--text-2)' }}>
                          O Passport ainda nao expôs presenca publica por rede para esta conta.
                        </div>
                      ) : (
                        <div className="space-y-3">
                          {connectedLinkedAccounts.map((account) => (
                            <div key={`${account.network}-${account.address}`} className="rounded-lg p-4" style={statCardStyle}>
                              <div className="flex items-center justify-between gap-3 mb-2">
                                <div className="font-semibold" style={{ color: 'var(--text-1)' }}>
                                  {account.network}
                                </div>
                                <StatusBadge status={account.primary ? 'success' : account.status === 'active' ? 'active' : 'pending'}>
                                  {account.primary ? 'principal' : account.status ?? 'vinculada'}
                                </StatusBadge>
                              </div>
                              <div className="text-sm font-mono break-all" style={{ color: 'var(--text-2)' }}>
                                {account.address}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    <div
                      className="rounded-xl p-5"
                      style={{ backgroundColor: 'var(--bg-2)', borderWidth: '1px', borderColor: 'var(--stroke-1)', boxShadow: 'var(--shadow-1)' }}
                    >
                      <div className="mb-4 text-sm font-semibold" style={{ color: 'var(--text-2)' }}>
                        Escopo operacional
                      </div>
                      <div className="space-y-3">
                        {connectedNetworkScope.map((scope, index) => (
                          <div key={`${typeof scope.network === 'string' ? scope.network : scope.network?.label}-${index}`} className="rounded-lg p-4" style={statCardStyle}>
                            <div className="flex items-center justify-between gap-3 mb-2">
                              <div className="font-semibold" style={{ color: 'var(--text-1)' }}>
                                {typeof scope.network === 'string' ? scope.network : scope.network?.label ?? '--'}
                              </div>
                              <div className="text-[11px] uppercase" style={{ color: 'var(--text-3)' }}>
                                {scope.enabled === false ? 'desligada' : 'ativa'}
                              </div>
                            </div>
                            <div className="text-sm" style={{ color: 'var(--text-2)' }}>
                              {scope.link_strategy === 'same-address'
                                ? 'Mesmo endereco sempre que a familia permitir.'
                                : 'Requer vinculo externo ou confirmacao adicional.'}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </section>
                </>
              )}
            </>
          )}

          {activeTab === 'lookup' && (
            <section className="grid grid-cols-1 xl:grid-cols-[minmax(0,0.82fr)_minmax(0,1.18fr)] gap-5">
              <div
                className="rounded-xl p-5"
                style={{ backgroundColor: 'var(--bg-2)', borderWidth: '1px', borderColor: 'var(--stroke-1)', boxShadow: 'var(--shadow-1)' }}
              >
                <div className="mb-4 text-sm font-semibold" style={{ color: 'var(--text-2)' }}>
                  Lookup publico
                </div>
                <form onSubmit={handleLookupSubmit} className="space-y-4">
                  <div className="relative">
                    <Search
                      size={18}
                      style={{ color: 'var(--text-3)', position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }}
                    />
                    <input
                      type="text"
                      value={lookupInput}
                      onChange={(event) => {
                        setLookupInput(event.target.value);
                        setLookupError(null);
                      }}
                      placeholder={lookupPlaceholder()}
                      className="w-full pl-10 pr-4 py-3 rounded-lg font-mono text-sm"
                      style={{ backgroundColor: 'var(--bg-3)', borderWidth: '1px', borderColor: 'var(--stroke-1)', color: 'var(--text-1)' }}
                    />
                  </div>

                  {lookupError ? (
                    <div className="text-sm" style={{ color: 'var(--danger-red)' }}>
                      {lookupError}
                    </div>
                  ) : null}

                  <button
                    type="submit"
                    className="px-4 py-2 rounded-lg inline-flex items-center gap-2 font-medium"
                    style={{ backgroundColor: 'var(--accent-orange)', color: '#FFFFFF' }}
                  >
                    Resolver conta
                    <ArrowUpRight className="w-4 h-4" />
                  </button>
                </form>

                <div className="mt-5 space-y-3">
                  <div className="rounded-lg p-4" style={statCardStyle}>
                    <div className="font-semibold mb-2" style={{ color: 'var(--text-1)' }}>O que esta leitura resolve</div>
                    <div className="text-sm" style={{ color: 'var(--text-2)' }}>
                      Identity id, wallet ancora, presenca publica, assertions e enderecos expostos por esta conta.
                    </div>
                  </div>

                  <div className="rounded-lg p-4" style={statCardStyle}>
                    <div className="font-semibold mb-2" style={{ color: 'var(--text-1)' }}>Consultas recentes</div>
                    {recentLookups.length === 0 ? (
                      <div className="text-sm" style={{ color: 'var(--text-2)' }}>
                        Enderecos e identity ids consultados recentemente aparecem aqui.
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {recentLookups.map((recentValue) => (
                          <button
                            key={recentValue}
                            onClick={() => {
                              setLookupInput(recentValue);
                              setLookupTarget(resolveLookupInput(recentValue));
                            }}
                            className="w-full rounded-lg px-3 py-2 text-left font-mono text-sm"
                            style={{ backgroundColor: 'var(--bg-2)', color: 'var(--text-1)', borderWidth: '1px', borderColor: 'var(--stroke-1)' }}
                          >
                            {recentValue}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div
                className="rounded-xl p-5"
                style={{ backgroundColor: 'var(--bg-2)', borderWidth: '1px', borderColor: 'var(--stroke-1)', boxShadow: 'var(--shadow-1)' }}
              >
                <div className="mb-4 text-sm font-semibold" style={{ color: 'var(--text-2)' }}>
                  Conta resolvida
                </div>

                {!lookupTarget ? (
                  <div className="text-sm" style={{ color: 'var(--text-2)' }}>
                    Resolva por endereco 0x... ou por identity id para abrir a presenca publica desta conta.
                  </div>
                ) : lookupIsLoading ? (
                  <div className="text-sm" style={{ color: 'var(--text-2)' }}>
                    Resolvendo conta...
                  </div>
                ) : lookupHasError ? (
                  <div className="text-sm" style={{ color: 'var(--danger-red)' }}>
                    Falha ao resolver essa conta agora.
                  </div>
                ) : (
                  <div className="space-y-4">
                    {publicPassport ? (
                      <PassportIdentityProfilePanel
                        profile={publicPassport.profile}
                        identityId={publicPassport.identity.id}
                        primaryAddress={publicPassport.primary_wallet?.address ?? publicPassport.identity.anchor_address}
                        walletsTotal={publicPassport.stats.wallets_total}
                        title="Presenca publica resolvida"
                        subtitle="Resolvida a partir do lookup publico do Passport, por endereco ou identity id."
                      />
                    ) : null}

                    <div className="grid grid-cols-2 xl:grid-cols-4 gap-3">
                      <div className="rounded-lg p-4" style={statCardStyle}>
                        <div className="text-[11px] uppercase mb-1" style={{ color: 'var(--text-3)' }}>Modo</div>
                        <div className="font-semibold" style={{ color: 'var(--text-1)' }}>
                          {lookupTarget.kind === 'identity' ? 'identity id' : 'endereco'}
                        </div>
                      </div>
                      <div className="rounded-lg p-4" style={statCardStyle}>
                        <div className="text-[11px] uppercase mb-1" style={{ color: 'var(--text-3)' }}>Identity ID</div>
                        <div className="font-semibold break-all" style={{ color: 'var(--text-1)' }}>
                          {publicPassport?.identity.id ?? '--'}
                        </div>
                      </div>
                      <div className="rounded-lg p-4" style={statCardStyle}>
                        <div className="text-[11px] uppercase mb-1" style={{ color: 'var(--text-3)' }}>Wallet ancora</div>
                        <div className="font-semibold break-all" style={{ color: 'var(--text-1)' }}>
                          {publicPassport?.identity.anchor_address ? formatAddress(publicPassport.identity.anchor_address) : '--'}
                        </div>
                      </div>
                      <div className="rounded-lg p-4" style={statCardStyle}>
                        <div className="text-[11px] uppercase mb-1" style={{ color: 'var(--text-3)' }}>Wallets</div>
                        <div className="font-semibold" style={{ color: 'var(--text-1)' }}>
                          {publicPassport?.stats.wallets_total ?? publicLinkedAccounts.length ?? 0}
                        </div>
                      </div>
                    </div>

                    {publicProfile ? (
                      <div className="grid grid-cols-2 xl:grid-cols-4 gap-3">
                        <div className="rounded-lg p-4" style={statCardStyle}>
                          <div className="text-[11px] uppercase mb-1" style={{ color: 'var(--text-3)' }}>Endereco resolvido</div>
                          <div className="font-semibold break-all" style={{ color: 'var(--text-1)' }}>
                            {publicProfile.identity?.address ? formatAddress(publicProfile.identity.address) : '--'}
                          </div>
                        </div>
                        <div className="rounded-lg p-4" style={statCardStyle}>
                          <div className="text-[11px] uppercase mb-1" style={{ color: 'var(--text-3)' }}>Tipo</div>
                          <div className="font-semibold" style={{ color: 'var(--text-1)' }}>
                            {publicProfile.identity?.accountType ?? '--'}
                          </div>
                        </div>
                        <div className="rounded-lg p-4" style={statCardStyle}>
                          <div className="text-[11px] uppercase mb-1" style={{ color: 'var(--text-3)' }}>Atividade</div>
                          <div className="font-semibold" style={{ color: 'var(--text-1)' }}>
                            {publicProfile.identity?.hasActivity ? 'ativa' : 'sem atividade'}
                          </div>
                        </div>
                        <div className="rounded-lg p-4" style={statCardStyle}>
                          <div className="text-[11px] uppercase mb-1" style={{ color: 'var(--text-3)' }}>Fonte</div>
                          <div className="font-semibold" style={{ color: 'var(--text-1)' }}>
                            {publicProfile.metadata?.source ?? '--'}
                          </div>
                        </div>
                      </div>
                    ) : null}

                    <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] gap-4">
                      <div className="rounded-lg p-4" style={statCardStyle}>
                        <div className="mb-3 text-sm font-semibold" style={{ color: 'var(--text-1)' }}>
                          Assertions publicas
                        </div>
                        {(publicProfile?.assertions ?? []).length === 0 ? (
                          <div className="text-sm" style={{ color: 'var(--text-2)' }}>
                            Nenhuma assertion publica adicional foi retornada para esta consulta.
                          </div>
                        ) : (
                          <div className="space-y-3">
                            {(publicProfile?.assertions ?? []).map((assertion) => (
                              <div key={assertion.id} className="rounded-lg p-3" style={{ backgroundColor: 'var(--bg-2)', borderWidth: '1px', borderColor: 'var(--stroke-1)' }}>
                                <div className="flex items-center justify-between gap-3 mb-1">
                                  <div className="font-semibold" style={{ color: 'var(--text-1)' }}>{assertion.label}</div>
                                  <StatusBadge status={assertion.status === 'present' ? 'success' : assertion.status === 'inactive' ? 'warning' : 'pending'}>
                                    {assertion.status}
                                  </StatusBadge>
                                </div>
                                <div className="text-sm break-words" style={{ color: 'var(--text-2)' }}>{assertion.value ?? '--'}</div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      <div className="rounded-lg p-4" style={statCardStyle}>
                        <div className="mb-3 text-sm font-semibold" style={{ color: 'var(--text-1)' }}>
                          Presenca por rede
                        </div>
                        {publicLinkedAccounts.length === 0 ? (
                          <div className="text-sm" style={{ color: 'var(--text-2)' }}>
                            Nenhuma presenca multi-network explicita foi retornada para esta conta.
                          </div>
                        ) : (
                          <div className="space-y-3">
                            {publicLinkedAccounts.map((account) => (
                              <div key={`${account.network}-${account.address}`} className="rounded-lg p-3" style={{ backgroundColor: 'var(--bg-2)', borderWidth: '1px', borderColor: 'var(--stroke-1)' }}>
                                <div className="flex items-center justify-between gap-3 mb-1">
                                  <div className="font-semibold" style={{ color: 'var(--text-1)' }}>{account.network}</div>
                                  <StatusBadge status={account.primary ? 'success' : account.status === 'active' ? 'active' : 'pending'}>
                                    {account.primary ? 'principal' : account.status ?? 'vinculada'}
                                  </StatusBadge>
                                </div>
                                <div className="text-sm font-mono break-all" style={{ color: 'var(--text-2)' }}>{account.address}</div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </section>
          )}
        </div>
      </div>
    </div>
  );
}
