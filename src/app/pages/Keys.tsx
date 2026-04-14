import { useAccount } from 'wagmi';
import { ArrowUpRight, Box, KeyRound, Shield, Wallet } from 'lucide-react';

import { ModuleStateCard } from '../components/sne/ModuleStateCard';
import { WalletConnect } from '../components/passport/WalletConnect';
import { useKeysOverview } from '../../hooks/useKeysData';
import { resolveModuleState } from '../../lib/moduleState';
import { formatAddress } from '@/utils/format';

export function Keys() {
  const { address, isConnected } = useAccount();
  const overviewQuery = useKeysOverview(isConnected && address ? address : null);
  const overview = overviewQuery.data;
  const moduleState = resolveModuleState({
    isConnected,
    isLoading: overviewQuery.isLoading,
    isError: overviewQuery.isError,
    data: overview,
  });
  const signals = overview?.signals ?? [];

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
                  <div className="text-sm" style={{ color: 'var(--text-3)' }}>Keys</div>
                </div>

                <h1 className="text-3xl font-semibold mb-2" style={{ color: 'var(--text-1)' }}>
                  Licenças, vínculos e dispositivos.
                </h1>
                <p className="max-w-3xl text-sm" style={{ color: 'var(--text-2)' }}>
                  A camada de Keys controla o que a conta acessa, quais credenciais estão vinculadas e quais dispositivos entram na superfície de confiança.
                </p>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-5">
                  {signals.map((signal) => (
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
                      {overview?.connected ? 'Superfície de acesso carregada para esta sessão.' : 'Conecte uma carteira para carregar licenças e vínculos.'}
                    </div>
                  </div>
                </div>

                <div className="mt-5 space-y-3">
                  <WalletConnect />
                  <div className="grid grid-cols-2 gap-3">
                    <div className="rounded-lg px-3 py-3" style={{ backgroundColor: 'var(--bg-2)', borderWidth: '1px', borderColor: 'var(--stroke-1)' }}>
                      <div className="text-[11px] uppercase mb-1" style={{ color: 'var(--text-3)' }}>Nível</div>
                      <div className="font-semibold" style={{ color: 'var(--text-1)' }}>{overview?.surface.access_level ?? '--'}</div>
                    </div>
                    <div className="rounded-lg px-3 py-3" style={{ backgroundColor: 'var(--bg-2)', borderWidth: '1px', borderColor: 'var(--stroke-1)' }}>
                      <div className="text-[11px] uppercase mb-1" style={{ color: 'var(--text-3)' }}>Fonte</div>
                      <div className="font-semibold" style={{ color: 'var(--text-1)' }}>{overview?.surface.source ?? '--'}</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>

          <section className="grid grid-cols-1 xl:grid-cols-[minmax(0,1.1fr)_minmax(320px,0.9fr)] gap-5">
            <div
              className="rounded-xl p-5"
              style={{ backgroundColor: 'var(--bg-2)', borderWidth: '1px', borderColor: 'var(--stroke-1)', boxShadow: 'var(--shadow-1)' }}
            >
                <div className="mb-4 text-sm font-semibold" style={{ color: 'var(--text-2)' }}>
                Licenças e credenciais
              </div>

              {moduleState === 'disconnected' ? (
                <ModuleStateCard
                  tone="disconnected"
                  title="Conecte uma carteira"
                  description="Keys precisa de uma sessão conectada para resolver licenças, vínculos e dispositivos."
                />
              ) : moduleState === 'loading' ? (
                <ModuleStateCard
                  tone="loading"
                  title="Carregando camada de acesso"
                  description="Lendo licenças, vínculos e dispositivos confiáveis da conta."
                />
              ) : moduleState === 'error' ? (
                <ModuleStateCard
                  tone="error"
                  title="Falha ao carregar Keys"
                  description="A superfície de acesso não pôde ser resolvida agora."
                  actionLabel="Tentar novamente"
                  onAction={() => overviewQuery.refetch()}
                />
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="rounded-xl p-4 min-w-0" style={{ backgroundColor: 'var(--bg-3)', borderWidth: '1px', borderColor: 'var(--stroke-1)' }}>
                    <div className="flex items-center gap-2 mb-3">
                      <Shield className="w-4 h-4" style={{ color: 'var(--accent-orange)' }} />
                      <div className="font-semibold" style={{ color: 'var(--text-1)' }}>Licenças</div>
                    </div>
                    <div className="text-sm" style={{ color: 'var(--text-2)' }}>
                      {overview?.grants.length ? `${overview.grants.length} licença(s) carregadas.` : 'Nenhuma licença ativa carregada para esta conta.'}
                    </div>
                  </div>

                  <div className="rounded-xl p-4 min-w-0" style={{ backgroundColor: 'var(--bg-3)', borderWidth: '1px', borderColor: 'var(--stroke-1)' }}>
                    <div className="flex items-center gap-2 mb-3">
                      <KeyRound className="w-4 h-4" style={{ color: 'var(--accent-orange)' }} />
                      <div className="font-semibold" style={{ color: 'var(--text-1)' }}>Vínculos</div>
                    </div>
                    <div className="text-sm" style={{ color: 'var(--text-2)' }}>
                      {overview?.bindings.length ? `${overview.bindings.length} vínculo(s) carregados.` : 'Nenhuma credencial portátil vinculada ainda.'}
                    </div>
                  </div>

                  <div className="rounded-xl p-4 min-w-0 md:col-span-2" style={{ backgroundColor: 'var(--bg-3)', borderWidth: '1px', borderColor: 'var(--stroke-1)' }}>
                    <div className="flex items-center gap-2 mb-3">
                      <Box className="w-4 h-4" style={{ color: 'var(--accent-orange)' }} />
                      <div className="font-semibold" style={{ color: 'var(--text-1)' }}>Devices</div>
                    </div>
                    <div className="text-sm" style={{ color: 'var(--text-2)' }}>
                      {overview?.devices.length ? `${overview.devices.length} dispositivo(s) confiável(is) carregado(s).` : 'Nenhum dispositivo confiável registrado para esta conta.'}
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="space-y-5">
              <div
                className="rounded-xl p-4"
                style={{ backgroundColor: 'var(--bg-2)', borderWidth: '1px', borderColor: 'var(--stroke-1)', boxShadow: 'var(--shadow-1)' }}
              >
                <div className="mb-3 text-sm font-semibold" style={{ color: 'var(--text-2)' }}>
                  Fronteiras
                </div>
                <div className="space-y-3">
                  <div className="rounded-lg p-4" style={{ backgroundColor: 'var(--bg-3)', borderWidth: '1px', borderColor: 'var(--stroke-1)' }}>
                    <div className="font-semibold mb-2" style={{ color: 'var(--text-1)' }}>Licenças</div>
                    <div className="text-sm" style={{ color: 'var(--text-2)' }}>
                      {overview?.boundary.grants ?? 'Licenças definem o que esta conta pode acessar.'}
                    </div>
                  </div>
                  <div className="rounded-lg p-4" style={{ backgroundColor: 'var(--bg-3)', borderWidth: '1px', borderColor: 'var(--stroke-1)' }}>
                    <div className="font-semibold mb-2" style={{ color: 'var(--text-1)' }}>Devices</div>
                    <div className="text-sm" style={{ color: 'var(--text-2)' }}>
                      {overview?.boundary.devices ?? 'Dispositivos e vínculos representam a camada portátil de confiança.'}
                    </div>
                  </div>
                </div>
              </div>

              <div
                className="rounded-xl p-4"
                style={{ backgroundColor: 'var(--bg-2)', borderWidth: '1px', borderColor: 'var(--stroke-1)', boxShadow: 'var(--shadow-1)' }}
              >
                <div className="mb-3 text-sm font-semibold" style={{ color: 'var(--text-2)' }}>
                  Próxima Camada
                </div>
                <button
                  onClick={() => window.location.assign('/pass')}
                  className="w-full rounded-lg px-4 py-3 text-left flex items-center justify-between gap-3"
                  style={{ backgroundColor: 'var(--bg-3)', borderWidth: '1px', borderColor: 'var(--stroke-1)' }}
                >
                  <div>
                    <div className="font-semibold" style={{ color: 'var(--text-1)' }}>Abrir Passport</div>
                    <div className="text-sm" style={{ color: 'var(--text-2)' }}>Passport prova. Keys concede.</div>
                  </div>
                  <ArrowUpRight className="w-4 h-4" style={{ color: 'var(--text-3)' }} />
                </button>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
