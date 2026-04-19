import { type ReactNode, useEffect, useMemo, useState } from 'react';
import {
  CheckCircle2,
  Coins,
  Copy,
  Link2,
  Loader2,
  RefreshCcw,
  ShieldCheck,
  ShoppingCart,
  Trash2,
  Wallet,
} from 'lucide-react';

import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '../ui/dialog';
import { Drawer, DrawerContent, DrawerDescription, DrawerHeader, DrawerTitle } from '../ui/drawer';
import { useIsMobile } from '../../../hooks/useIsMobile';
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
import type { CheckoutOrder, CheckoutOrderStatus } from '../../../services/checkout-api';

type OperatorCheckoutCardProps = {
  effectiveAccess: boolean;
};

type FlowStage = 'auth' | 'create' | 'bind' | 'payment' | 'activation' | 'success';
type FlowStepState = 'complete' | 'current' | 'upcoming' | 'error';

type FlowStep = {
  id: 'session' | 'order' | 'tron' | 'activation';
  label: string;
  detail: string;
  state: FlowStepState;
};

type StepCardProps = {
  step: FlowStep;
};

type StageActionButtonProps = {
  children: ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  tone?: 'primary' | 'secondary' | 'danger';
};

type DetailRowProps = {
  label: string;
  value?: string | null;
  onCopy?: () => void;
};

const FINAL_ORDER_STATUSES = new Set<CheckoutOrderStatus>(['activated', 'cancelled', 'refunded']);
const ACTIVE_ORDER_STATUSES = new Set<CheckoutOrderStatus>([
  'created',
  'awaiting_payment',
  'payment_seen',
  'payment_confirmed',
  'activation_pending',
  'activation_submitted',
  'activation_failed',
]);

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

function resolveFlowStage({
  effectiveAccess,
  isAuthenticated,
  order,
}: {
  effectiveAccess: boolean;
  isAuthenticated: boolean;
  order?: CheckoutOrder | null;
}): FlowStage {
  if (effectiveAccess && (!order || FINAL_ORDER_STATUSES.has(order.status) || order.status === 'activated')) {
    return 'success';
  }
  if (!isAuthenticated) return 'auth';
  if (!order || FINAL_ORDER_STATUSES.has(order.status)) return 'create';
  if (order.status === 'created') return 'bind';
  if (order.status === 'awaiting_payment' || order.status === 'payment_seen') return 'payment';
  if (
    order.status === 'payment_confirmed' ||
    order.status === 'activation_pending' ||
    order.status === 'activation_submitted' ||
    order.status === 'activation_failed'
  ) {
    return 'activation';
  }
  if (order.status === 'activated') return 'success';
  return 'create';
}

function buildFlowSteps({
  isAuthenticated,
  order,
  flowStage,
}: {
  isAuthenticated: boolean;
  order?: CheckoutOrder | null;
  flowStage: FlowStage;
}): FlowStep[] {
  const hasOrder = Boolean(order && !FINAL_ORDER_STATUSES.has(order.status));
  const hasTronBinding = Boolean(
    order &&
      (order.status === 'awaiting_payment' ||
        order.status === 'payment_seen' ||
        order.status === 'payment_confirmed' ||
        order.status === 'activation_pending' ||
        order.status === 'activation_submitted' ||
        order.status === 'activation_failed' ||
        order.status === 'activated')
  );
  const activationFailed = order?.status === 'activation_failed';
  const activationActive = Boolean(
    order &&
      (order.status === 'payment_confirmed' ||
        order.status === 'activation_pending' ||
        order.status === 'activation_submitted' ||
        order.status === 'activation_failed')
  );

  return [
    {
      id: 'session',
      label: 'Sessão',
      detail: 'EVM + SIWE',
      state: isAuthenticated ? 'complete' : flowStage === 'auth' ? 'current' : 'upcoming',
    },
    {
      id: 'order',
      label: 'Ordem',
      detail: 'ActivationOrder',
      state: hasOrder || order?.status === 'activated' ? 'complete' : flowStage === 'create' ? 'current' : 'upcoming',
    },
    {
      id: 'tron',
      label: 'Tron',
      detail: 'Wallet + USDT',
      state: hasTronBinding || order?.status === 'activated' ? 'complete' : flowStage === 'bind' || flowStage === 'payment' ? 'current' : 'upcoming',
    },
    {
      id: 'activation',
      label: 'Arbitrum',
      detail: 'Mint do Key',
      state: order?.status === 'activated' ? 'complete' : activationFailed ? 'error' : activationActive ? 'current' : 'upcoming',
    },
  ];
}

function stepStyles(state: FlowStepState) {
  if (state === 'complete') {
    return { bg: 'rgba(50,213,131,0.12)', border: 'rgba(50,213,131,0.22)', color: 'var(--ok-green)' };
  }
  if (state === 'current') {
    return { bg: 'rgba(255,140,66,0.12)', border: 'rgba(255,140,66,0.24)', color: 'var(--accent-orange)' };
  }
  if (state === 'error') {
    return { bg: 'rgba(255,99,99,0.10)', border: 'rgba(255,99,99,0.20)', color: 'var(--danger)' };
  }
  return { bg: 'rgba(255,255,255,0.03)', border: 'rgba(255,255,255,0.08)', color: 'var(--text-3)' };
}

