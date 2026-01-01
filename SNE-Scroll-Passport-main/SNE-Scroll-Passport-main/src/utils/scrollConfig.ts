import { scroll, scrollSepolia } from 'wagmi/chains'

export const SCROLL_MAINNET = {
  id: scroll.id,
  name: scroll.name,
  network: 'scroll',
  nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
  rpcUrls: {
    default: { http: ['https://rpc.scroll.io'] },
    public: { http: ['https://rpc.scroll.io'] },
  },
  blockExplorers: {
    default: { name: 'ScrollScan', url: 'https://scrollscan.com' },
  },
  testnet: false,
} as const

export const SCROLL_SEPOLIA = {
  id: scrollSepolia.id,
  name: scrollSepolia.name,
  network: 'scroll-sepolia',
  nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
  rpcUrls: {
    default: { http: ['https://sepolia-rpc.scroll.io'] },
    public: { http: ['https://sepolia-rpc.scroll.io'] },
  },
  blockExplorers: {
    default: { name: 'ScrollScan', url: 'https://sepolia.scrollscan.com' },
  },
  testnet: true,
} as const

// Default to Sepolia for development
export const DEFAULT_CHAIN = SCROLL_SEPOLIA

