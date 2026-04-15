import { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, Loader2 } from 'lucide-react';

import { LIFI_RPC_URLS } from '@/lib/rpcUrls';
import { DEFAULT_USDT_CHAIN_ID, MAJOR_USDT_WIDGET_CHAIN_IDS, MAJOR_USDT_WIDGET_TOKENS, getUsdtTokenAddress } from '@/lib/usdt';

type SwapPrefill = {
  fromChain?: number;
  toChain?: number;
  fromToken?: string;
  toToken?: string;
  toAddress?: string;
};

type LiFiWidgetComponent = (props: Record<string, unknown>) => JSX.Element;

type LiFiSwapWidgetProps = {
  prefill?: SwapPrefill;
  compact?: boolean;
  className?: string;
};

const LIFI_INTEGRATOR = 'sne-os';

export function LiFiSwapWidget({
  prefill,
  compact = false,
  className,
}: LiFiSwapWidgetProps) {
  const [WidgetComponent, setWidgetComponent] = useState<LiFiWidgetComponent | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    import('@lifi/widget')
      .then((mod) => {
        if (cancelled) return;
        setWidgetComponent(() => mod.LiFiWidget as LiFiWidgetComponent);
      })
      .catch((error) => {
        if (cancelled) return;
        setLoadError(error instanceof Error ? error.message : 'Falha ao carregar a superficie de execucao.');
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const config = useMemo(
    () => ({
      integrator: LIFI_INTEGRATOR,
      variant: compact ? 'compact' : 'wide',
      appearance: 'dark',
      buildUrl: true,
      chains: {
        allow: MAJOR_USDT_WIDGET_CHAIN_IDS,
      },
      tokens: {
        from: {
          allow: MAJOR_USDT_WIDGET_TOKENS,
        },
        to: {
          allow: MAJOR_USDT_WIDGET_TOKENS,
        },
      },
      hiddenUI: ['poweredBy', 'gasRefuelMessage', 'fromToken', 'toToken', 'reverseTokensButton'],
      walletConfig: {
        usePartialWalletManagement: true,
      },
      sdkConfig: {
        rpcUrls: LIFI_RPC_URLS,
      },
      theme: {
        container: {
          border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: compact ? '20px' : '28px',
          boxShadow: 'none',
        },
        palette: {
          primary: { main: '#ff8c42' },
          secondary: { main: '#9fb1c7' },
          background: {
            default: '#060913',
            paper: '#0b1018',
          },
          text: {
            primary: '#f3f6fb',
            secondary: '#9fb1c7',
          },
        },
      },
      fromChain: prefill?.fromChain ?? DEFAULT_USDT_CHAIN_ID,
      toChain: prefill?.toChain,
      fromToken: getUsdtTokenAddress(prefill?.fromChain ?? DEFAULT_USDT_CHAIN_ID),
      toToken: getUsdtTokenAddress(prefill?.toChain),
      toAddress: prefill?.toAddress,
    }),
    [compact, prefill]
  );

  if (loadError) {
    return (
      <div
        className={className}
        style={{
          backgroundColor: 'var(--bg-2)',
          border: '1px solid var(--stroke-1)',
          borderRadius: compact ? '20px' : '28px',
          padding: compact ? '16px' : '20px',
        }}
      >
        <div className="flex items-start gap-3">
          <div
            className="flex h-10 w-10 items-center justify-center rounded-2xl"
            style={{ backgroundColor: 'rgba(239,68,68,0.12)', color: 'var(--error-red)' }}
          >
            <AlertTriangle className="h-4 w-4" />
          </div>
          <div className="min-w-0">
            <div className="mb-1 text-sm font-semibold" style={{ color: 'var(--text-1)' }}>
              Widget indisponivel nesta sessao
            </div>
            <div className="text-sm leading-6" style={{ color: 'var(--text-2)' }}>
              A superficie de execucao nao carregou nesta sessao.
            </div>
            <div className="mt-2 text-xs leading-5" style={{ color: 'var(--text-3)' }}>
              {loadError}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!WidgetComponent) {
    return (
      <div
        className={className}
        style={{
          backgroundColor: 'var(--bg-2)',
          border: '1px solid var(--stroke-1)',
          borderRadius: compact ? '20px' : '28px',
          padding: compact ? '20px' : '28px',
        }}
      >
        <div className="flex items-center gap-3">
          <Loader2 className="h-4 w-4 animate-spin" style={{ color: 'var(--accent-orange)' }} />
          <div className="text-sm" style={{ color: 'var(--text-2)' }}>
            Carregando superficie de execucao...
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={className}>
      <WidgetComponent integrator={LIFI_INTEGRATOR} config={config} />
    </div>
  );
}
