import { createConfig, http } from 'wagmi'
import { scrollSepolia } from 'wagmi/chains'
import { injected, metaMask, walletConnect } from 'wagmi/connectors'

// Scroll Network Configuration - Only Sepolia for now to avoid CORS issues
// Use proxy in development
const rpcUrl = import.meta.env.DEV 
  ? '/api/rpc' 
  : 'https://sepolia-rpc.scroll.io'

export const config = createConfig({
  chains: [scrollSepolia],
  connectors: [
    injected(),
    metaMask(),
    walletConnect({
      projectId: import.meta.env.VITE_WALLETCONNECT_PROJECT_ID || '',
    }),
  ],
  transports: {
    [scrollSepolia.id]: http(rpcUrl, {
      timeout: 10000,
    }),
  },
})

