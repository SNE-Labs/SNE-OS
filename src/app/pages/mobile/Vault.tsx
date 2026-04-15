import { useNavigate } from 'react-router-dom';
import { useAccount } from 'wagmi';
import { ArrowUpRight, Box, Shield, Wallet, Waves, Zap } from 'lucide-react';

import { Badge, EmptyState, ErrorState, MobileButton, MobilePageShell, SurfaceCard } from '../../components/mobile';
import { WalletConnect } from '../../components/passport/WalletConnect';
import { useVaultOverview } from '../../../hooks/useVaultData';
import { formatAddress } from '@/utils/format';

function toBadgeVariant(tone?: 'active' | 'success' | 'warning' | 'pending') {
  if (tone === 'success') return 'success';
  if (tone === 'warning') return 'warning';
  if (tone === 'active') return 'orange';
  return 'neutral';
}

function networkBadgeVariant(status: string) {
  if (status === 'active') return 'success';
  if (status === 'degraded') return 'warning';
  if (status === 'idle') return 'orange';
  return 'neutral';
}

export function MobileVault() {
  const navigate = useNavigate();
  const { address, isConnected } = useAccount();
  const overviewQuery = useVaultOverview(isConnected && address ? address : null);
  const overview = overviewQuery.data;
  const actions = overview?.next_action.actions ?? [];
  const networks = overview?.by_network?.slice(0, 4) ?? [];

  return (
    <MobilePageShell
      title="Vault"
      subtitle="Conta USDT-first em modo somente leitura."
      showContext
    >
      {overviewQuery.isLoading && !overview ? (
        <div className="space-y-3">
          <SurfaceCard className="h-32 animate-pulse bg-[var(--bg-1)]" />
          <SurfaceCard className="h-48 animate-pulse bg-[var(--bg-1)]" />
        </div>
      ) : (overviewQuery.isError || !overview) && !overview ? (
        <ErrorState
          title="Vault indisponivel"
          description="A leitura on-chain da conta nao carregou agora."
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
                  {overview?.surface.address ? formatAddress(overview.surface.address) : 'Conecte sua wallet'}
                </div>
                <p className="text-sm text-[var(--text-2)]">
                  {overview?.hero.summary ??
                    'O saldo permanece na wallet. O OS so le, organiza e qualifica saldo-base, gas e prontidao.'}
                </p>
              </div>
            </div>

            {overviewQuery.isFetching ? (
              <div className="mb-4">
                <Badge variant="neutral" size="sm">
                  atualizando
                </Badge>
              </div>
            ) : null}

            <div className="mb-4 text-lg text-[var(--text-1)]">{overview?.hero.title}</div>

            {!overview?.connected ? (
              <div className="mb-4">
                <WalletConnect showConnectButton connectButtonLabel="Conectar wallet" fullWidth />
              </div>
            ) : null}

            <div className="grid grid-cols-1 gap-3 mb-4">
              {(overview?.hero.metrics ?? []).map((metric) => (
                <div key={metric.label} className="rounded-xl bg-[var(--bg-2)] border border-[var(--stroke-1)] p-3">
                  <div className="flex items-center justify-between gap-3 mb-1">
                    <div className="text-[10px] uppercase text-[var(--text-3)]">{metric.label}</div>
                    <Badge variant={toBadgeVariant(metric.tone)} size="sm">
                      {metric.value}
                    </Badge>
                  </div>
                  <div className="text-sm text-[var(--text-2)]">{metric.detail}</div>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-2 gap-3">
              {actions.slice(0, 2).map((action) => (
                <MobileButton
                  key={`${action.label}-${action.href}`}
                  variant={action.tone === 'accent' ? 'primary' : 'secondary'}
                  className="w-full"
                  onClick={() => navigate(action.href)}
                >
                  {action.label}
                </MobileButton>
              ))}
            </div>
          </SurfaceCard>

          {overview?.empty_state ? (
            <SurfaceCard>
              <div className="flex items-center gap-2 mb-3 text-[var(--text-1)]">
                <Waves className="w-4 h-4 text-[var(--accent-orange)]" />
                <span>Proximo passo</span>
              </div>
              <div className="text-[var(--text-1)] mb-2">{overview.empty_state.title}</div>
              <div className="text-sm text-[var(--text-2)] mb-3">{overview.empty_state.description}</div>
              <div className="space-y-2">
                {overview.empty_state.steps.map((step) => (
                  <div key={step} className="rounded-xl bg-[var(--bg-2)] border border-[var(--stroke-1)] p-3 text-sm text-[var(--text-2)]">
                    {step}
                  </div>
                ))}
              </div>
            </SurfaceCard>
          ) : null}

          <SurfaceCard>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-[var(--text-1)]">Buckets da conta</h3>
              <Badge variant={toBadgeVariant(overview?.readiness.tone)} size="sm">
                {overview?.readiness.label ?? 'pendente'}
              </Badge>
            </div>

            <div className="space-y-3">
              <div className="rounded-xl bg-[var(--bg-2)] border border-[var(--stroke-1)] p-3">
                <div className="flex items-center gap-2 mb-2 text-[var(--text-1)]">
                  <Wallet className="w-4 h-4 text-[var(--accent-orange)]" />
                  <span>{overview?.balances.usdt.label ?? 'USDT'}</span>
                </div>
                <div className="text-[var(--text-1)] mb-1">{overview?.balances.usdt.value ?? '--'}</div>
                <div className="text-sm text-[var(--text-2)]">{overview?.balances.usdt.detail}</div>
              </div>

              <div className="rounded-xl bg-[var(--bg-2)] border border-[var(--stroke-1)] p-3">
                <div className="flex items-center gap-2 mb-2 text-[var(--text-1)]">
                  <Zap className="w-4 h-4 text-[var(--accent-orange)]" />
                  <span>{overview?.balances.gas.label ?? 'Gas'}</span>
                </div>
                <div className="text-[var(--text-1)] mb-1">{overview?.balances.gas.value ?? '--'}</div>
                <div className="text-sm text-[var(--text-2)]">{overview?.balances.gas.detail}</div>
              </div>

              <div className="rounded-xl bg-[var(--bg-2)] border border-[var(--stroke-1)] p-3">
                <div className="flex items-center gap-2 mb-2 text-[var(--text-1)]">
                  <Box className="w-4 h-4 text-[var(--accent-orange)]" />
                  <span>{overview?.balances.other_assets.label ?? 'Outros ativos'}</span>
                </div>
                <div className="text-[var(--text-1)] mb-1">{overview?.balances.other_assets.value ?? '--'}</div>
                <div className="text-sm text-[var(--text-2)]">{overview?.balances.other_assets.detail}</div>
              </div>
            </div>
          </SurfaceCard>

          <SurfaceCard>
            <div className="flex items-center gap-2 mb-3 text-[var(--text-1)]">
              <Waves className="w-4 h-4 text-[var(--accent-orange)]" />
              <span>Prontidao</span>
            </div>

            <div className="text-[var(--text-1)] mb-1">{overview?.readiness.title}</div>
            <div className="text-sm text-[var(--text-2)] mb-4">{overview?.readiness.summary}</div>

            <div className="space-y-3">
              {(overview?.readiness.items ?? []).map((item) => (
                <div key={item.label} className="rounded-xl bg-[var(--bg-2)] border border-[var(--stroke-1)] p-3">
                  <div className="flex items-center justify-between gap-3 mb-1">
                    <div className="text-[var(--text-1)]">{item.label}</div>
                    <Badge variant={toBadgeVariant(item.tone)} size="sm">
                      {item.value}
                    </Badge>
                  </div>
                  <div className="text-sm text-[var(--text-2)]">{item.detail}</div>
                </div>
              ))}
            </div>
          </SurfaceCard>

          <SurfaceCard>
            <div className="flex items-center gap-2 mb-3 text-[var(--text-1)]">
              <Shield className="w-4 h-4 text-[var(--accent-orange)]" />
              <span>Custodia e protecao</span>
            </div>

            <div className="space-y-3">
              <div className="rounded-xl bg-[var(--bg-2)] border border-[var(--stroke-1)] p-3">
                <div className="text-[var(--text-1)] mb-1">{overview?.source_of_truth.title}</div>
                <div className="text-sm text-[var(--text-2)]">{overview?.source_of_truth.description}</div>
              </div>
              <div className="rounded-xl bg-[var(--bg-2)] border border-[var(--stroke-1)] p-3">
                <div className="text-[var(--text-1)] mb-1">Estado</div>
                <div className="text-sm text-[var(--text-2)]">{overview?.protection.state}</div>
              </div>
              <div className="rounded-xl bg-[var(--bg-2)] border border-[var(--stroke-1)] p-3">
                <div className="text-[var(--text-1)] mb-1">Fronteira</div>
                <div className="text-sm text-[var(--text-2)]">{overview?.protection.boundary}</div>
              </div>
            </div>
          </SurfaceCard>

          <SurfaceCard>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-[var(--text-1)]">Redes ativas</h3>
              <Badge variant="neutral" size="sm">
                {networks.length}
              </Badge>
            </div>

            {networks.length === 0 ? (
              <EmptyState
                title="Sem leitura por rede"
                description="Nenhuma rede retornou saldo, gas ou atividade detectavel."
              />
            ) : (
              <div className="space-y-3">
                {networks.map((item) => (
                  <div key={item.network} className="rounded-xl bg-[var(--bg-2)] border border-[var(--stroke-1)] p-3">
                    <div className="flex items-center justify-between gap-3 mb-2">
                      <div className="text-[var(--text-1)]">{item.network}</div>
                      <Badge variant={networkBadgeVariant(item.status)} size="sm">
                        {item.status}
                      </Badge>
                    </div>
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div>
                        <div className="text-[var(--text-3)]">USDT</div>
                        <div className="text-[var(--text-1)]">{item.balance_formatted ?? '--'}</div>
                      </div>
                      <div>
                        <div className="text-[var(--text-3)]">Gas</div>
                        <div className="text-[var(--text-1)]">{item.gas_balance_formatted ?? '--'}</div>
                      </div>
                    </div>
                    <button
                      onClick={() => navigate('/swaps?mode=move')}
                      className="mt-3 w-full rounded-xl bg-[var(--bg-1)] border border-[var(--stroke-1)] px-3 py-3 flex items-center justify-between text-left"
                    >
                      <div>
                        <div className="text-[var(--text-1)] mb-1">Abrir rail de execucao</div>
                        <div className="text-sm text-[var(--text-2)]">{item.gas ?? 'Revise gas e rota antes de executar.'}</div>
                      </div>
                      <ArrowUpRight className="w-4 h-4 text-[var(--text-3)]" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </SurfaceCard>
        </>
      )}
    </MobilePageShell>
  );
}
