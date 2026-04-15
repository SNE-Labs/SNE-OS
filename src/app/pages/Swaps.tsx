import { useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAccount } from 'wagmi';
import { ArrowLeftRight, ArrowUpRight, Sparkles, Wallet } from 'lucide-react';

import { LiFiSwapWidget } from '../components/swaps/LiFiSwapWidget';
import { WalletConnect } from '../components/passport/WalletConnect';
import { useSeoMeta } from '@/lib/seo/useSeoMeta';
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

export function Swaps() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { address, isConnected } = useAccount();

  const prefill = useMemo(
    () => ({
      fromChain: parseChainId(searchParams.get('fromChain')),
      toChain: parseChainId(searchParams.get('toChain')),
      fromToken: parseToken(searchParams.get('fromToken')),
      toToken: parseToken(searchParams.get('toToken')),
      toAddress: address ?? parseToken(searchParams.get('toAddress')),
    }),
    [address, searchParams]
  );

  useSeoMeta({
    title: 'Swaps | SNE OS',
    description:
      'Superficie de execucao do SNE OS com LI.FI para swap e bridge multichain a partir da wallet conectada.',
    canonicalPath: '/swaps',
    type: 'website',
    keywords: ['sne os swaps', 'lifi widget', 'cross-chain swap', 'bridge crypto', 'multichain execution'],
    structuredData: {
      '@context': 'https://schema.org',
      '@type': 'WebPage',
      name: 'Swaps | SNE OS',
      description:
        'Superficie de execucao do SNE OS com LI.FI para swap e bridge multichain a partir da wallet conectada.',
      url: 'https://snelabs.space/swaps',
    },
  });

  return (
    <div className="flex flex-1">
      <div className="flex-1 overflow-y-auto px-6 py-6 xl:px-8">
        <div className="mx-auto max-w-[1480px] space-y-5">
          <section
            className="overflow-hidden rounded-[28px] p-5"
            style={{
              background:
                'radial-gradient(circle at top left, rgba(255,140,66,0.18), transparent 32%), radial-gradient(circle at 88% 14%, rgba(85,140,255,0.08), transparent 18%), linear-gradient(180deg, rgba(255,255,255,0.02), rgba(0,0,0,0.04))',
              backgroundColor: 'var(--bg-2)',
              borderWidth: '1px',
              borderColor: 'var(--stroke-1)',
              boxShadow: 'var(--shadow-1)',
            }}
          >
            <div className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1.08fr)_360px]">
              <div className="min-w-0">
                <div className="mb-3 flex flex-wrap items-center gap-2">
                  <div
                    className="inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs uppercase tracking-[0.18em]"
                    style={{ backgroundColor: 'rgba(255,255,255,0.04)', color: 'var(--text-3)' }}
                  >
                    <ArrowLeftRight className="h-3.5 w-3.5" />
                    Swaps
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1fr)_320px]">
                  <div className="min-w-0">
                    <h1 className="mb-2 text-3xl font-semibold leading-tight" style={{ color: 'var(--text-1)' }}>
                      Execucao multichain, sem confundir o papel do Radar.
                    </h1>
                    <p className="max-w-3xl text-sm leading-6" style={{ color: 'var(--text-2)' }}>
                      O Radar continua lendo liquidez, regime e direcao. O modulo Swaps executa a rota quando a tese ja
                      esta validada. A superficie abaixo usa a LI.FI como camada de swap e bridge.
                    </p>
                  </div>

                  <div
                    className="rounded-[24px] p-4"
                    style={{
                      backgroundColor: 'rgba(8,10,16,0.28)',
                      borderWidth: '1px',
                      borderColor: 'rgba(255,255,255,0.06)',
                    }}
                  >
                    <div className="mb-3 flex items-start justify-between gap-3">
                      <div>
                        <div className="text-sm font-semibold" style={{ color: 'var(--text-1)' }}>
                          Superficie ativa
                        </div>
                        <div className="text-sm" style={{ color: 'var(--text-2)' }}>
                          Rota de swap pronta para a wallet conectada.
                        </div>
                      </div>
                      <div
                        className="rounded-full px-2.5 py-1 text-[11px] uppercase tracking-[0.16em]"
                        style={{
                          backgroundColor: isConnected ? 'rgba(34,197,94,0.12)' : 'rgba(255,140,66,0.12)',
                          color: isConnected ? 'var(--ok-green)' : 'var(--accent-orange)',
                        }}
                      >
                        {isConnected ? 'wallet online' : 'wallet pending'}
                      </div>
                    </div>

                    <div className="space-y-3">
                      <div
                        className="rounded-2xl p-3"
                        style={{ backgroundColor: 'var(--bg-2)', borderWidth: '1px', borderColor: 'var(--stroke-1)' }}
                      >
                        <div className="mb-1 text-[11px] uppercase tracking-[0.18em]" style={{ color: 'var(--text-3)' }}>
                          Destino padrao
                        </div>
                        <div className="text-sm font-medium break-all" style={{ color: 'var(--text-1)' }}>
                          {prefill.toAddress ? formatAddress(prefill.toAddress) : 'Endereco da wallet conectada'}
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div
                          className="rounded-2xl p-3"
                          style={{ backgroundColor: 'var(--bg-2)', borderWidth: '1px', borderColor: 'var(--stroke-1)' }}
                        >
                          <div className="mb-1 text-[11px] uppercase tracking-[0.18em]" style={{ color: 'var(--text-3)' }}>
                            Origem
                          </div>
                          <div className="text-sm font-medium" style={{ color: 'var(--text-1)' }}>
                            {prefill.fromChain ?? '--'}
                          </div>
                        </div>
                        <div
                          className="rounded-2xl p-3"
                          style={{ backgroundColor: 'var(--bg-2)', borderWidth: '1px', borderColor: 'var(--stroke-1)' }}
                        >
                          <div className="mb-1 text-[11px] uppercase tracking-[0.18em]" style={{ color: 'var(--text-3)' }}>
                            Destino
                          </div>
                          <div className="text-sm font-medium" style={{ color: 'var(--text-1)' }}>
                            {prefill.toChain ?? '--'}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div
                className="rounded-[24px] p-4"
                style={{ backgroundColor: 'var(--bg-3)', borderWidth: '1px', borderColor: 'var(--stroke-1)' }}
              >
                <div className="mb-4 flex items-start gap-3">
                  <div
                    className="flex h-11 w-11 items-center justify-center rounded-2xl"
                    style={{ backgroundColor: 'rgba(255,140,66,0.12)', color: 'var(--accent-orange)' }}
                  >
                    <Wallet className="h-5 w-5" />
                  </div>
                  <div className="min-w-0">
                    <div className="mb-1 text-sm font-semibold break-all" style={{ color: 'var(--text-1)' }}>
                      {address ? formatAddress(address) : 'Conecte uma wallet'}
                    </div>
                    <div className="text-sm" style={{ color: 'var(--text-2)' }}>
                      Use a wallet do workspace para assinar a execucao final.
                    </div>
                  </div>
                </div>

                <WalletConnect />

                <div className="mt-4 space-y-3">
                  <button
                    onClick={() => navigate('/radar')}
                    className="flex w-full items-center justify-between rounded-2xl px-4 py-3 text-left"
                    style={{ backgroundColor: 'var(--bg-2)', borderWidth: '1px', borderColor: 'var(--stroke-1)' }}
                  >
                    <div>
                      <div className="mb-1 text-sm font-medium" style={{ color: 'var(--text-1)' }}>
                        Voltar para o Radar
                      </div>
                      <div className="text-sm" style={{ color: 'var(--text-2)' }}>
                        Revalidar liquidez e regime antes de executar.
                      </div>
                    </div>
                    <ArrowUpRight className="h-4 w-4" style={{ color: 'var(--text-3)' }} />
                  </button>

                  <div
                    className="rounded-2xl p-4"
                    style={{ backgroundColor: 'var(--bg-2)', borderWidth: '1px', borderColor: 'var(--stroke-1)' }}
                  >
                    <div className="mb-2 flex items-center gap-2">
                      <Sparkles className="h-4 w-4" style={{ color: 'var(--accent-orange)' }} />
                      <div className="text-sm font-medium" style={{ color: 'var(--text-1)' }}>
                        Execucao assistida
                      </div>
                    </div>
                    <div className="text-sm leading-6" style={{ color: 'var(--text-2)' }}>
                      Quando a rota vier do Radar, o ativo de destino pode chegar pre-selecionado. Antes de assinar,
                      revise rede, token, cotacao, slippage e endereco final dentro do widget.
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>

          <section className="grid grid-cols-1">
            <div className="min-w-0">
              <LiFiSwapWidget prefill={prefill} />
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
