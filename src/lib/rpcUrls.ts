import { TRON_CHAIN_ID } from './usdt';

export const CHAIN_RPC_URLS = {
  mainnet: import.meta.env.VITE_ETH_RPC_URL?.trim() || 'https://ethereum-rpc.publicnode.com',
  arbitrum: import.meta.env.VITE_ARBITRUM_RPC_URL?.trim() || 'https://arbitrum-one-rpc.publicnode.com',
  optimism: import.meta.env.VITE_OPTIMISM_RPC_URL?.trim() || 'https://optimism-rpc.publicnode.com',
  base: import.meta.env.VITE_BASE_RPC_URL?.trim() || 'https://base-rpc.publicnode.com',
  polygon: import.meta.env.VITE_POLYGON_RPC_URL?.trim() || 'https://polygon-bor-rpc.publicnode.com',
  scroll: import.meta.env.VITE_SCROLL_RPC_URL?.trim() || 'https://scroll-rpc.publicnode.com',
  tron: import.meta.env.VITE_TRON_RPC_URL?.trim() || 'https://api.trongrid.io',
} as const;

export const LIFI_RPC_URLS = {
  1: [CHAIN_RPC_URLS.mainnet],
  42161: [CHAIN_RPC_URLS.arbitrum],
  10: [CHAIN_RPC_URLS.optimism],
  8453: [CHAIN_RPC_URLS.base],
  137: [CHAIN_RPC_URLS.polygon],
  534352: [CHAIN_RPC_URLS.scroll],
  [TRON_CHAIN_ID]: [CHAIN_RPC_URLS.tron],
} as const;
