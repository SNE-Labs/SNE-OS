import { useMemo, type ReactNode } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAccount } from 'wagmi';
import { ArrowUpRight, CheckCircle2, CircleDot, KeyRound, ShieldCheck, Wallet, type LucideIcon } from 'lucide-react';

import { FieldSurface } from '../components/field/FieldSurface';
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
    <div className="flex flex-1">
      <div className="flex-1 overflow-y-auto px-6 py-5 xl:px-8">
        <div className="mx-auto max-w-[1600px] space-y-4">
          <FieldSurface
            as="header"
            motif="swap-engine"
            density="compact"
            surface="strip"
            className="flex flex-wrap items-end justify-between gap-4 rounded-[28px] px-5 py-5"
            style={{
              background: 'linear-gradient(135deg, rgba(255,140,66,0.065), rgba(255,255,255,0.014))',
              borderWidth: '1px',
              borderColor: 'rgba(255,255,255,0.08)',
            }}
          >
            <div className="min-w-0">
              <div className="mb-2 text-[11px] uppercase tracking-[0.22em]" style={{ color: 'var(--text-3)' }}>
                Rail de execução
              </div>
              <h1 className="text-2xl font-semibold tracking-[-0.035em]" style={{ color: 'var(--text-1)' }}>
                {radarAsset ? `Executar ${radarAsset.displaySymbol}` : 'Mover USDT'}
              </h1>
              <p className="mt-1 max-w-2xl text-sm leading-6" style={{ color: 'var(--text-2)' }}>
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

          <main className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_332px] 2xl:grid-cols-[minmax(0,1fr)_340px]">
            <FieldSurface
              as="section"
              motif="swap-engine"
              density="compact"
              surface="panel"
              className="min-w-0 rounded-[30px] border p-3 lg:p-4"
              style={{
                background:
                  'radial-gradient(circle at 14% -12%, rgba(255,140,66,0.07), transparent 24%), linear-gradient(180deg, rgba(255,255,255,0.026), rgba(255,255,255,0.01))',
                borderColor: 'rgba(255,255,255,0.075)',
                boxShadow: '0 18px 70px rgba(0,0,0,0.20), inset 0 1px 0 rgba(255,255,255,0.04)',
              }}
            >
              {radarContext.fromRadar ? (
                <div
                  className="mb-3 flex flex-wrap items-center justify-between gap-3 rounded-[24px] border px-4 py-3"
                  style={{
                    backgroundColor: 'rgba(255,140,66,0.06)',
                    borderColor: 'rgba(255,140,66,0.14)',
                  }}
                >
                  <div className="min-w-0">
                    <div className="text-[11px] uppercase tracking-[0.2em]" style={{ color: 'var(--accent-orange)' }}>
                      Leitura trazida do Radar
                    </div>
                    <div className="mt-1 text-sm" style={{ color: 'var(--text-1)' }}>
                      {radarAsset
                        ? `${radarAsset.displayName} entrou em foco antes da execução.`
                        : radarContext.symbol
                          ? `${radarContext.symbol} entrou em foco antes da execução.`
                          : 'O contexto veio do Radar antes da execução.'}
                    </div>
                    <div className="mt-1 text-sm leading-6" style={{ color: 'var(--text-2)' }}>
                      {radarAsset?.executionHint ?? 'Mantenha a rota curta: revise cotação, rede e assinatura sem perder o ativo em leitura.'}
                    </div>
                  </div>
                  <button
                    onClick={() => navigate(radarContext.radarHref)}
                    className="shrink-0 rounded-full border px-3 py-2 text-[11px] uppercase tracking-[0.16em] transition-transform duration-200 hover:-translate-y-0.5"
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

              <div className="mb-2 flex items-center justify-between gap-3 px-1">
                <div>
                  <div className="text-[11px] uppercase tracking-[0.2em]" style={{ color: 'var(--text-3)' }}>
                    Motor de execução
                  </div>
                  <div className="mt-1 text-sm" style={{ color: 'var(--text-2)' }}>
                    {radarAsset
                      ? `USDT entra como unidade operacional. O motor converte saldo em ${radarAsset.displaySymbol} pela rota compatível.`
                      : 'USDT entra como unidade operacional. O motor transforma saldo em execução.'}
                  </div>
                </div>
                <div
                  className="hidden rounded-full border px-3 py-1.5 text-[10px] uppercase tracking-[0.16em] lg:block"
                  style={{
                    color: 'var(--accent-orange)',
                    borderColor: 'rgba(255,140,66,0.16)',
                    backgroundColor: 'rgba(255,140,66,0.08)',
                  }}
                >
                  pronto para revisar
                </div>
              </div>

              <LiFiSwapWidget prefill={prefill} className="min-h-[660px]" />
            </FieldSurface>

            <aside className="space-y-3">
              <Panel title="Conta" icon={Wallet}>
                <div className="space-y-3">
                  <div>
                    <div className="text-[11px] uppercase tracking-[0.18em]" style={{ color: 'var(--text-3)' }}>
                      Carteira
                    </div>
                    <div className="mt-1 break-all text-sm font-medium" style={{ color: 'var(--text-1)' }}>
                      {address ? formatAddress(address) : 'Conecte uma carteira'}
                    </div>
                  </div>
                  <div className="text-sm leading-6" style={{ color: 'var(--text-2)' }}>
                    A conta permanece na sua carteira. O OS só organiza contexto, rota e assinatura.
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <Metric label="Classe" value={operatorActive ? 'Operator' : 'Discovery'} />
                    <Metric label="Fee" value={feePolicyLabel} />
                  </div>
                  <div className="text-sm leading-6" style={{ color: 'var(--text-2)' }}>
                    {accessNarrative}
                  </div>
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
                          Posse, delegação e fee tier vivem na camada soberana de Keys.
                        </div>
                      </div>
                      <ArrowUpRight className="h-4 w-4 shrink-0" style={{ color: 'var(--text-3)' }} />
                    </div>
                  </button>
                  <WalletConnect />
                </div>
              </Panel>

              <Panel title="Entitlement" icon={KeyRound}>
                <div className="grid grid-cols-2 gap-3">
                  <Metric label="Owner" value={entitlement?.ownerWallet ? formatAddress(entitlement.ownerWallet) : '--'} />
                  <Metric label="Delegate" value={entitlement?.delegateWallet ? formatAddress(entitlement.delegateWallet) : operatorActive ? 'Posse direta' : '--'} />
                </div>
                <div className="mt-3 rounded-2xl border px-3 py-3 text-sm leading-6" style={{ backgroundColor: 'var(--bg-2)', borderColor: 'var(--stroke-1)', color: 'var(--text-2)' }}>
                  {entitlementQuery.isLoading
                    ? 'Resolvendo entitlement soberano para esta wallet.'
                    : accessNarrative}
                </div>
              </Panel>

              <Panel title="Rota" icon={CircleDot}>
                <div className="grid grid-cols-2 gap-3">
                  <Metric label="Origem" value={getUsdtChainName(prefill.fromChain)} />
                  <Metric label="Rede alvo" value={getUsdtChainName(prefill.toChain)} />
                </div>
                <div className="mt-3">
                  <Metric label="Endereço alvo" value={prefill.toAddress ? formatAddress(prefill.toAddress) : 'Carteira conectada'} />
                </div>
                {radarAsset ? (
                  <div className="mt-3 grid grid-cols-2 gap-3">
                    <Metric label="Ativo alvo" value={radarAsset.displaySymbol} />
                    <Metric label="Execução" value={executionSurfaceLabel} />
                  </div>
                ) : null}
                {radarAsset?.executionHint ? (
                  <div className="mt-3 rounded-2xl border px-3 py-3 text-sm leading-6" style={{ backgroundColor: 'var(--bg-2)', borderColor: 'var(--stroke-1)', color: 'var(--text-2)' }}>
                    {radarAsset.executionHint}
                  </div>
                ) : null}
              </Panel>

              <Panel title="Revisão" icon={ShieldCheck}>
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
              </Panel>

              <Panel title="Origem da decisão" icon={ArrowUpRight} compact>
                <button
                  onClick={() => navigate(radarContext.radarHref)}
                  className="flex w-full items-center justify-between rounded-2xl border px-4 py-3 text-left transition-transform duration-200 hover:-translate-y-0.5"
                  style={{ backgroundColor: 'var(--bg-2)', borderColor: 'var(--stroke-1)' }}
                >
                  <div>
                    <div className="mb-1 text-sm font-medium" style={{ color: 'var(--text-1)' }}>
                      {radarAsset
                        ? `Voltar para ${radarAsset.displaySymbol} no Radar`
                        : radarContext.symbol
                          ? `Voltar para ${radarContext.symbol} no Radar`
                          : 'Voltar para o Radar'}
                    </div>
                    <div className="text-sm leading-5" style={{ color: 'var(--text-2)' }}>
                      {radarContext.fromRadar
                        ? 'Retome a leitura do mesmo ativo com regime, liquidez e risco no mesmo trilho.'
                        : 'Liquidez e regime revisados antes da execução.'}
                    </div>
                  </div>
                  <ArrowUpRight className="h-4 w-4 shrink-0" style={{ color: 'var(--text-3)' }} />
                </button>
              </Panel>
            </aside>
          </main>
        </div>
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
    <div className="rounded-full border px-3 py-1.5 text-[10px] uppercase tracking-[0.16em]" style={styles}>
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
      className={`${compact ? 'rounded-[24px] p-3.5' : 'rounded-[26px] p-4'} border`}
      style={{
        background: compact
          ? 'linear-gradient(135deg, rgba(255,255,255,0.026), rgba(255,255,255,0.01))'
          : 'linear-gradient(135deg, rgba(255,255,255,0.04), rgba(255,255,255,0.014))',
        borderColor: compact ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.08)',
        boxShadow: compact ? 'none' : 'inset 0 1px 0 rgba(255,255,255,0.04)',
      }}
    >
      <div className="mb-4 flex items-center gap-2">
        <div
          className="flex h-8 w-8 items-center justify-center rounded-2xl"
          style={{ backgroundColor: 'rgba(255,140,66,0.10)', color: 'var(--accent-orange)' }}
        >
          <Icon className="h-4 w-4" />
        </div>
        <div className="text-[11px] uppercase tracking-[0.18em]" style={{ color: 'var(--text-3)' }}>
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
      className="rounded-2xl border p-3"
      style={{ backgroundColor: 'var(--bg-2)', borderColor: 'var(--stroke-1)' }}
    >
      <div className="mb-1 text-[10px] uppercase tracking-[0.16em]" style={{ color: 'var(--text-3)' }}>
        {label}
      </div>
      <div className="truncate text-sm font-medium" style={{ color: 'var(--text-1)' }}>
        {value}
      </div>
    </div>
  );
}