function stepIcon(stepId: FlowStep['id']) {
  if (stepId === 'session') return Wallet;
  if (stepId === 'order') return ShoppingCart;
  if (stepId === 'tron') return Coins;
  return ShieldCheck;
}

function countCompletedSteps(steps: FlowStep[]) {
  return steps.filter((step) => step.state === 'complete').length;
}

function progressPercent(steps: FlowStep[]) {
  if (!steps.length) return 0;
  return Math.max(8, Math.round((countCompletedSteps(steps) / steps.length) * 100));
}

function stageSignal(flowStage: FlowStage, order?: CheckoutOrder | null) {
  if (flowStage === 'success') return 'operator active';
  if (flowStage === 'activation' && order?.status === 'activation_failed') return 'retry path';
  if (flowStage === 'activation') return 'mint pending';
  if (flowStage === 'payment') return 'settlement rail';
  if (flowStage === 'bind') return 'wallet binding';
  if (flowStage === 'create') return 'order prep';
  return 'session bootstrap';
}

function stageCopy(flowStage: FlowStage, order?: CheckoutOrder | null) {
  if (flowStage === 'auth') {
    return {
      eyebrow: 'Sessão soberana',
      title: 'Autentique a wallet EVM que vai receber a ativação.',
      description: 'A ordem nasce vinculada à sessão autenticada. Sem SIWE, o checkout não consegue ancorar o target Arbitrum com segurança.',
    };
  }
  if (flowStage === 'create') {
    return {
      eyebrow: 'Preparação',
      title: 'Defina o destino da ativação antes de criar a ordem.',
      description: 'O pagamento acontece em Tron, mas o direito só nasce depois do mint em Arbitrum. Esta tela fixa o target da ativação.',
    };
  }
  if (flowStage === 'bind') {
    return {
      eyebrow: 'Vínculo Tron',
      title: 'Conecte a wallet Tron que vai pagar em USDT.',
      description: 'A buyer wallet fica registrada na ordem. O reconcile só aceita um `txHash` que saia desse endereço para a treasury correta.',
    };
  }
  if (flowStage === 'payment') {
    return {
      eyebrow: 'Rail de pagamento',
      title: 'Pague em Tron e entregue o `txHash` para a reconciliação.',
      description: 'O fluxo já consegue abrir a TronLink, transferir USDT para a treasury e disparar a prova de pagamento no backend.',
    };
  }
  if (flowStage === 'activation') {
    return {
      eyebrow: 'Rail de ativação',
      title: order?.status === 'activation_failed' ? 'O pagamento entrou. Falta concluir o mint em Arbitrum.' : 'O pagamento já foi aceito. Agora a ordem entra na camada de ativação.',
      description: 'Esta etapa valida o recebimento em Tron, resolve o signer correto e executa a ativação do Operator Key na target wallet.',
    };
  }
  return {
    eyebrow: 'Entrega concluída',
    title: 'Operator Key pronto para esta sessão.',
    description: 'O checkout fechou o rail financeiro em Tron e a ativação soberana em Arbitrum. A wallet agora herda a classe Operator.',
  };
}

function cardSynopsis({
  effectiveAccess,
  isAuthenticated,
  order,
}: {
  effectiveAccess: boolean;
  isAuthenticated: boolean;
  order?: CheckoutOrder | null;
}) {
  if (effectiveAccess && (!order || FINAL_ORDER_STATUSES.has(order.status) || order.status === 'activated')) {
    return 'A sessão já está em classe Operator. O modal agora funciona como uma superfície premium para revisar estado, txs e próximos movimentos.';
  }
  if (!isAuthenticated) {
    return 'Abra o modal para autenticar a sessão EVM e iniciar uma ActivationOrder com contexto completo de pagamento e ativação.';
  }
  if (!order || FINAL_ORDER_STATUSES.has(order.status)) {
    return 'Nenhuma ordem ativa nesta sessão. O novo modal conduz a criação da ordem, o vínculo da wallet Tron e a ativação final em Arbitrum em telas separadas.';
  }
  if (order.status === 'created') {
    return 'A ordem já existe. Falta vincular a wallet Tron que vai pagar em USDT.';
  }
  if (order.status === 'awaiting_payment' || order.status === 'payment_seen') {
    return 'A ordem está pronta para pagamento. O modal concentra treasury, contrato USDT, CTA da TronLink e reconcile manual do `txHash`.';
  }
  if (order.status === 'activation_failed') {
    return order.errorMessage || 'O pagamento foi aceito, mas a ativação falhou. O modal expõe o erro e o retry em uma etapa isolada.';
  }
  if (order.status === 'activated') {
    return 'Ativação concluída. O rail financeiro e o mint soberano já fecharam para esta sessão.';
  }
  return 'O pagamento já entrou. O modal acompanha a entrega do Key em Arbitrum e mostra o estado da ativação em tempo real.';
}

function primaryLauncherLabel({
  effectiveAccess,
  order,
}: {
  effectiveAccess: boolean;
  order?: CheckoutOrder | null;
}) {
  if (effectiveAccess && (!order || FINAL_ORDER_STATUSES.has(order.status) || order.status === 'activated')) {
    return 'Revisar estado do Operator';
  }
  if (order && ACTIVE_ORDER_STATUSES.has(order.status)) {
    return 'Continuar ativação premium';
  }
  return 'Abrir checkout premium';
}

