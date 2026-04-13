import { useMemo } from 'react';
import { useAccount } from 'wagmi';
import { ArrowUpRight, Box, KeyRound, Shield, Wallet, Waves, Zap } from 'lucide-react';

import { ModuleStateCard } from '../components/sne/ModuleStateCard';
import { StatusBadge } from '../components/sne/StatusBadge';
import { WalletConnect } from '../components/passport/WalletConnect';
import { useVaultOverview } from '../../hooks/useVaultData';
import { resolveModuleState } from '../../lib/moduleState';
import { formatAddress } from '@/utils/format';

export function Vault() {
  const { address, isConnected } = useAccount();
  const overviewQuery = useVaultOverview(isConnected && address ? address : null);
  const overview = overviewQuery.data;
  const moduleState = resolveModuleState({
    isConnected,
    isLoading: overviewQuery.isLoading,
    isError: overviewQuery.isError,
    data: overview,
  });

  const vaultStatus = overview?.status ?? { label: 'offline', tone: 'pending' as const };

  const capitalCards = useMemo(
    () => (overview?.capital_cards ?? []).map((card) => ({
      ...card,
      icon:
        card.icon === 'wallet'
          ? Wallet
          : card.icon === 'zap'
            ? Zap
            : card.icon === 'shield'
              ? Shield
              : Box,
    })),
    [overview?.capital_cards]
  );

  const vaultSignals = overview?.signals ?? [];

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
            <div className="grid grid-cols-1 xl:grid-cols-[0.7fr_0.3fr] gap-5">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2 mb-3">
                  <StatusBadge status={vaultStatus.tone}>{vaultStatus.label}</StatusBadge>
                  <div className="text-sm" style={{ color: 'var(--text-3)' }}>Cofre</div>
                </div>

                <h1 className="text-3xl font-semibold mb-2" style={{ color: 'var(--text-1)' }}>
                  Seu capital, em um só lugar.
                </h1>
                <p className="max-w-3xl text-sm" style={{ color: 'var(--text-2)' }}>
                  O Vault exibe saldo ao vivo, contexto de gas, atividade da conta e registros de proteção de hardware a partir da carteira conectada.
                </p>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-5">
                  {vaultSignals.map((signal) => (
                    <div
                      key={signal.title}
                      className="rounded-lg px-4 py-3"
                      style={{ backgroundColor: 'var(--bg-3)', borderWidth: '1px', borderColor: 'var(--stroke-1)' }}
                    >
                      <div className="text-[11px] uppercase mb-1" style={{ color: 'var(--text-3)' }}>
                        {signal.title}
                      </div>
                      <div className="font-semibold mb-1 break-words" style={{ color: 'var(--text-1)' }}>
                        {signal.value}
                      </div>
                      <div className="text-sm" style={{ color: 'var(--text-2)' }}>
                        {signal.detail}
                      </div>
                    </div>
                  ))}
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
                      {overview?.surface.address ? formatAddress(overview.surface.address) : 'Conecte sua carteira'}
                    </div>
                    <div className="text-sm" style={{ color: 'var(--text-2)' }}>
                      {overview?.connected ? 'Saldo e postura da conta carregados ao vivo.' : 'Conecte uma carteira para carregar seu capital.'}
                    </div>
                  </div>
                </div>

                <div className="mt-5 space-y-3">
                  <WalletConnect />
                  <div className="grid grid-cols-2 gap-3">
                    <div className="rounded-lg px-3 py-3" style={{ backgroundColor: 'var(--bg-2)', borderWidth: '1px', borderColor: 'var(--stroke-1)' }}>
                      <div className="text-[11px] uppercase mb-1" style={{ color: 'var(--text-3)' }}>Rede</div>
                      <div className="font-semibold" style={{ color: 'var(--text-1)' }}>{overview?.surface.network ?? '--'}</div>
                    </div>
                    <div className="rounded-lg px-3 py-3" style={{ backgroundColor: 'var(--bg-2)', borderWidth: '1px', borderColor: 'var(--stroke-1)' }}>
                      <div className="text-[11px] uppercase mb-1" style={{ color: 'var(--text-3)' }}>Fonte</div>
                      <div className="font-semibold" style={{ color: 'var(--text-1)' }}>{overview?.surface.source ?? 'rpc'}</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>

          <section className="grid grid-cols-1 xl:grid-cols-[minmax(0,1.2fr)_minmax(320px,0.8fr)] gap-5">
            <div
              className="rounded-xl p-5"
              style={{ backgroundColor: 'var(--bg-2)', borderWidth: '1px', borderColor: 'var(--stroke-1)', boxShadow: 'var(--shadow-1)' }}
            >
              <div className="mb-4 text-sm font-semibold" style={{ color: 'var(--text-2)' }}>
                Superfície de Capital
              </div>

              {moduleState === 'disconnected' ? (
                <ModuleStateCard
                  tone="disconnected"
                  title="Conecte uma carteira"
                  description="O Vault precisa de uma carteira conectada para resolver capital, gas e postura por network."
                />
              ) : moduleState === 'loading' ? (
                <ModuleStateCard
                  tone="loading"
                  title="Carregando capital"
                  description="Lendo saldo, atividade e superfície de custódia da conta conectada."
                />
              ) : moduleState === 'error' ? (
                <ModuleStateCard
                  tone="error"
                  title="Falha ao carregar o Vault"
                  description="O estado do capital não pôde ser resolvido agora."
                  actionLabel="Tentar novamente"
                  onAction={() => overviewQuery.refetch()}
                />
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {capitalCards.map((card) => {
                    const Icon = card.icon;
                    return (
                      <div
                        key={card.label}
                        className="rounded-xl p-4 min-w-0"
                        style={{ backgroundColor: 'var(--bg-3)', borderWidth: '1px', borderColor: 'var(--stroke-1)' }}
                      >
                        <div className="flex items-center justify-between gap-3 mb-3">
                          <div className="text-[11px] uppercase" style={{ color: 'var(--text-3)' }}>{card.label}</div>
                          <Icon className="w-4 h-4" style={{ color: 'var(--accent-orange)' }} />
                        </div>
                        <div className="text-xl font-semibold mb-2 break-words" style={{ color: 'var(--text-1)' }}>
                          {card.value}
                        </div>
                        <div className="text-sm" style={{ color: 'var(--text-2)' }}>
                          {card.hint}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="space-y-5">
              <div
                className="rounded-xl p-4"
                style={{ backgroundColor: 'var(--bg-2)', borderWidth: '1px', borderColor: 'var(--stroke-1)', boxShadow: 'var(--shadow-1)' }}
              >
                <div className="mb-3 text-sm font-semibold" style={{ color: 'var(--text-2)' }}>
                  Postura da Conta
                </div>
                <div className="grid grid-cols-2 gap-3">
                  {(overview?.posture ?? []).map((item) => (
                    <div key={item.label} className="rounded-lg p-3" style={{ backgroundColor: 'var(--bg-3)', borderWidth: '1px', borderColor: 'var(--stroke-1)' }}>
                      <div className="text-[11px] uppercase mb-1" style={{ color: 'var(--text-3)' }}>{item.label}</div>
                      <div className="font-semibold" style={{ color: 'var(--text-1)' }}>{item.value}</div>
                    </div>
                  ))}
                </div>
              </div>

              <div
                className="rounded-xl p-4"
                style={{ backgroundColor: 'var(--bg-2)', borderWidth: '1px', borderColor: 'var(--stroke-1)', boxShadow: 'var(--shadow-1)' }}
              >
                <div className="mb-3 text-sm font-semibold" style={{ color: 'var(--text-2)' }}>
                  Camada de Proteção
                </div>
                <div className="space-y-3">
                  <div className="rounded-lg p-4" style={{ backgroundColor: 'var(--bg-3)', borderWidth: '1px', borderColor: 'var(--stroke-1)' }}>
                    <div className="flex items-center gap-2 mb-2">
                      <Shield className="w-4 h-4" style={{ color: 'var(--accent-orange)' }} />
                      <div className="font-semibold" style={{ color: 'var(--text-1)' }}>Estado atual</div>
                    </div>
                    <div className="text-sm" style={{ color: 'var(--text-2)' }}>
                      {overview?.protection.state ?? 'Visibilidade de capital indisponível.'}
                    </div>
                  </div>

                  <div className="rounded-lg p-4" style={{ backgroundColor: 'var(--bg-3)', borderWidth: '1px', borderColor: 'var(--stroke-1)' }}>
                    <div className="flex items-center gap-2 mb-2">
                      <KeyRound className="w-4 h-4" style={{ color: 'var(--accent-orange)' }} />
                      <div className="font-semibold" style={{ color: 'var(--text-1)' }}>Fronteira</div>
                    </div>
                    <div className="text-sm" style={{ color: 'var(--text-2)' }}>
                      {overview?.protection.boundary ?? 'Chaves e Dispositivos continuam sendo a fronteira de proteção do Vault.'}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>

          <section
            className="rounded-xl p-5"
            style={{ backgroundColor: 'var(--bg-2)', borderWidth: '1px', borderColor: 'var(--stroke-1)', boxShadow: 'var(--shadow-1)' }}
          >
            <div className="flex items-center justify-between gap-3 mb-4">
              <div>
                <div className="text-sm font-semibold" style={{ color: 'var(--text-2)' }}>
                  Prontidão para Execução
                </div>
                <div className="text-sm" style={{ color: 'var(--text-3)' }}>
                  O Vault permanece em modo leitura até que ações de capital sejam configuradas.
                </div>
              </div>
              <button
                onClick={() => window.location.assign('/radar')}
                className="text-sm font-medium inline-flex items-center gap-2"
                style={{ color: 'var(--accent-orange)' }}
              >
                Radar
                <ArrowUpRight className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="rounded-lg p-4" style={{ backgroundColor: 'var(--bg-3)', borderWidth: '1px', borderColor: 'var(--stroke-1)' }}>
                <div className="flex items-center gap-2 mb-2">
                  <Wallet className="w-4 h-4" style={{ color: 'var(--accent-orange)' }} />
                  <div className="font-semibold" style={{ color: 'var(--text-1)' }}>Custódia</div>
                </div>
                <div className="text-sm" style={{ color: 'var(--text-2)' }}>
                  {overview?.readiness.custody ?? 'Não custodial. O capital permanece na carteira conectada.'}
                </div>
              </div>
              <div className="rounded-lg p-4" style={{ backgroundColor: 'var(--bg-3)', borderWidth: '1px', borderColor: 'var(--stroke-1)' }}>
                <div className="flex items-center gap-2 mb-2">
                  <Waves className="w-4 h-4" style={{ color: 'var(--accent-orange)' }} />
                  <div className="font-semibold" style={{ color: 'var(--text-1)' }}>Staking</div>
                </div>
                <div className="text-sm" style={{ color: 'var(--text-2)' }}>
                  {overview?.readiness.staking ?? 'Nenhuma rota de staking disponível para esta conta.'}
                </div>
              </div>
              <div className="rounded-lg p-4" style={{ backgroundColor: 'var(--bg-3)', borderWidth: '1px', borderColor: 'var(--stroke-1)' }}>
                <div className="flex items-center gap-2 mb-2">
                  <Box className="w-4 h-4" style={{ color: 'var(--accent-orange)' }} />
                  <div className="font-semibold" style={{ color: 'var(--text-1)' }}>Provisionamento</div>
                </div>
                <div className="text-sm" style={{ color: 'var(--text-2)' }}>
                  {overview?.readiness.provisioning ?? 'Provisionamento de hardware requer um dispositivo SNE Vault vinculado.'}
                </div>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
