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

export const keysApi = {
  getOverview: (address?: string | null): Promise<KeysOverview> => {
    const query = address ? `?address=${encodeURIComponent(address)}` : '';
    return apiGet(`/api/keys/overview${query}`);
  },
  getEntitlement: (address?: string | null): Promise<KeysEntitlement> => {
    const query = address ? `?address=${encodeURIComponent(address)}` : '';
    return apiGet(`/api/keys/entitlement${query}`);
  },
};
