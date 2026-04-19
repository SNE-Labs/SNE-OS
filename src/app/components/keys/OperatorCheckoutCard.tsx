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
  X,
} from 'lucide-react';

import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '../ui/dialog';
import { Drawer, DrawerContent, DrawerDescription, DrawerHeader, DrawerTitle } from '../ui/drawer';
import { useWallet as useTronWallet } from '@tronweb3/tronwallet-adapter-react-hooks';
import { AdapterState, type Adapter, type AdapterName } from '@tronweb3/tronwallet-abstract-adapter';
import { useIsMobile } from '../../../hooks/useIsMobile';
import { useAuth } from '@/lib/auth/AuthProvider';
import {
  broadcastSignedTransaction,
  buildUsdtTransferTransaction,
  decimalToUnits,
  isTronAddress,
  normalizeTronAddress,
} from '@/lib/tron/tron';
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
type SupportedTronAdapterName = AdapterName<'TronLink'> | AdapterName<'WalletConnect'>;

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

function explainInvalidTronWalletAddress(address: string, connector: SupportedTronAdapterName) {
  const candidate = address.trim();
  if (candidate.startsWith('0x')) {
    return connector === 'WalletConnect'
      ? `O WalletConnect retornou ${candidate}. Vou aceitar isso quando ele mapear para a mesma conta Tron, mas este valor isolado ainda precisa resolver para um address Tron base58 iniciado em T.`
      : `A ${connector} retornou ${candidate}, que não é um address Tron base58 iniciado em T.`;
  }

  return `O conector ${connector} nao retornou um address Tron valido. Recebi ${candidate}.`;
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
      description: 'O fluxo consegue abrir um conector Tron compatível, transferir USDT para a treasury e disparar a prova de pagamento no backend.',
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
    return 'A ordem está pronta para pagamento. O modal concentra treasury, contrato USDT, CTA da wallet Tron e reconcile manual do `txHash`.';
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
      className="flex items-center justify-between gap-2 rounded-full px-2.5 py-1.5 transition-all duration-300"
      style={{ backgroundColor: tone.bg, borderWidth: '1px', borderColor: tone.border }}
    >
      <div className="flex items-center justify-between gap-2 min-w-0">
        <div className="flex min-w-0 items-center gap-2">
          <div
            className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full"
            style={{ backgroundColor: 'rgba(255,255,255,0.05)', color: tone.color }}
          >
            <Icon className="w-2.5 h-2.5" />
          </div>
          <div className="flex min-w-0 items-center gap-1.5">
            <div className="shrink-0 text-[9px] uppercase tracking-[0.14em] leading-none" style={{ color: tone.color }}>
              {step.label}
            </div>
            <div className="text-[12px] font-medium leading-none whitespace-nowrap" style={{ color: 'var(--text-1)' }}>
              {step.detail}
            </div>
          </div>
        </div>
      </div>
      <div
        className="h-1.5 w-1.5 shrink-0 rounded-full"
        style={{ backgroundColor: tone.color, boxShadow: step.state === 'current' ? `0 0 0 4px ${tone.bg}` : 'none' }}
      />
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
      className="inline-flex min-h-11 items-center justify-center rounded-xl px-4 py-3 text-sm font-medium transition-all duration-200 hover:-translate-y-0.5 disabled:opacity-60 disabled:transform-none"
      style={{ borderWidth: '1px', ...style }}
    >
      {children}
    </button>
  );
}

