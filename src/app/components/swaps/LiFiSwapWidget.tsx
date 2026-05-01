import { useEffect, useMemo, useRef, useState } from 'react';
import { AlertTriangle, Loader2 } from 'lucide-react';

import { LIFI_RPC_URLS } from '@/lib/rpcUrls';
import { DEFAULT_USDT_CHAIN_ID, MAJOR_USDT_WIDGET_CHAIN_IDS, MAJOR_USDT_WIDGET_TOKENS } from '@/lib/usdt';

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
  bare?: boolean;
};

const LIFI_INTEGRATOR =
  import.meta.env.VITE_LIFI_INTEGRATOR?.trim() || 'SNE-OS';
const LIFI_API_KEY = import.meta.env.VITE_LIFI_API_KEY?.trim();

function mergeAllowedTokens(
  baseTokens: Array<{ chainId: number; address: string }>,
  extraTokens: Array<{ chainId?: number; address?: string }>
) {
  const deduped = new Map<string, { chainId: number; address: string }>();

  for (const token of baseTokens) {
    deduped.set(`${token.chainId}:${token.address.toLowerCase()}`, token);
  }

  for (const token of extraTokens) {
    if (!token.chainId || !token.address) continue;
    deduped.set(`${token.chainId}:${token.address.toLowerCase()}`, {
      chainId: token.chainId,
      address: token.address,
    });
  }

  return [...deduped.values()];
}

const SNE_LIFI_PT_BR = {
  language: {
    name: 'Português',
    title: 'Idioma',
  },
  button: {
    bridge: 'Transferir',
    bridgeReview: 'Revisar transferência',
    exchange: 'Mover USDT',
    getGas: 'Adicionar gás',
    startBridging: 'Iniciar transferência',
    startSwapping: 'Iniciar execução',
    swap: 'Converter',
    swapReview: 'Revisar rota',
  },
  header: {
    bridge: 'Transferência',
    exchange: 'Mover USDT',
    from: 'Origem',
    sendToWallet: 'Enviar para carteira',
    swap: 'Conversão',
    to: 'Destino',
    youGet: 'Você recebe',
    youPay: 'Você envia',
  },
  info: {
    message: {
      autoRefuel:
        'Você está com pouco gás na rede {{chainName}}. Ao continuar, o motor tenta obter gás suficiente para concluir a execução.',
      emptyBridgesList: 'Não encontramos pontes compatíveis com a sua busca.',
      emptyExchangesList: 'Não encontramos provedores de execução compatíveis com a sua busca.',
      routeNotFound:
        'A rota não está disponível. Possíveis causas: baixa liquidez, valor muito baixo, custo de gás elevado ou combinação de redes sem execução no momento.',
    },
    title: {
      autoRefuel: 'Adicionar gás em {{chainName}}',
      routeNotFound: 'Nenhuma rota disponível',
    },
  },
  success: {
    message: {
      exchangePartiallySuccessful:
        'Tentamos concluir a execução, mas {{tool}} não conseguiu continuar por slippage ou falta de liquidez para {{tokenSymbol}}.',
    },
    title: {
      bridgePartiallySuccessful: 'Transferência parcialmente concluída',
      bridgeSuccessful: 'Transferência concluída',
      swapPartiallySuccessful: 'Conversão parcialmente concluída',
      swapSuccessful: 'Conversão concluída',
    },
  },
  warning: {
    message: {
      fundsLossPrevention:
        'Confirme rede, endereço e tipo de conta antes de executar. Transferências diretas para endereços incorretos podem causar perda permanente.',
      insufficientFunds: 'Saldo insuficiente na origem para concluir esta execução.',
      insufficientGas: 'Gás insuficiente para concluir a execução. Adicione pelo menos:',
      rateChanged: 'A cotação mudou. Ao continuar, você aceita a nova rota de execução.',
      resetSettings: 'Isso redefinirá prioridade de rota, slippage, preço de gás, pontes e provedores ativos.',
    },
    title: {
      insufficientGas: 'Gás insuficiente',
      rateChanged: 'Cotação alterada',
    },
  },
  error: {
    message: {
      allowanceRequired: 'O valor de {{tokenSymbol}} excede sua permissão atual. Aprove um novo limite e tente novamente.',
      insufficientFunds: 'Você não tem saldo suficiente para cobrir valor e custos desta execução.',
      remainInYourWallet: '{{amount, numberExt}} {{tokenSymbol}} em {{chainName}} permanece na sua carteira.',
      signatureRejected:
        'Sua assinatura é necessária para concluir a execução. {{amount, numberExt}} {{tokenSymbol}} em {{chainName}} permanece na sua carteira.',
      slippageThreshold: 'O slippage excedeu o limite definido. Solicite uma nova cotação.',
      transactionCanceled: 'A transação foi cancelada.',
      transactionConflict:
        'A transação conflita com outra transação pendente usando os mesmos fundos. Aguarde a confirmação ou revise o histórico antes de tentar novamente.',
      transactionRejected: 'A transação foi rejeitada pela carteira. Tente novamente ou solicite uma nova cotação.',
    },
    title: {
      allowanceRequired: 'Permissão insuficiente',
      balanceIsTooLow: 'Saldo muito baixo',
      chainSwitch: 'Troca de rede necessária',
      exchangeRateUpdateCanceled: 'Atualização de cotação cancelada',
      insufficientFunds: 'Saldo insuficiente',
      signatureRejected: 'Assinatura necessária',
      slippageNotMet: 'Slippage fora do limite',
      transactionCanceled: 'Transação cancelada',
      transactionConflict: 'Transação em conflito',
      transactionRejected: 'Transação rejeitada',
    },
  },
  main: {
    bridgeStepDetails: 'Transferir de {{from}} para {{to}} via {{tool}}',
    from: 'Origem',
    process: {
      bridge: {
        actionRequired: 'Assinar transferência entre redes',
        done: 'Transferência confirmada',
        pending: 'Transferência entre redes pendente',
        started: 'Preparando transferência',
      },
      receivingChain: {
        done: 'Transferência concluída',
        partial: 'Transferência parcialmente concluída',
        pending: 'Aguardando rede de destino',
        refunded: 'Transferência reembolsada',
      },
      swap: {
        actionRequired: 'Assinar conversão',
        done: 'Conversão concluída',
        pending: 'Conversão pendente',
        started: 'Preparando conversão',
      },
    },
    searchBridges: 'Buscar ponte',
    searchExchanges: 'Buscar provedor',
    sending: 'Enviando',
    stepBridge: 'Transferência',
    stepSwap: 'Conversão',
    stepSwapAndBridge: 'Converter e transferir',
    swapStepDetails: 'Converter em {{chain}} via {{tool}}',
    to: 'Destino',
    valueLoss: 'Perda estimada',
  },
  settings: {
    enabledBridges: 'Pontes',
    enabledExchanges: 'Provedores',
    gasPrice: {
      title: 'Preço do gás',
    },
    routePriority: 'Prioridade da rota',
    slippage: 'Slippage máximo',
  },
};

