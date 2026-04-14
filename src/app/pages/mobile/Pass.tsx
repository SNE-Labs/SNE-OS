import { useEffect, useState } from 'react';
import { ArrowUpRight, BadgeCheck, Globe, Link2, Search, Shield, Wallet } from 'lucide-react';
import { isAddress } from 'viem';

import { Badge, EmptyState, ErrorState, MobileButton, MobilePageShell, SurfaceCard } from '../../components/mobile';
import { WalletConnect } from '../../components/passport/WalletConnect';
import { PassportWalletLinkPanel } from '../../components/passport/PassportWalletLinkPanel';
import { usePassportIdentity, usePassportOverview } from '../../../hooks/usePassportData';
import { useAuth } from '@/lib/auth/AuthProvider';
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
  identity?: { address?: string; accountType?: string; txCount?: number; balanceEth?: string };
  metadata?: { source?: string };
};

function formatDate(value?: string | null) {
  if (!value) return '--';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '--';
  return date.toLocaleString('pt-BR');
}

export function MobilePass() {
  const { address, isAuthenticated } = useAuth();
  const [lookupInput, setLookupInput] = useState('');
  const [lookupTarget, setLookupTarget] = useState<string | null>(null);
  const [lookupError, setLookupError] = useState<string | null>(null);
  const [showLinkPanel, setShowLinkPanel] = useState(false);

  const identityQuery = usePassportIdentity(isAuthenticated);
  const connectedOverviewQuery = usePassportOverview(isAuthenticated && address ? address : null);
  const publicOverviewQuery = usePassportOverview(lookupTarget);

  const identity = identityQuery.data;
  const connectedProfile = connectedOverviewQuery.data?.profile as OverviewProfile | null;
  const publicProfile = publicOverviewQuery.data?.profile as OverviewProfile | null;
  const linkedAccounts = connectedProfile?.linked_accounts ?? [];

  useEffect(() => {
    if (!lookupTarget) return;
    setLookupInput(lookupTarget);
  }, [lookupTarget]);

  const handleLookup = () => {
    const candidate = lookupInput.trim();
    if (!candidate) {
      setLookupError('Informe um endereço.');
      return;
    }
    if (!isAddress(candidate)) {
      setLookupError('Endereço inválido.');
      return;
    }
    setLookupError(null);
    setLookupTarget(candidate);
  };

  return (
    <MobilePageShell
      title="Passport"
      subtitle="Identidade, vínculo e lookup público do OS."
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
                <div className="text-[var(--text-1)] mb-1">Crie sua identidade Passport</div>
                <p className="text-sm text-[var(--text-2)]">
                  A primeira wallet autenticada vira a âncora do seu grafo de identidade dentro do OS.
                </p>
              </div>
            </div>

            <WalletConnect showConnectButton connectButtonLabel="Conectar primeira wallet" fullWidth />
          </SurfaceCard>

          <SurfaceCard>
            <div className="flex items-center gap-2 mb-3 text-[var(--text-1)]">
              <Search className="w-4 h-4 text-[var(--accent-orange)]" />
              <span>Lookup público</span>
            </div>
            <div className="text-sm text-[var(--text-2)]">
              Mesmo sem autenticar, o Passport continua sendo a superfície pública de lookup on-chain do OS.
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
          title="Passport indisponível"
          description="A identidade autenticada não carregou agora."
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
                <div className="text-[var(--text-1)] mb-1">
                  {identity.primary_wallet ? formatAddress(identity.primary_wallet.address) : 'Sem wallet principal'}
                </div>
                <p className="text-sm text-[var(--text-2)]">
                  {identity.stats.wallets_total > 1
                    ? 'Qualquer wallet ativa deste Passport deve reabrir a mesma identidade.'
                    : 'Sua primeira wallet já está ancorada. Agora você pode vincular as próximas.'}
                </p>
              </div>
            </div>

            {identityQuery.isFetching ? (
              <div className="mb-4">
                <Badge variant="neutral" size="sm">atualizando</Badge>
              </div>
            ) : null}

            <div className="grid grid-cols-3 gap-3 mb-4">
              <div className="rounded-xl bg-[var(--bg-2)] border border-[var(--stroke-1)] p-3">
                <div className="text-[10px] uppercase text-[var(--text-3)] mb-1">Principal</div>
                <div className="text-[var(--text-1)]">{identity.primary_wallet ? formatAddress(identity.primary_wallet.address) : '--'}</div>
              </div>
              <div className="rounded-xl bg-[var(--bg-2)] border border-[var(--stroke-1)] p-3">
                <div className="text-[10px] uppercase text-[var(--text-3)] mb-1">Wallets</div>
                <div className="text-[var(--text-1)]">{identity.stats.wallets_total}</div>
              </div>
              <div className="rounded-xl bg-[var(--bg-2)] border border-[var(--stroke-1)] p-3">
                <div className="text-[10px] uppercase text-[var(--text-3)] mb-1">Vínculos</div>
                <div className="text-[var(--text-1)]">{linkedAccounts.length}</div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <MobileButton className="w-full" onClick={() => setShowLinkPanel((current) => !current)}>
                <Link2 className="w-4 h-4 mr-2" />
                {showLinkPanel ? 'Fechar vínculo' : 'Adicionar wallet'}
              </MobileButton>
              <MobileButton variant="secondary" className="w-full" onClick={handleLookup}>
                <Search className="w-4 h-4 mr-2" />
                Consultar
              </MobileButton>
            </div>
          </SurfaceCard>

          {showLinkPanel ? (
            <PassportWalletLinkPanel currentAddress={address} onLinked={() => identityQuery.refetch()} />
          ) : null}

          <SurfaceCard>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-[var(--text-1)]">Grafo de carteiras</h3>
              <Badge variant="neutral" size="sm">{identity.wallets.length}</Badge>
            </div>
            <div className="space-y-3">
              {identity.wallets.map((wallet) => (
                <div key={wallet.id} className="rounded-xl bg-[var(--bg-2)] border border-[var(--stroke-1)] p-3">
                  <div className="flex items-center justify-between gap-3 mb-1">
                    <div className="text-[var(--text-1)]">{wallet.label}</div>
                    <Badge variant={wallet.is_primary ? 'orange' : wallet.status === 'active' ? 'success' : 'neutral'} size="sm">
                      {wallet.is_primary ? 'principal' : wallet.status}
                    </Badge>
                  </div>
                  <div className="text-sm text-[var(--text-2)] break-all mb-1">{wallet.address}</div>
                  <div className="text-[10px] uppercase text-[var(--text-3)]">
                    último login {formatDate(wallet.last_login_at)}
                  </div>
                </div>
              ))}
            </div>
          </SurfaceCard>

          <SurfaceCard>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-[var(--text-1)]">Eventos</h3>
              <Badge variant="neutral" size="sm">{identity.events.length}</Badge>
            </div>
            {identity.events.length === 0 ? (
              <EmptyState
                title="Sem eventos ainda"
                description="Novos vínculos e mudanças de identidade aparecem aqui."
              />
            ) : (
              <div className="space-y-3">
                {identity.events.map((event) => (
                  <div key={event.id} className="rounded-xl bg-[var(--bg-2)] border border-[var(--stroke-1)] p-3">
                    <div className="text-[var(--text-1)] mb-1">{event.type.replaceAll('_', ' ')}</div>
                    <div className="text-sm text-[var(--text-2)] break-all">
                      {event.target_address ?? 'evento de identidade'}
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
              <span>Lookup público</span>
            </div>
            <div className="space-y-3">
              <input
                type="text"
                value={lookupInput}
                onChange={(event) => {
                  setLookupInput(event.target.value);
                  setLookupError(null);
                }}
                placeholder="0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb"
                className="w-full rounded-xl bg-[var(--bg-2)] border border-[var(--stroke-1)] px-4 py-3 font-mono text-sm text-[var(--text-1)]"
              />
              {lookupError ? <div className="text-sm text-[var(--danger-red)]">{lookupError}</div> : null}
              <MobileButton variant="secondary" className="w-full" onClick={handleLookup}>
                Consultar endereço
              </MobileButton>

              {!lookupTarget ? (
                <div className="text-sm text-[var(--text-2)]">
                  Digite um endereço para abrir o perfil público on-chain.
                </div>
              ) : publicOverviewQuery.isLoading && !publicProfile ? (
                <div className="text-sm text-[var(--text-2)]">Resolvendo endereço...</div>
              ) : (publicOverviewQuery.isError || !publicProfile) && !publicProfile ? (
                <div className="text-sm text-[var(--danger-red)]">Falha ao resolver o perfil público.</div>
              ) : (
                <div className="rounded-xl bg-[var(--bg-2)] border border-[var(--stroke-1)] p-3">
                  <div className="flex items-center justify-between gap-3 mb-2">
                    <div className="text-[var(--text-1)]">{formatAddress(publicProfile.identity?.address ?? lookupTarget)}</div>
                    <ArrowUpRight className="w-4 h-4 text-[var(--text-3)]" />
                  </div>
                  <div className="grid grid-cols-2 gap-3 mb-3">
                    <div>
                      <div className="text-[10px] uppercase text-[var(--text-3)] mb-1">Tipo</div>
                      <div className="text-[var(--text-1)]">{publicProfile.identity?.accountType ?? '--'}</div>
                    </div>
                    <div>
                      <div className="text-[10px] uppercase text-[var(--text-3)] mb-1">Saldo</div>
                      <div className="text-[var(--text-1)]">{publicProfile.identity?.balanceEth ? `${publicProfile.identity.balanceEth} ETH` : '--'}</div>
                    </div>
                  </div>
                  <div className="space-y-2">
                    {(publicProfile.assertions ?? []).slice(0, 3).map((assertion) => (
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
                Passport resolve identidade, múltiplas wallets e lookup público.
              </div>
              <div className="rounded-xl bg-[var(--bg-2)] border border-[var(--stroke-1)] p-3">
                Keys continua sendo a camada de grants, licenças e dispositivos.
              </div>
            </div>
          </SurfaceCard>
        </>
      )}
    </MobilePageShell>
  );
}
