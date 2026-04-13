import { useMemo } from 'react';
import { useAccount, useChainId } from 'wagmi';
import { ArrowUpRight, Box, KeyRound, Shield, Wallet, Waves, Zap } from 'lucide-react';

import { StatusBadge } from '../components/sne/StatusBadge';
import { WalletConnect } from '../components/passport/WalletConnect';
import { useConnectedBalance, useGasPrice, useLookupAddress } from '../../hooks/usePassportData';
import { formatAddress } from '@/utils/format';

export function Vault() {
  const { address, isConnected } = useAccount();
  const chainId = useChainId();

  const balanceQuery = useConnectedBalance();
  const gasQuery = useGasPrice();
  const lookupQuery = useLookupAddress(isConnected && address ? address : null);

  const profile = lookupQuery.data;

  const vaultStatus = useMemo(() => {
    if (!isConnected) return { label: 'offline', tone: 'pending' as const };
    if (lookupQuery.isLoading || balanceQuery.isLoading) return { label: 'syncing', tone: 'pending' as const };
    if (profile?.identity?.hasActivity) return { label: 'capital online', tone: 'active' as const };
    return { label: 'idle', tone: 'warning' as const };
  }, [balanceQuery.isLoading, isConnected, lookupQuery.isLoading, profile?.identity?.hasActivity]);

  const capitalCards = useMemo(
    () => [
      {
        label: 'Saldo',
        value: balanceQuery.data?.eth?.formatted ?? '--',
        hint: profile?.identity?.balanceEth ? `${profile.identity.balanceEth} ETH` : 'Sem capital carregado',
        icon: Wallet,
      },
      {
        label: 'Gas',
        value: gasQuery.data?.gasPriceFormatted ?? '--',
        hint: 'Scroll RPC',
        icon: Zap,
      },
      {
        label: 'Conta',
        value: profile?.identity?.accountType ?? '--',
        hint: profile?.identity?.hasActivity ? `${profile.identity.txCount} tx` : 'Sem atividade visível',
        icon: Shield,
      },
      {
        label: 'Proteção',
        value: (profile?.boxes.length ?? 0) > 0 ? 'dispositivos detectados' : 'sem dispositivos',
        hint: (profile?.keys.length ?? 0) > 0 ? `${profile?.keys.length ?? 0} chaves vinculadas` : 'Nenhum dispositivo confiável',
        icon: Box,
      },
    ],
    [balanceQuery.data?.eth?.formatted, gasQuery.data?.gasPriceFormatted, profile]
  );

  const vaultSignals = useMemo(
    () => [
      {
        title: 'Estado do capital',
        value: balanceQuery.data?.eth?.formatted ?? '--',
        detail: isConnected ? 'Saldo ao vivo da carteira' : 'Conecte uma carteira para carregar o capital',
      },
      {
        title: 'Superfície de acesso',
        value: `${profile?.keys.length ?? 0} chaves`,
        detail: (profile?.keys.length ?? 0) > 0 ? 'Acesso portátil detectado' : 'Nenhuma chave vinculada ainda',
      },
      {
        title: 'Camada de proteção',
        value: `${profile?.boxes.length ?? 0} dispositivos`,
        detail: (profile?.boxes.length ?? 0) > 0 ? 'Hardware confiável presente' : 'Nenhum dispositivo registrado',
      },
    ],
    [balanceQuery.data?.eth?.formatted, isConnected, profile?.boxes.length, profile?.keys.length]
  );

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
                      {isConnected && address ? formatAddress(address) : 'Conecte sua carteira'}
                    </div>
                    <div className="text-sm" style={{ color: 'var(--text-2)' }}>
                      {isConnected ? 'Saldo e postura da conta carregados ao vivo.' : 'Conecte uma carteira para carregar seu capital.'}
                    </div>
                  </div>
                </div>

                <div className="mt-5 space-y-3">
                  <WalletConnect />
                  <div className="grid grid-cols-2 gap-3">
                    <div className="rounded-lg px-3 py-3" style={{ backgroundColor: 'var(--bg-2)', borderWidth: '1px', borderColor: 'var(--stroke-1)' }}>
                      <div className="text-[11px] uppercase mb-1" style={{ color: 'var(--text-3)' }}>Rede</div>
                      <div className="font-semibold" style={{ color: 'var(--text-1)' }}>{chainId ?? '--'}</div>
                    </div>
                    <div className="rounded-lg px-3 py-3" style={{ backgroundColor: 'var(--bg-2)', borderWidth: '1px', borderColor: 'var(--stroke-1)' }}>
                      <div className="text-[11px] uppercase mb-1" style={{ color: 'var(--text-3)' }}>Fonte</div>
                      <div className="font-semibold" style={{ color: 'var(--text-1)' }}>{profile?.metadata?.source ?? 'wagmi/rpc'}</div>
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
                  <div className="rounded-lg p-3" style={{ backgroundColor: 'var(--bg-3)', borderWidth: '1px', borderColor: 'var(--stroke-1)' }}>
                    <div className="text-[11px] uppercase mb-1" style={{ color: 'var(--text-3)' }}>Tipo</div>
                    <div className="font-semibold" style={{ color: 'var(--text-1)' }}>
                      {profile?.identity?.accountType ?? '--'}
                    </div>
                  </div>
                  <div className="rounded-lg p-3" style={{ backgroundColor: 'var(--bg-3)', borderWidth: '1px', borderColor: 'var(--stroke-1)' }}>
                    <div className="text-[11px] uppercase mb-1" style={{ color: 'var(--text-3)' }}>Transações</div>
                    <div className="font-semibold" style={{ color: 'var(--text-1)' }}>
                      {profile?.identity?.txCount ?? '--'}
                    </div>
                  </div>
                  <div className="rounded-lg p-3" style={{ backgroundColor: 'var(--bg-3)', borderWidth: '1px', borderColor: 'var(--stroke-1)' }}>
                    <div className="text-[11px] uppercase mb-1" style={{ color: 'var(--text-3)' }}>Chaves</div>
                    <div className="font-semibold" style={{ color: 'var(--text-1)' }}>
                      {profile?.keys.length ?? 0}
                    </div>
                  </div>
                  <div className="rounded-lg p-3" style={{ backgroundColor: 'var(--bg-3)', borderWidth: '1px', borderColor: 'var(--stroke-1)' }}>
                    <div className="text-[11px] uppercase mb-1" style={{ color: 'var(--text-3)' }}>Dispositivos</div>
                    <div className="font-semibold" style={{ color: 'var(--text-1)' }}>
                      {profile?.boxes.length ?? 0}
                    </div>
                  </div>
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
                      Visibilidade de capital ativa. Rotas de staking e provisionamento de hardware ainda não estão disponíveis para esta conta.
                    </div>
                  </div>

                  <div className="rounded-lg p-4" style={{ backgroundColor: 'var(--bg-3)', borderWidth: '1px', borderColor: 'var(--stroke-1)' }}>
                    <div className="flex items-center gap-2 mb-2">
                      <KeyRound className="w-4 h-4" style={{ color: 'var(--accent-orange)' }} />
                      <div className="font-semibold" style={{ color: 'var(--text-1)' }}>Fronteira</div>
                    </div>
                    <div className="text-sm" style={{ color: 'var(--text-2)' }}>
                      Chaves e Dispositivos são primitivos de proteção. Gerenciamento de grants fica em Chaves; execução fica no Radar.
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
                  Não custodial. O capital permanece na carteira conectada.
                </div>
              </div>
              <div className="rounded-lg p-4" style={{ backgroundColor: 'var(--bg-3)', borderWidth: '1px', borderColor: 'var(--stroke-1)' }}>
                <div className="flex items-center gap-2 mb-2">
                  <Waves className="w-4 h-4" style={{ color: 'var(--accent-orange)' }} />
                  <div className="font-semibold" style={{ color: 'var(--text-1)' }}>Staking</div>
                </div>
                <div className="text-sm" style={{ color: 'var(--text-2)' }}>
                  Nenhuma rota de staking disponível para esta conta.
                </div>
              </div>
              <div className="rounded-lg p-4" style={{ backgroundColor: 'var(--bg-3)', borderWidth: '1px', borderColor: 'var(--stroke-1)' }}>
                <div className="flex items-center gap-2 mb-2">
                  <Box className="w-4 h-4" style={{ color: 'var(--accent-orange)' }} />
                  <div className="font-semibold" style={{ color: 'var(--text-1)' }}>Provisionamento</div>
                </div>
                <div className="text-sm" style={{ color: 'var(--text-2)' }}>
                  Provisionamento de hardware requer um dispositivo SNE Vault vinculado.
                </div>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
