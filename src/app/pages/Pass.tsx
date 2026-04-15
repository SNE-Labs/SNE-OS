import { useEffect, useMemo, useState } from 'react';
import {
  Activity,
  ArrowUpRight,
  BadgeCheck,
  Clock3,
  Globe,
  Link2,
  Network,
  Search,
  Shield,
  Sparkles,
  Wallet,
} from 'lucide-react';
import { isAddress } from 'viem';

import { ModuleStateCard } from '../components/sne/ModuleStateCard';
import { StatusBadge } from '../components/sne/StatusBadge';
import { WalletConnect } from '../components/passport/WalletConnect';
import { PassportIdentityProfilePanel } from '../components/passport/PassportIdentityProfilePanel';
import { PassportWalletLinkPanel } from '../components/passport/PassportWalletLinkPanel';
import { usePassportIdentity, usePassportOverview, useUpdatePassportProfile } from '../../hooks/usePassportData';
import { useAuth } from '@/lib/auth/AuthProvider';
import type { PassportOverviewIdentity, PassportProfileInput } from '@/types/passport';
import { formatAddress } from '@/utils/format';

type PassportTab = 'identity' | 'lookup' | 'social';

type LinkedAccount = {
  network: string;
  address: string;
  primary?: boolean;
  status?: string;
  account_type?: string;
};

type NetworkScope = {
  network: string;
  link_strategy?: string;
  enabled?: boolean;
};

type OverviewProfile = {
  assertions?: Array<{ id: string; label: string; status: string; value?: string | null; source?: string }>;
  linked_accounts?: LinkedAccount[];
  network_scope?: NetworkScope[];
  identity?: { address?: string; accountType?: string; txCount?: number; balanceEth?: string; hasActivity?: boolean };
  passport?: PassportOverviewIdentity | null;
  metadata?: { source?: string };
};

const RECENT_LOOKUPS_KEY = 'sne-passport-recent-lookups';

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

function writeRecentLookups(addresses: string[]) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(RECENT_LOOKUPS_KEY, JSON.stringify(addresses.slice(0, 8)));
}

function formatDate(value?: string | null) {
  if (!value) return '--';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '--';
  return date.toLocaleString('pt-BR');
}

