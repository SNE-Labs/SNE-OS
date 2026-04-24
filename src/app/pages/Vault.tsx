import { useNavigate } from 'react-router-dom';
import { useAccount } from 'wagmi';
import { ArrowUpRight, Box, Shield, Wallet, Waves, Zap } from 'lucide-react';

import { FieldSurface } from '../components/field/FieldSurface';
import { ModuleStateCard } from '../components/sne/ModuleStateCard';
import { WalletConnect } from '../components/passport/WalletConnect';
import { useVaultOverview } from '../../hooks/useVaultData';
import { resolveModuleState } from '../../lib/moduleState';
import { formatAddress } from '@/utils/format';

type Tone = 'active' | 'success' | 'warning' | 'pending';
type ActionTone = 'accent' | 'neutral';

function toneStyle(tone: Tone) {
  if (tone === 'success') {
    return {
      color: 'var(--ok-green)',
      backgroundColor: 'rgba(34,197,94,0.10)',
      borderColor: 'rgba(34,197,94,0.16)',
    };
  }
  if (tone === 'warning') {
    return {
      color: 'var(--warn-amber)',
      backgroundColor: 'rgba(255,176,32,0.10)',
      borderColor: 'rgba(255,176,32,0.18)',
    };
  }
  if (tone === 'active') {
    return {
      color: 'var(--accent-orange)',
      backgroundColor: 'rgba(255,140,66,0.10)',
      borderColor: 'rgba(255,140,66,0.18)',
    };
  }
  return {
    color: 'var(--text-3)',
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderColor: 'rgba(255,255,255,0.08)',
  };
}

function networkTone(status: string): Tone {
  if (status === 'active') return 'success';
  if (status === 'idle') return 'active';
  if (status === 'degraded') return 'warning';
  return 'pending';
}

function actionStyle(tone: ActionTone) {
  if (tone === 'accent') {
    return {
      backgroundColor: 'rgba(255,140,66,0.10)',
      borderColor: 'rgba(255,140,66,0.18)',
      color: 'var(--accent-orange)',
    };
  }

  return {
    backgroundColor: 'var(--bg-3)',
    borderColor: 'var(--stroke-1)',
    color: 'var(--text-1)',
  };
}

function BucketCard({
  icon: Icon,
  label,
  value,
  detail,
  tone,
}: {
  icon: typeof Wallet;
  label: string;
  value: string;
  detail: string;
  tone: Tone;
}) {
  const badgeStyle = toneStyle(tone);

  return (
    <div
      className="rounded-xl p-4 min-w-0"
      style={{ backgroundColor: 'var(--bg-3)', borderWidth: '1px', borderColor: 'var(--stroke-1)' }}
    >
      <div className="flex items-center justify-between gap-3 mb-3">
        <div className="text-[11px] uppercase" style={{ color: 'var(--text-3)' }}>
          {label}
        </div>
        <div
          className="flex h-8 w-8 items-center justify-center rounded-xl"
          style={{ backgroundColor: badgeStyle.backgroundColor, color: badgeStyle.color }}
        >
          <Icon className="w-4 h-4" />
        </div>
      </div>
      <div className="text-xl font-semibold mb-2 break-words" style={{ color: 'var(--text-1)' }}>
        {value}
      </div>
      <div className="text-sm leading-6" style={{ color: 'var(--text-2)' }}>
        {detail}
      </div>
    </div>
  );
}

function TonePill({ label, tone }: { label: string; tone: Tone }) {
  const styles = toneStyle(tone);

  return (
    <div
      className="inline-flex items-center rounded-full border px-3 py-1 text-[10px] uppercase tracking-[0.16em]"
      style={styles}
    >
      {label}
    </div>
  );
}

