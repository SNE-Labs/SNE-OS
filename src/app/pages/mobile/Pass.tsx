import { useEffect, useState } from 'react';
import { ArrowUpRight, BadgeCheck, Globe, Link2, LogOut, Search, Shield, Wallet } from 'lucide-react';
import { isAddress } from 'viem';

import { Badge, EmptyState, ErrorState, MobileButton, MobilePageShell, SurfaceCard } from '../../components/mobile';
import { PassportIdentityProfilePanel } from '../../components/passport/PassportIdentityProfilePanel';
import { WalletConnect } from '../../components/passport/WalletConnect';
import { PassportWalletLinkPanel } from '../../components/passport/PassportWalletLinkPanel';
import {
  usePassportIdentity,
  usePassportOverview,
  usePassportPublicProfile,
  useUpdatePassportProfile,
} from '../../../hooks/usePassportData';
import { useAuth } from '@/lib/auth/AuthProvider';
import type { PassportOverviewIdentity, PassportProfileInput } from '@/types/passport';
import { formatAddress } from '@/utils/format';

type LinkedAccount = {
  network: string;
  address: string;
  primary?: boolean;
  status?: string;
};

type OverviewProfile = {
  assertions?: Array<{ id: string; label: string; status: string; value?: string | null; source?: string }>;
  linked_accounts?: LinkedAccount[];
  identity?: { address?: string; accountType?: string; txCount?: number; hasActivity?: boolean };
  passport?: PassportOverviewIdentity | null;
  metadata?: { source?: string };
};

type LookupTarget = {
  kind: 'address' | 'identity';
  value: string;
};

const PASSPORT_IDENTITY_PATTERN = /^pid_[a-z0-9]{32}$/i;

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

