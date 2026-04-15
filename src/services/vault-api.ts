import { apiGet } from '../lib/api/http';

export type VaultOverview = {
  connected: boolean;
  status: { label: string; tone: 'active' | 'success' | 'warning' | 'pending' };
  surface: {
    address: string | null;
    network: string;
    source: string;
    mode?: string;
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
    gas_balance_formatted?: string;
    gas?: string;
    balance_native?: number;
    tx_count?: number;
  }>;
  hero: {
    eyebrow: string;
    title: string;
    summary: string;
    metrics: Array<{
      label: string;
      value: string;
      detail: string;
      tone: 'active' | 'success' | 'warning' | 'pending';
    }>;
  };
  balances: {
    usdt: {
      label: string;
      value: string;
      detail: string;
      tone: 'active' | 'success' | 'warning' | 'pending';
    };
    gas: {
      label: string;
      value: string;
      detail: string;
      tone: 'active' | 'success' | 'warning' | 'pending';
    };
    other_assets: {
      label: string;
      value: string;
      detail: string;
      tone: 'active' | 'success' | 'warning' | 'pending';
    };
  };
  posture: Array<{ label: string; value: string }>;
  protection: {
    state: string;
    boundary: string;
  };
  readiness: {
    level: string;
    label: string;
    tone: 'active' | 'success' | 'warning' | 'pending';
    title: string;
    summary: string;
    items: Array<{
      label: string;
      value: string;
      detail: string;
      tone: 'active' | 'success' | 'warning' | 'pending';
    }>;
  };
  next_action: {
    reason: string;
    actions: Array<{
      label: string;
      href: string;
      tone: 'accent' | 'neutral';
    }>;
  };
  empty_state: {
    title: string;
    description: string;
    steps: string[];
  } | null;
  source_of_truth: {
    title: string;
    description: string;
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
    mode: 'read-only',
  },
  aggregate: {
    active_networks: 0,
    total_value_display: '--',
  },
  by_network: [],
  hero: {
    eyebrow: 'Conta USDT-first',
    title: 'Conecte uma wallet para abrir sua conta USDT-first.',
    summary: 'O saldo permanece na wallet. O OS so le, organiza e qualifica saldo-base, gas e prontidao para execucao.',
    metrics: [],
  },
  balances: {
    usdt: {
      label: 'USDT',
      value: '--',
      detail: 'Conecte uma wallet para ver o saldo-base.',
      tone: 'pending',
    },
    gas: {
      label: 'Gas',
      value: '--',
      detail: 'Conecte uma wallet para ver redes ativas e gas.',
      tone: 'pending',
    },
    other_assets: {
      label: 'Outros ativos',
      value: 'leitura USDT-first',
      detail: 'O Vault prioriza USDT e gas na conta operacional.',
      tone: 'pending',
    },
  },
  posture: [],
  protection: {
    state: 'A leitura USDT fica indisponivel ate a conexao de uma wallet.',
    boundary: 'Chaves e Dispositivos continuam sendo a fronteira de protecao do Vault.',
  },
  readiness: {
    level: 'disconnected',
    label: 'conectar carteira',
    tone: 'pending',
    title: 'Conecte uma wallet para abrir sua conta USDT-first.',
    summary: 'Sem wallet conectada o OS nao consegue ler saldo-base, gas e prontidao operacional.',
    items: [],
  },
  next_action: {
    reason: 'Conecte a wallet para carregar a conta operacional.',
    actions: [],
  },
  empty_state: null,
  source_of_truth: {
    title: 'Leitura organizada, sem custodia',
    description: 'O saldo permanece na wallet. O OS so le e organiza a conta operacional.',
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
    gas_balance_formatted: typeof item.gas_balance_formatted === 'string' ? item.gas_balance_formatted : undefined,
    gas: typeof item.gas === 'string' ? item.gas : undefined,
    balance_native: item.balance_native == null ? undefined : Number(item.balance_native),
    tx_count: item.tx_count == null ? undefined : Number(item.tx_count),
  };
}

export function normalizeVaultOverview(payload: any): VaultOverview {
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
      mode: typeof payload?.surface?.mode === 'string' ? payload.surface.mode : DEFAULT_VAULT_OVERVIEW.surface.mode,
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
    hero: {
      eyebrow: typeof payload?.hero?.eyebrow === 'string' ? payload.hero.eyebrow : DEFAULT_VAULT_OVERVIEW.hero.eyebrow,
      title: typeof payload?.hero?.title === 'string' ? payload.hero.title : DEFAULT_VAULT_OVERVIEW.hero.title,
      summary: typeof payload?.hero?.summary === 'string' ? payload.hero.summary : DEFAULT_VAULT_OVERVIEW.hero.summary,
      metrics: normalizeArray(payload?.hero?.metrics),
    },
    balances: {
      usdt: payload?.balances?.usdt ?? DEFAULT_VAULT_OVERVIEW.balances.usdt,
      gas: payload?.balances?.gas ?? DEFAULT_VAULT_OVERVIEW.balances.gas,
      other_assets: payload?.balances?.other_assets ?? DEFAULT_VAULT_OVERVIEW.balances.other_assets,
    },
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
      level:
        typeof payload?.readiness?.level === 'string'
          ? payload.readiness.level
          : DEFAULT_VAULT_OVERVIEW.readiness.level,
      label:
        typeof payload?.readiness?.label === 'string'
          ? payload.readiness.label
          : DEFAULT_VAULT_OVERVIEW.readiness.label,
      tone: payload?.readiness?.tone ?? DEFAULT_VAULT_OVERVIEW.readiness.tone,
      title:
        typeof payload?.readiness?.title === 'string'
          ? payload.readiness.title
          : DEFAULT_VAULT_OVERVIEW.readiness.title,
      summary:
        typeof payload?.readiness?.summary === 'string'
          ? payload.readiness.summary
          : DEFAULT_VAULT_OVERVIEW.readiness.summary,
      items: normalizeArray(payload?.readiness?.items),
    },
    next_action: {
      reason:
        typeof payload?.next_action?.reason === 'string'
          ? payload.next_action.reason
          : DEFAULT_VAULT_OVERVIEW.next_action.reason,
      actions: normalizeArray(payload?.next_action?.actions),
    },
    empty_state:
      payload?.empty_state && typeof payload.empty_state === 'object'
        ? {
            title:
              typeof payload.empty_state.title === 'string'
                ? payload.empty_state.title
                : 'Nenhum saldo-base visivel ainda.',
            description:
              typeof payload.empty_state.description === 'string'
                ? payload.empty_state.description
                : 'Conecte a wallet operacional correta ou envie USDT antes de abrir uma execucao.',
            steps: normalizeArray(payload.empty_state.steps),
          }
        : null,
    source_of_truth: {
      title:
        typeof payload?.source_of_truth?.title === 'string'
          ? payload.source_of_truth.title
          : DEFAULT_VAULT_OVERVIEW.source_of_truth.title,
      description:
        typeof payload?.source_of_truth?.description === 'string'
          ? payload.source_of_truth.description
          : DEFAULT_VAULT_OVERVIEW.source_of_truth.description,
    },
    last_updated: typeof payload?.last_updated === 'string' ? payload.last_updated : DEFAULT_VAULT_OVERVIEW.last_updated,
  };
}

export const vaultApi = {
  getOverview: async (address?: string | null): Promise<VaultOverview> => {
    const query = address ? `?address=${encodeURIComponent(address)}` : '';
    return normalizeVaultOverview(await apiGet(`/api/vault/overview${query}`));
  },
  hydrateOverview: (payload: unknown): VaultOverview => normalizeVaultOverview(payload),
};
