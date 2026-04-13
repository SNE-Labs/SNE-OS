import { apiGet } from '../lib/api/http';

export type VaultOverview = {
  connected: boolean;
  status: { label: string; tone: 'active' | 'success' | 'warning' | 'pending' };
  surface: {
    address: string | null;
    network: string;
    source: string;
  };
  signals: Array<{ title: string; value: string; detail: string }>;
  capital_cards: Array<{ label: string; value: string; hint: string; icon: string }>;
  posture: Array<{ label: string; value: string }>;
  protection: {
    state: string;
    boundary: string;
  };
  readiness: {
    custody: string;
    staking: string;
    provisioning: string;
  };
  last_updated: string;
};

export const vaultApi = {
  getOverview: (address?: string | null): Promise<VaultOverview> => {
    const query = address ? `?address=${encodeURIComponent(address)}` : '';
    return apiGet(`/api/vault/overview${query}`);
  },
};
