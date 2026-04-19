import { useEffect, useMemo, useState } from 'react';
import { ArrowUpRight, Copy, Loader2, RefreshCcw, ShieldCheck, ShoppingCart, Trash2 } from 'lucide-react';

import { useAuth } from '@/lib/auth/AuthProvider';
import { connectTronWallet, decimalToUnits, sendUsdtTransfer } from '@/lib/tron/tron';
import {
  useCancelCheckoutOrder,
  useCheckoutOrder,
  useCreateCheckoutOrder,
  useCreateTronSession,
  useProcessActivation,
  useReconcileTronPayment,
  useRetryActivation,
} from '../../../hooks/useCheckoutData';

type OperatorCheckoutCardProps = {
  effectiveAccess: boolean;
};

const FINAL_ORDER_STATUSES = new Set(['activated', 'cancelled', 'refunded']);

function checkoutStorageKey(address?: string | null) {
  return address ? `sne:checkout:operator:${address.toLowerCase()}` : null;
}

function statusLabel(status?: string | null) {
  const normalized = `${status || ''}`.trim().toLowerCase();
  if (normalized === 'created') return 'ordem criada';
  if (normalized === 'awaiting_payment') return 'aguardando pagamento';
  if (normalized === 'payment_seen') return 'pagamento visto';
  if (normalized === 'payment_confirmed') return 'pagamento confirmado';
  if (normalized === 'activation_pending') return 'ativação pendente';
  if (normalized === 'activation_submitted') return 'ativação enviada';
  if (normalized === 'activated') return 'ativado';
  if (normalized === 'activation_failed') return 'ativação falhou';
  if (normalized === 'cancelled') return 'cancelado';
  if (normalized === 'refund_pending') return 'reembolso pendente';
  if (normalized === 'refunded') return 'reembolsado';
  return normalized || '--';
}

function statusTone(status?: string | null) {
  const normalized = `${status || ''}`.trim().toLowerCase();
  if (normalized === 'activated') return { bg: 'rgba(50,213,131,0.12)', border: 'rgba(50,213,131,0.22)', color: 'var(--ok-green)' };
  if (normalized === 'awaiting_payment' || normalized === 'payment_seen' || normalized === 'payment_confirmed') {
    return { bg: 'rgba(255,140,66,0.12)', border: 'rgba(255,140,66,0.24)', color: 'var(--accent-orange)' };
  }
  if (normalized === 'activation_failed' || normalized === 'cancelled' || normalized === 'refunded') {
    return { bg: 'rgba(255,99,99,0.10)', border: 'rgba(255,99,99,0.20)', color: 'var(--danger)' };
  }
  return { bg: 'rgba(255,255,255,0.04)', border: 'rgba(255,255,255,0.10)', color: 'var(--text-2)' };
}

function generateIdempotencyKey() {
  const randomPart =
    typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
      ? crypto.randomUUID().replace(/-/g, '')
      : `${Date.now().toString(16)}${Math.random().toString(16).slice(2)}`;
  return `operator_checkout_${randomPart}`;
}

function shortValue(value?: string | null) {
  if (!value) return '--';
  if (value.length <= 18) return value;
  return `${value.slice(0, 10)}...${value.slice(-6)}`;
}

