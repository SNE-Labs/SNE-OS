import { useMemo, type ReactNode } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAccount } from 'wagmi';
import { ArrowUpRight, CheckCircle2, Wallet, type LucideIcon } from 'lucide-react';

import { FieldSurface } from '../components/field/FieldSurface';
import { PageSignalFrame, SignalPanel } from '../components/motion/PageMotion';
import { LiFiSwapWidget } from '../components/swaps/LiFiSwapWidget';
import { getRadarSwapContext } from '../components/swaps/radarSwapPrefill';
import { WalletConnect } from '../components/passport/WalletConnect';
import { useKeysEntitlement } from '../../hooks/useKeysEntitlement';
import { getPreferredExecutionTarget, getRadarAssetByKey, getRadarAssetBySymbol } from '@/lib/assets/registry';
import { useSeoMeta } from '@/lib/seo/useSeoMeta';
import { DEFAULT_USDT_CHAIN_ID, MAJOR_USDT_WIDGET_CHAIN_IDS, getUsdtChainName } from '@/lib/usdt';
import { formatAddress } from '@/utils/format';

function parseChainId(value: string | null) {
  if (!value) return undefined;
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : undefined;
}

function normalizeWidgetChain(value?: number) {
  return value && MAJOR_USDT_WIDGET_CHAIN_IDS.includes(value) ? value : undefined;
}

function reviewItems(isConnected: boolean, executionMode?: string) {
  return [
    { label: isConnected ? 'Carteira online' : 'Carteira pendente', ready: isConnected },
    { label: 'Rede confirmada no motor', ready: true },
    { label: executionMode ?? 'Modo USDT-first ativo', ready: true },
    { label: 'Revisar slippage e endereço', ready: false },
  ];
}

