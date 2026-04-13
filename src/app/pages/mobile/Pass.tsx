import { useNavigate } from 'react-router-dom';
import { useAccount } from 'wagmi';
import { Activity, ArrowUpRight, BadgeCheck, Globe, Search, Shield, Wallet } from 'lucide-react';

import { Badge, EmptyState, ErrorState, MobileButton, MobilePageShell, SurfaceCard } from '../../components/mobile';
import { usePassportOverview } from '../../../hooks/usePassportData';
import { formatAddress } from '@/utils/format';

function toBadgeVariant(
  tone?: 'active' | 'success' | 'warning' | 'pending'
): 'success' | 'warning' | 'neutral' | 'orange' {
  if (tone === 'success') return 'success';
  if (tone === 'warning') return 'warning';
  if (tone === 'active') return 'orange';
  return 'neutral';
}

type LinkedAccount = {
  network: string;
  address: string;
  primary?: boolean;
  status?: string;
  account_type?: string;
};

export function MobilePass() {
  const navigate = useNavigate();
  const { address, isConnected } = useAccount();
  const overviewQuery = usePassportOverview(isConnected && address ? address : null);
  const overview = overviewQuery.data;
  const profile = (overview?.profile ?? null) as {
    assertions?: Array<{ id: string; label: string; status: string; value?: string | null; source?: string }>;
    linked_accounts?: LinkedAccount[];
    network_scope?: Array<{ network: string; link_strategy?: string; enabled?: boolean }>;
    identity?: { accountType?: string; txCount?: number; balanceEth?: string };
    metadata?: { source?: string };
  } | null;

  const linkedAccounts = profile?.linked_accounts ?? [];
  const assertions = profile?.assertions ?? [];
  const networkScope = profile?.network_scope ?? [];

  return (
    <MobilePageShell
      title="Passport"
      subtitle="SNE Identity across linked accounts and networks."
      statusPill={{
        label: overview?.status.label ?? 'offline',
        variant: toBadgeVariant(overview?.status.tone),
      }}
      showContext
    >
      {overviewQuery.isLoading ? (
        <div className="space-y-3">
          <SurfaceCard className="h-32 animate-pulse bg-[var(--bg-1)]" />
          <SurfaceCard className="h-48 animate-pulse bg-[var(--bg-1)]" />
        </div>
      ) : overviewQuery.isError || !overview ? (
        <ErrorState
          title="Passport indisponível"
          description="A identidade da sessão não carregou agora."
          onRetry={() => overviewQuery.refetch()}
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
                  {overview.surface.address ? formatAddress(overview.surface.address) : 'No primary account'}
                </div>
                <p className="text-sm text-[var(--text-2)]">
                  {overview.connected
                    ? 'Identity surface loaded from the connected account.'
                    : 'Connect a wallet to load linked accounts and assertions.'}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3 mb-4">
              <div className="rounded-xl bg-[var(--bg-2)] border border-[var(--stroke-1)] p-3">
                <div className="text-[10px] uppercase text-[var(--text-3)] mb-1">Capital</div>
                <div className="text-[var(--text-1)]">{overview.surface.capital}</div>
              </div>
              <div className="rounded-xl bg-[var(--bg-2)] border border-[var(--stroke-1)] p-3">
                <div className="text-[10px] uppercase text-[var(--text-3)] mb-1">Gas</div>
                <div className="text-[var(--text-1)]">{overview.surface.gas}</div>
              </div>
              <div className="rounded-xl bg-[var(--bg-2)] border border-[var(--stroke-1)] p-3">
                <div className="text-[10px] uppercase text-[var(--text-3)] mb-1">Links</div>
                <div className="text-[var(--text-1)]">{linkedAccounts.length}</div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <MobileButton className="w-full" onClick={() => navigate('/keys')}>
                Open Keys
              </MobileButton>
              <MobileButton variant="secondary" className="w-full" onClick={() => navigate('/home')}>
                Back Home
              </MobileButton>
            </div>
          </SurfaceCard>

          <SurfaceCard>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-[var(--text-1)]">Identity Assertions</h3>
              <Badge variant="neutral" size="sm">{assertions.length}</Badge>
            </div>

            {assertions.length === 0 ? (
              <EmptyState
                title="No assertions loaded"
                description="Connect a wallet to resolve the identity surface."
              />
            ) : (
              <div className="space-y-3">
                {assertions.slice(0, 4).map((assertion) => (
                  <div key={assertion.id} className="rounded-xl bg-[var(--bg-2)] border border-[var(--stroke-1)] p-3">
                    <div className="flex items-center justify-between gap-3 mb-1">
                      <div className="text-[var(--text-1)]">{assertion.label}</div>
                      <Badge
                        variant={
                          assertion.status === 'present'
                            ? 'success'
                            : assertion.status === 'inactive'
                              ? 'warning'
                              : 'neutral'
                        }
                        size="sm"
                      >
                        {assertion.status}
                      </Badge>
                    </div>
                    <div className="text-sm text-[var(--text-2)] break-words">{assertion.value ?? '--'}</div>
                    <div className="text-[10px] uppercase text-[var(--text-3)] mt-2">{assertion.source ?? 'derived'}</div>
                  </div>
                ))}
              </div>
            )}
          </SurfaceCard>

          <SurfaceCard>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-[var(--text-1)]">Linked Accounts</h3>
              <Badge variant="neutral" size="sm">{linkedAccounts.length}</Badge>
            </div>

            {linkedAccounts.length === 0 ? (
              <EmptyState
                title="No linked accounts"
                description="The Passport still has no multi-chain account surface for this session."
              />
            ) : (
              <div className="space-y-3">
                {linkedAccounts.map((account) => (
                  <div key={`${account.network}-${account.address}`} className="rounded-xl bg-[var(--bg-2)] border border-[var(--stroke-1)] p-3">
                    <div className="flex items-center justify-between gap-3 mb-1">
                      <div className="text-[var(--text-1)]">{account.network}</div>
                      <Badge variant={account.primary ? 'orange' : 'neutral'} size="sm">
                        {account.primary ? 'primary' : account.status ?? 'linked'}
                      </Badge>
                    </div>
                    <div className="text-sm text-[var(--text-2)] break-all mb-1">{formatAddress(account.address)}</div>
                    <div className="text-[10px] uppercase text-[var(--text-3)]">{account.account_type ?? 'account'}</div>
                  </div>
                ))}
              </div>
            )}
          </SurfaceCard>

          <SurfaceCard>
            <div className="flex items-center gap-2 mb-3 text-[var(--text-1)]">
              <Globe className="w-4 h-4 text-[var(--accent-orange)]" />
              <span>Network Scope</span>
            </div>

            <div className="space-y-3">
              {networkScope.length ? networkScope.map((item) => (
                <div key={item.network} className="rounded-xl bg-[var(--bg-2)] border border-[var(--stroke-1)] p-3">
                  <div className="flex items-center justify-between gap-3 mb-1">
                    <div className="text-[var(--text-1)]">{item.network}</div>
                    <Badge variant={item.enabled ? 'success' : 'neutral'} size="sm">
                      {item.enabled ? 'enabled' : 'inactive'}
                    </Badge>
                  </div>
                  <div className="text-sm text-[var(--text-2)]">
                    {item.link_strategy ?? 'linked from the primary identity surface'}
                  </div>
                </div>
              )) : (
                <div className="rounded-xl bg-[var(--bg-2)] border border-[var(--stroke-1)] p-3 text-sm text-[var(--text-2)]">
                  No explicit network scope returned for this identity yet.
                </div>
              )}
            </div>
          </SurfaceCard>

          <SurfaceCard>
            <div className="flex items-center gap-2 mb-3 text-[var(--text-1)]">
              <Activity className="w-4 h-4 text-[var(--accent-orange)]" />
              <span>Identity Surface</span>
            </div>

            <div className="grid grid-cols-2 gap-3 mb-4">
              <div className="rounded-xl bg-[var(--bg-2)] border border-[var(--stroke-1)] p-3">
                <div className="text-[10px] uppercase text-[var(--text-3)] mb-1">Type</div>
                <div className="text-[var(--text-1)]">{profile?.identity?.accountType ?? '--'}</div>
              </div>
              <div className="rounded-xl bg-[var(--bg-2)] border border-[var(--stroke-1)] p-3">
                <div className="text-[10px] uppercase text-[var(--text-3)] mb-1">Tx Count</div>
                <div className="text-[var(--text-1)]">{profile?.identity?.txCount ?? '--'}</div>
              </div>
              <div className="rounded-xl bg-[var(--bg-2)] border border-[var(--stroke-1)] p-3">
                <div className="text-[10px] uppercase text-[var(--text-3)] mb-1">Balance</div>
                <div className="text-[var(--text-1)]">{profile?.identity?.balanceEth ? `${profile.identity.balanceEth} ETH` : '--'}</div>
              </div>
              <div className="rounded-xl bg-[var(--bg-2)] border border-[var(--stroke-1)] p-3">
                <div className="text-[10px] uppercase text-[var(--text-3)] mb-1">Source</div>
                <div className="text-[var(--text-1)]">{profile?.metadata?.source ?? 'api'}</div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <MobileButton variant="secondary" className="w-full" onClick={() => navigate('/keys')}>
                <Shield className="w-4 h-4 mr-2" />
                Keys
              </MobileButton>
              <MobileButton variant="secondary" className="w-full" onClick={() => navigate('/docs')}>
                <Search className="w-4 h-4 mr-2" />
                Docs
              </MobileButton>
            </div>

            <button
              onClick={() => navigate('/keys')}
              className="w-full mt-3 rounded-xl bg-[var(--bg-2)] border border-[var(--stroke-1)] px-3 py-3 flex items-center justify-between text-left"
            >
              <div>
                <div className="text-[var(--text-1)] mb-1">Identity proves. Keys grants.</div>
                <div className="text-sm text-[var(--text-2)]">Move from Passport to the access layer.</div>
              </div>
              <ArrowUpRight className="w-4 h-4 text-[var(--text-3)]" />
            </button>
          </SurfaceCard>
        </>
      )}
    </MobilePageShell>
  );
}
