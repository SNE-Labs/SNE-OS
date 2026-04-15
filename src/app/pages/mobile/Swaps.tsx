import { useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAccount } from 'wagmi';
import { ArrowLeftRight, ArrowUpRight, BadgeCheck, Waves } from 'lucide-react';

import { Badge, MobileButton, MobilePageShell, SurfaceCard } from '../../components/mobile';
import { LiFiSwapWidget } from '../../components/swaps/LiFiSwapWidget';
import { useSeoMeta } from '@/lib/seo/useSeoMeta';
import { DEFAULT_USDT_CHAIN_ID, getUsdtChainName, getUsdtTokenAddress, normalizeSwapMode } from '@/lib/usdt';
import { formatAddress } from '@/utils/format';

function parseChainId(value: string | null) {
  if (!value) return undefined;
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : undefined;
}

function parseToken(value: string | null) {
  const normalized = `${value || ''}`.trim();
  return normalized || undefined;
}

export function MobileSwaps() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { address, isConnected } = useAccount();
  const mode = normalizeSwapMode(searchParams.get('mode'));

  const prefill = useMemo(() => {
    const explicitFromChain = parseChainId(searchParams.get('fromChain'));
    const explicitToChain = parseChainId(searchParams.get('toChain'));
    const fromChain = explicitFromChain ?? (mode === 'advanced' ? undefined : DEFAULT_USDT_CHAIN_ID);
    const toChain = explicitToChain;
    const fromUsdt = getUsdtTokenAddress(fromChain);
    const toUsdt = getUsdtTokenAddress(toChain);

    return {
      fromChain,
      toChain,
      fromToken: parseToken(searchParams.get('fromToken')) ?? (mode === 'to-usdt' ? undefined : fromUsdt),
      toToken: parseToken(searchParams.get('toToken')) ?? (mode === 'move' || mode === 'to-usdt' ? toUsdt : undefined),
      toAddress: address ?? parseToken(searchParams.get('toAddress')),
    };
  }, [address, mode, searchParams]);

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
      subtitle="Execucao USDT-first para mover, converter ou usar dolar digital pela wallet."
      statusPill={{
        label: isConnected ? 'wallet online' : 'wallet pending',
        variant: isConnected ? 'success' : 'orange',
      }}
    >
      <SurfaceCard variant="elevated">
        <div className="mb-3 flex items-start justify-between gap-3">
          <div>
            <div className="mb-1 text-[var(--text-1)]">USDT como unidade base.</div>
            <div className="text-sm text-[var(--text-2)]">
              O saldo segue on-chain. Esta tela prepara a rota e a wallet confirma a execucao.
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
            <div className="mb-1 text-[var(--text-1)]">Radar continua em leitura</div>
            <div className="text-sm text-[var(--text-2)]">Use Radar para validar regime, liquidez e direcao antes da execucao.</div>
          </div>
          <div className="rounded-xl bg-[var(--bg-2)] border border-[var(--stroke-1)] p-3">
            <div className="mb-1 flex items-center gap-2 text-[var(--text-1)]">
              <BadgeCheck className="h-4 w-4 text-[var(--accent-orange)]" />
              <span>Antes de assinar</span>
            </div>
            <div className="text-sm text-[var(--text-2)]">
              Confira rede, token, cotacao, slippage e endereco final antes de confirmar na wallet.
            </div>
          </div>
        </div>
      </SurfaceCard>

      <MobileButton variant="secondary" className="w-full" onClick={() => navigate('/radar')}>
        <ArrowUpRight className="mr-2 h-4 w-4" />
        Abrir Radar
      </MobileButton>
    </MobilePageShell>
  );
}
