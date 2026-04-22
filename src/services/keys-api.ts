import { apiGet } from '../lib/api/http';

export type KeysOverview = {
  connected: boolean;
  status: { label: string; tone: 'active' | 'success' | 'warning' | 'pending' };
  surface: {
    address: string | null;
    access_level: string;
    source: string;
  };
  signals: Array<{ title: string; value: string; detail: string }>;
  grants: Array<{
    id?: string;
    label?: string;
    status?: string;
  }>;
  bindings: Array<{
    id?: string;
    label?: string;
    status?: string;
  }>;
  devices: Array<{
    id?: string;
    label?: string;
    status?: string;
  }>;
  boundary: {
    grants: string;
    devices: string;
  };
  last_updated: string;
};

export type KeysEntitlement = {
  wallet: string | null;
  ownerWallet: string | null;
  delegateWallet: string | null;
  hasOperatorKey: boolean;
  accessClass: 'none' | 'operator';
  effectiveAccess: boolean;
  feeTier: 'standard' | 'operator_discount' | string;
  feePolicy?: {
    tier: string;
    discountBps: number;
    label: string;
    reason: string;
  };
  source: string;
  lastIndexedBlock: number | null;
  contractsConfigured: boolean;
  checkedAt: string;
  indexer?: {
    mode: string;
    healthy: boolean;
    source: string;
    lastIndexedBlock: number | null;
  };
  error?: string;
};

export type OperatorCockpitTimelineEvent = {
  kind: string;
  label: string;
  status: 'complete' | 'pending' | 'warning' | string;
  timestamp?: string | null;
  txHash?: string | null;
  detail?: string | null;
};

export type OperatorCockpit = {
  session: {
    authenticated: boolean;
    address: string | null;
    role: 'anonymous' | 'owner' | 'delegate' | 'discovery' | string;
  };
  entitlement: KeysEntitlement;
  contracts: {
    network: string;
    configured: boolean;
    source: string;
    operatorKey: string | null;
    keySale: string | null;
    delegationRegistry: string | null;
    legacyRegistry: string | null;
    usdt: string | null;
    treasury: string | null;
    operatorPriceUnits: string | null;
    operatorPriceDisplay: string | null;
    keySalePaused: boolean | null;
    saleController: string | null;
    latestBlock: number | null;
    manifestNetwork?: string | null;
    error?: string | null;
  };
  indexer: {
    mode: string;
    healthy: boolean;
    source: string;
    lastIndexedBlock: number | null;
  };
  checkout: {
    available: boolean;
    productCode: string;
    productLabel: string;
    price: {
      amount: string;
      asset: string;
      chain: string;
    };
    pendingOrder: Record<string, unknown> | null;
    recentOrders: Array<Record<string, unknown>>;
    lastPayment: Record<string, unknown> | null;
    lastActivation: Record<string, unknown> | null;
  };
  timeline: OperatorCockpitTimelineEvent[];
  nextAction: {
    state: string;
    label: string;
    href: string;
    priority: 'high' | 'medium' | 'low' | string;
    orderId?: string;
  };
  lastUpdated: string;
};

export const keysApi = {
  getOverview: (address?: string | null): Promise<KeysOverview> => {
    const query = address ? `?address=${encodeURIComponent(address)}` : '';
    return apiGet(`/api/keys/overview${query}`);
  },
  getEntitlement: (address?: string | null): Promise<KeysEntitlement> => {
    const query = address ? `?address=${encodeURIComponent(address)}` : '';
    return apiGet(`/api/keys/entitlement${query}`);
  },
  getOperatorCockpit: (address?: string | null): Promise<OperatorCockpit> => {
    const query = address ? `?address=${encodeURIComponent(address)}` : '';
    return apiGet(`/api/keys/operator-cockpit${query}`);
  },
};
