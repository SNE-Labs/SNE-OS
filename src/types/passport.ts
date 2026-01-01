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

export type LookupResult = {
  licenses: License[];
  keys: KeyRecord[];
  boxes: BoxRecord[];
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

export type ErrorResponse = {
  error: string;
  code: 'INVALID_PARAMETER' | 'ADDRESS_NOT_FOUND' | 'RATE_LIMIT' | 'RPC_ERROR' | 'CONTRACT_ERROR' | 'INTERNAL_ERROR';
  message?: string;
  retryAfter?: number;
};


