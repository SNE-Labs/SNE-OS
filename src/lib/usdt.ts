export type UsdtChainConfig = {
  chainId: number;
  chainName: string;
  tokenAddress: string;
  decimals: number;
};

export type SwapMode = 'move' | 'to-usdt' | 'trade' | 'advanced';

export const TRON_CHAIN_ID = 728126428;

export const USDT_CHAINS: UsdtChainConfig[] = [
  {
    chainId: 1,
    chainName: 'Ethereum',
    tokenAddress: '0xdAC17F958D2ee523a2206206994597C13D831ec7',
    decimals: 6,
  },
  {
    chainId: 42161,
    chainName: 'Arbitrum',
    tokenAddress: '0xFd086bC7CD5C481DCC9C85ebe478A1C0b69FCbb9',
    decimals: 6,
  },
  {
    chainId: 10,
    chainName: 'Optimism',
    tokenAddress: '0x94b008aA00579c1307B0EF2c499aD98a8ce58e58',
    decimals: 6,
  },
  {
    chainId: 8453,
    chainName: 'Base',
    tokenAddress: '0xfde4C96c8593536E31F229EA8f37b2ADa2699bb2',
    decimals: 6,
  },
  {
    chainId: 137,
    chainName: 'Polygon',
    tokenAddress: '0xc2132D05D31c914a87C6611C10748AEb04B58e8F',
    decimals: 6,
  },
  {
    chainId: TRON_CHAIN_ID,
    chainName: 'Tron',
    tokenAddress: 'TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t',
    decimals: 6,
  },
];

export const DEFAULT_USDT_CHAIN_ID = 1;

export const MAJOR_USDT_EVM_CHAINS = USDT_CHAINS.filter((chain) => chain.chainId !== TRON_CHAIN_ID);

export const MAJOR_USDT_WIDGET_CHAIN_IDS = MAJOR_USDT_EVM_CHAINS.map((chain) => chain.chainId);

export const MAJOR_USDT_WIDGET_TOKENS = MAJOR_USDT_EVM_CHAINS.map((chain) => ({
  chainId: chain.chainId,
  address: chain.tokenAddress,
}));

export function normalizeSwapMode(value: string | null | undefined): SwapMode {
  if (value === 'move' || value === 'to-usdt' || value === 'trade' || value === 'advanced') {
    return value;
  }
  return 'move';
}

export function getUsdtToken(chainId?: number | null) {
  return USDT_CHAINS.find((chain) => chain.chainId === chainId);
}

export function getUsdtTokenAddress(chainId?: number | null) {
  return getUsdtToken(chainId)?.tokenAddress;
}

export function getUsdtChainName(chainId?: number | null) {
  return getUsdtToken(chainId)?.chainName ?? (chainId ? `Chain ${chainId}` : '--');
}
