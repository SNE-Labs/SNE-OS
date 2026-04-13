import { apiDelete, apiGet, apiPost } from '../lib/api/http';

export type SecretsTone = 'active' | 'success' | 'warning' | 'pending';

export type SecretVault = {
  id: string;
  label: string;
  count: number;
  state: string;
  detail: string;
};

export type SecretItemSummary = {
  id: string;
  vault_id: string;
  kind: string;
  label: string;
  created_at?: string | null;
  updated_at?: string | null;
  algorithm?: string;
  version?: number;
  metadata?: Record<string, unknown>;
};

export type SecretItem = SecretItemSummary & {
  ciphertext: string;
  wrapped_key: string;
  iv: string;
  auth_tag: string;
  aad?: string | null;
};

export type SecretsOverview = {
  connected: boolean;
  status: { label: string; tone: SecretsTone };
  surface: {
    address: string | null;
    mode: string;
    source: string;
  };
  capabilities: {
    plaintext_server_side: boolean;
    client_side_encryption_required: boolean;
    wallet_bound_unlock: boolean;
    device_binding_supported: boolean;
    sharing_supported: boolean;
    recovery_supported: boolean;
    sync_supported: boolean;
    sync_backend: string;
  };
  policy: {
    plaintext_server_side: boolean;
    exportability: string;
    custody: string;
  };
  sync: {
    backend: string;
    configured: boolean;
    rpc_url?: string | null;
    proxy_url?: string | null;
    mode: string;
    detail?: string;
  };
  storage: {
    backend: string;
    configured: boolean;
    ttl_seconds?: number | null;
    detail?: string;
  };
  linked_accounts: Array<{
    network: string;
    address: string;
    primary?: boolean;
    status?: string;
    account_type?: string;
    tx_count?: number | null;
    balance?: number | null;
    has_activity?: boolean;
    source?: string;
  }>;
  network_scope: Array<{
    network: string;
    link_strategy: string;
  }>;
  vaults: SecretVault[];
  item_count: number;
  recent_items: SecretItemSummary[];
  updated_at?: string | null;
  items: SecretItemSummary[];
  access: {
    session_bound: boolean;
    linked_accounts_required: boolean;
    device_binding: string;
  };
  last_updated: string;
};

export type SecretItemsResponse = {
  configured: boolean;
  items: SecretItemSummary[];
  count: number;
};

export type DeleteSecretResponse = {
  ok: boolean;
  deleted: boolean;
  id: string;
};

export type CreateSecretPayload = {
  vault_id: string;
  kind: string;
  label: string;
  algorithm: string;
  ciphertext: string;
  wrapped_key: string;
  iv: string;
  auth_tag: string;
  aad?: string;
  metadata?: Record<string, unknown>;
  version?: number;
};

export const secretsApi = {
  getOverview: (address?: string | null): Promise<SecretsOverview> => {
    const query = address ? `?address=${encodeURIComponent(address)}` : '';
    return apiGet(`/api/secrets/overview${query}`);
  },
  getItems: (vaultId?: string | null): Promise<SecretItemsResponse> => {
    const query = vaultId ? `?vault_id=${encodeURIComponent(vaultId)}` : '';
    return apiGet(`/api/secrets/items${query}`);
  },
  getItem: (itemId: string): Promise<SecretItem> => apiGet(`/api/secrets/items/${encodeURIComponent(itemId)}`),
  createItem: (payload: CreateSecretPayload): Promise<SecretItem> => apiPost('/api/secrets/items', payload),
  deleteItem: (itemId: string): Promise<DeleteSecretResponse> => apiDelete(`/api/secrets/items/${encodeURIComponent(itemId)}`),
};