export function Swaps() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { address, isConnected } = useAccount();
  const entitlementQuery = useKeysEntitlement(isConnected && address ? address : null);
  const entitlement = entitlementQuery.data;
  const isOwnerSession =
    Boolean(entitlement?.wallet) &&
    Boolean(entitlement?.ownerWallet) &&
    entitlement!.wallet!.toLowerCase() === entitlement!.ownerWallet!.toLowerCase();
  const isDelegateSession =
    Boolean(entitlement?.wallet) &&
    Boolean(entitlement?.delegateWallet) &&
    entitlement!.wallet!.toLowerCase() === entitlement!.delegateWallet!.toLowerCase();
  const radarContext = useMemo(() => getRadarSwapContext(searchParams), [searchParams]);
  const radarAsset = useMemo(
    () => getRadarAssetByKey(radarContext.assetKey) ?? getRadarAssetBySymbol(radarContext.symbol),
    [radarContext.assetKey, radarContext.symbol]
  );
  const executionTarget = useMemo(() => getPreferredExecutionTarget(radarAsset), [radarAsset]);

  const prefill = useMemo(() => {
    const explicitFromChain = normalizeWidgetChain(parseChainId(searchParams.get('fromChain')));
    const explicitToChain = normalizeWidgetChain(parseChainId(searchParams.get('toChain')));
    const fromChain = explicitFromChain ?? DEFAULT_USDT_CHAIN_ID;
    const toChain = explicitToChain ?? normalizeWidgetChain(executionTarget?.chainId);

    return {
      fromChain,
      toChain,
      fromToken: searchParams.get('fromToken') ?? undefined,
      toToken: searchParams.get('toToken') ?? executionTarget?.address,
      toAddress: address ?? searchParams.get('toAddress') ?? undefined,
    };
  }, [address, executionTarget?.address, executionTarget?.chainId, searchParams]);

  const executionModeLabel =
    radarAsset?.swapAvailability === 'proxy' ? 'Rota proxy preparada' : 'Execução direta pronta';
  const executionSurfaceLabel = radarAsset
    ? `${radarAsset.displaySymbol} em ${getUsdtChainName(prefill.toChain ?? executionTarget?.chainId)}`
    : getUsdtChainName(prefill.toChain);
  const operatorActive = Boolean(entitlement?.effectiveAccess);
  const operatorStatusLabel = !isConnected ? 'Discovery' : operatorActive ? 'Operator ativo' : 'Fee padrão';
  const feePolicyLabel = entitlement?.feePolicy?.label ?? (entitlement?.feeTier === 'operator_discount' ? 'Operator discount' : 'Standard');
  const accessNarrative = !isConnected
    ? 'Conecte a wallet para resolver a classe de acesso soberana antes da execução.'
    : operatorActive
      ? isDelegateSession
        ? 'Fee operator ativa por delegação válida do Key.'
        : isOwnerSession && entitlement?.delegateWallet
          ? `Fee operator ativa por posse direta. Delegate configurada para ${formatAddress(entitlement.delegateWallet)}.`
        : 'Fee operator ativa por posse direta do Key.'
      : 'Sem Operator Key efetivo. O rail continua disponível com fee padrão.';

  useSeoMeta({
    title: 'Mover USDT | SNE OS',
    description:
      'Rail de execução do SNE OS para usar USDT como saldo-base, mover entre redes e rotacionar para outros ativos.',
    canonicalPath: '/swaps',
    type: 'website',
    keywords: ['sne os swaps', 'usdt multichain', 'cross-chain usdt', 'digital dollar', 'multichain execution'],
    structuredData: {
      '@context': 'https://schema.org',
      '@type': 'WebPage',
      name: 'Mover USDT | SNE OS',
      description:
        'Rail de execução do SNE OS para usar USDT como saldo-base, mover entre redes e rotacionar para outros ativos.',
      url: 'https://snelabs.space/swaps',
    },
  });

  const checks = reviewItems(isConnected, executionModeLabel);

  return (
    <div className="flex flex-1 overflow-hidden">
      <div className="sne-mosaic-page flex-1 overflow-hidden px-3 py-3 lg:px-4 xl:px-6">
        <PageSignalFrame className="sne-mosaic-frame mx-auto flex h-full max-w-[1560px] flex-col">
          <SignalPanel className="mb-3 shrink-0">
            <FieldSurface
              as="header"
              motif="swap-engine"
              density="compact"
              surface="strip"
              className="flex flex-wrap items-end justify-between gap-3 rounded-[24px] px-4 py-3"
              style={{
                background: 'linear-gradient(135deg, rgba(255,140,66,0.065), rgba(255,255,255,0.014))',
                borderWidth: '1px',
                borderColor: 'rgba(255,255,255,0.08)',
              }}
            >
              <div className="min-w-0">
                <div className="mb-1 text-[10px] uppercase tracking-[0.2em]" style={{ color: 'var(--text-3)' }}>
                  Rail de execução
                </div>
                <h1 className="text-[22px] font-semibold tracking-[-0.03em]" style={{ color: 'var(--text-1)' }}>
                  {radarAsset ? `Executar ${radarAsset.displaySymbol}` : 'Mover USDT'}
                </h1>
                <p className="mt-1 max-w-[900px] text-xs leading-5" style={{ color: 'var(--text-2)' }}>
                  {radarAsset
                    ? `${radarAsset.executionHint} O motor usa USDT como base e abre a melhor rota de execução para ${radarAsset.displayName}.`
                    : 'Use seu saldo-base para converter, mover ou rotacionar entre redes e ativos sem sair da auto custódia.'}
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <StatusToken label={isConnected ? 'Carteira online' : 'Carteira pendente'} tone={isConnected ? 'success' : 'warning'} />
                <StatusToken label={getUsdtChainName(prefill.fromChain)} tone="neutral" />
                {radarContext.fromRadar ? <StatusToken label="Origem Radar" tone="neutral" /> : null}
                {radarAsset ? <StatusToken label={radarAsset.displaySymbol} tone="accent" /> : null}
                <StatusToken label={executionModeLabel} tone="accent" />
                <StatusToken label={operatorStatusLabel} tone={operatorActive ? 'success' : 'neutral'} />
              </div>
            </FieldSurface>
          </SignalPanel>

          <SignalPanel className="min-h-0 flex-1">
            <FieldSurface
              as="section"
              motif="swap-engine"
              density="compact"
              surface="hero"
              className="flex h-full min-h-0 flex-col rounded-[28px] border p-3 xl:p-4"
              style={{
                background:
                  'radial-gradient(circle at 14% -12%, rgba(255,140,66,0.07), transparent 24%), linear-gradient(180deg, rgba(255,255,255,0.026), rgba(255,255,255,0.01))',
                borderColor: 'rgba(255,255,255,0.075)',
                boxShadow: '0 18px 70px rgba(0,0,0,0.20), inset 0 1px 0 rgba(255,255,255,0.04)',
              }}
            >
              {radarContext.fromRadar ? (
                <div
                  className="mb-3 flex shrink-0 flex-wrap items-center justify-between gap-2 rounded-[18px] border px-3 py-2.5"
                  style={{
                    backgroundColor: 'rgba(255,140,66,0.06)',
                    borderColor: 'rgba(255,140,66,0.14)',
                  }}
                >
                  <div className="min-w-0">
                    <div className="text-[10px] uppercase tracking-[0.18em]" style={{ color: 'var(--accent-orange)' }}>
                      Leitura trazida do Radar
                    </div>
                    <div className="mt-1 text-xs" style={{ color: 'var(--text-1)' }}>
                      {radarAsset
                        ? `${radarAsset.displayName} entrou em foco antes da execução.`
                        : radarContext.symbol
                          ? `${radarContext.symbol} entrou em foco antes da execução.`
                          : 'O contexto veio do Radar antes da execução.'}
                    </div>
                  </div>
                  <button
                    onClick={() => navigate(radarContext.radarHref)}
                    className="shrink-0 rounded-full border px-3 py-1.5 text-[10px] uppercase tracking-[0.14em] transition-transform duration-200 hover:-translate-y-0.5"
                    style={{
                      color: 'var(--accent-orange)',
                      borderColor: 'rgba(255,140,66,0.18)',
                      backgroundColor: 'rgba(255,140,66,0.08)',
                    }}
                  >
                    Abrir Radar
                  </button>
                </div>
              ) : null}

              <div className="grid min-h-0 flex-1 gap-3 min-[1080px]:grid-cols-[minmax(0,1fr)_280px] min-[1320px]:grid-cols-[minmax(0,1fr)_292px]">
                <div className="flex min-h-0 flex-col">
                  <div className="mb-3 flex shrink-0 flex-wrap items-start justify-between gap-3 px-1">
                    <div className="min-w-0">
                      <div className="text-[10px] uppercase tracking-[0.18em]" style={{ color: 'var(--text-3)' }}>
                        Motor de execução
                      </div>
                      <div className="mt-1 text-base font-semibold tracking-[-0.02em]" style={{ color: 'var(--text-1)' }}>
                        {radarAsset ? `USDT entra e ${radarAsset.displaySymbol} sai do outro lado.` : 'O rail transforma saldo-base em execução.'}
                      </div>
                    </div>

                    <div
                      className="rounded-full border px-3 py-1 text-[9px] uppercase tracking-[0.14em]"
                      style={{
                        color: 'var(--accent-orange)',
                        borderColor: 'rgba(255,140,66,0.16)',
                        backgroundColor: 'rgba(255,140,66,0.08)',
                      }}
                    >
                      pronto para revisar
                    </div>
                  </div>

                  <div className="mb-3 grid shrink-0 gap-2 min-[1080px]:grid-cols-3">
                    <ExecutionNote
                      title="Origem"
                      detail={radarContext.fromRadar ? `${getUsdtChainName(prefill.fromChain)} com contexto trazido do Radar.` : `${getUsdtChainName(prefill.fromChain)} como saldo-base operacional.`}
                      tone="neutral"
                    />
                    <ExecutionNote
                      title="Destino"
                      detail={radarAsset ? `${executionSurfaceLabel} pronto para receber a execução.` : `${getUsdtChainName(prefill.toChain)} definido no motor.`}
                      tone="neutral"
                    />
                    <ExecutionNote
                      title="Classe"
                      detail={operatorActive ? `Operator ativo com ${feePolicyLabel}.` : 'Discovery ativo. Fee padrão até resolver entitlement.'}
                      tone={operatorActive ? 'success' : 'accent'}
                    />
                  </div>

                  <div className="min-h-0 flex-1">
                    <LiFiSwapWidget prefill={prefill} bare className="h-full min-h-[0]" />
                  </div>
                </div>

                <aside className="grid min-h-0 grid-rows-[auto_minmax(0,1fr)] gap-3">
                  <Panel title="Sessão de execução" icon={Wallet}>
                    <div className="space-y-3">
                      <div className="grid grid-cols-2 gap-2">
                        <Metric label="Classe" value={operatorActive ? 'Operator' : 'Discovery'} />
                        <Metric label="Fee" value={feePolicyLabel} />
                      </div>
                      <Metric label="Carteira" value={address ? formatAddress(address) : 'Conecte uma carteira'} />
                      <button
                        onClick={() => navigate('/keys')}
                        className="w-full rounded-2xl border px-4 py-3 text-left transition-transform duration-200 hover:-translate-y-0.5"
                        style={{ backgroundColor: 'var(--bg-2)', borderColor: 'var(--stroke-1)' }}
                      >
                        <div className="flex items-center justify-between gap-3">
                          <div>
                            <div className="text-sm font-medium" style={{ color: 'var(--text-1)' }}>
                              {operatorActive ? 'Gerenciar Keys' : 'Resolver Operator Key'}
                            </div>
                            <div className="mt-1 text-sm leading-5" style={{ color: 'var(--text-2)' }}>
                              Posse, delegação e fee tier vivem na camada soberana.
                            </div>
                          </div>
                          <ArrowUpRight className="h-4 w-4 shrink-0" style={{ color: 'var(--text-3)' }} />
                        </div>
                      </button>
                      <WalletConnect />
                    </div>
                  </Panel>

                  <Panel title="Revisão final" icon={ArrowUpRight}>
                    <div className="mb-3 grid grid-cols-2 gap-2">
                      <Metric label="Origem" value={getUsdtChainName(prefill.fromChain)} />
                      <Metric label="Rede alvo" value={getUsdtChainName(prefill.toChain)} />
                      <Metric label="Owner" value={entitlement?.ownerWallet ? formatAddress(entitlement.ownerWallet) : '--'} />
                      <Metric label="Delegate" value={entitlement?.delegateWallet ? formatAddress(entitlement.delegateWallet) : operatorActive ? 'Posse direta' : '--'} />
                    </div>
                    <div className="mb-3 rounded-2xl border px-3 py-3 text-sm leading-6" style={{ backgroundColor: 'var(--bg-2)', borderColor: 'var(--stroke-1)', color: 'var(--text-2)' }}>
                      {entitlementQuery.isLoading ? 'Resolvendo entitlement soberano para esta wallet.' : accessNarrative}
                    </div>
                    <div className="space-y-2">
                      {checks.map((item) => (
                        <div
                          key={item.label}
                          className="flex items-center justify-between gap-3 rounded-2xl border px-3 py-2.5"
                          style={{
                            backgroundColor: item.ready ? 'rgba(50,213,131,0.045)' : 'rgba(255,140,66,0.085)',
                            borderColor: item.ready ? 'rgba(50,213,131,0.11)' : 'rgba(255,140,66,0.24)',
                            color: item.ready ? 'var(--ok-green)' : 'var(--accent-orange)',
                          }}
                        >
                          <div className="flex min-w-0 items-center gap-2">
                            <CheckCircle2 className="h-4 w-4 shrink-0" />
                            <span className="truncate text-sm">{item.label}</span>
                          </div>
                          {!item.ready ? (
                            <span className="shrink-0 text-[9px] uppercase tracking-[0.16em]">
                              Ação
                            </span>
                          ) : null}
                        </div>
                      ))}
                    </div>
                    <button
                      onClick={() => navigate(radarContext.radarHref)}
                      className="mt-3 flex w-full items-center justify-between rounded-2xl border px-3 py-2.5 text-left transition-transform duration-200 hover:-translate-y-0.5"
                      style={{ backgroundColor: 'var(--bg-2)', borderColor: 'var(--stroke-1)' }}
                    >
                      <div className="min-w-0">
                        <div className="mb-1 text-[13px] font-medium" style={{ color: 'var(--text-1)' }}>
                          {radarAsset
                            ? `Voltar para ${radarAsset.displaySymbol} no Radar`
                            : radarContext.symbol
                              ? `Voltar para ${radarContext.symbol} no Radar`
                              : 'Voltar para o Radar'}
                        </div>
                        <div className="text-xs leading-5" style={{ color: 'var(--text-2)' }}>
                          Liquidez e regime revisados antes da execução.
                        </div>
                      </div>
                      <ArrowUpRight className="h-4 w-4 shrink-0" style={{ color: 'var(--text-3)' }} />
                    </button>
                  </Panel>
                </aside>
              </div>
            </FieldSurface>
          </SignalPanel>
        </PageSignalFrame>
      </div>
    </div>
  );
}