export function MobilePass() {
  const { address, authStatus, isAuthenticated, logout } = useAuth();
  const [lookupInput, setLookupInput] = useState('');
  const [lookupTarget, setLookupTarget] = useState<LookupTarget | null>(null);
  const [lookupError, setLookupError] = useState<string | null>(null);
  const [profileSaveError, setProfileSaveError] = useState<string | null>(null);
  const [showLinkPanel, setShowLinkPanel] = useState(false);

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
  const latestAccountActivity = latestTimestamp([
    ...(identity?.wallets.map((wallet) => wallet.last_login_at) ?? []),
    ...(identity?.events.map((event) => event.created_at) ?? []),
  ]);

  const isAuthBusy =
    authStatus === 'connecting' ||
    authStatus === 'signing' ||
    authStatus === 'verifying' ||
    authStatus === 'restoring';

  useEffect(() => {
    if (!lookupTarget) return;
    setLookupInput(lookupTarget.value);
  }, [lookupTarget]);

  const handleLookup = () => {
    const resolved = resolveLookupInput(lookupInput);
    if (!resolved) {
      setLookupError('Use um endereco 0x... ou identity id valido.');
      return;
    }
    setLookupError(null);
    setLookupTarget(resolved);
  };

  const handleProfileSave = async (payload: PassportProfileInput) => {
    setProfileSaveError(null);
    try {
      await updateProfileMutation.mutateAsync(payload);
    } catch (error) {
      setProfileSaveError(error instanceof Error ? error.message : 'Falha ao salvar a presenca publica.');
    }
  };

  const lookupIsLoading =
    lookupTarget?.kind === 'address'
      ? addressLookupQuery.isLoading && !publicProfile
      : identityLookupCheckpointQuery.isLoading || (identityLookupAddress != null && identityLookupOverviewQuery.isLoading && !publicProfile);

  const lookupHasError =
    lookupTarget?.kind === 'address'
      ? (addressLookupQuery.isError || !publicProfile) && !publicProfile
      : (identityLookupCheckpointQuery.isError || !publicPassport) && !publicPassport;

  return (
    <MobilePageShell
      title="Passport"
      subtitle="A conta do OS, com wallets vinculadas e lookup publico."
      showContext
    >
      {!isAuthenticated ? (
        <>
          <SurfaceCard variant="elevated">
            <div className="flex items-start gap-3 mb-4">
              <div className="w-11 h-11 rounded-2xl bg-[var(--accent-orange-dim)] text-[var(--accent-orange)] flex items-center justify-center">
                <Wallet className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <div className="text-[var(--text-1)] mb-1">Ancora da conta</div>
                <p className="text-sm text-[var(--text-2)]">
                  A primeira wallet autenticada cria a conta. Depois, novas wallets entram no mesmo checkpoint.
                </p>
              </div>
            </div>

            <WalletConnect showConnectButton connectButtonLabel="Ancorar conta" fullWidth />
          </SurfaceCard>

          <SurfaceCard>
            <div className="flex items-center gap-2 mb-3 text-[var(--text-1)]">
              <Search className="w-4 h-4 text-[var(--accent-orange)]" />
              <span>Lookup publico</span>
            </div>
            <div className="text-sm text-[var(--text-2)]">
              Mesmo sem autenticar, o Passport continua resolvendo endereco e identity id publicamente.
            </div>
          </SurfaceCard>
        </>
      ) : identityQuery.isLoading && !identity ? (
        <div className="space-y-3">
          <SurfaceCard className="h-32 animate-pulse bg-[var(--bg-1)]" />
          <SurfaceCard className="h-44 animate-pulse bg-[var(--bg-1)]" />
        </div>
      ) : (identityQuery.isError || !identity) && !identity ? (
        <ErrorState
          title="Passport indisponivel"
          description="A conta autenticada nao carregou agora."
          onRetry={() => identityQuery.refetch()}
        />
      ) : (
        <>
          <SurfaceCard variant="elevated">
            <div className="flex items-start gap-3 mb-4">
              <div className="w-11 h-11 rounded-2xl bg-[var(--accent-orange-dim)] text-[var(--accent-orange)] flex items-center justify-center">
                <BadgeCheck className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <div className="text-[var(--text-1)] mb-1">{sessionIdentityLabel}</div>
                <p className="text-sm text-[var(--text-2)]">
                  {identity.stats.wallets_total > 1
                    ? 'Sua conta ja pode ser reaberta por multiplas wallets.'
                    : 'A conta ja esta ancorada. Agora voce pode adicionar novas wallets.'}
                </p>
                {address ? (
                  <div className="mt-2 text-[10px] uppercase tracking-wide text-[var(--text-3)] break-all">
                    Sessao atual • {formatAddress(address)}
                  </div>
                ) : null}
              </div>
            </div>

            {identityQuery.isFetching ? (
              <div className="mb-4">
                <Badge variant="neutral" size="sm">atualizando</Badge>
              </div>
            ) : null}

            <div className="grid grid-cols-2 gap-3 mb-4">
              <div className="rounded-xl bg-[var(--bg-2)] border border-[var(--stroke-1)] p-3">
                <div className="text-[10px] uppercase text-[var(--text-3)] mb-1">Identity ID</div>
                <div className="text-[var(--text-1)] break-all">{identity.identity.id}</div>
              </div>
              <div className="rounded-xl bg-[var(--bg-2)] border border-[var(--stroke-1)] p-3">
                <div className="text-[10px] uppercase text-[var(--text-3)] mb-1">Ultima atividade</div>
                <div className="text-[var(--text-1)]">{formatDate(latestAccountActivity)}</div>
              </div>
              <div className="rounded-xl bg-[var(--bg-2)] border border-[var(--stroke-1)] p-3">
                <div className="text-[10px] uppercase text-[var(--text-3)] mb-1">Wallets</div>
                <div className="text-[var(--text-1)]">{identity.stats.wallets_total}</div>
              </div>
              <div className="rounded-xl bg-[var(--bg-2)] border border-[var(--stroke-1)] p-3">
                <div className="text-[10px] uppercase text-[var(--text-3)] mb-1">Lookup</div>
                <div className="text-[var(--text-1)]">ativo</div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <MobileButton className="w-full" onClick={() => setShowLinkPanel((current) => !current)}>
                <Link2 className="w-4 h-4 mr-2" />
                {showLinkPanel ? 'Fechar vinculo' : 'Adicionar wallet'}
              </MobileButton>
              <MobileButton variant="secondary" className="w-full" onClick={handleLookup}>
                <Search className="w-4 h-4 mr-2" />
                Lookup
              </MobileButton>
            </div>

            <MobileButton variant="secondary" className="w-full mt-3" onClick={() => void logout()} disabled={isAuthBusy}>
              <LogOut className="w-4 h-4 mr-2" />
              Trocar wallet / desconectar
            </MobileButton>
          </SurfaceCard>

          {showLinkPanel ? (
            <PassportWalletLinkPanel
              currentAddress={address}
              onLinked={() => {
                setShowLinkPanel(false);
                identityQuery.refetch();
              }}
            />
          ) : null}

          <SurfaceCard>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-[var(--text-1)]">Wallets vinculadas</h3>
              <Badge variant="neutral" size="sm">{identity.wallets.length}</Badge>
            </div>
            <div className="space-y-3">
              {identity.wallets.map((wallet) => (
                <div key={wallet.id} className="rounded-xl bg-[var(--bg-2)] border border-[var(--stroke-1)] p-3">
                  <div className="flex items-center justify-between gap-3 mb-1">
                    <div className="text-[var(--text-1)]">{wallet.label}</div>
                    <Badge variant={wallet.is_primary ? 'orange' : wallet.status === 'active' ? 'success' : 'neutral'} size="sm">
                      {walletRoleLabel(wallet, identity.identity.anchor_address)}
                    </Badge>
                  </div>
                  <div className="text-sm text-[var(--text-2)] break-all mb-1">{wallet.address}</div>
                  <div className="text-[10px] uppercase text-[var(--text-3)]">
                    ultimo login {formatDate(wallet.last_login_at)}
                  </div>
                </div>
              ))}
            </div>
          </SurfaceCard>

          <SurfaceCard>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-[var(--text-1)]">Continuidade da conta</h3>
              <Badge variant="neutral" size="sm">{identity.events.length}</Badge>
            </div>
            {identity.events.length === 0 ? (
              <EmptyState
                title="Sem eventos ainda"
                description="Novos vinculos e checkpoints aparecem aqui."
              />
            ) : (
              <div className="space-y-3">
                {identity.events.map((event) => (
                  <div key={event.id} className="rounded-xl bg-[var(--bg-2)] border border-[var(--stroke-1)] p-3">
                    <div className="text-[var(--text-1)] mb-1">{event.type.replaceAll('_', ' ')}</div>
                    <div className="text-sm text-[var(--text-2)] break-all">
                      {event.target_address ?? 'evento de checkpoint'}
                    </div>
                    <div className="text-[10px] uppercase text-[var(--text-3)] mt-2">{formatDate(event.created_at)}</div>
                  </div>
                ))}
              </div>
            )}
          </SurfaceCard>

          <SurfaceCard>
            <div className="flex items-center gap-2 mb-3 text-[var(--text-1)]">
              <Globe className="w-4 h-4 text-[var(--accent-orange)]" />
              <span>Lookup publico</span>
            </div>
            <div className="space-y-3">
              <input
                type="text"
                value={lookupInput}
                onChange={(event) => {
                  setLookupInput(event.target.value);
                  setLookupError(null);
                }}
                placeholder="0x... ou pid_..."
                className="w-full rounded-xl bg-[var(--bg-2)] border border-[var(--stroke-1)] px-4 py-3 font-mono text-sm text-[var(--text-1)]"
              />
              {lookupError ? <div className="text-sm text-[var(--danger-red)]">{lookupError}</div> : null}
              <MobileButton variant="secondary" className="w-full" onClick={handleLookup}>
                Resolver conta
              </MobileButton>

              {!lookupTarget ? (
                <div className="text-sm text-[var(--text-2)]">
                  Use endereco ou identity id para abrir a presenca publica da conta.
                </div>
              ) : lookupIsLoading ? (
                <div className="text-sm text-[var(--text-2)]">Resolvendo conta...</div>
              ) : lookupHasError ? (
                <div className="text-sm text-[var(--danger-red)]">Falha ao resolver o lookup publico.</div>
              ) : (
                <div className="space-y-3">
                  {publicPassport ? (
                    <PassportIdentityProfilePanel
                      profile={publicPassport.profile}
                      identityId={publicPassport.identity.id}
                      primaryAddress={publicPassport.primary_wallet?.address ?? publicPassport.identity.anchor_address}
                      walletsTotal={publicPassport.stats.wallets_total}
                      title="Conta publica"
                      subtitle="Resolvida por endereco ou identity id no Passport."
                    />
                  ) : null}

                  <div className="rounded-xl bg-[var(--bg-2)] border border-[var(--stroke-1)] p-3">
                    <div className="flex items-center justify-between gap-3 mb-2">
                      <div className="text-[var(--text-1)]">
                        {lookupTarget.kind === 'identity' ? 'identity id' : 'endereco'}
                      </div>
                      <ArrowUpRight className="w-4 h-4 text-[var(--text-3)]" />
                    </div>
                    <div className="grid grid-cols-2 gap-3 mb-3">
                      <div>
                        <div className="text-[10px] uppercase text-[var(--text-3)] mb-1">Identity ID</div>
                        <div className="text-[var(--text-1)] break-all">{publicPassport?.identity.id ?? '--'}</div>
                      </div>
                      <div>
                        <div className="text-[10px] uppercase text-[var(--text-3)] mb-1">Wallets</div>
                        <div className="text-[var(--text-1)]">{publicPassport?.stats.wallets_total ?? publicLinkedAccounts.length ?? 0}</div>
                      </div>
                    </div>
                    {publicProfile ? (
                      <div className="grid grid-cols-2 gap-3 mb-3 text-sm">
                        <div>
                          <div className="text-[var(--text-3)]">Tipo</div>
                          <div className="text-[var(--text-1)]">{publicProfile.identity?.accountType ?? '--'}</div>
                        </div>
                        <div>
                          <div className="text-[var(--text-3)]">Fonte</div>
                          <div className="text-[var(--text-1)]">{publicProfile.metadata?.source ?? '--'}</div>
                        </div>
                      </div>
                    ) : null}
                    <div className="space-y-2">
                      {(publicProfile?.assertions ?? []).slice(0, 3).map((assertion) => (
                        <div key={assertion.id} className="rounded-xl bg-[var(--bg-1)] border border-[var(--stroke-1)] p-3">
                          <div className="flex items-center justify-between gap-3 mb-1">
                            <div className="text-[var(--text-1)]">{assertion.label}</div>
                            <Badge variant={assertion.status === 'present' ? 'success' : assertion.status === 'inactive' ? 'warning' : 'neutral'} size="sm">
                              {assertion.status}
                            </Badge>
                          </div>
                          <div className="text-sm text-[var(--text-2)] break-words">{assertion.value ?? '--'}</div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {publicLinkedAccounts.length > 0 ? (
                    <div className="space-y-2">
                      {publicLinkedAccounts.map((account) => (
                        <div key={`${account.network}-${account.address}`} className="rounded-xl bg-[var(--bg-2)] border border-[var(--stroke-1)] p-3">
                          <div className="flex items-center justify-between gap-3 mb-1">
                            <div className="text-[var(--text-1)]">{account.network}</div>
                            <Badge variant={account.primary ? 'orange' : account.status === 'active' ? 'success' : 'neutral'} size="sm">
                              {account.primary ? 'principal' : account.status ?? 'vinculada'}
                            </Badge>
                          </div>
                          <div className="text-sm text-[var(--text-2)] break-all">{account.address}</div>
                        </div>
                      ))}
                    </div>
                  ) : null}
                </div>
              )}
            </div>
          </SurfaceCard>

          <SurfaceCard>
            <div className="flex items-center gap-2 mb-3 text-[var(--text-1)]">
              <Shield className="w-4 h-4 text-[var(--accent-orange)]" />
              <span>Fronteiras</span>
            </div>
            <div className="space-y-3 text-sm text-[var(--text-2)]">
              <div className="rounded-xl bg-[var(--bg-2)] border border-[var(--stroke-1)] p-3">
                Passport resolve conta, wallets e lookup publico.
              </div>
              <div className="rounded-xl bg-[var(--bg-2)] border border-[var(--stroke-1)] p-3">
                Vault le postura. Swaps executa. Secrets guarda memoria privada.
              </div>
            </div>
          </SurfaceCard>

          <PassportIdentityProfilePanel
            profile={identity.profile}
            identityId={identity.identity.id}
            primaryAddress={identity.primary_wallet?.address ?? identity.identity.anchor_address}
            walletsTotal={identity.stats.wallets_total}
            editable
            isSaving={updateProfileMutation.isPending}
            errorMessage={profileSaveError}
            title="Presenca publica"
            subtitle="Edite como a conta aparece quando alguem resolve seu endereco ou identity id."
            onSave={handleProfileSave}
          />
        </>
      )}
    </MobilePageShell>
  );
}