export function LiFiSwapWidget({
  prefill,
  compact = false,
  className,
  bare = false,
}: LiFiSwapWidgetProps) {
  const [WidgetComponent, setWidgetComponent] = useState<LiFiWidgetComponent | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [widgetScale, setWidgetScale] = useState(1);
  const [contentSize, setContentSize] = useState({ width: 0, height: 0 });
  const stageRef = useRef<HTMLDivElement | null>(null);
  const contentRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    let cancelled = false;

    import('@lifi/widget')
      .then((mod) => {
        if (cancelled) return;
        setWidgetComponent(() => mod.LiFiWidget as LiFiWidgetComponent);
      })
      .catch((error) => {
        if (cancelled) return;
        setLoadError(error instanceof Error ? error.message : 'Falha ao carregar a superfície de execução.');
      });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (compact) {
      setWidgetScale(1);
      return;
    }

    const stageNode = stageRef.current;
    const contentNode = contentRef.current;
    if (!stageNode || !contentNode || typeof ResizeObserver === 'undefined') return;

    const MIN_SCALE = 0.48;

    const readContentSize = () => {
      const nextWidth = Math.ceil(contentNode.offsetWidth);
      const nextHeight = Math.ceil(contentNode.offsetHeight);

      if (nextWidth > 0 && nextHeight > 0) {
        setContentSize((current) =>
          current.width === nextWidth && current.height === nextHeight
            ? current
            : { width: nextWidth, height: nextHeight }
        );
      }
    };

    const updateScale = () => {
      readContentSize();

      const { width: availableWidth, height: availableHeight } = stageNode.getBoundingClientRect();
      const measuredWidth = contentNode.offsetWidth;
      const measuredHeight = contentNode.offsetHeight;

      if (!availableWidth || !availableHeight || !measuredWidth || !measuredHeight) return;

      const widthScale = (availableWidth - 4) / measuredWidth;
      const heightScale = (availableHeight - 4) / measuredHeight;
      const nextScale = Math.max(MIN_SCALE, Math.min(1, widthScale, heightScale));
      setWidgetScale(Number(nextScale.toFixed(4)));
    };

    updateScale();

    const stageObserver = new ResizeObserver(updateScale);
    const contentObserver = new ResizeObserver(updateScale);
    stageObserver.observe(stageNode);
    contentObserver.observe(contentNode);
    window.addEventListener('resize', updateScale);

    return () => {
      stageObserver.disconnect();
      contentObserver.disconnect();
      window.removeEventListener('resize', updateScale);
    };
  }, [compact, WidgetComponent]);

  const config = useMemo(
    () => {
      const fromChain = prefill?.fromChain ?? DEFAULT_USDT_CHAIN_ID;
      const toChain = prefill?.toChain;
      const allowedTokens = mergeAllowedTokens(MAJOR_USDT_WIDGET_TOKENS, [
        { chainId: fromChain, address: prefill?.fromToken },
        { chainId: toChain, address: prefill?.toToken },
      ]);

      return {
        integrator: LIFI_INTEGRATOR,
        apiKey: LIFI_API_KEY,
        variant: compact ? 'compact' : 'wide',
        appearance: 'dark',
        buildUrl: true,
        chains: {
          allow: MAJOR_USDT_WIDGET_CHAIN_IDS,
        },
        tokens: {
          from: {
            allow: allowedTokens,
          },
          to: {
            allow: allowedTokens,
          },
        },
        hiddenUI: ['poweredBy', 'gasRefuelMessage', 'language'],
        languages: {
          default: 'pt',
          allow: ['pt'],
        },
        languageResources: {
          pt: SNE_LIFI_PT_BR,
        },
        walletConfig: {
          usePartialWalletManagement: true,
        },
        sdkConfig: {
          rpcUrls: LIFI_RPC_URLS,
        },
        theme: {
          container: {
            border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: compact ? '18px' : '24px',
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
        fromChain,
        toChain,
        fromToken: prefill?.fromToken,
        toToken: prefill?.toToken,
        toAddress: prefill?.toAddress,
      };
    },
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
              Motor indisponível nesta sessão
            </div>
            <div className="text-sm leading-6" style={{ color: 'var(--text-2)' }}>
              A superfície de execução não carregou nesta sessão.
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
            Carregando superfície de execução...
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className={className}
      ref={stageRef}
      style={{
        maxWidth: compact ? undefined : '100%',
        margin: compact ? undefined : '0 auto',
        width: '100%',
        height: '100%',
        borderRadius: bare ? '0' : compact ? '20px' : '26px',
        border: bare ? 'none' : '1px solid rgba(255,255,255,0.08)',
        background: bare
          ? 'transparent'
          : compact
            ? 'linear-gradient(180deg, rgba(8,12,20,0.9), rgba(6,9,19,0.94))'
            : 'radial-gradient(circle at top, rgba(255,140,66,0.08), transparent 30%), linear-gradient(180deg, rgba(8,12,20,0.92), rgba(6,9,19,0.96))',
        boxShadow: bare ? 'none' : compact ? 'none' : '0 24px 80px rgba(0,0,0,0.28)',
        padding: bare ? '0' : compact ? '10px' : '12px',
      }}
    >
      {!compact && !bare ? (
        <div
          className="mb-2 flex flex-wrap items-start justify-between gap-2 rounded-[18px] border px-3 py-2.5"
          style={{
            backgroundColor: 'rgba(255,255,255,0.025)',
            borderColor: 'rgba(255,255,255,0.07)',
          }}
        >
          <div className="min-w-0">
            <div className="text-[10px] uppercase tracking-[0.18em]" style={{ color: 'var(--text-3)' }}>
              Motor de execução
            </div>
            <div className="mt-1 text-[13px] font-medium" style={{ color: 'var(--text-1)' }}>
              LiFi embutido no rail do SNE OS
            </div>
            <div className="mt-1 text-xs leading-5" style={{ color: 'var(--text-2)' }}>
              A rota continua em auto custódia. O OS organiza contexto, destino e revisão antes da assinatura.
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            {['USDT-first', 'self-custody'].map((token) => (
              <div
                key={token}
                className="rounded-full border px-2.5 py-1 text-[9px] uppercase tracking-[0.14em]"
                style={{
                  color: 'var(--text-2)',
                  backgroundColor: 'rgba(255,255,255,0.03)',
                  borderColor: 'rgba(255,255,255,0.08)',
                }}
              >
                {token}
              </div>
            ))}
          </div>
        </div>
      ) : null}

      <div
        className="flex w-full justify-center"
        style={{
          height: compact
            ? 'auto'
            : contentSize.height > 0
              ? `${Math.ceil(contentSize.height * widgetScale)}px`
              : '100%',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            width: compact
              ? '100%'
              : contentSize.width > 0
                ? `${Math.ceil(contentSize.width * widgetScale)}px`
                : '100%',
            minHeight: 0,
          }}
        >
          <div
            ref={contentRef}
            style={{
              display: 'inline-block',
              width: compact ? '100%' : 'max-content',
              maxWidth: compact ? '100%' : 'none',
              transform: compact ? undefined : `scale(${widgetScale})`,
              transformOrigin: 'top left',
            }}
          >
            <WidgetComponent integrator={LIFI_INTEGRATOR} config={config} />
          </div>
        </div>
      </div>
    </div>
  );
}
