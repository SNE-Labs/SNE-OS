import { apiGet } from '../lib/api/http';

export type VaultOverview = {
  connected: boolean;
  status: { label: string; tone: 'active' | 'success' | 'warning' | 'pending' };
  surface: {
    address: string | null;
    network: string;
    source: string;
  };
  aggregate: {
    active_networks: number;
    visible_networks?: number;
    primary_network?: { key?: string; label?: string; native_asset?: string };
    total_value_display: string;
  };
  by_network: Array<{
    network: string;
    status: string;
    balance_formatted?: string;
    gas?: string;
    tx_count?: number;
  }>;
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

const DEFAULT_VAULT_OVERVIEW: VaultOverview = {
  connected: false,
  status: { label: 'offline', tone: 'pending' },
  surface: {
    address: null,
    network: '--',
    source: 'rpc',
  },
  aggregate: {
    active_networks: 0,
    total_value_display: '--',
  },
  by_network: [],
  signals: [],
  capital_cards: [],
  posture: [],
  protection: {
    state: 'A leitura USDT fica indisponivel ate a conexao de uma wallet.',
    boundary: 'Chaves e Dispositivos continuam sendo a fronteira de protecao do Vault.',
  },
  readiness: {
    custody: 'O Vault nao assina nem envia transacoes. O saldo permanece na wallet conectada.',
    staking: 'Leia gas e presenca de saldo antes de abrir a superficie de execucao.',
    provisioning: 'Movimento, conversao e uso de USDT acontecem apenas em Swaps.',
  },
  last_updated: '',
};

function normalizeArray<T>(value: unknown): T[] {
  return Array.isArray(value) ? (value as T[]) : [];
}

function normalizeByNetworkItem(item: any) {
  if (!item || typeof item !== 'object') return null;

  const networkLabel =
    typeof item.network === 'string'
      ? item.network
      : typeof item.network?.label === 'string'
        ? item.network.label
        : '--';

  return {
    network: networkLabel,
    status: typeof item.status === 'string' ? item.status : 'unavailable',
    balance_formatted: typeof item.balance_formatted === 'string' ? item.balance_formatted : undefined,
    gas: typeof item.gas === 'string' ? item.gas : undefined,
    tx_count: item.tx_count == null ? undefined : Number(item.tx_count),
  };
}

function normalizeVaultOverview(payload: any): VaultOverview {
  return {
    connected: Boolean(payload?.connected),
    status: {
      label: typeof payload?.status?.label === 'string' ? payload.status.label : DEFAULT_VAULT_OVERVIEW.status.label,
      tone: payload?.status?.tone ?? DEFAULT_VAULT_OVERVIEW.status.tone,
    },
    surface: {
      address: typeof payload?.surface?.address === 'string' ? payload.surface.address : null,
      network: typeof payload?.surface?.network === 'string' ? payload.surface.network : DEFAULT_VAULT_OVERVIEW.surface.network,
      source: typeof payload?.surface?.source === 'string' ? payload.surface.source : DEFAULT_VAULT_OVERVIEW.surface.source,
    },
    aggregate: {
      active_networks: Number(payload?.aggregate?.active_networks ?? DEFAULT_VAULT_OVERVIEW.aggregate.active_networks),
      visible_networks: payload?.aggregate?.visible_networks == null ? undefined : Number(payload.aggregate.visible_networks),
      primary_network: payload?.aggregate?.primary_network,
      total_value_display:
        typeof payload?.aggregate?.total_value_display === 'string'
          ? payload.aggregate.total_value_display
          : DEFAULT_VAULT_OVERVIEW.aggregate.total_value_display,
    },
    by_network: normalizeArray(payload?.by_network).map(normalizeByNetworkItem).filter(Boolean),
    signals: normalizeArray(payload?.signals),
    capital_cards: normalizeArray(payload?.capital_cards),
    posture: normalizeArray(payload?.posture),
    protection: {
      state:
        typeof payload?.protection?.state === 'string'
          ? payload.protection.state
          : DEFAULT_VAULT_OVERVIEW.protection.state,
      boundary:
        typeof payload?.protection?.boundary === 'string'
          ? payload.protection.boundary
          : DEFAULT_VAULT_OVERVIEW.protection.boundary,
    },
    readiness: {
      custody:
        typeof payload?.readiness?.custody === 'string'
          ? payload.readiness.custody
          : DEFAULT_VAULT_OVERVIEW.readiness.custody,
      staking:
        typeof payload?.readiness?.staking === 'string'
          ? payload.readiness.staking
          : DEFAULT_VAULT_OVERVIEW.readiness.staking,
      provisioning:
        typeof payload?.readiness?.provisioning === 'string'
          ? payload.readiness.provisioning
          : DEFAULT_VAULT_OVERVIEW.readiness.provisioning,
    },
    last_updated: typeof payload?.last_updated === 'string' ? payload.last_updated : DEFAULT_VAULT_OVERVIEW.last_updated,
  };
}

export const vaultApi = {
  getOverview: async (address?: string | null): Promise<VaultOverview> => {
    const query = address ? `?address=${encodeURIComponent(address)}` : '';
    return normalizeVaultOverview(await apiGet(`/api/vault/overview${query}`));
  },
};