function StatusToken({ label, tone }: { label: string; tone: 'accent' | 'success' | 'warning' | 'neutral' }) {
  const styles = {
    accent: {
      color: 'var(--accent-orange)',
      backgroundColor: 'rgba(255,140,66,0.08)',
      borderColor: 'rgba(255,140,66,0.16)',
    },
    success: {
      color: 'var(--ok-green)',
      backgroundColor: 'rgba(50,213,131,0.08)',
      borderColor: 'rgba(50,213,131,0.14)',
    },
    warning: {
      color: 'var(--warn-amber)',
      backgroundColor: 'rgba(255,176,32,0.08)',
      borderColor: 'rgba(255,176,32,0.14)',
    },
    neutral: {
      color: 'var(--text-2)',
      backgroundColor: 'rgba(255,255,255,0.035)',
      borderColor: 'rgba(255,255,255,0.08)',
    },
  }[tone];

  return (
    <div className="rounded-full border px-2.5 py-1 text-[9px] uppercase tracking-[0.14em]" style={styles}>
      {label}
    </div>
  );
}

function Panel({
  title,
  icon: Icon,
  compact = false,
  children,
}: {
  title: string;
  icon: LucideIcon;
  compact?: boolean;
  children: ReactNode;
}) {
  return (
    <FieldSurface
      as="section"
      motif={compact ? 'execution-rail' : 'swap-engine'}
      density="compact"
      surface={compact ? 'strip' : 'rail'}
      className={`${compact ? 'rounded-[16px] p-2.5' : 'rounded-[18px] p-2.5'} border`}
      style={{
        background: compact
          ? 'linear-gradient(135deg, rgba(255,255,255,0.026), rgba(255,255,255,0.01))'
          : 'linear-gradient(135deg, rgba(255,255,255,0.04), rgba(255,255,255,0.014))',
        borderColor: compact ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.08)',
        boxShadow: compact ? 'none' : 'inset 0 1px 0 rgba(255,255,255,0.04)',
      }}
    >
      <div className="mb-3 flex items-center gap-2">
        <div
          className="flex h-7 w-7 items-center justify-center rounded-xl"
          style={{ backgroundColor: 'rgba(255,140,66,0.10)', color: 'var(--accent-orange)' }}
        >
          <Icon className="h-3.5 w-3.5" />
        </div>
        <div className="text-[10px] uppercase tracking-[0.16em]" style={{ color: 'var(--text-3)' }}>
          {title}
        </div>
      </div>
      {children}
    </FieldSurface>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div
      className="rounded-[14px] border p-2"
      style={{ backgroundColor: 'var(--bg-2)', borderColor: 'var(--stroke-1)' }}
    >
      <div className="mb-1 text-[9px] uppercase tracking-[0.14em]" style={{ color: 'var(--text-3)' }}>
        {label}
      </div>
      <div className="truncate text-[13px] font-medium" style={{ color: 'var(--text-1)' }}>
        {value}
      </div>
    </div>
  );
}

function ExecutionNote({
  title,
  detail,
  tone = 'neutral',
}: {
  title: string;
  detail: string;
  tone?: 'accent' | 'success' | 'neutral';
}) {
  const tones = {
    accent: {
      borderColor: 'rgba(255,140,66,0.16)',
      background: 'rgba(255,140,66,0.06)',
      titleColor: 'var(--accent-orange)',
    },
    success: {
      borderColor: 'rgba(50,213,131,0.16)',
      background: 'rgba(50,213,131,0.06)',
      titleColor: 'var(--ok-green)',
    },
    neutral: {
      borderColor: 'rgba(255,255,255,0.08)',
      background: 'rgba(255,255,255,0.025)',
      titleColor: 'var(--text-1)',
    },
  }[tone];

  return (
    <div
      className="rounded-[16px] border px-3 py-2.5"
      style={{
        borderColor: tones.borderColor,
        backgroundColor: tones.background,
      }}
    >
      <div className="text-[10px] uppercase tracking-[0.14em]" style={{ color: tones.titleColor }}>
        {title}
      </div>
      <div className="mt-1.5 text-[12px] leading-5" style={{ color: 'var(--text-2)' }}>
        {detail}
      </div>
    </div>
  );
}