function StepCard({ step }: StepCardProps) {
  const tone = stepStyles(step.state);
  const Icon = stepIcon(step.id);

  return (
    <div
      className="group relative overflow-hidden rounded-2xl px-3 py-3 transition-all duration-300 min-h-[88px]"
      style={{ backgroundColor: tone.bg, borderWidth: '1px', borderColor: tone.border }}
    >
      <div
        className="absolute inset-x-0 top-0 h-px opacity-80"
        style={{ background: `linear-gradient(90deg, transparent, ${tone.color}, transparent)` }}
      />
      <div className="flex items-start justify-between gap-2">
        <div className="flex min-w-0 items-start gap-3">
          <div
            className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl transition-transform duration-300 group-hover:scale-105"
            style={{ backgroundColor: 'rgba(255,255,255,0.05)', color: tone.color }}
          >
            <Icon className="w-3.5 h-3.5" />
          </div>
          <div className="min-w-0 pr-1">
            <div className="text-[10px] uppercase tracking-[0.16em]" style={{ color: tone.color }}>
              {step.label}
            </div>
            <div className="mt-1 text-[0.95rem] font-medium leading-5 break-words" style={{ color: 'var(--text-1)' }}>
              {step.detail}
            </div>
          </div>
        </div>
        <div
          className="mt-1 h-2.5 w-2.5 shrink-0 rounded-full"
          style={{ backgroundColor: tone.color, boxShadow: step.state === 'current' ? `0 0 0 6px ${tone.bg}` : 'none' }}
        />
      </div>
    </div>
  );
}

function StageActionButton({ children, onClick, disabled, tone = 'primary' }: StageActionButtonProps) {
  const style =
    tone === 'primary'
      ? { backgroundColor: 'var(--accent-orange)', color: '#161616', borderColor: 'transparent' }
      : tone === 'danger'
        ? { backgroundColor: 'rgba(255,99,99,0.10)', color: 'var(--danger)', borderColor: 'rgba(255,99,99,0.20)' }
        : { backgroundColor: 'var(--bg-3)', color: 'var(--text-1)', borderColor: 'var(--stroke-1)' };

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="rounded-xl px-4 py-3 text-sm font-medium transition-all duration-200 hover:-translate-y-0.5 disabled:opacity-60 disabled:transform-none"
      style={{ borderWidth: '1px', ...style }}
    >
      {children}
    </button>
  );
}

function DetailRow({ label, value, onCopy }: DetailRowProps) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span style={{ color: 'var(--text-3)' }}>{label}</span>
      <div className="flex min-w-0 items-center gap-2">
        <span className="break-all text-right" style={{ color: 'var(--text-1)' }}>
          {value || '--'}
        </span>
        {onCopy ? (
          <button onClick={onCopy} className="shrink-0" style={{ color: 'var(--text-3)' }}>
            <Copy className="w-4 h-4" />
          </button>
        ) : null}
      </div>
    </div>
  );
}