export function Vault() {
  const navigate = useNavigate();
  const { address, isConnected } = useAccount();
  const overviewQuery = useVaultOverview(isConnected && address ? address : null);
  const overview = overviewQuery.data;
  const moduleState = resolveModuleState({
    isConnected,
    isLoading: overviewQuery.isLoading && !overview,
    isError: overviewQuery.isError && !overview,
    data: overview,
  });

  const heroMetrics = overview?.hero?.metrics ?? [];
  const actions = overview?.next_action.actions ?? [];
  const networks = overview?.by_network ?? [];
  const readinessItems = overview?.readiness.items ?? [];

  return (
    <div className="flex flex-1">
      <div className="sne-mosaic-page flex-1 px-6 py-5 overflow-y-auto xl:px-8">
        <div className="sne-mosaic-frame mx-auto max-w-[1480px] space-y-4">
          <FieldSurface
            as="section"
            motif="vault-ledger"
            density="compact"
            surface="hero"
            className="rounded-xl p-5"
            style={{
              background:
                'radial-gradient(circle at top left, rgba(255,140,66,0.16), transparent 30%), linear-gradient(180deg, rgba(255,255,255,0.02), rgba(0,0,0,0.03))',
              backgroundColor: 'var(--bg-2)',
              borderWidth: '1px',
              borderColor: 'var(--stroke-1)',
              boxShadow: 'var(--shadow-1)',
            }}
          >
            <div className="grid grid-cols-1 xl:grid-cols-[0.78fr_0.22fr] gap-4">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2 mb-3">
                  <div className="text-sm" style={{ color: 'var(--text-3)' }}>
                    {overview?.hero.eyebrow ?? 'Conta USDT-first'}
                  </div>
                  {overviewQuery.isFetching && overview ? <TonePill label="sincronizando" tone="pending" /> : null}
                </div>

                <h1 className="text-2xl font-semibold mb-2" style={{ color: 'var(--text-1)' }}>
                  {overview?.hero.title ?? 'Seu saldo-base em dolar digital.'}
                </h1>
                <p className="max-w-3xl text-sm leading-6" style={{ color: 'var(--text-2)' }}>
                  {overview?.hero.summary ??
                    'O saldo permanece na wallet. O OS so le, organiza e qualifica saldo-base, gas e prontidao para execucao.'}
                </p>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-5">
                  {heroMetrics.map((metric) => (
                    <div
                      key={metric.label}
                      className="rounded-lg px-4 py-3"
                      style={{ backgroundColor: 'var(--bg-3)', borderWidth: '1px', borderColor: 'var(--stroke-1)' }}
                    >
                      <div className="text-[11px] uppercase mb-1" style={{ color: 'var(--text-3)' }}>
                        {metric.label}
                      </div>
                      <div className="font-semibold mb-1 break-words" style={{ color: 'var(--text-1)' }}>
                        {metric.value}
                      </div>
                      <div className="text-sm" style={{ color: 'var(--text-2)' }}>
                        {metric.detail}
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
                      {overview?.surface.address ? formatAddress(overview.surface.address) : 'Conecte sua wallet'}
                    </div>
                    <div className="text-sm leading-6" style={{ color: 'var(--text-2)' }}>
                      {overview?.connected
                        ? 'O saldo permanece na wallet. O OS so le e organiza a conta operacional.'
                        : 'Conecte uma wallet para carregar saldo-base, gas e prontidao da conta.'}
                    </div>
                  </div>
                </div>

                <div className="mt-5 space-y-3">
                  <WalletConnect />
                  <div className="grid grid-cols-2 gap-3">
                    <div
                      className="rounded-lg px-3 py-3"
                      style={{ backgroundColor: 'var(--bg-2)', borderWidth: '1px', borderColor: 'var(--stroke-1)' }}
                    >
                      <div className="text-[11px] uppercase mb-1" style={{ color: 'var(--text-3)' }}>
                        Rede
                      </div>
                      <div className="font-semibold" style={{ color: 'var(--text-1)' }}>
                        {overview?.surface.network ?? '--'}
                      </div>
                    </div>
                    <div
                      className="rounded-lg px-3 py-3"
                      style={{ backgroundColor: 'var(--bg-2)', borderWidth: '1px', borderColor: 'var(--stroke-1)' }}
                    >
                      <div className="text-[11px] uppercase mb-1" style={{ color: 'var(--text-3)' }}>
                        Modo
                      </div>
                      <div className="font-semibold" style={{ color: 'var(--text-1)' }}>
                        {overview?.surface.mode ?? 'read-only'}
                      </div>
                    </div>
                  </div>

                  <div
                    className="rounded-lg p-4"
                    style={{ backgroundColor: 'var(--bg-2)', borderWidth: '1px', borderColor: 'var(--stroke-1)' }}
                  >
                    <div className="mb-2 text-sm font-semibold" style={{ color: 'var(--text-1)' }}>
                      {overview?.source_of_truth.title ?? 'Leitura organizada, sem custodia'}
                    </div>
                    <div className="text-sm leading-6" style={{ color: 'var(--text-2)' }}>
                      {overview?.source_of_truth.description ??
                        'O saldo permanece na wallet. O OS so le e organiza a conta operacional.'}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </FieldSurface>

          <section className="grid grid-cols-1 xl:grid-cols-[minmax(0,1.12fr)_minmax(300px,0.88fr)] gap-4">
            <FieldSurface
              motif="vault-ledger"
              as="section"
              density="compact"
              surface="panel"
              className="rounded-xl p-5"
              style={{ backgroundColor: 'var(--bg-2)', borderWidth: '1px', borderColor: 'var(--stroke-1)', boxShadow: 'var(--shadow-1)' }}
            >
              <div className="mb-4 text-sm font-semibold" style={{ color: 'var(--text-2)' }}>
                Estado da conta
              </div>

              {moduleState === 'disconnected' ? (
                <ModuleStateCard
                  tone="disconnected"
                  title="Conecte uma wallet"
                  description="O Vault precisa de uma wallet conectada para ler saldo-base, gas e prontidao operacional."
                />
              ) : moduleState === 'loading' ? (
                <ModuleStateCard
                  tone="loading"
                  title="Carregando conta USDT-first"
                  description="Lendo saldo-base, redes ativas e prontidao da wallet conectada."
                />
              ) : moduleState === 'error' ? (
                <ModuleStateCard
                  tone="error"
                  title="Falha ao carregar o Vault"
                  description="A leitura on-chain da conta nao pode ser resolvida agora."
                  actionLabel="Tentar novamente"
                  onAction={() => overviewQuery.refetch()}
                />
              ) : (
                <div className="space-y-3">
                  {overview?.empty_state ? (
                    <div
                      className="rounded-xl p-4"
                      style={{
                        backgroundColor: 'rgba(255,140,66,0.08)',
                        borderWidth: '1px',
                        borderColor: 'rgba(255,140,66,0.16)',
                      }}
                    >
                      <div className="mb-2 text-base font-semibold" style={{ color: 'var(--text-1)' }}>
                        {overview.empty_state.title}
                      </div>
                      <div className="text-sm leading-6" style={{ color: 'var(--text-2)' }}>
                        {overview.empty_state.description}
                      </div>
                      <div className="mt-4 space-y-2">
                        {overview.empty_state.steps.map((step) => (
                          <div key={step} className="text-sm" style={{ color: 'var(--text-2)' }}>
                            {step}
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : null}

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <BucketCard
                      icon={Wallet}
                      label={overview?.balances.usdt.label ?? 'USDT'}
                      value={overview?.balances.usdt.value ?? '--'}
                      detail={overview?.balances.usdt.detail ?? 'Sem saldo-base visivel.'}
                      tone={overview?.balances.usdt.tone ?? 'pending'}
                    />
                    <BucketCard
                      icon={Zap}
                      label={overview?.balances.gas.label ?? 'Gas'}
                      value={overview?.balances.gas.value ?? '--'}
                      detail={overview?.balances.gas.detail ?? 'Sem leitura de gas.'}
                      tone={overview?.balances.gas.tone ?? 'pending'}
                    />
                    <BucketCard
                      icon={Box}
                      label={overview?.balances.other_assets.label ?? 'Outros ativos'}
                      value={overview?.balances.other_assets.value ?? '--'}
                      detail={overview?.balances.other_assets.detail ?? 'Leitura adicional indisponivel.'}
                      tone={overview?.balances.other_assets.tone ?? 'pending'}
                    />
                  </div>
                </div>
              )}
            </FieldSurface>

            <div className="space-y-3">
              <FieldSurface
                motif="execution-rail"
                as="section"
                density="compact"
                surface="rail"
                className="rounded-xl p-4"
                style={{ backgroundColor: 'var(--bg-2)', borderWidth: '1px', borderColor: 'var(--stroke-1)', boxShadow: 'var(--shadow-1)' }}
              >
                <div className="mb-3 flex items-center gap-2">
                  <Waves className="w-4 h-4" style={{ color: 'var(--accent-orange)' }} />
                  <div className="text-sm font-semibold" style={{ color: 'var(--text-2)' }}>
                    Prontidao de execucao
                  </div>
                </div>
                <div className="mb-3 text-base font-semibold" style={{ color: 'var(--text-1)' }}>
                  {overview?.readiness.title ?? 'Conecte uma wallet para carregar a conta.'}
                </div>
                <div className="text-sm leading-6 mb-4" style={{ color: 'var(--text-2)' }}>
                  {overview?.readiness.summary ??
                    'O OS precisa da wallet conectada para ler saldo-base, gas e prontidao operacional.'}
                </div>
                <div className="space-y-3">
                  {readinessItems.map((item) => (
                    <div
                      key={item.label}
                      className="rounded-lg p-3"
                      style={{ backgroundColor: 'var(--bg-3)', borderWidth: '1px', borderColor: 'var(--stroke-1)' }}
                    >
                      <div className="flex items-center justify-between gap-3 mb-1">
                        <div className="text-[11px] uppercase" style={{ color: 'var(--text-3)' }}>
                          {item.label}
                        </div>
                        <TonePill label={item.value} tone={item.tone} />
                      </div>
                      <div className="text-sm" style={{ color: 'var(--text-2)' }}>
                        {item.detail}
                      </div>
                    </div>
                  ))}
                </div>
              </FieldSurface>

              <FieldSurface
                motif="sovereign-key"
                as="section"
                density="compact"
                surface="rail"
                className="rounded-xl p-4"
                style={{ backgroundColor: 'var(--bg-2)', borderWidth: '1px', borderColor: 'var(--stroke-1)', boxShadow: 'var(--shadow-1)' }}
              >
                <div className="mb-3 flex items-center gap-2">
                  <Shield className="w-4 h-4" style={{ color: 'var(--accent-orange)' }} />
                  <div className="text-sm font-semibold" style={{ color: 'var(--text-2)' }}>
                    Protecao e fronteira
                  </div>
                </div>
                <div className="space-y-3">
                  <div className="rounded-lg p-4" style={{ backgroundColor: 'var(--bg-3)', borderWidth: '1px', borderColor: 'var(--stroke-1)' }}>
                    <div className="font-semibold mb-2" style={{ color: 'var(--text-1)' }}>
                      Estado atual
                    </div>
                    <div className="text-sm leading-6" style={{ color: 'var(--text-2)' }}>
                      {overview?.protection.state ?? 'Visibilidade de capital indisponivel.'}
                    </div>
                  </div>
                  <div className="rounded-lg p-4" style={{ backgroundColor: 'var(--bg-3)', borderWidth: '1px', borderColor: 'var(--stroke-1)' }}>
                    <div className="font-semibold mb-2" style={{ color: 'var(--text-1)' }}>
                      Fronteira
                    </div>
                    <div className="text-sm leading-6" style={{ color: 'var(--text-2)' }}>
                      {overview?.protection.boundary ??
                        'Chaves e dispositivos continuam sendo a fronteira de protecao do Vault.'}
                    </div>
                  </div>
                </div>
              </FieldSurface>

              <FieldSurface
                motif="execution-rail"
                as="section"
                density="compact"
                surface="rail"
                className="rounded-xl p-4"
                style={{ backgroundColor: 'var(--bg-2)', borderWidth: '1px', borderColor: 'var(--stroke-1)', boxShadow: 'var(--shadow-1)' }}
              >
                <div className="mb-2 text-sm font-semibold" style={{ color: 'var(--text-2)' }}>
                  Proxima acao
                </div>
                <div className="text-sm leading-6 mb-4" style={{ color: 'var(--text-2)' }}>
                  {overview?.next_action.reason ?? 'Sem guidance operacional no momento.'}
                </div>
                <div className="space-y-3">
                  {actions.map((action) => (
                    <button
                      key={`${action.label}-${action.href}`}
                      onClick={() => navigate(action.href)}
                      className="w-full rounded-xl border px-4 py-3 flex items-center justify-between gap-3 text-left"
                      style={actionStyle(action.tone)}
                    >
                      <div className="text-sm font-medium">{action.label}</div>
                      <ArrowUpRight className="w-4 h-4 shrink-0" />
                    </button>
                  ))}
                </div>
              </FieldSurface>
            </div>
          </section>

          <FieldSurface
            as="section"
            motif="liquidity-field"
            density="compact"
            surface="panel"
            className="rounded-xl p-5"
            style={{ backgroundColor: 'var(--bg-2)', borderWidth: '1px', borderColor: 'var(--stroke-1)', boxShadow: 'var(--shadow-1)' }}
          >
            <div className="flex items-center justify-between gap-3 mb-4">
              <div>
                <div className="text-sm font-semibold" style={{ color: 'var(--text-2)' }}>
                  Redes ativas
                </div>
                <div className="text-sm" style={{ color: 'var(--text-3)' }}>
                  O Vault organiza USDT e gas por rede sem mover nada da wallet.
                </div>
              </div>
              <TonePill label={`${networks.length} redes`} tone={networks.length > 0 ? 'active' : 'pending'} />
            </div>

            {moduleState !== 'ready' ? (
              <ModuleStateCard
                tone={moduleState === 'error' ? 'error' : moduleState === 'loading' ? 'loading' : 'empty'}
                title="Leitura por rede indisponivel"
                description="A visao por rede aparece quando a conta operacional e carregada."
                compact
              />
            ) : networks.length === 0 ? (
              <ModuleStateCard
                tone="empty"
                title="Sem redes visiveis"
                description="Nenhuma rede retornou saldo, gas ou atividade detectavel nesta leitura."
                compact
              />
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 2xl:grid-cols-4 gap-3">
                {networks.map((network) => (
                  <div
                    key={network.network}
                    className="rounded-xl p-4"
                    style={{ backgroundColor: 'var(--bg-3)', borderWidth: '1px', borderColor: 'var(--stroke-1)' }}
                  >
                    <div className="flex items-center justify-between gap-3 mb-3">
                      <div className="font-semibold" style={{ color: 'var(--text-1)' }}>
                        {network.network}
                      </div>
                      <TonePill label={network.status} tone={networkTone(network.status)} />
                    </div>

                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div>
                        <div className="text-[11px] uppercase mb-1" style={{ color: 'var(--text-3)' }}>
                          USDT
                        </div>
                        <div style={{ color: 'var(--text-1)' }}>{network.balance_formatted ?? '--'}</div>
                      </div>
                      <div>
                        <div className="text-[11px] uppercase mb-1" style={{ color: 'var(--text-3)' }}>
                          Gas
                        </div>
                        <div style={{ color: 'var(--text-1)' }}>{network.gas_balance_formatted ?? '--'}</div>
                      </div>
                      <div>
                        <div className="text-[11px] uppercase mb-1" style={{ color: 'var(--text-3)' }}>
                          Mercado
                        </div>
                        <div style={{ color: 'var(--text-1)' }}>{network.gas ?? '--'}</div>
                      </div>
                      <div>
                        <div className="text-[11px] uppercase mb-1" style={{ color: 'var(--text-3)' }}>
                          Transacoes
                        </div>
                        <div style={{ color: 'var(--text-1)' }}>{network.tx_count ?? 0}</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </FieldSurface>
        </div>
      </div>
    </div>
  );
}