export function OperatorCheckoutCard({ effectiveAccess }: OperatorCheckoutCardProps) {
  const { address, isConnected, isAuthenticated, authStatus, connect } = useAuth();
  const [trackedOrderId, setTrackedOrderId] = useState<string | null>(null);
  const [targetArbitrumAddress, setTargetArbitrumAddress] = useState('');
  const [buyerTronAddress, setBuyerTronAddress] = useState('');
  const [manualTxHash, setManualTxHash] = useState('');
  const [feedback, setFeedback] = useState<string | null>(null);
  const [copyFeedback, setCopyFeedback] = useState<string | null>(null);

  const storageKey = useMemo(() => checkoutStorageKey(address), [address]);
  const orderQuery = useCheckoutOrder(trackedOrderId);
  const order = orderQuery.data;

  const createOrderMutation = useCreateCheckoutOrder();
  const bindTronMutation = useCreateTronSession();
  const cancelOrderMutation = useCancelCheckoutOrder();
  const reconcilePaymentMutation = useReconcileTronPayment();
  const processActivationMutation = useProcessActivation();
  const retryActivationMutation = useRetryActivation();

  useEffect(() => {
    if (!address) {
      setTrackedOrderId(null);
      setTargetArbitrumAddress('');
      setBuyerTronAddress('');
      return;
    }

    setTargetArbitrumAddress(address);
    setBuyerTronAddress('');

    if (!storageKey || typeof window === 'undefined') return;
    const storedOrderId = window.localStorage.getItem(storageKey);
    if (storedOrderId) {
      setTrackedOrderId(storedOrderId);
      return;
    }
    setTrackedOrderId(null);
  }, [address, storageKey]);

  useEffect(() => {
    if (!storageKey || typeof window === 'undefined') return;
    if (trackedOrderId) {
      window.localStorage.setItem(storageKey, trackedOrderId);
      return;
    }
    window.localStorage.removeItem(storageKey);
  }, [trackedOrderId, storageKey]);

  useEffect(() => {
    if (!order) return;
    if (order.targetArbitrumAddress) {
      setTargetArbitrumAddress(order.targetArbitrumAddress);
    }
    if (order.buyerTronAddress) {
      setBuyerTronAddress(order.buyerTronAddress);
    }
    if (order.paymentTxHash) {
      setManualTxHash(order.paymentTxHash);
    }
  }, [order]);

  useEffect(() => {
    if (!copyFeedback) return;
    const timer = window.setTimeout(() => setCopyFeedback(null), 1800);
    return () => window.clearTimeout(timer);
  }, [copyFeedback]);

  const isCreating = createOrderMutation.isPending;
  const isBindingTron = bindTronMutation.isPending;
  const isCancelling = cancelOrderMutation.isPending;
  const isReconciling = reconcilePaymentMutation.isPending;
  const isProcessingActivation = processActivationMutation.isPending;
  const isRetryingActivation = retryActivationMutation.isPending;
  const orderStatusTone = statusTone(order?.status);
  const hasTrackedOrder = Boolean(trackedOrderId);
  const canStartNewOrder = isConnected && isAuthenticated && !effectiveAccess && (!order || FINAL_ORDER_STATUSES.has(order.status));

  async function handleAuthenticate() {
    try {
      setFeedback(null);
      await connect();
      setFeedback('Sessão EVM autenticada. Você já pode criar a ordem de compra.');
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : 'Falha ao autenticar a carteira EVM.');
    }
  }

  async function handleCreateOrder() {
    try {
      setFeedback(null);
      const nextOrder = await createOrderMutation.mutateAsync({
        productCode: 'operator_key',
        targetArbitrumAddress: targetArbitrumAddress || address || undefined,
        idempotencyKey: generateIdempotencyKey(),
      });
      setTrackedOrderId(nextOrder.id);
      setFeedback('ActivationOrder criada. Agora vincule a wallet Tron que vai pagar em USDT.');
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : 'Falha ao criar a ActivationOrder.');
    }
  }

  async function handleBindTronSession() {
    if (!trackedOrderId) return;
    try {
      setFeedback(null);
      const connectedTronAddress = await connectTronWallet();
      const resolvedBuyerAddress = buyerTronAddress.trim() || connectedTronAddress;
      if (resolvedBuyerAddress !== connectedTronAddress) {
        throw new Error(`A wallet Tron conectada não coincide com a buyer wallet informada (${resolvedBuyerAddress}).`);
      }
      const updatedOrder = await bindTronMutation.mutateAsync({
        orderId: trackedOrderId,
        payload: {
          buyerTronAddress: resolvedBuyerAddress,
          walletProvider: 'tronlink',
          gasMode: 'gasfree_planned',
        },
      });
      setTrackedOrderId(updatedOrder.id);
      setBuyerTronAddress(resolvedBuyerAddress);
      setFeedback('Wallet Tron vinculada. A ordem agora está pronta para o pagamento em USDT.');
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : 'Falha ao vincular a wallet Tron.');
    }
  }

  async function handlePayWithTronLink() {
    if (!trackedOrderId || !order?.payment.assetContract || !order.payment.treasuryAddress) return;
    try {
      setFeedback(null);
      const amountUnits = decimalToUnits(order.payment.expectedAmount, order.payment.assetDecimals);
      const payment = await sendUsdtTransfer({
        contractAddress: order.payment.assetContract,
        to: order.payment.treasuryAddress,
        amountUnits,
        expectedFromAddress: order.buyerTronAddress,
      });
      setManualTxHash(payment.txHash);

      const updatedOrder = await reconcilePaymentMutation.mutateAsync({
        orderId: trackedOrderId,
        payload: {
          txHash: payment.txHash,
          autoProcess: true,
        },
      });

      if (updatedOrder.status === 'activated') {
        setFeedback('Pagamento Tron confirmado e Operator Key ativado em Arbitrum.');
        return;
      }

      if (updatedOrder.status === 'activation_failed') {
        setFeedback(updatedOrder.errorMessage || 'Pagamento confirmado, mas a ativação falhou. Tente o retry.');
        return;
      }

      setFeedback('Pagamento Tron enviado. O backend reconciliou a ordem e iniciou a ativação em Arbitrum.');
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : 'Falha ao pagar com TronLink.');
    }
  }

  async function handleManualReconcile() {
    if (!trackedOrderId || !manualTxHash.trim()) return;
    try {
      setFeedback(null);
      const updatedOrder = await reconcilePaymentMutation.mutateAsync({
        orderId: trackedOrderId,
        payload: {
          txHash: manualTxHash.trim(),
          autoProcess: true,
        },
      });
      if (updatedOrder.status === 'activated') {
        setFeedback('Pagamento reconciliado e ativação concluída.');
        return;
      }
      setFeedback(updatedOrder.errorMessage || 'Reconciliação executada. Atualize a ordem para acompanhar o status.');
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : 'Falha ao reconciliar a transação Tron.');
    }
  }

  async function handleProcessActivation() {
    if (!trackedOrderId) return;
    try {
      setFeedback(null);
      const updatedOrder = await processActivationMutation.mutateAsync({ orderId: trackedOrderId });
      if (updatedOrder.status === 'activated') {
        setFeedback('Ativação concluída em Arbitrum.');
        return;
      }
      setFeedback(updatedOrder.errorMessage || 'A ativação foi reenviada para processamento.');
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : 'Falha ao processar a ativação.');
    }
  }

  async function handleRetryActivation() {
    if (!trackedOrderId) return;
    try {
      setFeedback(null);
      const updatedOrder = await retryActivationMutation.mutateAsync({ orderId: trackedOrderId });
      if (updatedOrder.status === 'activated') {
        setFeedback('Retry concluído. Operator Key ativado em Arbitrum.');
        return;
      }
      setFeedback(updatedOrder.errorMessage || 'Retry enviado. Atualize a ordem para acompanhar o status.');
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : 'Falha ao reenviar a ativação.');
    }
  }

  async function handleCancelOrder() {
    if (!trackedOrderId) return;
    try {
      setFeedback(null);
      await cancelOrderMutation.mutateAsync({
        orderId: trackedOrderId,
        payload: { reason: 'user_cancelled_checkout' },
      });
      setFeedback('Ordem cancelada. Você pode abrir uma nova ActivationOrder quando quiser.');
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : 'Falha ao cancelar a ordem.');
    }
  }

  function clearTrackedOrder() {
    setTrackedOrderId(null);
    setBuyerTronAddress('');
    setFeedback('Rastreamento local limpo. A ordem continua persistida no backend.');
  }

  async function copyValue(value: string | null | undefined, label: string) {
    if (!value) return;
    try {
      await navigator.clipboard.writeText(value);
      setCopyFeedback(`${label} copiado`);
    } catch {
      setCopyFeedback(`Não foi possível copiar ${label.toLowerCase()}`);
    }
  }

  return (
    <div
      className="rounded-xl p-4"
      style={{ backgroundColor: 'var(--bg-2)', borderWidth: '1px', borderColor: 'var(--stroke-1)', boxShadow: 'var(--shadow-1)' }}
    >
      <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
        <div className="min-w-0">
          <div className="text-sm font-semibold mb-1" style={{ color: 'var(--text-2)' }}>
            Checkout Operator
          </div>
          <div className="text-sm" style={{ color: 'var(--text-2)' }}>
            Tron recebe o pagamento em USDT. Arbitrum recebe a ativação do Key.
          </div>
        </div>
        <div
          className="rounded-full px-3 py-1 text-[11px] uppercase tracking-[0.14em]"
          style={{ backgroundColor: orderStatusTone.bg, borderWidth: '1px', borderColor: orderStatusTone.border, color: orderStatusTone.color }}
        >
          {order ? statusLabel(order.status) : effectiveAccess ? 'operator ativo' : 'checkout idle'}
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[1.1fr_0.9fr] gap-4">
        <div className="space-y-3">
          <div className="rounded-lg p-3" style={{ backgroundColor: 'var(--bg-3)', borderWidth: '1px', borderColor: 'var(--stroke-1)' }}>
            <div className="text-[11px] uppercase mb-1" style={{ color: 'var(--text-3)' }}>Target Arbitrum</div>
            <input
              value={targetArbitrumAddress}
              onChange={(event) => setTargetArbitrumAddress(event.target.value)}
              placeholder="0x..."
              className="w-full rounded-lg px-3 py-2 text-sm outline-none"
              style={{ backgroundColor: 'var(--bg-2)', borderWidth: '1px', borderColor: 'var(--stroke-1)', color: 'var(--text-1)' }}
              disabled={Boolean(order)}
            />
            <div className="text-xs mt-2" style={{ color: 'var(--text-3)' }}>
              A compra em Tron não concede premium sozinha. O direito nasce apenas depois da ativação em Arbitrum.
            </div>
          </div>

          <div className="rounded-lg p-3" style={{ backgroundColor: 'var(--bg-3)', borderWidth: '1px', borderColor: 'var(--stroke-1)' }}>
            <div className="text-[11px] uppercase mb-1" style={{ color: 'var(--text-3)' }}>Buyer Tron Address</div>
            <input
              value={buyerTronAddress}
              onChange={(event) => setBuyerTronAddress(event.target.value)}
              placeholder="T..."
              className="w-full rounded-lg px-3 py-2 text-sm outline-none"
              style={{ backgroundColor: 'var(--bg-2)', borderWidth: '1px', borderColor: 'var(--stroke-1)', color: 'var(--text-1)' }}
              disabled={order?.status !== 'created' && order?.status !== undefined}
            />
            <div className="text-xs mt-2" style={{ color: 'var(--text-3)' }}>
              Use a wallet TronLink que fará o pagamento em `USDT`.
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            {!isAuthenticated ? (
              <button
                onClick={() => void handleAuthenticate()}
                className="rounded-lg px-4 py-2 text-sm font-medium"
                style={{ backgroundColor: 'var(--accent-orange)', color: '#161616' }}
              >
                {authStatus === 'connecting' || authStatus === 'signing' || authStatus === 'verifying' ? 'Autenticando...' : 'Autenticar EVM'}
              </button>
            ) : canStartNewOrder ? (
              <button
                onClick={() => void handleCreateOrder()}
                disabled={isCreating}
                className="rounded-lg px-4 py-2 text-sm font-medium disabled:opacity-60"
                style={{ backgroundColor: 'var(--accent-orange)', color: '#161616' }}
              >
                {isCreating ? 'Criando ordem...' : 'Criar ActivationOrder'}
              </button>
            ) : null}

            {order?.status === 'created' ? (
              <button
                onClick={() => void handleBindTronSession()}
                disabled={isBindingTron}
                className="rounded-lg px-4 py-2 text-sm font-medium disabled:opacity-60"
                style={{ backgroundColor: 'rgba(255,140,66,0.12)', borderWidth: '1px', borderColor: 'rgba(255,140,66,0.24)', color: 'var(--accent-orange)' }}
              >
                {isBindingTron ? 'Vinculando...' : 'Vincular TronLink'}
              </button>
            ) : null}

            {order?.status === 'awaiting_payment' ? (
              <button
                onClick={() => void handlePayWithTronLink()}
                disabled={isReconciling}
                className="rounded-lg px-4 py-2 text-sm font-medium disabled:opacity-60"
                style={{ backgroundColor: 'var(--accent-orange)', color: '#161616' }}
              >
                {isReconciling ? 'Confirmando pagamento...' : 'Pagar com TronLink'}
              </button>
            ) : null}

            {(order?.status === 'payment_confirmed' || order?.status === 'activation_pending') ? (
              <button
                onClick={() => void handleProcessActivation()}
                disabled={isProcessingActivation}
                className="rounded-lg px-4 py-2 text-sm font-medium disabled:opacity-60"
                style={{ backgroundColor: 'rgba(255,140,66,0.12)', borderWidth: '1px', borderColor: 'rgba(255,140,66,0.24)', color: 'var(--accent-orange)' }}
              >
                {isProcessingActivation ? 'Processando ativação...' : 'Processar ativação'}
              </button>
            ) : null}

            {order?.status === 'activation_failed' ? (
              <button
                onClick={() => void handleRetryActivation()}
                disabled={isRetryingActivation}
                className="rounded-lg px-4 py-2 text-sm font-medium disabled:opacity-60"
                style={{ backgroundColor: 'rgba(255,140,66,0.12)', borderWidth: '1px', borderColor: 'rgba(255,140,66,0.24)', color: 'var(--accent-orange)' }}
              >
                {isRetryingActivation ? 'Reenviando...' : 'Retry ativação'}
              </button>
            ) : null}

            {hasTrackedOrder ? (
              <button
                onClick={() => void orderQuery.refetch()}
                className="rounded-lg px-4 py-2 text-sm font-medium"
                style={{ backgroundColor: 'var(--bg-3)', borderWidth: '1px', borderColor: 'var(--stroke-1)', color: 'var(--text-1)' }}
              >
                Atualizar ordem
              </button>
            ) : null}

            {order && !FINAL_ORDER_STATUSES.has(order.status) ? (
              <button
                onClick={() => void handleCancelOrder()}
                disabled={isCancelling}
                className="rounded-lg px-4 py-2 text-sm font-medium disabled:opacity-60"
                style={{ backgroundColor: 'var(--bg-3)', borderWidth: '1px', borderColor: 'rgba(255,99,99,0.20)', color: 'var(--danger)' }}
              >
                {isCancelling ? 'Cancelando...' : 'Cancelar ordem'}
              </button>
            ) : null}

            {order && FINAL_ORDER_STATUSES.has(order.status) ? (
              <button
                onClick={clearTrackedOrder}
                className="rounded-lg px-4 py-2 text-sm font-medium"
                style={{ backgroundColor: 'var(--bg-3)', borderWidth: '1px', borderColor: 'var(--stroke-1)', color: 'var(--text-1)' }}
              >
                Nova ordem
              </button>
            ) : null}
          </div>

          <div className="rounded-lg p-3" style={{ backgroundColor: 'var(--bg-3)', borderWidth: '1px', borderColor: 'var(--stroke-1)' }}>
            <div className="text-[11px] uppercase mb-2" style={{ color: 'var(--text-3)' }}>Trilha operacional</div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-sm" style={{ color: 'var(--text-2)' }}>
              <div className="rounded-lg px-3 py-2" style={{ backgroundColor: 'var(--bg-2)' }}>
                <div className="font-medium mb-1" style={{ color: 'var(--text-1)' }}>1. Ordem</div>
                Criar a `ActivationOrder` ligada à wallet EVM autenticada.
              </div>
              <div className="rounded-lg px-3 py-2" style={{ backgroundColor: 'var(--bg-2)' }}>
                <div className="font-medium mb-1" style={{ color: 'var(--text-1)' }}>2. Tron</div>
                Vincular a wallet Tron que vai pagar o `USDT`.
              </div>
              <div className="rounded-lg px-3 py-2" style={{ backgroundColor: 'var(--bg-2)' }}>
                <div className="font-medium mb-1" style={{ color: 'var(--text-1)' }}>3. Ativação</div>
                O `PR 5` vai reconciliar pagamento e mint em Arbitrum.
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-3">
          <div className="rounded-lg p-3" style={{ backgroundColor: 'var(--bg-3)', borderWidth: '1px', borderColor: 'var(--stroke-1)' }}>
            <div className="flex items-center gap-2 mb-3">
              <ShoppingCart className="w-4 h-4" style={{ color: 'var(--accent-orange)' }} />
              <div className="font-semibold" style={{ color: 'var(--text-1)' }}>Estado da ordem</div>
            </div>

            {orderQuery.isLoading && trackedOrderId ? (
              <div className="flex items-center gap-2 text-sm" style={{ color: 'var(--text-2)' }}>
                <Loader2 className="w-4 h-4 animate-spin" />
                Carregando ActivationOrder...
              </div>
            ) : order ? (
              <div className="space-y-2 text-sm">
                <div className="flex items-center justify-between gap-3">
                  <span style={{ color: 'var(--text-3)' }}>Order</span>
                  <span className="break-all text-right" style={{ color: 'var(--text-1)' }}>{shortValue(order.id)}</span>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span style={{ color: 'var(--text-3)' }}>Produto</span>
                  <span style={{ color: 'var(--text-1)' }}>{order.product.label}</span>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span style={{ color: 'var(--text-3)' }}>Preço</span>
                  <span style={{ color: 'var(--text-1)' }}>{order.expectedAmount} USDT</span>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span style={{ color: 'var(--text-3)' }}>Payment chain</span>
                  <span style={{ color: 'var(--text-1)' }}>{order.paymentChain}</span>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span style={{ color: 'var(--text-3)' }}>Activation chain</span>
                  <span style={{ color: 'var(--text-1)' }}>{order.activationChain}</span>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span style={{ color: 'var(--text-3)' }}>Target</span>
                  <span className="break-all text-right" style={{ color: 'var(--text-1)' }}>{shortValue(order.targetArbitrumAddress)}</span>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span style={{ color: 'var(--text-3)' }}>Payment tx</span>
                  <span className="break-all text-right" style={{ color: 'var(--text-1)' }}>{shortValue(order.paymentTxHash)}</span>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span style={{ color: 'var(--text-3)' }}>Activation tx</span>
                  <span className="break-all text-right" style={{ color: 'var(--text-1)' }}>{shortValue(order.activationTxHash)}</span>
                </div>
              </div>
            ) : (
              <div className="text-sm" style={{ color: 'var(--text-2)' }}>
                Nenhuma ActivationOrder rastreada nesta sessão ainda.
              </div>
            )}
          </div>

          <div className="rounded-lg p-3" style={{ backgroundColor: 'var(--bg-3)', borderWidth: '1px', borderColor: 'var(--stroke-1)' }}>
            <div className="flex items-center gap-2 mb-3">
              <ShieldCheck className="w-4 h-4" style={{ color: 'var(--accent-orange)' }} />
              <div className="font-semibold" style={{ color: 'var(--text-1)' }}>Instruções de pagamento</div>
            </div>

            <div className="space-y-2 text-sm">
              <div className="rounded-lg px-3 py-2" style={{ backgroundColor: 'var(--bg-2)' }}>
                <div className="text-[11px] uppercase mb-1" style={{ color: 'var(--text-3)' }}>Treasury Tron</div>
                <div className="flex items-center justify-between gap-3">
                  <span className="break-all" style={{ color: 'var(--text-1)' }}>{order?.payment.treasuryAddress ?? '--'}</span>
                  <button onClick={() => void copyValue(order?.payment.treasuryAddress, 'Treasury')} style={{ color: 'var(--text-3)' }}>
                    <Copy className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div className="rounded-lg px-3 py-2" style={{ backgroundColor: 'var(--bg-2)' }}>
                <div className="text-[11px] uppercase mb-1" style={{ color: 'var(--text-3)' }}>Valor esperado</div>
                <div className="flex items-center justify-between gap-3">
                  <span style={{ color: 'var(--text-1)' }}>{order?.payment.expectedAmount ?? '100.000000'} USDT</span>
                  <button onClick={() => void copyValue(order?.payment.expectedAmount, 'Valor')} style={{ color: 'var(--text-3)' }}>
                    <Copy className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div className="rounded-lg px-3 py-2" style={{ backgroundColor: 'var(--bg-2)' }}>
                <div className="text-[11px] uppercase mb-1" style={{ color: 'var(--text-3)' }}>USDT contract</div>
                <div className="flex items-center justify-between gap-3">
                  <span className="break-all" style={{ color: 'var(--text-1)' }}>{order?.payment.assetContract ?? '--'}</span>
                  <button onClick={() => void copyValue(order?.payment.assetContract, 'Contrato')} style={{ color: 'var(--text-3)' }}>
                    <Copy className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>

            {order && !order.paymentTxHash ? (
              <div className="rounded-lg px-3 py-2 mt-3" style={{ backgroundColor: 'var(--bg-2)' }}>
                <div className="text-[11px] uppercase mb-1" style={{ color: 'var(--text-3)' }}>Tron tx hash manual</div>
                <input
                  value={manualTxHash}
                  onChange={(event) => setManualTxHash(event.target.value)}
                  placeholder="0x... ou hash Tron"
                  className="w-full rounded-lg px-3 py-2 text-sm outline-none"
                  style={{ backgroundColor: 'var(--bg-3)', borderWidth: '1px', borderColor: 'var(--stroke-1)', color: 'var(--text-1)' }}
                />
                <div className="flex gap-2 mt-2">
                  <button
                    onClick={() => void handleManualReconcile()}
                    disabled={!manualTxHash.trim() || isReconciling}
                    className="rounded-lg px-3 py-2 text-sm font-medium disabled:opacity-60"
                    style={{ backgroundColor: 'var(--bg-3)', borderWidth: '1px', borderColor: 'var(--stroke-1)', color: 'var(--text-1)' }}
                  >
                    {isReconciling ? 'Reconciliando...' : 'Reconciliar tx'}
                  </button>
                </div>
              </div>
            ) : null}

            <div className="text-xs mt-3" style={{ color: 'var(--text-3)' }}>
              Esta tela agora consegue pagar com `TronLink`, reconciliar o `txHash` e disparar a ativação em Arbitrum.
            </div>
          </div>

          {order?.status === 'awaiting_payment' ? (
            <div className="rounded-lg p-3" style={{ backgroundColor: 'rgba(255,140,66,0.08)', borderWidth: '1px', borderColor: 'rgba(255,140,66,0.18)' }}>
              <div className="flex items-start gap-2">
                <ArrowUpRight className="w-4 h-4 mt-0.5" style={{ color: 'var(--accent-orange)' }} />
                <div className="text-sm" style={{ color: 'var(--text-2)' }}>
                  A ordem já está pronta para pagamento. Use `Pagar com TronLink` ou reconcilie manualmente um `txHash` já enviado.
                </div>
              </div>
            </div>
          ) : null}

          {feedback ? (
            <div className="rounded-lg p-3 text-sm" style={{ backgroundColor: 'var(--bg-3)', borderWidth: '1px', borderColor: 'var(--stroke-1)', color: 'var(--text-2)' }}>
              {feedback}
            </div>
          ) : null}

          {copyFeedback ? (
            <div className="rounded-lg p-3 text-sm" style={{ backgroundColor: 'var(--bg-3)', borderWidth: '1px', borderColor: 'var(--stroke-1)', color: 'var(--text-2)' }}>
              {copyFeedback}
            </div>
          ) : null}

          {orderQuery.isError ? (
            <div className="rounded-lg p-3 text-sm" style={{ backgroundColor: 'rgba(255,99,99,0.08)', borderWidth: '1px', borderColor: 'rgba(255,99,99,0.18)', color: 'var(--text-2)' }}>
              Não foi possível carregar a ordem rastreada agora.
              <div className="flex gap-2 mt-3">
                <button
                  onClick={() => void orderQuery.refetch()}
                  className="rounded-lg px-3 py-2 text-sm"
                  style={{ backgroundColor: 'var(--bg-3)', borderWidth: '1px', borderColor: 'var(--stroke-1)', color: 'var(--text-1)' }}
                >
                  <RefreshCcw className="w-4 h-4 inline-block mr-2" />
                  Tentar de novo
                </button>
                <button
                  onClick={clearTrackedOrder}
                  className="rounded-lg px-3 py-2 text-sm"
                  style={{ backgroundColor: 'var(--bg-3)', borderWidth: '1px', borderColor: 'var(--stroke-1)', color: 'var(--text-1)' }}
                >
                  <Trash2 className="w-4 h-4 inline-block mr-2" />
                  Limpar rastreamento
                </button>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