export function OperatorCheckoutCard({ effectiveAccess }: OperatorCheckoutCardProps) {
  const { address, isConnected, isAuthenticated, authStatus, connect } = useAuth();
  const isMobile = useIsMobile();
  const [trackedOrderId, setTrackedOrderId] = useState<string | null>(null);
  const [targetArbitrumAddress, setTargetArbitrumAddress] = useState('');
  const [buyerTronAddress, setBuyerTronAddress] = useState('');
  const [manualTxHash, setManualTxHash] = useState('');
  const [feedback, setFeedback] = useState<string | null>(null);
  const [copyFeedback, setCopyFeedback] = useState<string | null>(null);
  const [isFlowOpen, setIsFlowOpen] = useState(false);

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
  const flowStage = resolveFlowStage({ effectiveAccess, isAuthenticated, order });
  const steps = buildFlowSteps({ isAuthenticated, order, flowStage });
  const stageMeta = stageCopy(flowStage, order);
  const synopsis = cardSynopsis({ effectiveAccess, isAuthenticated, order });
  const completedSteps = countCompletedSteps(steps);
  const flowProgress = progressPercent(steps);

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
    setManualTxHash('');
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

  const sidePanel = (
    <div className="space-y-3">
      <div className="rounded-2xl p-4" style={{ backgroundColor: 'rgba(255,255,255,0.03)', borderWidth: '1px', borderColor: 'rgba(255,255,255,0.08)' }}>
        <div className="flex items-center gap-2 mb-3">
          <ShoppingCart className="w-4 h-4" style={{ color: 'var(--accent-orange)' }} />
          <div className="font-semibold" style={{ color: 'var(--text-1)' }}>Snapshot da ordem</div>
        </div>
        <div className="space-y-2 text-sm">
          <DetailRow label="Status" value={order ? statusLabel(order.status) : effectiveAccess ? 'operator ativo' : '--'} />
          <DetailRow label="Order" value={shortValue(order?.id)} onCopy={order?.id ? () => void copyValue(order.id, 'Order') : undefined} />
          <DetailRow label="Target" value={shortValue(order?.targetArbitrumAddress || targetArbitrumAddress)} onCopy={() => void copyValue(order?.targetArbitrumAddress || targetArbitrumAddress, 'Target')} />
          <DetailRow label="Buyer Tron" value={shortValue(order?.buyerTronAddress || buyerTronAddress)} onCopy={order?.buyerTronAddress || buyerTronAddress ? () => void copyValue(order?.buyerTronAddress || buyerTronAddress, 'Buyer') : undefined} />
          <DetailRow label="Valor" value={`${order?.payment.expectedAmount ?? '100.000000'} USDT`} onCopy={order?.payment.expectedAmount ? () => void copyValue(order.payment.expectedAmount, 'Valor') : undefined} />
        </div>
      </div>

      <div className="rounded-2xl p-4" style={{ backgroundColor: 'rgba(255,140,66,0.08)', borderWidth: '1px', borderColor: 'rgba(255,140,66,0.18)' }}>
        <div className="text-[11px] uppercase tracking-[0.18em] mb-2" style={{ color: 'var(--accent-orange)' }}>
          Split de rede
        </div>
        <div className="text-sm" style={{ color: 'var(--text-2)' }}>
          Tron liquida o pagamento em `USDT`. Arbitrum entrega o entitlement final. Este painel serve só como referência rápida, não como fluxo principal.
        </div>
      </div>

      {hasTrackedOrder ? (
        <div className="grid grid-cols-1 gap-2">
          <StageActionButton onClick={() => void orderQuery.refetch()}>
            Atualizar ordem
          </StageActionButton>
          {order && !FINAL_ORDER_STATUSES.has(order.status) ? (
            <StageActionButton onClick={() => void handleCancelOrder()} disabled={isCancelling} tone="danger">
              {isCancelling ? 'Cancelando...' : 'Cancelar ordem'}
            </StageActionButton>
          ) : (
            <StageActionButton onClick={clearTrackedOrder}>
              Limpar rastreamento
            </StageActionButton>
          )}
        </div>
      ) : null}
    </div>
  );

  const feedbackSurface = feedback || copyFeedback ? (
    <div
      className="rounded-2xl p-4 text-sm"
      style={{ backgroundColor: 'rgba(255,255,255,0.04)', borderWidth: '1px', borderColor: 'var(--stroke-1)', color: 'var(--text-2)' }}
    >
      {feedback || copyFeedback}
    </div>
  ) : null;

  const stageContent = (() => {
    if (flowStage === 'auth') {
      return (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="rounded-2xl p-4" style={{ backgroundColor: 'var(--bg-3)', borderWidth: '1px', borderColor: 'var(--stroke-1)' }}>
              <div className="flex items-center gap-2 mb-3">
                <Wallet className="w-4 h-4" style={{ color: 'var(--accent-orange)' }} />
                <div className="font-semibold" style={{ color: 'var(--text-1)' }}>Sessão EVM</div>
              </div>
              <div className="text-sm" style={{ color: 'var(--text-2)' }}>
                {address
                  ? `Wallet detectada: ${shortValue(address)}. Falta concluir a autenticação SIWE para abrir o rail da ordem.`
                  : 'Nenhuma wallet autenticada ainda. O checkout pede conexão e assinatura antes de criar a ordem.'}
              </div>
            </div>
            <div className="rounded-2xl p-4" style={{ backgroundColor: 'var(--bg-3)', borderWidth: '1px', borderColor: 'var(--stroke-1)' }}>
              <div className="flex items-center gap-2 mb-3">
                <ShieldCheck className="w-4 h-4" style={{ color: 'var(--accent-orange)' }} />
                <div className="font-semibold" style={{ color: 'var(--text-1)' }}>Por que isso vem primeiro</div>
              </div>
              <div className="text-sm" style={{ color: 'var(--text-2)' }}>
                A `ActivationOrder` precisa nascer vinculada à wallet EVM correta. Isso define o target inicial e evita ativação em sessão errada.
              </div>
            </div>
          </div>
          {feedbackSurface}
          <div className="flex flex-wrap gap-2">
            <StageActionButton onClick={() => void handleAuthenticate()} disabled={authStatus === 'connecting' || authStatus === 'signing' || authStatus === 'verifying'}>
              {authStatus === 'connecting' || authStatus === 'signing' || authStatus === 'verifying' ? 'Autenticando...' : 'Autenticar EVM'}
            </StageActionButton>
          </div>
        </div>
      );
    }

    if (flowStage === 'create') {
      return (
        <div className="space-y-4">
          <div className="rounded-2xl p-4" style={{ backgroundColor: 'var(--bg-3)', borderWidth: '1px', borderColor: 'var(--stroke-1)' }}>
            <div className="text-[11px] uppercase tracking-[0.18em] mb-2" style={{ color: 'var(--text-3)' }}>
              Target Arbitrum
            </div>
            <input
              value={targetArbitrumAddress}
              onChange={(event) => setTargetArbitrumAddress(event.target.value)}
              placeholder="0x..."
              className="w-full rounded-xl px-3 py-3 text-sm outline-none"
              style={{ backgroundColor: 'var(--bg-2)', borderWidth: '1px', borderColor: 'var(--stroke-1)', color: 'var(--text-1)' }}
              disabled={Boolean(order && !FINAL_ORDER_STATUSES.has(order.status))}
            />
            <div className="text-sm mt-3" style={{ color: 'var(--text-2)' }}>
              A compra em Tron não concede premium sozinha. O direito só nasce depois da ativação do Key neste endereço.
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="rounded-2xl p-4" style={{ backgroundColor: 'var(--bg-3)', borderWidth: '1px', borderColor: 'var(--stroke-1)' }}>
              <div className="text-[11px] uppercase tracking-[0.18em] mb-2" style={{ color: 'var(--text-3)' }}>Produto</div>
              <div className="text-lg font-semibold" style={{ color: 'var(--text-1)' }}>Operator Key</div>
              <div className="text-sm mt-2" style={{ color: 'var(--text-2)' }}>
                A ordem vai abrir o rail Tron para pagamento em USDT e reservar a ativação em Arbitrum.
              </div>
            </div>
            <div className="rounded-2xl p-4" style={{ backgroundColor: 'var(--bg-3)', borderWidth: '1px', borderColor: 'var(--stroke-1)' }}>
              <div className="text-[11px] uppercase tracking-[0.18em] mb-2" style={{ color: 'var(--text-3)' }}>Preço esperado</div>
              <div className="text-lg font-semibold" style={{ color: 'var(--text-1)' }}>100.000000 USDT</div>
              <div className="text-sm mt-2" style={{ color: 'var(--text-2)' }}>
                A ordem gera os metadados do checkout e prepara o reconcile do `txHash`.
              </div>
            </div>
          </div>

          {feedbackSurface}

          <div className="flex flex-wrap gap-2">
            <StageActionButton onClick={() => void handleCreateOrder()} disabled={!canStartNewOrder || isCreating}>
              {isCreating ? 'Criando ordem...' : 'Criar ActivationOrder'}
            </StageActionButton>
          </div>
        </div>
      );
    }

    if (flowStage === 'bind') {
      return (
        <div className="space-y-4">
          <div className="rounded-2xl p-4" style={{ backgroundColor: 'var(--bg-3)', borderWidth: '1px', borderColor: 'var(--stroke-1)' }}>
            <div className="text-[11px] uppercase tracking-[0.18em] mb-2" style={{ color: 'var(--text-3)' }}>
              Buyer Tron Address
            </div>
            <input
              value={buyerTronAddress}
              onChange={(event) => setBuyerTronAddress(event.target.value)}
              placeholder="T..."
              className="w-full rounded-xl px-3 py-3 text-sm outline-none"
              style={{ backgroundColor: 'var(--bg-2)', borderWidth: '1px', borderColor: 'var(--stroke-1)', color: 'var(--text-1)' }}
            />
            <div className="text-sm mt-3" style={{ color: 'var(--text-2)' }}>
              Se o campo estiver vazio, o fluxo usa o endereço conectado pela TronLink. Se estiver preenchido, ele precisa coincidir com a wallet aberta.
            </div>
          </div>

          <div className="rounded-2xl p-4" style={{ backgroundColor: 'rgba(255,140,66,0.08)', borderWidth: '1px', borderColor: 'rgba(255,140,66,0.18)' }}>
            <div className="flex items-center gap-2 mb-3">
              <Link2 className="w-4 h-4" style={{ color: 'var(--accent-orange)' }} />
              <div className="font-semibold" style={{ color: 'var(--text-1)' }}>Vínculo de sessão Tron</div>
            </div>
            <div className="text-sm" style={{ color: 'var(--text-2)' }}>
              Esta etapa não envia USDT ainda. Ela só fixa a wallet pagadora e prepara a ordem para o rail financeiro.
            </div>
          </div>

          {feedbackSurface}

          <div className="flex flex-wrap gap-2">
            <StageActionButton onClick={() => void handleBindTronSession()} disabled={isBindingTron}>
              {isBindingTron ? 'Vinculando...' : 'Vincular TronLink'}
            </StageActionButton>
          </div>
        </div>
      );
    }

    if (flowStage === 'payment') {
      return (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="rounded-2xl p-4" style={{ backgroundColor: 'var(--bg-3)', borderWidth: '1px', borderColor: 'var(--stroke-1)' }}>
              <div className="text-[11px] uppercase tracking-[0.18em] mb-2" style={{ color: 'var(--text-3)' }}>Treasury Tron</div>
              <div className="text-sm break-all" style={{ color: 'var(--text-1)' }}>{order?.payment.treasuryAddress ?? '--'}</div>
            </div>
            <div className="rounded-2xl p-4" style={{ backgroundColor: 'var(--bg-3)', borderWidth: '1px', borderColor: 'var(--stroke-1)' }}>
              <div className="text-[11px] uppercase tracking-[0.18em] mb-2" style={{ color: 'var(--text-3)' }}>Valor esperado</div>
              <div className="text-lg font-semibold" style={{ color: 'var(--text-1)' }}>{order?.payment.expectedAmount ?? '100.000000'} USDT</div>
            </div>
            <div className="rounded-2xl p-4" style={{ backgroundColor: 'var(--bg-3)', borderWidth: '1px', borderColor: 'var(--stroke-1)' }}>
              <div className="text-[11px] uppercase tracking-[0.18em] mb-2" style={{ color: 'var(--text-3)' }}>USDT contract</div>
              <div className="text-sm break-all" style={{ color: 'var(--text-1)' }}>{order?.payment.assetContract ?? '--'}</div>
            </div>
          </div>

          <div className="rounded-2xl p-4" style={{ backgroundColor: 'rgba(255,140,66,0.08)', borderWidth: '1px', borderColor: 'rgba(255,140,66,0.18)' }}>
            <div className="flex items-center gap-2 mb-3">
              <Coins className="w-4 h-4" style={{ color: 'var(--accent-orange)' }} />
              <div className="font-semibold" style={{ color: 'var(--text-1)' }}>Pagamento guiado</div>
            </div>
            <div className="text-sm" style={{ color: 'var(--text-2)' }}>
              `Pagar com TronLink` executa a transferência para a treasury e já envia o `txHash` ao backend. Se você pagou fora do modal, use o reconcile manual abaixo.
            </div>
          </div>

          <div className="rounded-2xl p-4" style={{ backgroundColor: 'var(--bg-3)', borderWidth: '1px', borderColor: 'var(--stroke-1)' }}>
            <div className="text-[11px] uppercase tracking-[0.18em] mb-2" style={{ color: 'var(--text-3)' }}>
              Reconcile manual do `txHash`
            </div>
            <input
              value={manualTxHash}
              onChange={(event) => setManualTxHash(event.target.value)}
              placeholder="Hash da transação Tron"
              className="w-full rounded-xl px-3 py-3 text-sm outline-none"
              style={{ backgroundColor: 'var(--bg-2)', borderWidth: '1px', borderColor: 'var(--stroke-1)', color: 'var(--text-1)' }}
            />
            <div className="text-sm mt-3" style={{ color: 'var(--text-2)' }}>
              Use esta via se o pagamento já foi enviado e você só precisa provar a transação para a ordem.
            </div>
            <div className="flex flex-wrap gap-2 mt-4">
              <StageActionButton onClick={() => void handleManualReconcile()} disabled={!manualTxHash.trim() || isReconciling} tone="secondary">
                {isReconciling ? 'Reconciliando...' : 'Reconciliar tx'}
              </StageActionButton>
            </div>
          </div>

          {feedbackSurface}

          <div className="flex flex-wrap gap-2">
            <StageActionButton onClick={() => void handlePayWithTronLink()} disabled={isReconciling}>
              {isReconciling ? 'Confirmando pagamento...' : 'Pagar com TronLink'}
            </StageActionButton>
          </div>
        </div>
      );
    }

    if (flowStage === 'activation') {
      return (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="rounded-2xl p-4" style={{ backgroundColor: 'var(--bg-3)', borderWidth: '1px', borderColor: 'var(--stroke-1)' }}>
              <div className="text-[11px] uppercase tracking-[0.18em] mb-2" style={{ color: 'var(--text-3)' }}>Payment tx</div>
              <div className="text-sm break-all" style={{ color: 'var(--text-1)' }}>{order?.paymentTxHash ?? '--'}</div>
            </div>
            <div className="rounded-2xl p-4" style={{ backgroundColor: 'var(--bg-3)', borderWidth: '1px', borderColor: 'var(--stroke-1)' }}>
              <div className="text-[11px] uppercase tracking-[0.18em] mb-2" style={{ color: 'var(--text-3)' }}>Activation tx</div>
              <div className="text-sm break-all" style={{ color: 'var(--text-1)' }}>{order?.activationTxHash ?? '--'}</div>
            </div>
          </div>

          <div
            className="rounded-2xl p-4"
            style={{
              backgroundColor: order?.status === 'activation_failed' ? 'rgba(255,99,99,0.08)' : 'rgba(255,140,66,0.08)',
              borderWidth: '1px',
              borderColor: order?.status === 'activation_failed' ? 'rgba(255,99,99,0.18)' : 'rgba(255,140,66,0.18)',
            }}
          >
            <div className="font-semibold mb-2" style={{ color: 'var(--text-1)' }}>
              {order?.status === 'activation_failed' ? 'Ativação pendurada em erro' : 'Entrega soberana em andamento'}
            </div>
            <div className="text-sm" style={{ color: 'var(--text-2)' }}>
              {order?.errorMessage || 'O backend já aceitou o rail financeiro. Falta fechar o mint do Operator Key no target Arbitrum.'}
            </div>
          </div>

          {feedbackSurface}

          <div className="flex flex-wrap gap-2">
            {order?.status === 'activation_failed' ? (
              <StageActionButton onClick={() => void handleRetryActivation()} disabled={isRetryingActivation}>
                {isRetryingActivation ? 'Reenviando...' : 'Retry ativação'}
              </StageActionButton>
            ) : (
              <StageActionButton onClick={() => void handleProcessActivation()} disabled={isProcessingActivation}>
                {isProcessingActivation ? 'Processando ativação...' : 'Processar ativação'}
              </StageActionButton>
            )}
          </div>
        </div>
      );
    }

    return (
      <div className="space-y-4">
        <div
          className="rounded-2xl p-5"
          style={{ backgroundColor: 'rgba(50,213,131,0.10)', borderWidth: '1px', borderColor: 'rgba(50,213,131,0.18)' }}
        >
          <div className="flex items-center gap-3 mb-3">
            <div
              className="h-11 w-11 rounded-2xl flex items-center justify-center"
              style={{ backgroundColor: 'rgba(50,213,131,0.14)', color: 'var(--ok-green)' }}
            >
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div>
              <div className="font-semibold" style={{ color: 'var(--text-1)' }}>Operator ativado</div>
              <div className="text-sm" style={{ color: 'var(--text-2)' }}>
                A wallet já concluiu o rail financeiro e a entrega soberana.
              </div>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
            <div className="rounded-xl px-3 py-3" style={{ backgroundColor: 'rgba(255,255,255,0.04)' }}>
              <div className="text-[11px] uppercase tracking-[0.18em] mb-1" style={{ color: 'var(--text-3)' }}>Target</div>
              <div className="break-all" style={{ color: 'var(--text-1)' }}>{order?.targetArbitrumAddress || targetArbitrumAddress || '--'}</div>
            </div>
            <div className="rounded-xl px-3 py-3" style={{ backgroundColor: 'rgba(255,255,255,0.04)' }}>
              <div className="text-[11px] uppercase tracking-[0.18em] mb-1" style={{ color: 'var(--text-3)' }}>Activation tx</div>
              <div className="break-all" style={{ color: 'var(--text-1)' }}>{order?.activationTxHash || '--'}</div>
            </div>
          </div>
        </div>

        {feedbackSurface}

        {order && FINAL_ORDER_STATUSES.has(order.status) ? (
          <div className="flex flex-wrap gap-2">
            <StageActionButton onClick={clearTrackedOrder}>
              Nova ordem
            </StageActionButton>
          </div>
        ) : null}
      </div>
    );
  })();

  const flowShell = (
    <div className="flex max-h-[90vh] flex-col overflow-hidden">
      <div
        className="relative overflow-hidden border-b"
        style={{
          borderColor: 'rgba(255,255,255,0.08)',
          background:
            'radial-gradient(circle at top left, rgba(255,140,66,0.22), transparent 34%), radial-gradient(circle at top right, rgba(50,213,131,0.10), transparent 28%), linear-gradient(180deg, rgba(255,255,255,0.04), rgba(255,255,255,0.01))',
        }}
      >
        <div className="relative px-5 py-5 lg:px-6 lg:py-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="max-w-3xl">
              <div className="text-[11px] uppercase tracking-[0.22em] mb-2" style={{ color: 'var(--accent-orange)' }}>
                {stageMeta.eyebrow}
              </div>
              <div className="text-2xl font-semibold leading-tight mb-2" style={{ color: 'var(--text-1)' }}>
                {stageMeta.title}
              </div>
              <div className="text-sm max-w-2xl" style={{ color: 'var(--text-2)' }}>
                {stageMeta.description}
              </div>
            </div>
            <div className="min-w-[220px] rounded-[24px] p-4" style={{ backgroundColor: 'rgba(9,10,11,0.22)', borderWidth: '1px', borderColor: 'rgba(255,255,255,0.08)', backdropFilter: 'blur(14px)' }}>
              <div className="flex items-center justify-between gap-3">
                <div
                  className="rounded-full px-3 py-1 text-[11px] uppercase tracking-[0.18em]"
                  style={{ backgroundColor: orderStatusTone.bg, borderWidth: '1px', borderColor: orderStatusTone.border, color: orderStatusTone.color }}
                >
                  {order ? statusLabel(order.status) : effectiveAccess ? 'operator ativo' : 'checkout idle'}
                </div>
                <div className="text-[11px] uppercase tracking-[0.18em]" style={{ color: 'var(--text-3)' }}>
                  {stageSignal(flowStage, order)}
                </div>
              </div>

              <div className="mt-4 flex items-end justify-between gap-3">
                <div>
                  <div className="text-[10px] uppercase tracking-[0.18em]" style={{ color: 'var(--text-3)' }}>
                    Progresso
                  </div>
                  <div className="text-2xl font-semibold tracking-[-0.03em]" style={{ color: 'var(--text-1)' }}>
                    {completedSteps}/{steps.length}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-[10px] uppercase tracking-[0.18em]" style={{ color: 'var(--text-3)' }}>
                    Rail split
                  </div>
                  <div className="text-sm font-medium" style={{ color: 'var(--text-1)' }}>
                    Tron / Arbitrum
                  </div>
                </div>
              </div>

              <div className="mt-3 h-2 overflow-hidden rounded-full" style={{ backgroundColor: 'rgba(255,255,255,0.08)' }}>
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{
                    width: `${flowProgress}%`,
                    background: 'linear-gradient(90deg, rgba(255,140,66,0.75), rgba(50,213,131,0.8))',
                  }}
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-2 mt-5">
            {steps.map((step) => (
              <StepCard key={step.id} step={step} />
            ))}
          </div>
        </div>
      </div>

      <div className="grid min-h-0 flex-1 grid-cols-1 xl:grid-cols-[minmax(0,1.45fr)_300px]">
        <div className="overflow-y-auto px-5 py-5 lg:px-6 lg:py-6">
          {stageContent}

          {orderQuery.isError ? (
            <div
              className="rounded-2xl p-4 text-sm mt-4"
              style={{ backgroundColor: 'rgba(255,99,99,0.08)', borderWidth: '1px', borderColor: 'rgba(255,99,99,0.18)', color: 'var(--text-2)' }}
            >
              Não foi possível carregar a ordem rastreada agora.
              <div className="flex flex-wrap gap-2 mt-4">
                <StageActionButton onClick={() => void orderQuery.refetch()}>
                  <RefreshCcw className="w-4 h-4 inline-block mr-2" />
                  Tentar de novo
                </StageActionButton>
                <StageActionButton onClick={clearTrackedOrder}>
                  <Trash2 className="w-4 h-4 inline-block mr-2" />
                  Limpar rastreamento
                </StageActionButton>
              </div>
            </div>
          ) : null}
        </div>

        <div
          className="overflow-y-auto border-t xl:border-l xl:border-t-0 px-5 py-5 lg:px-6 lg:py-6"
          style={{ borderColor: 'rgba(255,255,255,0.08)', backgroundColor: 'rgba(255,255,255,0.02)' }}
        >
          {orderQuery.isLoading && trackedOrderId ? (
            <div className="flex items-center gap-2 text-sm" style={{ color: 'var(--text-2)' }}>
              <Loader2 className="w-4 h-4 animate-spin" />
              Carregando ActivationOrder...
            </div>
          ) : (
            sidePanel
          )}
        </div>
      </div>
    </div>
  );

  return (
    <>
      <div
        className="rounded-xl p-5"
        style={{
          background:
            'radial-gradient(circle at top left, rgba(255,140,66,0.16), transparent 30%), linear-gradient(180deg, rgba(255,255,255,0.02), rgba(255,255,255,0.01))',
          backgroundColor: 'var(--bg-2)',
          borderWidth: '1px',
          borderColor: 'var(--stroke-1)',
          boxShadow: 'var(--shadow-1)',
        }}
      >
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="max-w-2xl">
            <div className="text-[11px] uppercase tracking-[0.22em] mb-2" style={{ color: 'var(--accent-orange)' }}>
              Operator Checkout
            </div>
            <div className="text-xl font-semibold leading-tight mb-2" style={{ color: 'var(--text-1)' }}>
              Checkout premium para ativar o Operator Key.
            </div>
            <div className="text-sm" style={{ color: 'var(--text-2)' }}>
              A página mostra só o estado da sessão e um launcher. O fluxo completo acontece dentro do modal.
            </div>
          </div>

          <div
            className="rounded-full px-3 py-1 text-[11px] uppercase tracking-[0.18em]"
            style={{ backgroundColor: orderStatusTone.bg, borderWidth: '1px', borderColor: orderStatusTone.border, color: orderStatusTone.color }}
          >
            {order ? statusLabel(order.status) : effectiveAccess ? 'operator ativo' : 'checkout idle'}
          </div>
        </div>

        <div
          className="mt-5 rounded-2xl p-4"
          style={{ backgroundColor: 'rgba(255,255,255,0.03)', borderWidth: '1px', borderColor: 'rgba(255,255,255,0.08)' }}
        >
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="min-w-0">
              <div className="font-semibold mb-1" style={{ color: 'var(--text-1)' }}>
                {effectiveAccess ? 'Entitlement ativo' : 'Checkout guiado por modal'}
              </div>
              <div className="text-sm max-w-2xl" style={{ color: 'var(--text-2)' }}>
                {synopsis}
              </div>
              {order ? (
                <div className="flex flex-wrap gap-3 mt-3 text-xs uppercase tracking-[0.16em]" style={{ color: 'var(--text-3)' }}>
                  <span>Target {shortValue(order.targetArbitrumAddress)}</span>
                  <span>Order {shortValue(order.id)}</span>
                  <span>{stageSignal(flowStage, order)}</span>
                </div>
              ) : null}
            </div>

            <div className="flex flex-wrap gap-2">
              <StageActionButton onClick={() => setIsFlowOpen(true)}>
                {primaryLauncherLabel({ effectiveAccess, order })}
              </StageActionButton>
              {hasTrackedOrder ? (
                <StageActionButton onClick={() => void orderQuery.refetch()} tone="secondary">
                  Atualizar ordem
                </StageActionButton>
              ) : null}
            </div>
          </div>
        </div>

        {feedbackSurface ? <div className="mt-4">{feedbackSurface}</div> : null}
      </div>

      {isMobile ? (
        <Drawer open={isFlowOpen} onOpenChange={setIsFlowOpen}>
          <DrawerContent
            className="border-[var(--stroke-1)] bg-[var(--bg-1)]"
            style={{ borderColor: 'var(--stroke-1)', backgroundColor: 'var(--bg-1)' }}
          >
            <DrawerHeader className="sr-only">
              <DrawerTitle>Checkout Operator</DrawerTitle>
              <DrawerDescription>Fluxo guiado para ordem, pagamento em Tron e ativação em Arbitrum.</DrawerDescription>
            </DrawerHeader>
            {flowShell}
          </DrawerContent>
        </Drawer>
      ) : (
        <Dialog open={isFlowOpen} onOpenChange={setIsFlowOpen}>
          <DialogContent
            className="max-w-[1120px] p-0 overflow-hidden"
            style={{ backgroundColor: 'var(--bg-1)', borderColor: 'var(--stroke-1)' }}
          >
            <DialogHeader className="sr-only">
              <DialogTitle>Checkout Operator</DialogTitle>
              <DialogDescription>Fluxo guiado para ordem, pagamento em Tron e ativação em Arbitrum.</DialogDescription>
            </DialogHeader>
            {flowShell}
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}
