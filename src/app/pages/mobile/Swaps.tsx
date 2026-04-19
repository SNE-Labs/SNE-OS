import { useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAccount } from 'wagmi';
import { ArrowLeftRight, ArrowUpRight, BadgeCheck, KeyRound, Waves } from 'lucide-react';

import { Badge, MobileButton, MobilePageShell, SurfaceCard } from '../../components/mobile';
import { LiFiSwapWidget } from '../../components/swaps/LiFiSwapWidget';
import { getRadarSwapContext } from '../../components/swaps/radarSwapPrefill';
import { useKeysEntitlement } from '../../../hooks/useKeysEntitlement';
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

export function MobileSwaps() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { address, isConnected } = useAccount();
  const entitlementQuery = useKeysEntitlement(isConnected && address ? address : null);
  const entitlement = entitlementQuery.data;
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
    radarAsset?.swapAvailability === 'proxy' ? 'rota proxy pronta' : 'execucao direta pronta';
  const operatorActive = Boolean(entitlement?.effectiveAccess);
  const feePolicyLabel = entitlement?.feePolicy?.label ?? (entitlement?.feeTier === 'operator_discount' ? 'Operator discount' : 'Standard');
  const accessNarrative = !isConnected
    ? 'Conecte a wallet para resolver a classe de acesso soberana antes da execução.'
    : operatorActive
      ? entitlement?.delegateWallet
        ? 'Fee operator ativa por delegação válida do Key.'
        : 'Fee operator ativa por posse direta do Key.'
      : 'Sem Operator Key efetivo. O rail continua disponível com fee padrão.';

  useSeoMeta({
    title: 'Swaps | SNE OS',
    description:
      'Superficie de execucao do SNE OS para mover, converter e usar USDT em ambiente multichain.',
    canonicalPath: '/swaps',
    type: 'website',
    keywords: ['sne os swaps', 'usdt multichain', 'cross-chain usdt', 'digital dollar', 'multichain execution'],
  });

  return (
    <MobilePageShell
      title="Swaps"
      subtitle={
        radarContext.fromRadar
          ? `Execucao USDT-first com ${radarAsset?.displaySymbol ?? radarContext.symbol ?? 'ativo em foco'} vindo do Radar.`
          : 'Execucao USDT-first para mover, converter ou usar dolar digital pela wallet.'
      }
      statusPill={{
        label: operatorActive ? 'operator active' : radarContext.fromRadar ? executionModeLabel : isConnected ? 'wallet online' : 'wallet pending',
        variant: operatorActive || isConnected ? 'success' : 'orange',
      }}
    >
      {radarContext.fromRadar ? (
        <SurfaceCard>
          <div className="mb-2 flex items-center justify-between gap-3">
            <div>
              <div className="text-[10px] uppercase tracking-[0.16em] text-[var(--accent-orange)]">leitura trazida do radar</div>
              <div className="mt-1 text-[var(--text-1)]">
                {radarAsset
                  ? `${radarAsset.displayName} segue em foco antes da assinatura.`
                  : radarContext.symbol
                    ? `${radarContext.symbol} segue em foco antes da assinatura.`
                    : 'O contexto do Radar segue ativo antes da assinatura.'}
              </div>
            </div>
            {radarAsset ? <Badge variant="orange" size="sm">{radarAsset.displaySymbol}</Badge> : null}
          </div>
          <div className="text-sm text-[var(--text-2)]">
            {radarAsset?.executionHint ?? 'Revise rota, cotacao e endereco final sem perder o ativo que trouxe voce ate a execucao.'}
          </div>
        </SurfaceCard>
      ) : null}

      <SurfaceCard variant="elevated">
        <div className="mb-3 flex items-start justify-between gap-3">
          <div>
            <div className="mb-1 text-[var(--text-1)]">
              {radarAsset ? `${radarAsset.displaySymbol} como alvo de execucao.` : 'USDT como unidade base.'}
            </div>
            <div className="text-sm text-[var(--text-2)]">
              {radarAsset
                ? `${radarAsset.executionHint} O saldo segue on-chain e a wallet confirma a execucao.`
                : 'O saldo segue on-chain. Esta tela prepara a rota e a wallet confirma a execucao.'}
            </div>
          </div>
          <ArrowLeftRight className="h-5 w-5 text-[var(--accent-orange)]" />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-xl bg-[var(--bg-2)] border border-[var(--stroke-1)] p-3">
            <div className="mb-1 text-[10px] uppercase text-[var(--text-3)]">Origem</div>
            <div className="text-[var(--text-1)]">{getUsdtChainName(prefill.fromChain)}</div>
          </div>
          <div className="rounded-xl bg-[var(--bg-2)] border border-[var(--stroke-1)] p-3">
            <div className="mb-1 text-[10px] uppercase text-[var(--text-3)]">Destino</div>
            <div className="text-[var(--text-1)]">{getUsdtChainName(prefill.toChain)}</div>
          </div>
        </div>

        <div className="mt-3 flex items-center justify-between gap-3 rounded-xl bg-[var(--bg-2)] border border-[var(--stroke-1)] p-3">
          <div className="min-w-0">
            <div className="mb-1 text-[10px] uppercase text-[var(--text-3)]">Endereco final</div>
            <div className="text-sm text-[var(--text-1)] break-all">
              {prefill.toAddress ? formatAddress(prefill.toAddress) : 'Wallet conectada'}
            </div>
          </div>
          {isConnected ? <Badge variant="success" size="sm">ready</Badge> : <Badge variant="orange" size="sm">connect</Badge>}
        </div>

        {radarAsset ? (
          <div className="mt-3 grid grid-cols-2 gap-3">
            <div className="rounded-xl bg-[var(--bg-2)] border border-[var(--stroke-1)] p-3">
              <div className="mb-1 text-[10px] uppercase text-[var(--text-3)]">Ativo alvo</div>
              <div className="text-[var(--text-1)]">{radarAsset.displaySymbol}</div>
            </div>
            <div className="rounded-xl bg-[var(--bg-2)] border border-[var(--stroke-1)] p-3">
              <div className="mb-1 text-[10px] uppercase text-[var(--text-3)]">Execucao</div>
              <div className="text-[var(--text-1)]">{getUsdtChainName(prefill.toChain ?? executionTarget?.chainId)}</div>
            </div>
          </div>
        ) : null}
      </SurfaceCard>

      <SurfaceCard>
        <div className="mb-3 flex items-center gap-2 text-[var(--text-1)]">
          <KeyRound className="h-4 w-4 text-[var(--accent-orange)]" />
          <span>Entitlement</span>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-xl bg-[var(--bg-2)] border border-[var(--stroke-1)] p-3">
            <div className="mb-1 text-[10px] uppercase text-[var(--text-3)]">Classe</div>
            <div className="text-[var(--text-1)]">{operatorActive ? 'Operator' : 'Discovery'}</div>
          </div>
          <div className="rounded-xl bg-[var(--bg-2)] border border-[var(--stroke-1)] p-3">
            <div className="mb-1 text-[10px] uppercase text-[var(--text-3)]">Fee</div>
            <div className="text-[var(--text-1)]">{feePolicyLabel}</div>
          </div>
          <div className="rounded-xl bg-[var(--bg-2)] border border-[var(--stroke-1)] p-3">
            <div className="mb-1 text-[10px] uppercase text-[var(--text-3)]">Owner</div>
            <div className="text-sm text-[var(--text-1)] break-all">
              {entitlement?.ownerWallet ? formatAddress(entitlement.ownerWallet) : '--'}
            </div>
          </div>
          <div className="rounded-xl bg-[var(--bg-2)] border border-[var(--stroke-1)] p-3">
            <div className="mb-1 text-[10px] uppercase text-[var(--text-3)]">Delegate</div>
            <div className="text-sm text-[var(--text-1)] break-all">
              {entitlement?.delegateWallet ? formatAddress(entitlement.delegateWallet) : operatorActive ? 'Posse direta' : '--'}
            </div>
          </div>
        </div>

        <div className="mt-3 text-sm text-[var(--text-2)]">
          {entitlementQuery.isLoading ? 'Resolvendo entitlement soberano para esta wallet.' : accessNarrative}
        </div>

        <MobileButton variant="secondary" className="mt-4 w-full" onClick={() => navigate('/keys')}>
          <ArrowUpRight className="mr-2 h-4 w-4" />
          {operatorActive ? 'Gerenciar Keys' : 'Resolver Operator Key'}
        </MobileButton>
      </SurfaceCard>

      <SurfaceCard className="overflow-hidden">
        <LiFiSwapWidget prefill={prefill} compact />
      </SurfaceCard>

      <SurfaceCard>
        <div className="mb-3 flex items-center gap-2 text-[var(--text-1)]">
          <Waves className="h-4 w-4 text-[var(--accent-orange)]" />
          <span>Fluxo operacional</span>
        </div>

        <div className="space-y-3">
          <div className="rounded-xl bg-[var(--bg-2)] border border-[var(--stroke-1)] p-3">
            <div className="mb-1 text-[var(--text-1)]">
              {radarAsset
                ? `${radarAsset.displaySymbol} continua em leitura`
                : radarContext.symbol
                  ? `${radarContext.symbol} continua em leitura`
                  : 'Radar continua em leitura'}
            </div>
            <div className="text-sm text-[var(--text-2)]">
              {radarContext.fromRadar
                ? 'Retorne ao mesmo ativo para revalidar regime, liquidez e direcao se a rota mudar.'
                : 'Use Radar para validar regime, liquidez e direcao antes da execucao.'}
            </div>
          </div>
          <div className="rounded-xl bg-[var(--bg-2)] border border-[var(--stroke-1)] p-3">
            <div className="mb-1 flex items-center gap-2 text-[var(--text-1)]">
              <BadgeCheck className="h-4 w-4 text-[var(--accent-orange)]" />
              <span>Antes de assinar</span>
            </div>
            <div className="text-sm text-[var(--text-2)]">
              Confira rede, cotacao, slippage e endereco final antes de confirmar na wallet.
            </div>
          </div>
        </div>
      </SurfaceCard>

      <MobileButton variant="secondary" className="w-full" onClick={() => navigate(radarContext.radarHref)}>
        <ArrowUpRight className="mr-2 h-4 w-4" />
        {radarAsset ? `Voltar para ${radarAsset.displaySymbol}` : radarContext.symbol ? `Voltar para ${radarContext.symbol}` : 'Abrir Radar'}
      </MobileButton>
    </MobilePageShell>
  );
}