export function Pass() {
  const { address, isAuthenticated } = useAuth();
  const [activeTab, setActiveTab] = useState<PassportTab>('identity');
  const [lookupInput, setLookupInput] = useState('');
  const [lookupTarget, setLookupTarget] = useState<string | null>(null);
  const [lookupError, setLookupError] = useState<string | null>(null);
  const [profileSaveError, setProfileSaveError] = useState<string | null>(null);
  const [showLinkPanel, setShowLinkPanel] = useState(false);
  const [recentLookups, setRecentLookups] = useState<string[]>(() => readRecentLookups());

  const identityQuery = usePassportIdentity(isAuthenticated);
  const connectedOverviewQuery = usePassportOverview(isAuthenticated && address ? address : null);
  const publicOverviewQuery = usePassportOverview(lookupTarget);
  const updateProfileMutation = useUpdatePassportProfile();

  const identity = identityQuery.data;
  const connectedProfile = connectedOverviewQuery.data?.profile as OverviewProfile | null;
  const publicProfile = publicOverviewQuery.data?.profile as OverviewProfile | null;
  const publicPassport = publicProfile?.passport ?? null;

  const connectedLinkedAccounts = connectedProfile?.linked_accounts ?? [];
  const connectedNetworkScope = connectedProfile?.network_scope ?? [];

  useEffect(() => {
    writeRecentLookups(recentLookups);
  }, [recentLookups]);

  useEffect(() => {
    if (!lookupTarget || !publicOverviewQuery.isSuccess) return;
    setRecentLookups((current) => [lookupTarget, ...current.filter((item) => item.toLowerCase() !== lookupTarget.toLowerCase())].slice(0, 8));
  }, [lookupTarget, publicOverviewQuery.isSuccess]);

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
      return { label: 'wallets vinculadas', tone: 'success' as const };
    }
    return { label: 'active', tone: 'active' as const };
  }, [identity?.stats.wallets_total, identityQuery.isError, identityQuery.isLoading, isAuthenticated]);

  const tabs = [
    { id: 'identity', label: 'Minha Identidade', icon: BadgeCheck },
    { id: 'lookup', label: 'Lookup Público', icon: Search },
    { id: 'social', label: 'Rede', icon: Sparkles },
  ] as const;

  const handleLookupSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    const candidate = lookupInput.trim();

    if (!candidate) {
      setLookupError('Informe um endereço para consultar.');
      return;
    }
    if (!isAddress(candidate)) {
      setLookupError('Endereço Ethereum inválido.');
      return;
    }

    setLookupTarget(candidate);
    setLookupError(null);
    setActiveTab('lookup');
  };

  const handleProfileSave = async (payload: PassportProfileInput) => {
    setProfileSaveError(null);
    try {
      await updateProfileMutation.mutateAsync(payload);
    } catch (error) {
      setProfileSaveError(error instanceof Error ? error.message : 'Falha ao salvar o perfil.');
    }
  };

  const statCardStyle = {
    backgroundColor: 'var(--bg-3)',
    borderWidth: '1px',
    borderColor: 'var(--stroke-1)',
  } as const;

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
                  <div className="text-sm" style={{ color: 'var(--text-3)' }}>Passport</div>
                  {identityQuery.isFetching && identity ? (
                    <StatusBadge status="pending">sincronizando</StatusBadge>
                  ) : null}
                </div>

                <h1 className="text-3xl font-semibold mb-2" style={{ color: 'var(--text-1)' }}>
                  Identidade única do OS, resolvida por múltiplas wallets.
                </h1>
                <p className="max-w-3xl text-sm" style={{ color: 'var(--text-2)' }}>
                  O Passport é a camada de identidade, vínculo e lookup público do SNE OS. A primeira wallet autenticada vira a âncora da identidade; as próximas podem ser vinculadas ao mesmo grafo, sem perder a leitura pública on-chain.
                </p>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-5">
                  <div className="rounded-lg px-4 py-3" style={statCardStyle}>
                    <div className="text-[11px] uppercase mb-1" style={{ color: 'var(--text-3)' }}>Wallet primária</div>
                    <div className="font-semibold break-all" style={{ color: 'var(--text-1)' }}>
                      {identity?.primary_wallet ? formatAddress(identity.primary_wallet.address) : 'Não autenticado'}
                    </div>
                  </div>
                  <div className="rounded-lg px-4 py-3" style={statCardStyle}>
                    <div className="text-[11px] uppercase mb-1" style={{ color: 'var(--text-3)' }}>Wallets vinculadas</div>
                    <div className="font-semibold" style={{ color: 'var(--text-1)' }}>
                      {identity?.stats.wallets_total ?? 0}
                    </div>
                  </div>
                  <div className="rounded-lg px-4 py-3" style={statCardStyle}>
                    <div className="text-[11px] uppercase mb-1" style={{ color: 'var(--text-3)' }}>Checkpoint</div>
                    <div className="font-semibold break-all" style={{ color: 'var(--text-1)' }}>
                      {identity?.identity_id ?? identity?.identity.id ?? '--'}
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
                      {address ? formatAddress(address) : 'Conecte sua wallet'}
                    </div>
                    <div className="text-sm" style={{ color: 'var(--text-2)' }}>
                      {isAuthenticated
                        ? 'Use qualquer wallet vinculada para voltar à mesma identidade do OS.'
                        : 'Autentique a primeira wallet para criar a âncora do seu Passport.'}
                    </div>
                  </div>
                </div>

                <div className="mt-5 space-y-3">
                  {isAuthenticated ? (
                    <button
                      onClick={() => setShowLinkPanel((current) => !current)}
                      className="w-full px-4 py-2 rounded-lg flex items-center justify-between gap-3 text-sm font-medium"
                      style={{ backgroundColor: 'var(--bg-2)', color: 'var(--text-1)', borderWidth: '1px', borderColor: 'var(--stroke-1)' }}
                    >
                      Vincular nova wallet
                      <ArrowUpRight className="w-4 h-4" />
                    </button>
                  ) : (
                    <WalletConnect showConnectButton connectButtonLabel="Criar identidade Passport" fullWidth />
                  )}
                  <button
                    onClick={() => setActiveTab('lookup')}
                    className="w-full px-4 py-2 rounded-lg flex items-center justify-between gap-3 text-sm font-medium"
                    style={{ backgroundColor: 'var(--bg-2)', color: 'var(--text-1)', borderWidth: '1px', borderColor: 'var(--stroke-1)' }}
                  >
                    Consultar endereço público
                    <Search className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          </section>

          <section
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
          </section>

          {activeTab === 'identity' && (
            <>
              {!isAuthenticated ? (
                <div
                  className="rounded-xl p-5 space-y-4"
                  style={{ backgroundColor: 'var(--bg-2)', borderWidth: '1px', borderColor: 'var(--stroke-1)', boxShadow: 'var(--shadow-1)' }}
                >
                  <ModuleStateCard
                    tone="disconnected"
                    title="Conecte a primeira wallet"
                    description="O Passport cria uma identidade âncora a partir da sua primeira autenticação SIWE. Depois disso, outras wallets entram no mesmo grafo de identidade."
                  />
                  <WalletConnect showConnectButton connectButtonLabel="Conectar wallet e assinar SIWE" fullWidth />
                </div>
              ) : identityQuery.isLoading && !identity ? (
                <ModuleStateCard
                  tone="loading"
                  title="Resolvendo identidade"
                  description="Carregando wallet primária, grafo de carteiras e trilha recente de eventos."
                />
              ) : (identityQuery.isError || !identity) && !identity ? (
                <ModuleStateCard
                  tone="error"
                  title="Falha ao carregar o Passport"
                  description="A identidade autenticada não pôde ser resolvida agora."
                  actionLabel="Tentar novamente"
                  onAction={() => identityQuery.refetch()}
                />
              ) : (
                <>
                  <PassportIdentityProfilePanel
                    profile={identity.profile}
                    identityId={identity.identity.id}
                    primaryAddress={identity.primary_wallet?.address ?? identity.identity.anchor_address}
                    walletsTotal={identity.stats.wallets_total}
                    editable
                    isSaving={updateProfileMutation.isPending}
                    errorMessage={profileSaveError}
                    title="Perfil customizavel"
                    subtitle="O checkpoint continua sendo o identity id. O que muda aqui eh a camada publica e social exibida pelo Passport."
                    onSave={handleProfileSave}
                  />

                  <section className="grid grid-cols-1 xl:grid-cols-[minmax(0,1.15fr)_minmax(320px,0.85fr)] gap-5">
                    <div
                      className="rounded-xl p-5"
                      style={{ backgroundColor: 'var(--bg-2)', borderWidth: '1px', borderColor: 'var(--stroke-1)', boxShadow: 'var(--shadow-1)' }}
                    >
                      <div className="mb-4 text-sm font-semibold" style={{ color: 'var(--text-2)' }}>
                        Checkpoint da Identidade
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
                        <div className="rounded-lg p-4" style={statCardStyle}>
                          <div className="text-[11px] uppercase mb-1" style={{ color: 'var(--text-3)' }}>Identity ID</div>
                          <div className="font-semibold break-all" style={{ color: 'var(--text-1)' }}>
                            {identity.identity.id}
                          </div>
                        </div>
                        <div className="rounded-lg p-4" style={statCardStyle}>
                          <div className="text-[11px] uppercase mb-1" style={{ color: 'var(--text-3)' }}>Wallet âncora</div>
                          <div className="font-semibold break-all" style={{ color: 'var(--text-1)' }}>
                            {formatAddress(identity.identity.anchor_address)}
                          </div>
                        </div>
                        <div className="rounded-lg p-4" style={statCardStyle}>
                          <div className="text-[11px] uppercase mb-1" style={{ color: 'var(--text-3)' }}>Primária atual</div>
                          <div className="font-semibold break-all" style={{ color: 'var(--text-1)' }}>
                            {identity.primary_wallet ? formatAddress(identity.primary_wallet.address) : '--'}
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
                          <div className="text-[11px] uppercase mb-1" style={{ color: 'var(--text-3)' }}>Tipo</div>
                          <div className="font-semibold" style={{ color: 'var(--text-1)' }}>
                            {connectedProfile?.identity?.accountType ?? '--'}
                          </div>
                        </div>
                        <div className="rounded-lg p-4" style={statCardStyle}>
                          <div className="text-[11px] uppercase mb-1" style={{ color: 'var(--text-3)' }}>Transações</div>
                          <div className="font-semibold" style={{ color: 'var(--text-1)' }}>
                            {connectedProfile?.identity?.txCount ?? '--'}
                          </div>
                        </div>
                        <div className="rounded-lg p-4" style={statCardStyle}>
                          <div className="text-[11px] uppercase mb-1" style={{ color: 'var(--text-3)' }}>Saldo</div>
                          <div className="font-semibold" style={{ color: 'var(--text-1)' }}>
                            {connectedProfile?.identity?.balanceEth ? `${connectedProfile.identity.balanceEth} ETH` : '--'}
                          </div>
                        </div>
                        <div className="rounded-lg p-4" style={statCardStyle}>
                          <div className="text-[11px] uppercase mb-1" style={{ color: 'var(--text-3)' }}>Fonte</div>
                          <div className="font-semibold" style={{ color: 'var(--text-1)' }}>
                            {connectedProfile?.metadata?.source ?? '--'}
                          </div>
                        </div>
                      </div>
                    </div>

                    <div
                      className="rounded-xl p-5"
                      style={{ backgroundColor: 'var(--bg-2)', borderWidth: '1px', borderColor: 'var(--stroke-1)', boxShadow: 'var(--shadow-1)' }}
                    >
                      <div className="mb-4 text-sm font-semibold" style={{ color: 'var(--text-2)' }}>
                        Eventos recentes
                      </div>
                      {identity.events.length === 0 ? (
                        <div className="text-sm" style={{ color: 'var(--text-2)' }}>
                          A trilha de eventos do Passport aparece aqui conforme novas wallets entram ou a identidade sofre mudanças.
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
                                {event.target_address ? formatAddress(event.target_address) : 'Sem alvo explícito'}
                              </div>
                              <div className="text-[11px] uppercase tracking-wide mt-2" style={{ color: 'var(--text-3)' }}>
                                {formatDate(event.created_at)}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </section>

                  <section
                    className="rounded-xl p-5"
                    style={{ backgroundColor: 'var(--bg-2)', borderWidth: '1px', borderColor: 'var(--stroke-1)', boxShadow: 'var(--shadow-1)' }}
                  >
                    <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                      <div>
                        <div className="text-sm font-semibold" style={{ color: 'var(--text-1)' }}>
                          Grafo de carteiras
                        </div>
                        <div className="text-sm mt-1" style={{ color: 'var(--text-2)' }}>
                          Qualquer wallet ativa desta lista deve conseguir abrir a mesma identidade do OS.
                        </div>
                      </div>
                      <button
                        onClick={() => setShowLinkPanel((current) => !current)}
                        className="px-4 py-2 rounded-lg inline-flex items-center gap-2 text-sm font-medium"
                        style={{ backgroundColor: 'var(--bg-3)', color: 'var(--text-1)', borderWidth: '1px', borderColor: 'var(--stroke-1)' }}
                      >
                        <Link2 className="w-4 h-4" />
                        {showLinkPanel ? 'Fechar vínculo' : 'Adicionar wallet'}
                      </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                      {identity.wallets.map((wallet) => (
                        <div key={wallet.id} className="rounded-lg p-4 min-w-0" style={statCardStyle}>
                          <div className="flex items-center justify-between gap-3 mb-3">
                            <div className="font-semibold" style={{ color: 'var(--text-1)' }}>
                              {wallet.label}
                            </div>
                            <StatusBadge status={wallet.status === 'active' ? 'success' : wallet.status === 'revoked' ? 'warning' : 'pending'}>
                              {wallet.is_primary ? 'principal' : wallet.status}
                            </StatusBadge>
                          </div>
                          <div className="text-sm font-mono break-all mb-3" style={{ color: 'var(--text-2)' }}>
                            {wallet.address}
                          </div>
                          <div className="grid grid-cols-2 gap-3 text-sm">
                            <div>
                              <div className="text-[11px] uppercase mb-1" style={{ color: 'var(--text-3)' }}>Família</div>
                              <div style={{ color: 'var(--text-1)' }}>{wallet.chain_family}</div>
                            </div>
                            <div>
                              <div className="text-[11px] uppercase mb-1" style={{ color: 'var(--text-3)' }}>Último login</div>
                              <div style={{ color: 'var(--text-1)' }}>{formatDate(wallet.last_login_at)}</div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </section>

                  {showLinkPanel ? (
                    <PassportWalletLinkPanel currentAddress={address} onLinked={() => identityQuery.refetch()} />
                  ) : null}

                  <section className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] gap-5">
                    <div
                      className="rounded-xl p-5"
                      style={{ backgroundColor: 'var(--bg-2)', borderWidth: '1px', borderColor: 'var(--stroke-1)', boxShadow: 'var(--shadow-1)' }}
                    >
                      <div className="mb-4 text-sm font-semibold" style={{ color: 'var(--text-2)' }}>
                        Presença pública multi-network
                      </div>
                      {connectedLinkedAccounts.length === 0 ? (
                        <div className="text-sm" style={{ color: 'var(--text-2)' }}>
                          O Passport ainda não expôs wallets públicas vinculadas para esta identidade.
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
                        Fronteiras do Passport
                      </div>
                      <div className="grid grid-cols-1 gap-3">
                        <div className="rounded-lg p-4" style={statCardStyle}>
                          <div className="font-semibold mb-2" style={{ color: 'var(--text-1)' }}>O que o Passport resolve</div>
                          <div className="text-sm" style={{ color: 'var(--text-2)' }}>
                            Continuidade de login no OS, vínculo entre wallets, checkpoint de identidade e lookup público do estado on-chain.
                          </div>
                        </div>
                        <div className="rounded-lg p-4" style={statCardStyle}>
                          <div className="font-semibold mb-2" style={{ color: 'var(--text-1)' }}>O que fica em Keys</div>
                          <div className="text-sm" style={{ color: 'var(--text-2)' }}>
                            Licenças, grants, dispositivos e credenciais portáteis continuam pertencendo à camada de acesso.
                          </div>
                        </div>
                        <div className="rounded-lg p-4" style={statCardStyle}>
                          <div className="font-semibold mb-2" style={{ color: 'var(--text-1)' }}>Escopo atual</div>
                          <div className="text-sm" style={{ color: 'var(--text-2)' }}>
                            O graph privado da identidade já está ativo. Camadas sociais e watchlists públicas entram na sequência.
                          </div>
                        </div>
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
                  Lookup público on-chain
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
                      placeholder="0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb"
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
                    Consultar endereço
                    <ArrowUpRight className="w-4 h-4" />
                  </button>
                </form>

                <div className="mt-5 space-y-3">
                  <div className="rounded-lg p-4" style={statCardStyle}>
                    <div className="font-semibold mb-2" style={{ color: 'var(--text-1)' }}>O que esta leitura mostra</div>
                    <div className="text-sm" style={{ color: 'var(--text-2)' }}>
                      Tipo de conta, atividade, saldo, assertions públicas e qualquer wallet vinculada exposta via Passport.
                    </div>
                  </div>

                  <div className="rounded-lg p-4" style={statCardStyle}>
                    <div className="font-semibold mb-2" style={{ color: 'var(--text-1)' }}>Perfis consultados recentemente</div>
                    {recentLookups.length === 0 ? (
                      <div className="text-sm" style={{ color: 'var(--text-2)' }}>
                        As consultas públicas recentes aparecem aqui para virar a memória social inicial do Passport.
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {recentLookups.map((recentAddress) => (
                          <button
                            key={recentAddress}
                            onClick={() => {
                              setLookupInput(recentAddress);
                              setLookupTarget(recentAddress);
                            }}
                            className="w-full rounded-lg px-3 py-2 text-left font-mono text-sm"
                            style={{ backgroundColor: 'var(--bg-2)', color: 'var(--text-1)', borderWidth: '1px', borderColor: 'var(--stroke-1)' }}
                          >
                            {recentAddress}
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
                  Perfil público resolvido
                </div>

                {!lookupTarget ? (
                  <div className="text-sm" style={{ color: 'var(--text-2)' }}>
                    Digite um endereço para abrir a leitura pública do Passport.
                  </div>
                ) : publicOverviewQuery.isLoading && !publicProfile ? (
                  <div className="text-sm" style={{ color: 'var(--text-2)' }}>
                    Resolvendo endereço...
                  </div>
                ) : (publicOverviewQuery.isError || !publicProfile) && !publicProfile ? (
                  <div className="text-sm" style={{ color: 'var(--danger-red)' }}>
                    Falha ao resolver esse endereço agora.
                  </div>
                ) : (
                  <div className="space-y-4">
                    {publicPassport ? (
                      <PassportIdentityProfilePanel
                        profile={publicPassport.profile}
                        identityId={publicPassport.identity.id}
                        primaryAddress={publicPassport.primary_wallet?.address ?? publicPassport.identity.anchor_address}
                        walletsTotal={publicPassport.stats.wallets_total}
                        title="Perfil publico Passport"
                        subtitle="Este perfil foi resolvido a partir do checkpoint de identidade vinculado ao endereco consultado."
                      />
                    ) : null}

                    <div className="rounded-lg p-4" style={statCardStyle}>
                      <div className="text-[11px] uppercase mb-1" style={{ color: 'var(--text-3)' }}>Address</div>
                      <div className="font-semibold break-all" style={{ color: 'var(--text-1)' }}>
                        {publicProfile.identity?.address ?? lookupTarget}
                      </div>
                    </div>

                    {publicPassport ? (
                      <div className="grid grid-cols-2 xl:grid-cols-4 gap-3">
                        <div className="rounded-lg p-4" style={statCardStyle}>
                          <div className="text-[11px] uppercase mb-1" style={{ color: 'var(--text-3)' }}>Identity ID</div>
                          <div className="font-semibold break-all" style={{ color: 'var(--text-1)' }}>
                            {publicPassport.identity.id}
                          </div>
                        </div>
                        <div className="rounded-lg p-4" style={statCardStyle}>
                          <div className="text-[11px] uppercase mb-1" style={{ color: 'var(--text-3)' }}>Wallets</div>
                          <div className="font-semibold" style={{ color: 'var(--text-1)' }}>
                            {publicPassport.stats.wallets_total}
                          </div>
                        </div>
                        <div className="rounded-lg p-4" style={statCardStyle}>
                          <div className="text-[11px] uppercase mb-1" style={{ color: 'var(--text-3)' }}>Anchor</div>
                          <div className="font-semibold break-all" style={{ color: 'var(--text-1)' }}>
                            {formatAddress(publicPassport.identity.anchor_address)}
                          </div>
                        </div>
                        <div className="rounded-lg p-4" style={statCardStyle}>
                          <div className="text-[11px] uppercase mb-1" style={{ color: 'var(--text-3)' }}>Perfil</div>
                          <div className="font-semibold" style={{ color: 'var(--text-1)' }}>
                            {publicPassport.profile.is_default ? 'default' : 'custom'}
                          </div>
                        </div>
                      </div>
                    ) : null}

                    <div className="grid grid-cols-2 xl:grid-cols-4 gap-3">
                      <div className="rounded-lg p-4" style={statCardStyle}>
                        <div className="text-[11px] uppercase mb-1" style={{ color: 'var(--text-3)' }}>Tipo</div>
                        <div className="font-semibold" style={{ color: 'var(--text-1)' }}>
                          {publicProfile.identity?.accountType ?? '--'}
                        </div>
                      </div>
                      <div className="rounded-lg p-4" style={statCardStyle}>
                        <div className="text-[11px] uppercase mb-1" style={{ color: 'var(--text-3)' }}>Tx Count</div>
                        <div className="font-semibold" style={{ color: 'var(--text-1)' }}>
                          {publicProfile.identity?.txCount ?? '--'}
                        </div>
                      </div>
                      <div className="rounded-lg p-4" style={statCardStyle}>
                        <div className="text-[11px] uppercase mb-1" style={{ color: 'var(--text-3)' }}>Saldo</div>
                        <div className="font-semibold" style={{ color: 'var(--text-1)' }}>
                          {publicProfile.identity?.balanceEth ? `${publicProfile.identity.balanceEth} ETH` : '--'}
                        </div>
                      </div>
                      <div className="rounded-lg p-4" style={statCardStyle}>
                        <div className="text-[11px] uppercase mb-1" style={{ color: 'var(--text-3)' }}>Fonte</div>
                        <div className="font-semibold" style={{ color: 'var(--text-1)' }}>
                          {publicProfile.metadata?.source ?? '--'}
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] gap-4">
                      <div className="rounded-lg p-4" style={statCardStyle}>
                        <div className="mb-3 text-sm font-semibold" style={{ color: 'var(--text-1)' }}>
                          Assertions públicas
                        </div>
                        <div className="space-y-3">
                          {(publicProfile.assertions ?? []).map((assertion) => (
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
                      </div>

                      <div className="rounded-lg p-4" style={statCardStyle}>
                        <div className="mb-3 text-sm font-semibold" style={{ color: 'var(--text-1)' }}>
                          Presença por rede
                        </div>
                        {(publicProfile.linked_accounts ?? []).length === 0 ? (
                          <div className="text-sm" style={{ color: 'var(--text-2)' }}>
                            Nenhuma superfície multi-network explícita foi retornada para este perfil.
                          </div>
                        ) : (
                          <div className="space-y-3">
                            {(publicProfile.linked_accounts ?? []).map((account) => (
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

          {activeTab === 'social' && (
            <section className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_minmax(0,0.9fr)] gap-5">
              <div
                className="rounded-xl p-5"
                style={{ backgroundColor: 'var(--bg-2)', borderWidth: '1px', borderColor: 'var(--stroke-1)', boxShadow: 'var(--shadow-1)' }}
              >
                <div className="mb-4 text-sm font-semibold" style={{ color: 'var(--text-2)' }}>
                  Memória social do Passport
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div className="rounded-lg p-4" style={statCardStyle}>
                    <div className="flex items-center gap-2 mb-3">
                      <Search className="w-4 h-4" style={{ color: 'var(--accent-orange)' }} />
                      <div className="font-semibold" style={{ color: 'var(--text-1)' }}>Perfis vistos</div>
                    </div>
                    <div className="text-2xl font-semibold" style={{ color: 'var(--text-1)' }}>
                      {recentLookups.length}
                    </div>
                    <div className="text-sm mt-1" style={{ color: 'var(--text-2)' }}>
                      consultas públicas recentes desta sessão
                    </div>
                  </div>
                  <div className="rounded-lg p-4" style={statCardStyle}>
                    <div className="flex items-center gap-2 mb-3">
                      <Network className="w-4 h-4" style={{ color: 'var(--accent-orange)' }} />
                      <div className="font-semibold" style={{ color: 'var(--text-1)' }}>Redes ligadas</div>
                    </div>
                    <div className="text-2xl font-semibold" style={{ color: 'var(--text-1)' }}>
                      {connectedNetworkScope.length}
                    </div>
                    <div className="text-sm mt-1" style={{ color: 'var(--text-2)' }}>
                      escopos públicos expostos na identidade atual
                    </div>
                  </div>
                  <div className="rounded-lg p-4" style={statCardStyle}>
                    <div className="flex items-center gap-2 mb-3">
                      <Activity className="w-4 h-4" style={{ color: 'var(--accent-orange)' }} />
                      <div className="font-semibold" style={{ color: 'var(--text-1)' }}>Atividade</div>
                    </div>
                    <div className="text-2xl font-semibold" style={{ color: 'var(--text-1)' }}>
                      {connectedProfile?.identity?.hasActivity ? 'ativa' : '--'}
                    </div>
                    <div className="text-sm mt-1" style={{ color: 'var(--text-2)' }}>
                      leitura on-chain da identidade conectada
                    </div>
                  </div>
                </div>

                <div className="mt-5 rounded-lg p-4" style={statCardStyle}>
                  <div className="font-semibold mb-2" style={{ color: 'var(--text-1)' }}>
                    O Passport como rede social cripto
                  </div>
                  <div className="text-sm" style={{ color: 'var(--text-2)' }}>
                    O lookup já funciona como perfil público de wallet. A próxima camada adiciona watchlists, aliases, observação persistente e contexto relacional entre perfis consultados.
                  </div>
                </div>
              </div>

              <div
                className="rounded-xl p-5"
                style={{ backgroundColor: 'var(--bg-2)', borderWidth: '1px', borderColor: 'var(--stroke-1)', boxShadow: 'var(--shadow-1)' }}
              >
                <div className="mb-4 text-sm font-semibold" style={{ color: 'var(--text-2)' }}>
                  Perfis recentemente observados
                </div>
                {recentLookups.length === 0 ? (
                  <div className="text-sm" style={{ color: 'var(--text-2)' }}>
                    Ainda não há perfis observados nesta sessão. Use o lookup público para começar a montar a camada social do Passport.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {recentLookups.map((recentAddress) => (
                      <button
                        key={recentAddress}
                        onClick={() => {
                          setLookupInput(recentAddress);
                          setLookupTarget(recentAddress);
                          setActiveTab('lookup');
                        }}
                        className="w-full rounded-lg p-4 text-left"
                        style={statCardStyle}
                      >
                        <div className="flex items-center justify-between gap-3 mb-2">
                          <div className="font-semibold" style={{ color: 'var(--text-1)' }}>{formatAddress(recentAddress)}</div>
                          <ArrowUpRight className="w-4 h-4" style={{ color: 'var(--text-3)' }} />
                        </div>
                        <div className="text-sm font-mono break-all" style={{ color: 'var(--text-2)' }}>
                          {recentAddress}
                        </div>
                      </button>
                    ))}
                  </div>
                )}

                <div className="mt-5 rounded-lg p-4" style={statCardStyle}>
                  <div className="font-semibold mb-2" style={{ color: 'var(--text-1)' }}>
                    Roadmap imediato
                  </div>
                  <div className="grid grid-cols-1 gap-3 text-sm" style={{ color: 'var(--text-2)' }}>
                    <div className="flex items-start gap-2">
                      <Shield className="w-4 h-4 mt-0.5" style={{ color: 'var(--accent-orange)' }} />
                      <span>Watchlist persistente por identidade</span>
                    </div>
                    <div className="flex items-start gap-2">
                      <Globe className="w-4 h-4 mt-0.5" style={{ color: 'var(--accent-orange)' }} />
                      <span>Perfis públicos com aliases e notas</span>
                    </div>
                    <div className="flex items-start gap-2">
                      <Sparkles className="w-4 h-4 mt-0.5" style={{ color: 'var(--accent-orange)' }} />
                      <span>Provas e sinais sociais derivados do histórico on-chain</span>
                    </div>
                  </div>
                </div>
              </div>
            </section>
          )}
        </div>
      </div>
    </div>
  );
}
