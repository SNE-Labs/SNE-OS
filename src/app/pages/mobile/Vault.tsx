import { useNavigate } from 'react-router-dom';
import { useAccount } from 'wagmi';
import { ArrowUpRight, Box, Shield, Wallet, Waves, Zap } from 'lucide-react';

import { Badge, EmptyState, ErrorState, MobileButton, MobilePageShell, SurfaceCard } from '../../components/mobile';
import { useVaultOverview } from '../../../hooks/useVaultData';
import { formatAddress } from '@/utils/format';

function toBadgeVariant(
  tone?: 'active' | 'success' | 'warning' | 'pending'
): 'success' | 'warning' | 'neutral' | 'orange' {
  if (tone === 'success') return 'success';
  if (tone === 'warning') return 'warning';
  if (tone === 'active') return 'orange';
  return 'neutral';
}

function iconForCapitalCard(icon: string) {
  if (icon === 'wallet') return Wallet;
  if (icon === 'zap') return Zap;
  if (icon === 'shield') return Shield;
  return Box;
}

type NetworkPosition = {
  network: string;
  status: string;
  balance_formatted?: string;
  gas?: string;
  tx_count?: number;
};

export function MobileVault() {
  const navigate = useNavigate();
  const { address, isConnected } = useAccount();
  const overviewQuery = useVaultOverview(isConnected && address ? address : null);
  const overview = overviewQuery.data;
  const aggregate = (overview as any)?.aggregate as { total_value_display?: string; active_networks?: number } | undefined;
  const byNetwork = (((overview as any)?.by_network ?? []) as NetworkPosition[]).slice(0, 4);

  return (
    <MobilePageShell
      title="Vault"
      subtitle="Self-custody, capital surface and network allocation."
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
          title="Vault indisponível"
          description="A superfície de capital não carregou agora."
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
                  {overview.surface.address ? formatAddress(overview.surface.address) : 'No wallet linked'}
                </div>
                <p className="text-sm text-[var(--text-2)]">
                  {overview.connected
                    ? 'Capital, gas and posture loaded for the current wallet.'
                    : 'Connect a wallet to load the capital surface.'}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3 mb-4">
              <div className="rounded-xl bg-[var(--bg-2)] border border-[var(--stroke-1)] p-3">
                <div className="text-[10px] uppercase text-[var(--text-3)] mb-1">Portfolio</div>
                <div className="text-[var(--text-1)]">{aggregate?.total_value_display ?? '--'}</div>
              </div>
              <div className="rounded-xl bg-[var(--bg-2)] border border-[var(--stroke-1)] p-3">
                <div className="text-[10px] uppercase text-[var(--text-3)] mb-1">Networks</div>
                <div className="text-[var(--text-1)]">{aggregate?.active_networks ?? 0}</div>
              </div>
              <div className="rounded-xl bg-[var(--bg-2)] border border-[var(--stroke-1)] p-3">
                <div className="text-[10px] uppercase text-[var(--text-3)] mb-1">Source</div>
                <div className="text-[var(--text-1)]">{overview.surface.source}</div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <MobileButton className="w-full" onClick={() => navigate('/secrets')}>
                Open Secrets
              </MobileButton>
              <MobileButton variant="secondary" className="w-full" onClick={() => navigate('/radar')}>
                Open Radar
              </MobileButton>
            </div>
          </SurfaceCard>

          <SurfaceCard>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-[var(--text-1)]">Capital Surface</h3>
              <Badge variant="neutral" size="sm">{overview.capital_cards.length}</Badge>
            </div>

            {overview.capital_cards.length === 0 ? (
              <EmptyState
                title="No capital cards"
                description="The Vault did not return capital metrics for this session."
              />
            ) : (
              <div className="space-y-3">
                {overview.capital_cards.map((card) => {
                  const Icon = iconForCapitalCard(card.icon);
                  return (
                    <div key={card.label} className="rounded-xl bg-[var(--bg-2)] border border-[var(--stroke-1)] p-3">
                      <div className="flex items-center justify-between gap-3 mb-2">
                        <div className="text-[var(--text-1)]">{card.label}</div>
                        <Icon className="w-4 h-4 text-[var(--accent-orange)]" />
                      </div>
                      <div className="text-[var(--text-1)] mb-1">{card.value}</div>
                      <div className="text-sm text-[var(--text-2)]">{card.hint}</div>
                    </div>
                  );
                })}
              </div>
            )}
          </SurfaceCard>

          <SurfaceCard>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-[var(--text-1)]">By Network</h3>
              <Badge variant="neutral" size="sm">{byNetwork.length}</Badge>
            </div>

            {byNetwork.length === 0 ? (
              <EmptyState
                title="No network allocation"
                description="The Vault has not returned any network positions yet."
              />
            ) : (
              <div className="space-y-3">
                {byNetwork.map((item) => (
                  <div key={item.network} className="rounded-xl bg-[var(--bg-2)] border border-[var(--stroke-1)] p-3">
                    <div className="flex items-center justify-between gap-3 mb-2">
                      <div className="text-[var(--text-1)]">{item.network}</div>
                      <Badge variant={item.status === 'active' ? 'success' : 'neutral'} size="sm">
                        {item.status}
                      </Badge>
                    </div>
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div>
                        <div className="text-[var(--text-3)]">Balance</div>
                        <div className="text-[var(--text-1)]">{item.balance_formatted ?? '--'}</div>
                      </div>
                      <div>
                        <div className="text-[var(--text-3)]">Gas</div>
                        <div className="text-[var(--text-1)]">{item.gas ?? '--'}</div>
                      </div>
                    </div>
                    <div className="text-[10px] uppercase text-[var(--text-3)] mt-2">
                      tx count {item.tx_count ?? 0}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </SurfaceCard>

          <SurfaceCard>
            <div className="flex items-center gap-2 mb-3 text-[var(--text-1)]">
              <Shield className="w-4 h-4 text-[var(--accent-orange)]" />
              <span>Protection</span>
            </div>

            <div className="space-y-3 mb-4">
              <div className="rounded-xl bg-[var(--bg-2)] border border-[var(--stroke-1)] p-3">
                <div className="text-[var(--text-1)] mb-1">State</div>
                <div className="text-sm text-[var(--text-2)]">{overview.protection.state}</div>
              </div>
              <div className="rounded-xl bg-[var(--bg-2)] border border-[var(--stroke-1)] p-3">
                <div className="text-[var(--text-1)] mb-1">Boundary</div>
                <div className="text-sm text-[var(--text-2)]">{overview.protection.boundary}</div>
              </div>
            </div>

            <button
              onClick={() => navigate('/radar')}
              className="w-full rounded-xl bg-[var(--bg-2)] border border-[var(--stroke-1)] px-3 py-3 flex items-center justify-between text-left"
            >
              <div>
                <div className="text-[var(--text-1)] mb-1">Execution remains downstream</div>
                <div className="text-sm text-[var(--text-2)]">Use Radar and Swap after the capital context is ready.</div>
              </div>
              <ArrowUpRight className="w-4 h-4 text-[var(--text-3)]" />
            </button>
          </SurfaceCard>

          <SurfaceCard>
            <div className="flex items-center gap-2 mb-3 text-[var(--text-1)]">
              <Waves className="w-4 h-4 text-[var(--accent-orange)]" />
              <span>Readiness</span>
            </div>

            <div className="grid grid-cols-1 gap-3">
              <div className="rounded-xl bg-[var(--bg-2)] border border-[var(--stroke-1)] p-3">
                <div className="text-[var(--text-1)] mb-1">Custody</div>
                <div className="text-sm text-[var(--text-2)]">{overview.readiness.custody}</div>
              </div>
              <div className="rounded-xl bg-[var(--bg-2)] border border-[var(--stroke-1)] p-3">
                <div className="text-[var(--text-1)] mb-1">Staking</div>
                <div className="text-sm text-[var(--text-2)]">{overview.readiness.staking}</div>
              </div>
              <div className="rounded-xl bg-[var(--bg-2)] border border-[var(--stroke-1)] p-3">
                <div className="text-[var(--text-1)] mb-1">Provisioning</div>
                <div className="text-sm text-[var(--text-2)]">{overview.readiness.provisioning}</div>
              </div>
            </div>
          </SurfaceCard>
        </>
      )}
    </MobilePageShell>
  );
}
