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

export const keysApi = {
  getOverview: (address?: string | null): Promise<KeysOverview> => {
    const query = address ? `?address=${encodeURIComponent(address)}` : '';
    return apiGet(`/api/keys/overview${query}`);
  },
};
