import { useNavigate } from 'react-router-dom';
import { useAccount } from 'wagmi';
import { ArrowUpRight, Box, Shield, Wallet, Waves, Zap } from 'lucide-react';

import { Badge, EmptyState, ErrorState, MobileButton, MobilePageShell, SurfaceCard } from '../../components/mobile';
import { useVaultOverview } from '../../../hooks/useVaultData';
import { formatAddress } from '@/utils/format';

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
      subtitle="Leitura USDT multichain via RPC. O Vault nao transaciona."
      showContext
    >
      {overviewQuery.isLoading && !overview ? (
        <div className="space-y-3">
          <SurfaceCard className="h-32 animate-pulse bg-[var(--bg-1)]" />
          <SurfaceCard className="h-48 animate-pulse bg-[var(--bg-1)]" />
        </div>
      ) : (overviewQuery.isError || !overview) && !overview ? (
        <ErrorState
          title="Vault indisponível"
          description="A leitura on-chain da wallet nao carregou agora."
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
                    ? 'Saldo, gas e postura lidos via RPC para a wallet atual.'
                    : 'Conecte uma wallet para carregar a leitura USDT.'}
                </p>
              </div>
            </div>

            {overviewQuery.isFetching ? (
              <div className="mb-4">
                <Badge variant="neutral" size="sm">atualizando</Badge>
              </div>
            ) : null}

            <div className="grid grid-cols-3 gap-3 mb-4">
              <div className="rounded-xl bg-[var(--bg-2)] border border-[var(--stroke-1)] p-3">
                <div className="text-[10px] uppercase text-[var(--text-3)] mb-1">USDT view</div>
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
              <MobileButton className="w-full" onClick={() => navigate('/swaps?mode=move')}>
                Mover USDT
              </MobileButton>
              <MobileButton variant="secondary" className="w-full" onClick={() => navigate('/radar')}>
                Abrir Radar
              </MobileButton>
            </div>
          </SurfaceCard>

          <SurfaceCard>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-[var(--text-1)]">Leitura USDT</h3>
              <Badge variant="neutral" size="sm">{overview.capital_cards.length}</Badge>
            </div>

            {overview.capital_cards.length === 0 ? (
              <EmptyState
                title="Sem leitura disponivel"
                description="O Vault nao retornou metricas on-chain para esta sessao."
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
              <h3 className="text-[var(--text-1)]">Por rede</h3>
              <Badge variant="neutral" size="sm">{byNetwork.length}</Badge>
            </div>

            {byNetwork.length === 0 ? (
              <EmptyState
                title="Sem leitura por rede"
                description="O Vault ainda nao retornou posicoes por rede."
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
              <span>Protecao</span>
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
              onClick={() => navigate('/swaps?mode=move')}
              className="w-full rounded-xl bg-[var(--bg-2)] border border-[var(--stroke-1)] px-3 py-3 flex items-center justify-between text-left"
            >
              <div>
                <div className="text-[var(--text-1)] mb-1">Execucao fica fora do Vault</div>
                <div className="text-sm text-[var(--text-2)]">Use Swaps para mover ou converter USDT depois da leitura.</div>
              </div>
              <ArrowUpRight className="w-4 h-4 text-[var(--text-3)]" />
            </button>
          </SurfaceCard>

          <SurfaceCard>
            <div className="flex items-center gap-2 mb-3 text-[var(--text-1)]">
              <Waves className="w-4 h-4 text-[var(--accent-orange)]" />
              <span>Prontidao</span>
            </div>

            <div className="grid grid-cols-1 gap-3">
              <div className="rounded-xl bg-[var(--bg-2)] border border-[var(--stroke-1)] p-3">
                <div className="text-[var(--text-1)] mb-1">Somente leitura</div>
                <div className="text-sm text-[var(--text-2)]">{overview.readiness.custody}</div>
              </div>
              <div className="rounded-xl bg-[var(--bg-2)] border border-[var(--stroke-1)] p-3">
                <div className="text-[var(--text-1)] mb-1">Gas readiness</div>
                <div className="text-sm text-[var(--text-2)]">{overview.readiness.staking}</div>
              </div>
              <div className="rounded-xl bg-[var(--bg-2)] border border-[var(--stroke-1)] p-3">
                <div className="text-[var(--text-1)] mb-1">Execucao</div>
                <div className="text-sm text-[var(--text-2)]">{overview.readiness.provisioning}</div>
              </div>
            </div>
          </SurfaceCard>
        </>
      )}
    </MobilePageShell>
  );
}
