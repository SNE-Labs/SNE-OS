import { createConfig, http } from 'wagmi'
import { walletConnect, injected } from 'wagmi/connectors'
import { scrollSepolia } from 'wagmi/chains'

// Verificar se o projectId está definido
const projectId = import.meta.env.VITE_WALLETCONNECT_PROJECT_ID || '3fcc6bba6f1de962d911bb5b5c3dba68'

if (!import.meta.env.VITE_WALLETCONNECT_PROJECT_ID) {
  console.warn('VITE_WALLETCONNECT_PROJECT_ID not set, using fallback. Make sure to set it in production!')
}

console.log('WalletConnect Project ID:', projectId)

export const wagmiConfig = createConfig({
  chains: [scrollSepolia],
  connectors: [
    walletConnect({
      projectId,
      showQrModal: true,
    }),
    injected(), // Detecta MetaMask automaticamente
  ],
  transports: {
    [scrollSepolia.id]: http(import.meta.env.VITE_SCROLL_RPC_URL || 'https://sepolia-rpc.scroll.io'),
  },
})