function DetailRow({ label, value, onCopy }: DetailRowProps) {
  return (
    <div className="flex flex-col gap-1.5 sm:flex-row sm:items-center sm:justify-between sm:gap-3">
      <span className="text-[11px] uppercase tracking-[0.16em]" style={{ color: 'var(--text-3)' }}>
        {label}
      </span>
      <div className="flex min-w-0 items-center gap-2 sm:max-w-[65%]">
        <span className="break-all text-left sm:text-right" style={{ color: 'var(--text-1)' }}>
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
  const [showBuyerAddressConfig, setShowBuyerAddressConfig] = useState(false);
  const [showPaymentSurface, setShowPaymentSurface] = useState(false);
  const [showManualBuyerAddress, setShowManualBuyerAddress] = useState(false);
  const [activeTronConnector, setActiveTronConnector] = useState<SupportedTronAdapterName | null>(null);

  const storageKey = useMemo(() => checkoutStorageKey(address), [address]);
  const orderQuery = useCheckoutOrder(trackedOrderId);
  const order = orderQuery.data;
  const {
    wallets: tronWallets,
    wallet: selectedTronWallet,
    address: connectedTronAddress,
    connecting: isConnectingTronWallet,
    connected: isTronWalletConnected,
    disconnecting: isDisconnectingTronWallet,
    select: selectTronWallet,
  } = useTronWallet();

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

  useEffect(() => {
    if (order?.buyerTronAddress) {
      setShowManualBuyerAddress(true);
    }
  }, [order?.buyerTronAddress]);

  useEffect(() => {
    if (selectedTronWallet?.adapter.name === 'TronLink' || selectedTronWallet?.adapter.name === 'WalletConnect') {
      setActiveTronConnector(selectedTronWallet.adapter.name);
    }
  }, [selectedTronWallet]);

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
  const bottomSignalTone = stepStyles(flowStage === 'activation' && order?.status === 'activation_failed' ? 'error' : flowStage === 'success' ? 'complete' : 'current');
  const tronLinkWallet = tronWallets.find((candidate) => candidate.adapter.name === 'TronLink');
  const walletConnectWallet = tronWallets.find((candidate) => candidate.adapter.name === 'WalletConnect');
  const tronLinkAvailable = Boolean(tronLinkWallet && tronLinkWallet.state !== AdapterState.NotFound);
  const walletConnectAvailable = Boolean(walletConnectWallet);
  const hasConnectedTronAddress = Boolean(connectedTronAddress);
  const normalizedConnectedTronAddress = normalizeTronAddress(connectedTronAddress);
  const connectedTronAddressValid = Boolean(normalizedConnectedTronAddress);
  const tronWalletStatusLabel = connectedTronAddress
    ? connectedTronAddressValid
      ? 'Wallet conectada'
      : 'Wallet invalida'
    : activeTronConnector === 'WalletConnect'
      ? 'WalletConnect selecionado'
      : activeTronConnector === 'TronLink'
        ? tronLinkAvailable
          ? 'TronLink disponível'
          : 'TronLink ausente'
        : 'Selecione um conector';
  const tronWalletStatusDescription = connectedTronAddress
    ? connectedTronAddressValid
      ? `${shortValue(connectedTronAddress)} via ${selectedTronWallet?.adapter.name ?? activeTronConnector ?? 'wallet'}`
      : `${shortValue(connectedTronAddress)} nao parece um address Tron base58. Este checkout nao aceita buyer em formato 0x.`
    : activeTronConnector === 'WalletConnect'
      ? 'Abra QR code ou deep link para concluir a conexão com uma wallet Tron compatível.'
      : activeTronConnector === 'TronLink'
        ? tronLinkAvailable
          ? 'A extensão está disponível nesta página. Autorize a wallet que vai pagar em USDT.'
          : 'A TronLink não foi injetada nesta página. Use WalletConnect ou reconcile manual.'
        : 'Escolha TronLink ou WalletConnect para abrir a sessão Tron do checkout.';

  useEffect(() => {
    if (flowStage === 'payment') {
      setShowPaymentSurface(true);
      return;
    }
    setShowPaymentSurface(false);
  }, [flowStage]);

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

  type ConnectedTronWallet = {
    buyerAddress: string;
    connector: SupportedTronAdapterName;
    adapter: Adapter;
  };

  function resolvePreferredTronWalletName(): SupportedTronAdapterName | null {
    if (activeTronConnector) return activeTronConnector;
    if (selectedTronWallet?.adapter.name === 'TronLink' || selectedTronWallet?.adapter.name === 'WalletConnect') {
      return selectedTronWallet.adapter.name;
    }
    if (tronLinkAvailable) return 'TronLink';
    if (walletConnectAvailable) return 'WalletConnect';
    return null;
  }

  async function connectTronAdapter(adapterName: SupportedTronAdapterName): Promise<ConnectedTronWallet> {
    const targetWallet = tronWallets.find((candidate) => candidate.adapter.name === adapterName);
    if (!targetWallet) {
      throw new Error(`O conector ${adapterName} não está disponível nesta sessão.`);
    }

    setActiveTronConnector(adapterName);
    selectTronWallet(targetWallet.adapter.name);
    await targetWallet.adapter.connect();

    const nextAddress = targetWallet.adapter.address?.trim();
    if (!nextAddress) {
      throw new Error(`O conector ${adapterName} não retornou uma wallet Tron conectada.`);
    }
    const normalizedNextAddress = normalizeTronAddress(nextAddress);
    if (!normalizedNextAddress) {
      throw new Error(explainInvalidTronWalletAddress(nextAddress, adapterName));
    }

    return {
      buyerAddress: normalizedNextAddress,
      connector: adapterName,
      adapter: targetWallet.adapter,
    };
  }

  async function ensureConnectedTronWallet(): Promise<ConnectedTronWallet> {
    const preferredConnector = resolvePreferredTronWalletName();
    if (!preferredConnector) {
      throw new Error('Nenhum conector Tron disponível. Use WalletConnect ou o reconcile manual do txHash.');
    }

    if (
      connectedTronAddress &&
      normalizedConnectedTronAddress &&
      selectedTronWallet?.adapter &&
      selectedTronWallet?.adapter.name &&
      (selectedTronWallet.adapter.name === 'TronLink' || selectedTronWallet.adapter.name === 'WalletConnect')
    ) {
      return {
        buyerAddress: normalizedConnectedTronAddress,
        connector: selectedTronWallet.adapter.name,
        adapter: selectedTronWallet.adapter,
      };
    }

    return connectTronAdapter(preferredConnector);
  }

  async function handleConnectTronAdapter(adapterName: SupportedTronAdapterName) {
    try {
      setFeedback(
        adapterName === 'WalletConnect'
          ? 'Abrindo WalletConnect para conectar a wallet pagadora...'
          : 'Abrindo TronLink para conectar a wallet pagadora...'
      );
      const { buyerAddress: nextAddress } = await connectTronAdapter(adapterName);
      setBuyerTronAddress((current) => normalizeTronAddress(current) || nextAddress);
      setFeedback(`${adapterName} conectada com ${shortValue(nextAddress)}.`);
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : 'Falha ao conectar a wallet Tron.');
    }
  }

  async function handleBindTronSession() {
    if (!trackedOrderId) return;
    try {
      setFeedback(null);
      const { buyerAddress: connectedTronAddress, connector } = await ensureConnectedTronWallet();
      const resolvedBuyerAddress = normalizeTronAddress(buyerTronAddress) || connectedTronAddress;
      if (!resolvedBuyerAddress || !isTronAddress(resolvedBuyerAddress)) {
        throw new Error('Buyer Tron Address invalido. Use um endereco Tron base58 iniciado em T.');
      }
      if (resolvedBuyerAddress !== connectedTronAddress) {
        throw new Error(`A wallet Tron conectada não coincide com a buyer wallet informada (${resolvedBuyerAddress}).`);
      }
      const updatedOrder = await bindTronMutation.mutateAsync({
        orderId: trackedOrderId,
        payload: {
          buyerTronAddress: resolvedBuyerAddress,
          walletProvider: connector.toLowerCase(),
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

  async function handlePayWithTronWallet() {
    if (!trackedOrderId || !order?.payment.assetContract || !order.payment.treasuryAddress) return;
    try {
      setFeedback(null);
      const { buyerAddress, adapter: activeAdapter } = await ensureConnectedTronWallet();
      const expectedFromAddress = order.buyerTronAddress?.trim();
      if (expectedFromAddress && buyerAddress !== expectedFromAddress) {
        throw new Error(`A wallet Tron conectada não corresponde à buyer wallet vinculada (${expectedFromAddress}).`);
      }

      const amountUnits = decimalToUnits(order.payment.expectedAmount, order.payment.assetDecimals);
      const unsignedTransaction = await buildUsdtTransferTransaction({
        contractAddress: order.payment.assetContract,
        to: order.payment.treasuryAddress,
        amountUnits,
        ownerAddress: buyerAddress,
        rpcUrl: order.payment.rpcUrl,
      });
      const signedTransaction = await activeAdapter.signTransaction(unsignedTransaction);
      const payment = await broadcastSignedTransaction({
        signedTransaction,
        rpcUrl: order.payment.rpcUrl,
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
      setFeedback(error instanceof Error ? error.message : 'Falha ao pagar com a wallet Tron.');
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
    <div
      className="rounded-2xl p-4"
      style={{ backgroundColor: 'rgba(255,255,255,0.03)', borderWidth: '1px', borderColor: 'rgba(255,255,255,0.08)' }}
    >
      <div className="text-[10px] uppercase tracking-[0.2em] mb-2" style={{ color: 'var(--text-3)' }}>
        Resumo operacional
      </div>
      <div className="flex items-center gap-2 mb-3">
        <ShoppingCart className="w-4 h-4" style={{ color: 'var(--accent-orange)' }} />
        <div className="font-semibold" style={{ color: 'var(--text-1)' }}>
          Snapshot da ordem
        </div>
      </div>
      <div className="space-y-2 text-sm">
        <DetailRow label="Status" value={order ? statusLabel(order.status) : effectiveAccess ? 'operator ativo' : '--'} />
        <DetailRow label="Order" value={shortValue(order?.id)} onCopy={order?.id ? () => void copyValue(order.id, 'Order') : undefined} />
        <DetailRow label="Target" value={shortValue(order?.targetArbitrumAddress || targetArbitrumAddress)} onCopy={() => void copyValue(order?.targetArbitrumAddress || targetArbitrumAddress, 'Target')} />
        <DetailRow label="Buyer Tron" value={shortValue(order?.buyerTronAddress || buyerTronAddress)} onCopy={order?.buyerTronAddress || buyerTronAddress ? () => void copyValue(order?.buyerTronAddress || buyerTronAddress, 'Buyer') : undefined} />
        <DetailRow label="Valor" value={`${order?.payment.expectedAmount ?? '100.000000'} USDT`} onCopy={order?.payment.expectedAmount ? () => void copyValue(order.payment.expectedAmount, 'Valor') : undefined} />
      </div>

      <div className="my-4 h-px" style={{ backgroundColor: 'rgba(255,255,255,0.08)' }} />

      <div className="text-[11px] uppercase tracking-[0.18em] mb-2" style={{ color: 'var(--accent-orange)' }}>
        Split de rede
      </div>
      <div className="text-sm leading-6" style={{ color: 'var(--text-2)' }}>
        Tron liquida o pagamento em USDT. Arbitrum entrega o entitlement final. Este painel serve só como referência rápida.
      </div>
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

  const tronBindingSurface =
    (flowStage === 'bind' || flowStage === 'payment') && showBuyerAddressConfig ? (
      <>
        {isMobile ? (
          <button
            type="button"
            aria-label="Fechar vinculo Tron"
            className="fixed inset-0 z-[70] bg-black/55"
            onClick={() => setShowBuyerAddressConfig(false)}
          />
        ) : null}
        <div
          className={
            isMobile
              ? 'fixed inset-x-3 bottom-3 top-[5.5rem] z-[80]'
              : 'absolute left-full top-6 z-20 ml-4'
          }
          style={
            isMobile
              ? undefined
              : {
                  width: 'min(388px, calc(100vw - 2rem))',
                }
          }
        >
          <div
            className="flex h-full max-h-[calc(100vh-7rem)] flex-col overflow-hidden rounded-[28px]"
            style={{
              backgroundColor: 'var(--bg-2)',
              borderWidth: '1px',
              borderColor: 'rgba(255,255,255,0.10)',
              boxShadow: '0 28px 80px rgba(0,0,0,0.34)',
            }}
          >
            <div
              className="flex items-start justify-between gap-3 border-b px-5 py-4"
              style={{ borderColor: 'rgba(255,255,255,0.08)' }}
            >
              <div>
                <div className="text-[11px] uppercase tracking-[0.18em]" style={{ color: 'var(--accent-orange)' }}>
                  Vinculo Tron
                </div>
                <div className="mt-1 text-base font-semibold" style={{ color: 'var(--text-1)' }}>
                  Wallet + buyer
                </div>
                <div className="mt-2 text-sm leading-6" style={{ color: 'var(--text-2)' }}>
                  Conecte a wallet pagadora e, se precisar, trave manualmente o buyer address.
                </div>
              </div>
              <button onClick={() => setShowBuyerAddressConfig(false)} style={{ color: 'var(--text-3)' }}>
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5">
              <div className="space-y-4">
                <div
                  className="rounded-2xl p-4"
                  style={{
                    backgroundColor: hasConnectedTronAddress
                      ? connectedTronAddressValid
                        ? 'rgba(50,213,131,0.10)'
                        : 'rgba(255,99,99,0.10)'
                      : 'rgba(255,255,255,0.03)',
                    borderWidth: '1px',
                    borderColor: hasConnectedTronAddress
                      ? connectedTronAddressValid
                        ? 'rgba(50,213,131,0.18)'
                        : 'rgba(255,99,99,0.18)'
                      : 'rgba(255,255,255,0.08)',
                  }}
                >
                  <div className="text-[11px] uppercase tracking-[0.18em] mb-1" style={{ color: 'var(--text-3)' }}>
                    Sessao Tron
                  </div>
                  <div className="font-semibold" style={{ color: 'var(--text-1)' }}>
                    {tronWalletStatusLabel}
                  </div>
                  <div className="mt-2 text-sm leading-6" style={{ color: 'var(--text-2)' }}>
                    {tronWalletStatusDescription}
                  </div>
                  <div className="mt-4 grid grid-cols-2 gap-2">
                    <StageActionButton
                      onClick={() => void handleConnectTronAdapter('TronLink')}
                      disabled={isConnectingTronWallet || isDisconnectingTronWallet || !tronLinkWallet}
                      tone={activeTronConnector === 'TronLink' ? 'primary' : 'secondary'}
                    >
                      {isConnectingTronWallet && activeTronConnector === 'TronLink' ? 'Conectando...' : 'TronLink'}
                    </StageActionButton>
                    <StageActionButton
                      onClick={() => void handleConnectTronAdapter('WalletConnect')}
                      disabled={isConnectingTronWallet || isDisconnectingTronWallet || !walletConnectAvailable}
                      tone={activeTronConnector === 'WalletConnect' ? 'primary' : 'secondary'}
                    >
                      {isConnectingTronWallet && activeTronConnector === 'WalletConnect' ? 'Abrindo QR...' : 'WalletConnect'}
                    </StageActionButton>
                  </div>
                </div>

                <div
                  className="rounded-2xl p-4"
                  style={{ backgroundColor: 'rgba(255,255,255,0.03)', borderWidth: '1px', borderColor: 'rgba(255,255,255,0.08)' }}
                >
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <div className="text-[11px] uppercase tracking-[0.18em] mb-1" style={{ color: 'var(--text-3)' }}>
                        Buyer Tron
                      </div>
                      <div className="text-sm leading-6" style={{ color: 'var(--text-2)' }}>
                        O checkout usa a wallet conectada por padrao. Abra a configuracao manual apenas se quiser travar explicitamente o buyer.
                      </div>
                    </div>
                    <StageActionButton onClick={() => setShowManualBuyerAddress((current) => !current)} tone="secondary">
                      {showManualBuyerAddress ? 'Ocultar' : 'Configurar'}
                    </StageActionButton>
                  </div>

                  {showManualBuyerAddress ? (
                    <div className="mt-4">
                      <input
                        value={buyerTronAddress}
                        onChange={(event) => setBuyerTronAddress(event.target.value)}
                        placeholder="T..."
                        className="w-full rounded-xl px-3 py-3 text-sm outline-none"
                        style={{ backgroundColor: 'var(--bg-1)', borderWidth: '1px', borderColor: 'var(--stroke-1)', color: 'var(--text-1)' }}
                      />
                      <div className="mt-3 text-sm leading-6" style={{ color: 'var(--text-2)' }}>
                        Se voce preencher, ele precisa bater exatamente com a wallet Tron conectada.
                      </div>
                    </div>
                  ) : null}
                </div>

                {feedbackSurface}

                <div
                  className="rounded-2xl p-4"
                  style={{ backgroundColor: 'rgba(255,255,255,0.03)', borderWidth: '1px', borderColor: 'rgba(255,255,255,0.08)' }}
                >
                  <div className="text-[11px] uppercase tracking-[0.18em] mb-3" style={{ color: 'var(--text-3)' }}>
                    Resumo operacional
                  </div>
                  <div className="space-y-2 text-sm">
                    <DetailRow label="Status" value={order ? statusLabel(order.status) : '--'} />
                    <DetailRow label="Order" value={shortValue(order?.id)} />
                    <DetailRow label="Target" value={shortValue(order?.targetArbitrumAddress || targetArbitrumAddress)} />
                    <DetailRow label="Buyer Tron" value={shortValue(order?.buyerTronAddress || buyerTronAddress || connectedTronAddress)} />
                    <DetailRow label="Valor" value={`${order?.payment.expectedAmount ?? '100.000000'} USDT`} />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </>
    ) : null;

  const paymentRailSurface =
    flowStage === 'payment' && showPaymentSurface ? (
      <>
        {isMobile ? (
          <button
            type="button"
            aria-label="Fechar rail de pagamento"
            className="fixed inset-0 z-[70] bg-black/55"
            onClick={() => setShowPaymentSurface(false)}
          />
        ) : null}
        <div
          className={
            isMobile
              ? 'fixed inset-x-3 bottom-3 top-[5.5rem] z-[80]'
              : 'absolute left-full top-6 z-20 ml-4'
          }
          style={
            isMobile
              ? undefined
              : {
                  width: 'min(460px, calc(100vw - 2rem))',
                }
          }
        >
          <div
            className="flex h-full max-h-[calc(100vh-7rem)] flex-col overflow-hidden rounded-[28px]"
            style={{
              backgroundColor: 'var(--bg-2)',
              borderWidth: '1px',
              borderColor: 'rgba(255,255,255,0.10)',
              boxShadow: '0 28px 80px rgba(0,0,0,0.34)',
            }}
          >
            <div
              className="flex items-start justify-between gap-3 border-b px-5 py-4"
              style={{ borderColor: 'rgba(255,255,255,0.08)' }}
            >
              <div>
                <div className="text-[11px] uppercase tracking-[0.18em]" style={{ color: 'var(--accent-orange)' }}>
                  Rail de pagamento
                </div>
                <div className="mt-1 text-base font-semibold" style={{ color: 'var(--text-1)' }}>
                  Tron settlement
                </div>
                <div className="mt-2 text-sm leading-6" style={{ color: 'var(--text-2)' }}>
                  Tudo que envolve treasury, USDT, wallet Tron, pagamento guiado e reconcile manual fica concentrado aqui.
                </div>
              </div>
              <button onClick={() => setShowPaymentSurface(false)} style={{ color: 'var(--text-3)' }}>
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5">
              <div className="space-y-4">
                <div className="grid grid-cols-1 gap-3">
                  <div className="rounded-2xl p-4" style={{ backgroundColor: 'var(--bg-3)', borderWidth: '1px', borderColor: 'var(--stroke-1)' }}>
                    <div className="text-[11px] uppercase tracking-[0.18em] mb-2" style={{ color: 'var(--text-3)' }}>Treasury Tron</div>
                    <div className="text-sm break-all" style={{ color: 'var(--text-1)' }}>{order?.payment.treasuryAddress ?? '--'}</div>
                  </div>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <div className="rounded-2xl p-4" style={{ backgroundColor: 'var(--bg-3)', borderWidth: '1px', borderColor: 'var(--stroke-1)' }}>
                      <div className="text-[11px] uppercase tracking-[0.18em] mb-2" style={{ color: 'var(--text-3)' }}>Valor esperado</div>
                      <div className="text-lg font-semibold" style={{ color: 'var(--text-1)' }}>{order?.payment.expectedAmount ?? '100.000000'} USDT</div>
                    </div>
                    <div className="rounded-2xl p-4" style={{ backgroundColor: 'var(--bg-3)', borderWidth: '1px', borderColor: 'var(--stroke-1)' }}>
                      <div className="text-[11px] uppercase tracking-[0.18em] mb-2" style={{ color: 'var(--text-3)' }}>USDT contract</div>
                      <div className="text-sm break-all" style={{ color: 'var(--text-1)' }}>{order?.payment.assetContract ?? '--'}</div>
                    </div>
                  </div>
                </div>

                <div
                  className="rounded-2xl p-4"
                  style={{ backgroundColor: 'rgba(255,255,255,0.03)', borderWidth: '1px', borderColor: 'rgba(255,255,255,0.08)' }}
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="text-[11px] uppercase tracking-[0.18em] mb-1" style={{ color: 'var(--text-3)' }}>
                        Sessão Tron
                      </div>
                      <div className="font-semibold" style={{ color: 'var(--text-1)' }}>
                        {tronWalletStatusLabel}
                      </div>
                      <div className="mt-1 text-sm leading-6" style={{ color: 'var(--text-2)' }}>
                        {normalizedConnectedTronAddress
                          ? `A transferência sairá de ${shortValue(normalizedConnectedTronAddress)}.`
                          : tronWalletStatusDescription}
                      </div>
                    </div>
                    <StageActionButton onClick={() => setShowBuyerAddressConfig(true)} tone="secondary">
                      Editar buyer
                    </StageActionButton>
                  </div>

                  <div className="mt-4 grid grid-cols-2 gap-2">
                    <StageActionButton
                      onClick={() => void handleConnectTronAdapter('TronLink')}
                      disabled={isConnectingTronWallet || isDisconnectingTronWallet || !tronLinkWallet}
                      tone={activeTronConnector === 'TronLink' ? 'primary' : 'secondary'}
                    >
                      {isConnectingTronWallet && activeTronConnector === 'TronLink' ? 'Conectando...' : 'TronLink'}
                    </StageActionButton>
                    <StageActionButton
                      onClick={() => void handleConnectTronAdapter('WalletConnect')}
                      disabled={isConnectingTronWallet || isDisconnectingTronWallet || !walletConnectAvailable}
                      tone={activeTronConnector === 'WalletConnect' ? 'primary' : 'secondary'}
                    >
                      {isConnectingTronWallet && activeTronConnector === 'WalletConnect' ? 'Abrindo QR...' : 'WalletConnect'}
                    </StageActionButton>
                  </div>
                </div>

                <div className="rounded-2xl p-4" style={{ backgroundColor: 'rgba(255,140,66,0.08)', borderWidth: '1px', borderColor: 'rgba(255,140,66,0.18)' }}>
                  <div className="flex items-center gap-2 mb-3">
                    <Coins className="w-4 h-4" style={{ color: 'var(--accent-orange)' }} />
                    <div className="font-semibold" style={{ color: 'var(--text-1)' }}>Pagamento guiado</div>
                  </div>
                  <div className="text-sm leading-6" style={{ color: 'var(--text-2)' }}>
                    `Pagar com wallet Tron` assina a transferência TRC-20 pelo conector ativo e já envia o `txHash` ao backend.
                  </div>
                  <div className="flex flex-wrap gap-2 mt-4">
                    <StageActionButton onClick={() => void handlePayWithTronWallet()} disabled={isReconciling || isConnectingTronWallet || isDisconnectingTronWallet}>
                      {isReconciling ? 'Confirmando pagamento...' : 'Pagar com wallet Tron'}
                    </StageActionButton>
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
                  <div className="text-sm mt-3 leading-6" style={{ color: 'var(--text-2)' }}>
                    Use esta via se o pagamento já foi enviado e você só precisa provar a transação para a ordem.
                  </div>
                  <div className="flex flex-wrap gap-2 mt-4">
                    <StageActionButton onClick={() => void handleManualReconcile()} disabled={!manualTxHash.trim() || isReconciling} tone="secondary">
                      {isReconciling ? 'Reconciliando...' : 'Reconciliar tx'}
                    </StageActionButton>
                  </div>
                </div>

                <div
                  className="rounded-2xl p-4"
                  style={{ backgroundColor: 'rgba(255,255,255,0.03)', borderWidth: '1px', borderColor: 'rgba(255,255,255,0.08)' }}
                >
                  <div className="text-[11px] uppercase tracking-[0.18em] mb-3" style={{ color: 'var(--text-3)' }}>
                    Resumo operacional
                  </div>
                  <div className="space-y-2 text-sm">
                    <DetailRow label="Status" value={order ? statusLabel(order.status) : '--'} />
                    <DetailRow label="Order" value={shortValue(order?.id)} />
                    <DetailRow label="Target" value={shortValue(order?.targetArbitrumAddress || targetArbitrumAddress)} />
                    <DetailRow label="Buyer Tron" value={shortValue(order?.buyerTronAddress || buyerTronAddress || normalizedConnectedTronAddress)} />
                    <DetailRow label="Valor" value={`${order?.payment.expectedAmount ?? '100.000000'} USDT`} />
                  </div>
                </div>

                {feedbackSurface}
              </div>
            </div>
          </div>
        </div>
      </>
    ) : null;

  const stageContent = (() => {
    if (flowStage === 'auth') {
      return (
        <div className="space-y-4">
          <div className="rounded-2xl p-5" style={{ backgroundColor: 'var(--bg-3)', borderWidth: '1px', borderColor: 'var(--stroke-1)' }}>
            <div className="flex items-center gap-2 mb-3">
              <Wallet className="w-4 h-4" style={{ color: 'var(--accent-orange)' }} />
              <div className="font-semibold" style={{ color: 'var(--text-1)' }}>Sessão EVM</div>
            </div>
            <div className="space-y-3 text-sm leading-6" style={{ color: 'var(--text-2)' }}>
              <p>
                {address
                  ? `Wallet detectada: ${shortValue(address)}. Falta concluir a autenticação SIWE para abrir o rail da ordem.`
                  : 'Nenhuma wallet autenticada ainda. O checkout pede conexão e assinatura antes de criar a ordem.'}
              </p>
              <p>
                A `ActivationOrder` precisa nascer vinculada à wallet EVM correta. Isso define o target inicial e evita ativação em sessão errada.
              </p>
            </div>
          </div>
          {feedbackSurface}
        </div>
      );
    }

    if (flowStage === 'create') {
      return (
        <div className="space-y-4">
          <div className="rounded-2xl p-5" style={{ backgroundColor: 'var(--bg-3)', borderWidth: '1px', borderColor: 'var(--stroke-1)' }}>
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

            <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="rounded-xl p-3" style={{ backgroundColor: 'rgba(255,255,255,0.03)' }}>
                <div className="text-[11px] uppercase tracking-[0.18em] mb-2" style={{ color: 'var(--text-3)' }}>Produto</div>
                <div className="text-base font-semibold" style={{ color: 'var(--text-1)' }}>Operator Key</div>
              </div>
              <div className="rounded-xl p-3" style={{ backgroundColor: 'rgba(255,255,255,0.03)' }}>
                <div className="text-[11px] uppercase tracking-[0.18em] mb-2" style={{ color: 'var(--text-3)' }}>Preço esperado</div>
                <div className="text-base font-semibold" style={{ color: 'var(--text-1)' }}>100.000000 USDT</div>
              </div>
            </div>
          </div>

          {feedbackSurface}
        </div>
      );
    }

    if (flowStage === 'bind') {
      return (
        <div className="space-y-4 max-w-[760px]">
          <div className="rounded-2xl p-5" style={{ backgroundColor: 'var(--bg-3)', borderWidth: '1px', borderColor: 'var(--stroke-1)' }}>
            <div className="flex items-center gap-2 mb-3">
              <Link2 className="w-4 h-4" style={{ color: 'var(--accent-orange)' }} />
              <div className="font-semibold" style={{ color: 'var(--text-1)' }}>
                Vínculo da wallet Tron
              </div>
            </div>
            <div className="text-sm leading-6" style={{ color: 'var(--text-2)' }}>
              Esta etapa só prepara a wallet pagadora. O vínculo detalhado abre em uma segunda superfície lateral, separada do fluxo principal.
            </div>

            <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="rounded-xl p-4" style={{ backgroundColor: 'rgba(255,255,255,0.03)' }}>
                <div className="text-[11px] uppercase tracking-[0.18em] mb-2" style={{ color: 'var(--text-3)' }}>
                  Status
                </div>
                <div className="text-base font-semibold" style={{ color: 'var(--text-1)' }}>
                  {statusLabel(order?.status)}
                </div>
                <div className="mt-2 text-sm" style={{ color: 'var(--text-2)' }}>
                  {order?.buyerTronAddress ? `Buyer atual ${shortValue(order.buyerTronAddress)}` : 'Nenhum buyer Tron fixado ainda.'}
                </div>
              </div>
              <div className="rounded-xl p-4" style={{ backgroundColor: 'rgba(255,255,255,0.03)' }}>
                <div className="text-[11px] uppercase tracking-[0.18em] mb-2" style={{ color: 'var(--text-3)' }}>
                  Target
                </div>
                <div className="text-base font-semibold break-all" style={{ color: 'var(--text-1)' }}>
                  {order?.targetArbitrumAddress || targetArbitrumAddress || '--'}
                </div>
              </div>
            </div>

            <div className="mt-5 flex flex-wrap items-center gap-2">
              <StageActionButton onClick={() => setShowBuyerAddressConfig(true)} tone="secondary">
                Abrir modal Tron
              </StageActionButton>
              {connectedTronAddress ? (
                <span className="text-xs uppercase tracking-[0.16em]" style={{ color: connectedTronAddressValid ? 'var(--text-3)' : 'var(--danger)' }}>
                  {connectedTronAddressValid ? `Conectada ${shortValue(connectedTronAddress)}` : `Wallet invalida ${shortValue(connectedTronAddress)}`}
                </span>
              ) : null}
            </div>
          </div>

          {!showBuyerAddressConfig ? feedbackSurface : null}
        </div>
      );
    }

    if (flowStage === 'payment') {
      return (
        <div className="space-y-4">
          <div className="rounded-2xl p-5" style={{ backgroundColor: 'var(--bg-3)', borderWidth: '1px', borderColor: 'var(--stroke-1)' }}>
            <div className="flex items-center gap-2 mb-3">
              <Coins className="w-4 h-4" style={{ color: 'var(--accent-orange)' }} />
              <div className="font-semibold" style={{ color: 'var(--text-1)' }}>Liquidação em Tron</div>
            </div>
            <div className="space-y-3 text-sm leading-6" style={{ color: 'var(--text-2)' }}>
              <p>
                O modal principal fica limpo e o rail financeiro abre numa superfície lateral própria. Lá dentro você encontra treasury, contrato USDT, wallet Tron, pagamento guiado e reconcile manual.
              </p>
              <p>
                Se precisar revisar ou trocar a buyer wallet antes de pagar, abra também o painel de vínculo Tron sem sair desta etapa.
              </p>
            </div>

            <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="rounded-xl p-4" style={{ backgroundColor: 'rgba(255,255,255,0.03)' }}>
                <div className="text-[11px] uppercase tracking-[0.18em] mb-2" style={{ color: 'var(--text-3)' }}>
                  Buyer ativo
                </div>
                <div className="text-base font-semibold break-all" style={{ color: 'var(--text-1)' }}>
                  {order?.buyerTronAddress || normalizedConnectedTronAddress || '--'}
                </div>
              </div>
              <div className="rounded-xl p-4" style={{ backgroundColor: 'rgba(255,255,255,0.03)' }}>
                <div className="text-[11px] uppercase tracking-[0.18em] mb-2" style={{ color: 'var(--text-3)' }}>
                  Valor
                </div>
                <div className="text-base font-semibold" style={{ color: 'var(--text-1)' }}>
                  {order?.payment.expectedAmount ?? '100.000000'} USDT
                </div>
              </div>
            </div>

            <div className="mt-5 flex flex-wrap gap-2">
              <StageActionButton onClick={() => setShowPaymentSurface(true)}>
                Abrir modal de pagamento
              </StageActionButton>
              <StageActionButton onClick={() => setShowBuyerAddressConfig(true)} tone="secondary">
                Abrir modal Tron
              </StageActionButton>
            </div>
          </div>

          {feedbackSurface}
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
    <div className="relative flex max-h-[90vh] flex-col overflow-visible">
      <div
        className="relative overflow-hidden border-b"
        style={{
          borderColor: 'rgba(255,255,255,0.08)',
          background:
            'radial-gradient(circle at top left, rgba(255,140,66,0.22), transparent 34%), radial-gradient(circle at top right, rgba(50,213,131,0.10), transparent 28%), linear-gradient(180deg, rgba(255,255,255,0.04), rgba(255,255,255,0.01))',
        }}
      >
        <div className="relative px-5 py-4 lg:px-6 lg:py-5">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="max-w-3xl">
              <div className="text-[11px] uppercase tracking-[0.22em] mb-2" style={{ color: 'var(--accent-orange)' }}>
                {stageMeta.eyebrow}
              </div>
              <div className="mb-2 text-[1.6rem] font-semibold leading-tight tracking-[-0.03em] lg:text-[1.82rem]" style={{ color: 'var(--text-1)' }}>
                {stageMeta.title}
              </div>
              <div className="max-w-[760px] text-sm leading-6" style={{ color: 'var(--text-2)' }}>
                {stageMeta.description}
              </div>
            </div>
            <div className="flex flex-wrap items-center justify-end gap-2">
              <div
                className="rounded-full px-3 py-1 text-[11px] uppercase tracking-[0.18em]"
                style={{ backgroundColor: orderStatusTone.bg, borderWidth: '1px', borderColor: orderStatusTone.border, color: orderStatusTone.color }}
              >
                {order ? statusLabel(order.status) : effectiveAccess ? 'operator ativo' : 'checkout idle'}
              </div>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-1 gap-2">
            {steps.map((step) => (
              <StepCard key={step.id} step={step} />
            ))}
          </div>
        </div>
      </div>

      <div className={`grid min-h-0 flex-1 ${flowStage === 'activation' || flowStage === 'success' ? 'grid-cols-1 xl:grid-cols-[minmax(0,1.62fr)_320px]' : 'grid-cols-1'}`}>
        <div className="overflow-y-auto px-5 py-5 lg:px-6 lg:py-6">
          <div className="max-w-[780px]">
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
        </div>

        {flowStage === 'activation' || flowStage === 'success' ? (
          <div
            className="overflow-y-auto border-t px-5 py-5 xl:border-l xl:border-t-0 lg:px-6 lg:py-6"
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
        ) : null}
      </div>

      <div
        className="border-t px-5 py-3 lg:px-6"
        style={{ borderColor: 'rgba(255,255,255,0.08)', backgroundColor: 'rgba(255,255,255,0.02)' }}
      >
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            {hasTrackedOrder && (flowStage === 'payment' || flowStage === 'activation' || flowStage === 'success') ? (
              <StageActionButton onClick={() => void orderQuery.refetch()} tone="secondary">
                Atualizar ordem
              </StageActionButton>
            ) : null}
            {order && !FINAL_ORDER_STATUSES.has(order.status) && flowStage !== 'auth' ? (
              <StageActionButton onClick={() => void handleCancelOrder()} disabled={isCancelling} tone="danger">
                {isCancelling ? 'Cancelando...' : 'Cancelar ordem'}
              </StageActionButton>
            ) : null}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {flowStage === 'auth' ? (
              <StageActionButton onClick={() => void handleAuthenticate()} disabled={authStatus === 'connecting' || authStatus === 'signing' || authStatus === 'verifying'}>
                {authStatus === 'connecting' || authStatus === 'signing' || authStatus === 'verifying' ? 'Autenticando...' : 'Autenticar EVM'}
              </StageActionButton>
            ) : flowStage === 'create' ? (
              <StageActionButton onClick={() => void handleCreateOrder()} disabled={!canStartNewOrder || isCreating}>
                {isCreating ? 'Criando ordem...' : 'Criar ActivationOrder'}
              </StageActionButton>
            ) : flowStage === 'bind' ? (
              <StageActionButton onClick={() => void handleBindTronSession()} disabled={isBindingTron || isConnectingTronWallet || isDisconnectingTronWallet}>
                {isBindingTron ? 'Vinculando...' : 'Vincular wallet pagadora'}
              </StageActionButton>
            ) : flowStage === 'payment' ? (
              <StageActionButton onClick={() => setShowPaymentSurface(true)}>
                Abrir modal de pagamento
              </StageActionButton>
            ) : flowStage === 'activation' ? (
              order?.status === 'activation_failed' ? (
                <StageActionButton onClick={() => void handleRetryActivation()} disabled={isRetryingActivation}>
                  {isRetryingActivation ? 'Reenviando...' : 'Retry ativação'}
                </StageActionButton>
              ) : (
                <StageActionButton onClick={() => void handleProcessActivation()} disabled={isProcessingActivation}>
                  {isProcessingActivation ? 'Processando ativação...' : 'Processar ativação'}
                </StageActionButton>
              )
            ) : order && FINAL_ORDER_STATUSES.has(order.status) ? (
              <StageActionButton onClick={clearTrackedOrder}>Nova ordem</StageActionButton>
            ) : null}
          </div>
        </div>
        <div className="mt-3 flex flex-wrap items-center justify-between gap-3 text-[11px]">
          <div className="flex flex-wrap items-center gap-2">
            <span
              className="rounded-full px-2.5 py-1 uppercase tracking-[0.16em]"
              style={{ backgroundColor: bottomSignalTone.bg, borderWidth: '1px', borderColor: bottomSignalTone.border, color: bottomSignalTone.color }}
            >
              {order ? statusLabel(order.status) : effectiveAccess ? 'operator ativo' : 'checkout idle'}
            </span>
            <span style={{ color: 'var(--text-3)' }}>{stageSignal(flowStage, order)}</span>
          </div>

          <div className="flex flex-wrap items-center gap-3 uppercase tracking-[0.14em]" style={{ color: 'var(--text-2)' }}>
            <span>Progresso {completedSteps}/{steps.length}</span>
            <span>Rail split Tron / Arbitrum</span>
          </div>

          <div className="h-1.5 w-full overflow-hidden rounded-full xl:max-w-[220px]" style={{ backgroundColor: 'rgba(255,255,255,0.08)' }}>
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
      {paymentRailSurface}
      {tronBindingSurface}
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
            className="max-w-[1120px] p-0 overflow-visible"
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
