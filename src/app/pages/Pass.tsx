import { useMemo, useState } from 'react';
import { useAccount } from 'wagmi';
import { BadgeCheck, Search, Shield, Wallet, ArrowUpRight, AlertCircle, KeyRound, Box, Activity } from 'lucide-react';
import { isAddress } from 'viem';

import { StatusBadge } from '../components/sne/StatusBadge';
import { WalletConnect } from '../components/passport/WalletConnect';
import { usePassportOverview } from '../../hooks/usePassportData';
import { formatAddress } from '@/utils/format';

type PassportTab = 'identity' | 'lookup' | 'watch';

export function Pass() {
  const { address, isConnected } = useAccount();
  const [activeTab, setActiveTab] = useState<PassportTab>('identity');
  const [lookupInput, setLookupInput] = useState('');
  const [lookupTarget, setLookupTarget] = useState<string | null>(null);
  const [lookupError, setLookupError] = useState<string | null>(null);

  const overviewQuery = usePassportOverview(isConnected && address ? address : null);
  const publicOverview = usePassportOverview(lookupTarget);

  const connectedProfile = overviewQuery.data?.profile;
  const publicProfile = publicOverview.data?.profile;

  const currentProfile = activeTab === 'lookup' ? publicProfile : connectedProfile;

  const identityStatus = overviewQuery.data?.status ?? (
    !isConnected
      ? { label: 'offline', tone: 'pending' as const }
      : overviewQuery.isLoading
        ? { label: 'syncing', tone: 'pending' as const }
        : (connectedProfile?.licenses.length ?? 0) > 0
          ? { label: 'verified', tone: 'success' as const }
          : connectedProfile?.identity?.hasActivity
            ? { label: 'active', tone: 'active' as const }
            : { label: 'pending', tone: 'warning' as const }
  );

  const tabs = [
    { id: 'identity', label: 'Identidade', icon: BadgeCheck },
    { id: 'lookup', label: 'Consulta Pública', icon: Search },
    { id: 'watch', label: 'Camada de Acesso', icon: Shield },
  ] as const;

  const inventory = useMemo(
    () => (
      activeTab === 'identity' && overviewQuery.data?.inventory
        ? overviewQuery.data.inventory.map((item) => ({
            ...item,
            icon:
              item.label === 'Asserções'
                ? BadgeCheck
                : item.label === 'Licenças'
                  ? Shield
                  : item.label === 'Chaves'
                    ? KeyRound
                    : Box,
          }))
        : [
            { label: 'Asserções', value: `${currentProfile?.assertions?.length ?? 0}`, icon: BadgeCheck },
            { label: 'Licenças', value: `${currentProfile?.licenses.length ?? 0}`, icon: Shield },
            { label: 'Chaves', value: `${currentProfile?.keys.length ?? 0}`, icon: KeyRound },
            { label: 'Caixas', value: `${currentProfile?.boxes.length ?? 0}`, icon: Box },
          ]
    ),
    [activeTab, currentProfile, overviewQuery.data?.inventory]
  );

  const handleLookupSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    const candidate = lookupInput.trim();

    if (!candidate) {
      setLookupError('Informe um endereço para consultar.');
      return;
    }

    if (!isAddress(candidate)) {
      setLookupError('Endereço Ethereum inválido.');
      return;
    }

    setLookupError(null);
    setLookupTarget(candidate);
    setActiveTab('lookup');
  };

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
                  <StatusBadge status={identityStatus.tone}>{identityStatus.label}</StatusBadge>
                  <div className="text-sm" style={{ color: 'var(--text-3)' }}>Passaporte</div>
                </div>

                <h1 className="text-3xl font-semibold mb-2" style={{ color: 'var(--text-1)' }}>
                  Sua identidade on-chain, resolvida.
                </h1>
                <p className="max-w-3xl text-sm" style={{ color: 'var(--text-2)' }}>
                  O Passport lê sua conta conectada via Scroll RPC e expõe asserções de identidade, inventário de acesso e postura da conta — tudo a partir do estado público on-chain.
                </p>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-5">
                  <div
                    className="rounded-lg px-4 py-3"
                    style={{ backgroundColor: 'var(--bg-3)', borderWidth: '1px', borderColor: 'var(--stroke-1)' }}
                  >
                    <div className="text-[11px] uppercase mb-1" style={{ color: 'var(--text-3)' }}>Endereço</div>
                    <div className="font-semibold break-all" style={{ color: 'var(--text-1)' }}>
                      {overviewQuery.data?.surface.address ? formatAddress(overviewQuery.data.surface.address) : 'Não conectado'}
                    </div>
                  </div>
                  <div
                    className="rounded-lg px-4 py-3"
                    style={{ backgroundColor: 'var(--bg-3)', borderWidth: '1px', borderColor: 'var(--stroke-1)' }}
                  >
                    <div className="text-[11px] uppercase mb-1" style={{ color: 'var(--text-3)' }}>Capital</div>
                    <div className="font-semibold break-words" style={{ color: 'var(--text-1)' }}>
                      {overviewQuery.data?.surface.capital ?? '--'}
                    </div>
                  </div>
                  <div
                    className="rounded-lg px-4 py-3"
                    style={{ backgroundColor: 'var(--bg-3)', borderWidth: '1px', borderColor: 'var(--stroke-1)' }}
                  >
                    <div className="text-[11px] uppercase mb-1" style={{ color: 'var(--text-3)' }}>Gas</div>
                    <div className="font-semibold break-words" style={{ color: 'var(--text-1)' }}>
                      {overviewQuery.data?.surface.gas ?? '--'}
                    </div>
                  </div>
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
                      {overviewQuery.data?.surface.address ? formatAddress(overviewQuery.data.surface.address) : 'Conecte sua carteira'}
                    </div>
                    <div className="text-sm" style={{ color: 'var(--text-2)' }}>
                      {isConnected ? 'O Passport está lendo o estado público desta conta.' : 'Conecte uma carteira para carregar seu Passport.'}
                    </div>
                  </div>
                </div>

                <div className="mt-5 space-y-3">
                  <WalletConnect />
                  <button
                    onClick={() => setActiveTab('lookup')}
                    className="w-full px-4 py-2 rounded-lg flex items-center justify-between gap-3 text-sm font-medium"
                    style={{ backgroundColor: 'var(--bg-2)', color: 'var(--text-1)', borderWidth: '1px', borderColor: 'var(--stroke-1)' }}
                  >
                    Consultar endereço público
                    <ArrowUpRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          </section>

          <section
            className="rounded-xl p-4"
            style={{ backgroundColor: 'var(--bg-2)', borderWidth: '1px', borderColor: 'var(--stroke-1)', boxShadow: 'var(--shadow-1)' }}
          >
            <div className="flex flex-wrap gap-2">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                const active = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className="px-4 py-2 rounded-lg flex items-center gap-2 text-sm font-medium transition-all"
                    style={{
                      backgroundColor: active ? 'var(--accent-orange)' : 'var(--bg-3)',
                      color: active ? '#FFFFFF' : 'var(--text-1)',
                      borderWidth: active ? '0px' : '1px',
                      borderColor: 'var(--stroke-1)',
                    }}
                  >
                    <Icon className="w-4 h-4" />
                    {tab.label}
                  </button>
                );
              })}
            </div>
          </section>

          {activeTab === 'identity' && (
            <>
              <section className="grid grid-cols-1 xl:grid-cols-[minmax(0,1.25fr)_minmax(320px,0.75fr)] gap-5">
                <div
                  className="rounded-xl p-5"
                  style={{ backgroundColor: 'var(--bg-2)', borderWidth: '1px', borderColor: 'var(--stroke-1)', boxShadow: 'var(--shadow-1)' }}
                >
                  <div className="mb-4 text-sm font-semibold" style={{ color: 'var(--text-2)' }}>
                    Asserções de Identidade
                  </div>

                  {!isConnected ? (
                    <div className="text-sm" style={{ color: 'var(--text-2)' }}>
                      Conecte uma carteira para carregar suas asserções de identidade.
                    </div>
                  ) : overviewQuery.isLoading ? (
                    <div className="text-sm" style={{ color: 'var(--text-2)' }}>
                      Lendo estado on-chain da conta...
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {(connectedProfile?.assertions ?? []).map((assertion) => (
                        <div
                          key={assertion.id}
                          className="rounded-lg p-4 min-w-0"
                          style={{ backgroundColor: 'var(--bg-3)', borderWidth: '1px', borderColor: 'var(--stroke-1)' }}
                        >
                          <div className="flex items-center justify-between gap-3 mb-3">
                            <div className="font-semibold min-w-0 truncate" style={{ color: 'var(--text-1)' }}>
                              {assertion.label}
                            </div>
                            <StatusBadge
                              status={
                                assertion.status === 'present'
                                  ? 'success'
                                  : assertion.status === 'inactive'
                                  ? 'warning'
                                  : 'pending'
                              }
                            >
                              {assertion.status}
                            </StatusBadge>
                          </div>
                          <div className="text-sm break-words" style={{ color: 'var(--text-2)' }}>
                            {assertion.value ?? '--'}
                          </div>
                          <div className="text-xs mt-2 uppercase tracking-wide" style={{ color: 'var(--text-3)' }}>
                            {assertion.source}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="space-y-5">
                  <div
                    className="rounded-xl p-4"
                    style={{ backgroundColor: 'var(--bg-2)', borderWidth: '1px', borderColor: 'var(--stroke-1)', boxShadow: 'var(--shadow-1)' }}
                  >
                    <div className="mb-3 text-sm font-semibold" style={{ color: 'var(--text-2)' }}>
                      Superfície de Identidade
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="rounded-lg p-3" style={{ backgroundColor: 'var(--bg-3)', borderWidth: '1px', borderColor: 'var(--stroke-1)' }}>
                        <div className="text-[11px] uppercase mb-1" style={{ color: 'var(--text-3)' }}>Tipo</div>
                        <div className="font-semibold" style={{ color: 'var(--text-1)' }}>
                          {connectedProfile?.identity?.accountType ?? '--'}
                        </div>
                      </div>
                      <div className="rounded-lg p-3" style={{ backgroundColor: 'var(--bg-3)', borderWidth: '1px', borderColor: 'var(--stroke-1)' }}>
                        <div className="text-[11px] uppercase mb-1" style={{ color: 'var(--text-3)' }}>Transações</div>
                        <div className="font-semibold" style={{ color: 'var(--text-1)' }}>
                          {connectedProfile?.identity?.txCount ?? '--'}
                        </div>
                      </div>
                      <div className="rounded-lg p-3" style={{ backgroundColor: 'var(--bg-3)', borderWidth: '1px', borderColor: 'var(--stroke-1)' }}>
                        <div className="text-[11px] uppercase mb-1" style={{ color: 'var(--text-3)' }}>Saldo</div>
                        <div className="font-semibold" style={{ color: 'var(--text-1)' }}>
                          {connectedProfile?.identity?.balanceEth ? `${connectedProfile.identity.balanceEth} ETH` : '--'}
                        </div>
                      </div>
                      <div className="rounded-lg p-3" style={{ backgroundColor: 'var(--bg-3)', borderWidth: '1px', borderColor: 'var(--stroke-1)' }}>
                        <div className="text-[11px] uppercase mb-1" style={{ color: 'var(--text-3)' }}>Origem</div>
                        <div className="font-semibold" style={{ color: 'var(--text-1)' }}>
                          {connectedProfile?.metadata?.source ?? '--'}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div
                    className="rounded-xl p-4"
                    style={{ backgroundColor: 'var(--bg-2)', borderWidth: '1px', borderColor: 'var(--stroke-1)', boxShadow: 'var(--shadow-1)' }}
                  >
                    <div className="mb-3 text-sm font-semibold" style={{ color: 'var(--text-2)' }}>
                      Inventário
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      {inventory.map((item) => {
                        const Icon = item.icon;
                        return (
                          <div
                            key={item.label}
                            className="rounded-lg p-3 min-w-0"
                            style={{ backgroundColor: 'var(--bg-3)', borderWidth: '1px', borderColor: 'var(--stroke-1)' }}
                          >
                            <div className="flex items-center justify-between gap-3 mb-2">
                              <span className="text-xs uppercase" style={{ color: 'var(--text-3)' }}>{item.label}</span>
                              <Icon className="w-4 h-4" style={{ color: 'var(--accent-orange)' }} />
                            </div>
                            <div className="font-semibold text-sm" style={{ color: 'var(--text-1)' }}>{item.value}</div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </section>

              <section
                className="rounded-xl p-5"
                style={{ backgroundColor: 'var(--bg-2)', borderWidth: '1px', borderColor: 'var(--stroke-1)', boxShadow: 'var(--shadow-1)' }}
              >
                <div className="mb-4 text-sm font-semibold" style={{ color: 'var(--text-2)' }}>
                  Fronteiras da Identidade
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="rounded-lg p-4" style={{ backgroundColor: 'var(--bg-3)', borderWidth: '1px', borderColor: 'var(--stroke-1)' }}>
                    <div className="font-semibold mb-2" style={{ color: 'var(--text-1)' }}>O que o Passport prova</div>
                    <div className="text-sm" style={{ color: 'var(--text-2)' }}>
                      Resolução de endereço, atividade on-chain, tipo de conta e qualquer asserção de identidade SNE visível publicamente.
                    </div>
                  </div>
                  <div className="rounded-lg p-4" style={{ backgroundColor: 'var(--bg-3)', borderWidth: '1px', borderColor: 'var(--stroke-1)' }}>
                    <div className="font-semibold mb-2" style={{ color: 'var(--text-1)' }}>O que as Chaves concedem</div>
                    <div className="text-sm" style={{ color: 'var(--text-2)' }}>
                      Licenças, vínculos, dispositivos e credenciais portáteis pertencem à camada de acesso, não à superfície de identidade.
                    </div>
                  </div>
                  <div className="rounded-lg p-4" style={{ backgroundColor: 'var(--bg-3)', borderWidth: '1px', borderColor: 'var(--stroke-1)' }}>
                    <div className="font-semibold mb-2" style={{ color: 'var(--text-1)' }}>Estado atual</div>
                    <div className="text-sm" style={{ color: 'var(--text-2)' }}>
                      O Passport está ativo no Scroll. Contratos de licença SNE ainda não estão em produção, então o inventário pode aparecer vazio.
                    </div>
                  </div>
                </div>
              </section>
            </>
          )}

          {activeTab === 'lookup' && (
            <section className="grid grid-cols-1 xl:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)] gap-5">
              <div
                className="rounded-xl p-5"
                style={{ backgroundColor: 'var(--bg-2)', borderWidth: '1px', borderColor: 'var(--stroke-1)', boxShadow: 'var(--shadow-1)' }}
              >
                <div className="mb-4 text-sm font-semibold" style={{ color: 'var(--text-2)' }}>
                  Consulta Pública
                </div>
                <form onSubmit={handleLookupSubmit} className="space-y-4">
                  <div className="relative">
                    <Search
                      size={18}
                      style={{ color: 'var(--text-3)', position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }}
                    />
                    <input
                      type="text"
                      value={lookupInput}
                      onChange={(event) => {
                        setLookupInput(event.target.value);
                        setLookupError(null);
                      }}
                      placeholder="0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb"
                      className="w-full pl-10 pr-4 py-3 rounded-lg font-mono text-sm"
                      style={{ backgroundColor: 'var(--bg-3)', borderWidth: '1px', borderColor: 'var(--stroke-1)', color: 'var(--text-1)' }}
                    />
                  </div>

                  {lookupError && (
                    <div className="flex items-center gap-2 text-sm" style={{ color: 'var(--danger-red)' }}>
                      <AlertCircle className="w-4 h-4" />
                      <span>{lookupError}</span>
                    </div>
                  )}

                  <button
                    type="submit"
                    className="px-4 py-2 rounded-lg inline-flex items-center gap-2 font-medium"
                    style={{ backgroundColor: 'var(--accent-orange)', color: '#FFFFFF' }}
                  >
                    Consultar endereço
                    <ArrowUpRight className="w-4 h-4" />
                  </button>
                </form>

                <div className="mt-5 rounded-lg p-4" style={{ backgroundColor: 'var(--bg-3)', borderWidth: '1px', borderColor: 'var(--stroke-1)' }}>
                  <div className="font-semibold mb-2" style={{ color: 'var(--text-1)' }}>O que a consulta retorna</div>
                  <div className="text-sm" style={{ color: 'var(--text-2)' }}>
                    O Passport lê o estado público da conta diretamente via Scroll RPC: saldo, contagem de transações, tipo de conta e o inventário SNE visível on-chain.
                  </div>
                </div>
              </div>

              <div
                className="rounded-xl p-5"
                style={{ backgroundColor: 'var(--bg-2)', borderWidth: '1px', borderColor: 'var(--stroke-1)', boxShadow: 'var(--shadow-1)' }}
              >
                <div className="mb-4 text-sm font-semibold" style={{ color: 'var(--text-2)' }}>
                  Resultado da Consulta
                </div>

                {!lookupTarget ? (
                  <div className="text-sm" style={{ color: 'var(--text-2)' }}>
                    Informe um endereço para resolver um perfil público de Passport.
                  </div>
                ) : publicOverview.isLoading ? (
                  <div className="text-sm" style={{ color: 'var(--text-2)' }}>
                    Resolvendo endereço...
                  </div>
                ) : publicOverview.isError ? (
                  <div className="text-sm" style={{ color: 'var(--danger-red)' }}>
                    Falha ao resolver este endereço.
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="rounded-lg p-4" style={{ backgroundColor: 'var(--bg-3)', borderWidth: '1px', borderColor: 'var(--stroke-1)' }}>
                      <div className="text-[11px] uppercase mb-1" style={{ color: 'var(--text-3)' }}>Address</div>
                      <div className="font-semibold break-all" style={{ color: 'var(--text-1)' }}>
                        {publicProfile?.identity?.address ?? lookupTarget}
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {(publicProfile?.assertions ?? []).map((assertion) => (
                        <div
                          key={assertion.id}
                          className="rounded-lg p-4"
                          style={{ backgroundColor: 'var(--bg-3)', borderWidth: '1px', borderColor: 'var(--stroke-1)' }}
                        >
                          <div className="flex items-center justify-between gap-3 mb-2">
                            <div className="font-semibold" style={{ color: 'var(--text-1)' }}>{assertion.label}</div>
                            <StatusBadge
                              status={
                                assertion.status === 'present'
                                  ? 'success'
                                  : assertion.status === 'inactive'
                                  ? 'warning'
                                  : 'pending'
                              }
                            >
                              {assertion.status}
                            </StatusBadge>
                          </div>
                          <div className="text-sm break-words" style={{ color: 'var(--text-2)' }}>{assertion.value ?? '--'}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </section>
          )}

          {activeTab === 'watch' && (
            <section className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_minmax(320px,0.8fr)] gap-5">
              <div
                className="rounded-xl p-5"
                style={{ backgroundColor: 'var(--bg-2)', borderWidth: '1px', borderColor: 'var(--stroke-1)', boxShadow: 'var(--shadow-1)' }}
              >
                <div className="mb-4 text-sm font-semibold" style={{ color: 'var(--text-2)' }}>
                  Camada de Acesso
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="rounded-lg p-4" style={{ backgroundColor: 'var(--bg-3)', borderWidth: '1px', borderColor: 'var(--stroke-1)' }}>
                    <div className="flex items-center gap-2 mb-3">
                      <Shield className="w-4 h-4" style={{ color: 'var(--accent-orange)' }} />
                      <div className="font-semibold" style={{ color: 'var(--text-1)' }}>Licenças</div>
                    </div>
                    <div className="text-sm" style={{ color: 'var(--text-2)' }}>
                      {connectedProfile?.licenses.length ?? 0} registro(s) de licença visível(is).
                    </div>
                  </div>
                  <div className="rounded-lg p-4" style={{ backgroundColor: 'var(--bg-3)', borderWidth: '1px', borderColor: 'var(--stroke-1)' }}>
                    <div className="flex items-center gap-2 mb-3">
                      <KeyRound className="w-4 h-4" style={{ color: 'var(--accent-orange)' }} />
                      <div className="font-semibold" style={{ color: 'var(--text-1)' }}>Chaves</div>
                    </div>
                    <div className="text-sm" style={{ color: 'var(--text-2)' }}>
                      {connectedProfile?.keys.length ?? 0} vínculo(s) de chave carregado(s).
                    </div>
                  </div>
                  <div className="rounded-lg p-4" style={{ backgroundColor: 'var(--bg-3)', borderWidth: '1px', borderColor: 'var(--stroke-1)' }}>
                    <div className="flex items-center gap-2 mb-3">
                      <Box className="w-4 h-4" style={{ color: 'var(--accent-orange)' }} />
                      <div className="font-semibold" style={{ color: 'var(--text-1)' }}>Caixas</div>
                    </div>
                    <div className="text-sm" style={{ color: 'var(--text-2)' }}>
                      {connectedProfile?.boxes.length ?? 0} registro(s) de dispositivo confiável.
                    </div>
                  </div>
                </div>
              </div>

              <div
                className="rounded-xl p-5"
                style={{ backgroundColor: 'var(--bg-2)', borderWidth: '1px', borderColor: 'var(--stroke-1)', boxShadow: 'var(--shadow-1)' }}
              >
                <div className="mb-4 text-sm font-semibold" style={{ color: 'var(--text-2)' }}>
                  Estado de Acesso Atual
                </div>
                <div className="space-y-3">
                  <div className="rounded-lg p-4" style={{ backgroundColor: 'var(--bg-3)', borderWidth: '1px', borderColor: 'var(--stroke-1)' }}>
                    <div className="flex items-center gap-2 mb-2">
                      <Activity className="w-4 h-4" style={{ color: 'var(--accent-orange)' }} />
                      <div className="font-semibold" style={{ color: 'var(--text-1)' }}>Fronteira</div>
                    </div>
                    <div className="text-sm" style={{ color: 'var(--text-2)' }}>
                      Nenhum grant SNE está vinculado a esta conta ainda. O estado de identidade continua legível.
                    </div>
                  </div>
                  <div className="rounded-lg p-4" style={{ backgroundColor: 'var(--bg-3)', borderWidth: '1px', borderColor: 'var(--stroke-1)' }}>
                    <div className="flex items-center gap-2 mb-2">
                      <Wallet className="w-4 h-4" style={{ color: 'var(--accent-orange)' }} />
                      <div className="font-semibold" style={{ color: 'var(--text-1)' }}>Próxima camada</div>
                    </div>
                    <div className="text-sm" style={{ color: 'var(--text-2)' }}>
                      Grants, dispositivos e revogações são gerenciados na camada de Chaves.
                    </div>
                  </div>
                </div>
              </div>
            </section>
          )}
        </div>
      </div>
    </div>
  );
}
