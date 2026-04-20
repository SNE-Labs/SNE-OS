import { apiGet, apiPost } from '../lib/api/http';

export type CheckoutOrderStatus =
  | 'created'
  | 'awaiting_payment'
  | 'payment_seen'
  | 'payment_confirmed'
  | 'activation_pending'
  | 'activation_submitted'
  | 'activated'
  | 'activation_failed'
  | 'cancelled'
  | 'refund_pending'
  | 'refunded';

export type CheckoutOrder = {
  id: string;
  status: CheckoutOrderStatus;
  productCode: string;
  createdByAddress: string;
  buyerTronAddress: string | null;
  targetArbitrumAddress: string;
  paymentChain: string;
  paymentAsset: string;
  expectedAmount: string;
  receivedAmount: string | null;
  paymentTxHash: string | null;
  paymentConfirmedAt: string | null;
  activationChain: string;
  activationTxHash: string | null;
  activationAttempts: number;
  idempotencyKey: string;
  errorCode: string | null;
  errorMessage: string | null;
  createdAt: string | null;
  updatedAt: string | null;
  product: {
    code: string;
    label: string;
    accessClass: string;
  };
  payment: {
    chain: string;
    asset: string;
    expectedAmount: string;
    buyerTronAddress: string | null;
    treasuryAddress: string | null;
    assetContract: string | null;
    assetDecimals: number;
    rpcUrl: string | null;
    txHash: string | null;
    confirmedAt: string | null;
    verifiedAt?: string | null;
    blockNumber?: number | null;
    from?: string | null;
    to?: string | null;
    amountUnits?: string | null;
  };
  activation: {
    chain: string;
    targetAddress: string;
    txHash: string | null;
    attempts: number;
    state?: string | null;
    submittedAt?: string | null;
    processedAt?: string | null;
    confirmedAt?: string | null;
    failedAt?: string | null;
    failureCode?: string | null;
    lastObservedAt?: string | null;
    receiptBlock?: number | null;
    confirmations?: number | null;
    requiredConfirmations?: number | null;
    operatorKeyContract?: string | null;
    previousSaleController?: string | null;
    restoreControllerRequested?: boolean | null;
    restoredController?: boolean | null;
    skipReason?: string | null;
  };
  session: {
    walletProvider?: string | null;
    paymentMode?: string | null;
    authSource?: string | null;
    cancelReason?: string | null;
  };
};

export type CreateCheckoutOrderPayload = {
  productCode?: string;
  targetArbitrumAddress?: string;
  idempotencyKey?: string;
};

export type CreateTronSessionPayload = {
  buyerTronAddress: string;
  walletProvider?: string;
  paymentMode?: string;
};

export type CancelCheckoutOrderPayload = {
  reason?: string;
};

export type ReconcileTronPaymentPayload = {
  txHash: string;
  autoProcess?: boolean;
};

export const checkoutApi = {
  createOrder: (payload: CreateCheckoutOrderPayload = {}): Promise<CheckoutOrder> =>
    apiPost('/api/checkout/orders', payload),
  getOrder: (orderId: string): Promise<CheckoutOrder> =>
    apiGet(`/api/checkout/orders/${encodeURIComponent(orderId)}`),
  createTronSession: (orderId: string, payload: CreateTronSessionPayload): Promise<CheckoutOrder> =>
    apiPost(`/api/checkout/orders/${encodeURIComponent(orderId)}/tron-session`, payload),
  cancelOrder: (orderId: string, payload: CancelCheckoutOrderPayload = {}): Promise<CheckoutOrder> =>
    apiPost(`/api/checkout/orders/${encodeURIComponent(orderId)}/cancel`, payload),
  reconcileTronPayment: (orderId: string, payload: ReconcileTronPaymentPayload): Promise<CheckoutOrder> =>
    apiPost(`/api/payments/tron/reconcile/${encodeURIComponent(orderId)}`, payload),
  processActivation: (orderId: string): Promise<CheckoutOrder> =>
    apiPost(`/api/activations/${encodeURIComponent(orderId)}/process`, {}),
  retryActivation: (orderId: string): Promise<CheckoutOrder> =>
    apiPost(`/api/activations/${encodeURIComponent(orderId)}/retry`, {}),
};
