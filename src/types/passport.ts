/**
 * Types compartilhados para integração com SNE Scroll Passport
 */

export type Address = `0x${string}`;

export type License = {
  id: string;
  nodeId?: string;
  name?: string;
  status: 'active' | 'revoked' | 'unknown';
  power?: string;
  lastChecked?: string | null;
  contractAddress?: string;
  tokenId?: string;
};

export type KeyRecord = {
  id: string;
  type: 'physical' | 'virtual';
  boundTo?: string | null;
  status: 'bound' | 'unbound';
  contractAddress?: string;
  tokenId?: string;
};

export type BoxRecord = {
  id: string;
  tier: 'tier1' | 'tier2' | 'tier3';
  provisioned: boolean;
  lastSeen?: string | null;
  contractAddress?: string;
  tokenId?: string;
};

export type PassportAssertion = {
  id: string;
  label: string;
  status: 'present' | 'missing' | 'inactive';
  source: 'rpc' | 'on-chain' | 'derived';
  value?: string;
};

export type PassportIdentity = {
  address: Address;
  accountType: 'wallet' | 'contract';
  txCount: number;
  balanceEth: string;
  checkedAt: string;
  hasActivity: boolean;
  hasCode: boolean;
};

export type LookupResult = {
  licenses: License[];
  keys: KeyRecord[];
  boxes: BoxRecord[];
  identity?: PassportIdentity;
  assertions?: PassportAssertion[];
  pou?: { nodesPublic: number };
  metadata?: {
    cached: boolean;
    cacheExpiry?: string;
    source: 'on-chain' | 'rpc' | 'api' | 'cache';
  };
};

export type BalanceResponse = {
  address: Address;
  eth: {
    value: string;
    formatted: string;
  };
  tokens: Array<{
    address: Address;
    symbol: string;
    name: string;
    decimals: number;
    balance: string;
    formatted: string;
    spam: boolean;
  }>;
  metadata?: {
    cached: boolean;
    cacheExpiry?: string;
    source: string;
  };
};

export type GasResponse = {
  gasPrice: string;
  maxFeePerGas: string;
  maxPriorityFeePerGas: string;
  formatted: {
    gasPrice: string;
    maxFeePerGas: string;
  };
  metadata?: {
    cached: boolean;
    source: string;
    timestamp: string;
  };
};

export type Product = {
  id: string;
  title: string;
  priceUSD: string;
  priceETH?: string;
  features: string[];
  available: boolean;
  contractAddress?: string;
  metadata?: {
    cached: boolean;
    cacheExpiry?: string;
  };
};

export type ProductsResponse = {
  products: Product[];
};

export type PassportIdentityWallet = {
  id: number;
  address: Address;
  chain_family: string;
  wallet_type: string;
  label: string;
  status: 'active' | 'pending' | 'revoked';
  is_primary: boolean;
  added_at: string | null;
  last_login_at: string | null;
};

export type PassportIdentityEvent = {
  id: number;
  type: string;
  actor_address?: Address | null;
  target_address?: Address | null;
  payload: Record<string, unknown>;
  created_at: string | null;
};

export type PassportIdentityCheckpoint = {
  connected: boolean;
  address: Address;
  identity_id: string;
  identity: {
    id: string;
    anchor_address: Address;
    status: string;
    created_at: string | null;
    updated_at: string | null;
  };
  primary_wallet: PassportIdentityWallet | null;
  wallets: PassportIdentityWallet[];
  events: PassportIdentityEvent[];
  stats: {
    wallets_total: number;
    active_wallets: number;
    pending_wallets: number;
    revoked_wallets: number;
  };
};

export type PassportLinkInitResponse = {
  request_id: string;
  identity_id: string;
  candidate_address: Address;
  requested_by_address: Address;
  expires_at: string;
  current_wallet_message: string;
  candidate_wallet_message: string;
};

export type ErrorResponse = {
  error: string;
  code: 'INVALID_PARAMETER' | 'ADDRESS_NOT_FOUND' | 'RATE_LIMIT' | 'RPC_ERROR' | 'CONTRACT_ERROR' | 'INTERNAL_ERROR';
  message?: string;
  retryAfter?: number;
};
