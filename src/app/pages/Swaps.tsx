import { useMemo, type ReactNode } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAccount } from 'wagmi';
import { ArrowUpRight, CheckCircle2, CircleDot, ShieldCheck, Wallet, type LucideIcon } from 'lucide-react';

import { LiFiSwapWidget } from '../components/swaps/LiFiSwapWidget';
import { WalletConnect } from '../components/passport/WalletConnect';
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

function reviewItems(isConnected: boolean) {
  return [
    { label: isConnected ? 'Carteira online' : 'Carteira pendente', ready: isConnected },
    { label: 'Rede confirmada no motor', ready: true },
    { label: 'Modo USDT-first ativo', ready: true },
    { label: 'Revisar slippage e endereço', ready: false },
  ];
}

export function Swaps() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { address, isConnected } = useAccount();

  const prefill = useMemo(() => {
    const explicitFromChain = normalizeWidgetChain(parseChainId(searchParams.get('fromChain')));
    const explicitToChain = normalizeWidgetChain(parseChainId(searchParams.get('toChain')));
    const fromChain = explicitFromChain ?? DEFAULT_USDT_CHAIN_ID;
    const toChain = explicitToChain;

    return {
      fromChain,
      toChain,
      toAddress: address ?? searchParams.get('toAddress') ?? undefined,
    };
  }, [address, searchParams]);

  useSeoMeta({
    title: 'Swaps | SNE OS',
    description:
      'Superfície de execução do SNE OS para mover, converter e usar USDT em ambiente multichain.',
    canonicalPath: '/swaps',
    type: 'website',
    keywords: ['sne os swaps', 'usdt multichain', 'cross-chain usdt', 'digital dollar', 'multichain execution'],
    structuredData: {
      '@context': 'https://schema.org',
      '@type': 'WebPage',
      name: 'Swaps | SNE OS',
      description:
        'Superfície de execução do SNE OS para mover, converter e usar USDT em ambiente multichain.',
      url: 'https://snelabs.space/swaps',
    },
  });

  const checks = reviewItems(isConnected);

  return (
    <div className="flex flex-1">
      <div className="flex-1 overflow-y-auto px-6 py-5 xl:px-8">
        <div className="mx-auto max-w-[1480px] space-y-5">
          <header className="flex flex-wrap items-end justify-between gap-4">
            <div className="min-w-0">
              <div className="mb-2 text-[11px] uppercase tracking-[0.22em]" style={{ color: 'var(--text-3)' }}>
                Superfície de execução
              </div>
              <h1 className="text-2xl font-semibold tracking-[-0.035em]" style={{ color: 'var(--text-1)' }}>
                Execução USDT
              </h1>
              <p className="mt-1 max-w-2xl text-sm leading-6" style={{ color: 'var(--text-2)' }}>
                Assinatura na carteira. Contexto no OS. Execute somente depois de revisar rede, rota e endereço final.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <StatusToken label={isConnected ? 'Carteira online' : 'Carteira pendente'} tone={isConnected ? 'success' : 'warning'} />
              <StatusToken label={getUsdtChainName(prefill.fromChain)} tone="neutral" />
              <StatusToken label="Modo USDT-first" tone="accent" />
            </div>
          </header>

          <main className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
            <section
              className="min-w-0 rounded-[32px] border p-4 lg:p-5"
              style={{
                background:
                  'radial-gradient(circle at 18% 0%, rgba(255,140,66,0.13), transparent 28%), linear-gradient(180deg, rgba(255,255,255,0.035), rgba(255,255,255,0.012))',
                borderColor: 'rgba(255,255,255,0.08)',
                boxShadow: '0 26px 90px rgba(0,0,0,0.24), inset 0 1px 0 rgba(255,255,255,0.05)',
              }}
            >
              <div className="mb-4 flex items-center justify-between gap-3 px-1">
                <div>
                  <div className="text-[11px] uppercase tracking-[0.2em]" style={{ color: 'var(--text-3)' }}>
                    Motor de execução
                  </div>
                  <div className="mt-1 text-sm" style={{ color: 'var(--text-2)' }}>
                    Superfície preparada para USDT nas principais redes.
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

              <LiFiSwapWidget prefill={prefill} className="min-h-[720px]" />
            </section>

            <aside className="space-y-4">
              <Panel title="Sessão" icon={Wallet}>
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
                    Use a carteira do workspace para revisar e assinar a execução final.
                  </div>
                  <WalletConnect />
                </div>
              </Panel>

              <Panel title="Rota" icon={CircleDot}>
                <div className="grid grid-cols-2 gap-3">
                  <Metric label="Origem" value={getUsdtChainName(prefill.fromChain)} />
                  <Metric label="Destino" value={getUsdtChainName(prefill.toChain)} />
                </div>
                <div className="mt-3">
                  <Metric label="Destino padrão" value={prefill.toAddress ? formatAddress(prefill.toAddress) : 'Carteira conectada'} />
                </div>
              </Panel>

              <Panel title="Revisão" icon={ShieldCheck}>
                <div className="space-y-2">
                  {checks.map((item) => (
                    <div
                      key={item.label}
                      className="flex items-center gap-2 rounded-2xl border px-3 py-2.5"
                      style={{
                        backgroundColor: item.ready ? 'rgba(50,213,131,0.055)' : 'rgba(255,255,255,0.025)',
                        borderColor: item.ready ? 'rgba(50,213,131,0.12)' : 'rgba(255,255,255,0.07)',
                        color: item.ready ? 'var(--ok-green)' : 'var(--text-2)',
                      }}
                    >
                      <CheckCircle2 className="h-4 w-4 shrink-0" />
                      <span className="text-sm">{item.label}</span>
                    </div>
                  ))}
                </div>
              </Panel>

              <Panel title="Contexto" icon={ArrowUpRight}>
                <button
                  onClick={() => navigate('/radar')}
                  className="flex w-full items-center justify-between rounded-2xl border px-4 py-3 text-left transition-transform duration-200 hover:-translate-y-0.5"
                  style={{ backgroundColor: 'var(--bg-2)', borderColor: 'var(--stroke-1)' }}
                >
                  <div>
                    <div className="mb-1 text-sm font-medium" style={{ color: 'var(--text-1)' }}>
                      Voltar para o Radar
                    </div>
                    <div className="text-sm leading-5" style={{ color: 'var(--text-2)' }}>
                      Revalidar liquidez e regime antes de executar.
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

function Panel({ title, icon: Icon, children }: { title: string; icon: LucideIcon; children: ReactNode }) {
  return (
    <section
      className="rounded-[26px] border p-4"
      style={{
        background: 'linear-gradient(135deg, rgba(255,255,255,0.04), rgba(255,255,255,0.014))',
        borderColor: 'rgba(255,255,255,0.08)',
        boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.04)',
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
    </section>
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
