import { http, createConfig } from 'wagmi'
import { scroll, scrollSepolia } from 'wagmi/chains'
import { walletConnect, injected, metaMask } from 'wagmi/connectors'

// Configuração Wagmi para Scroll
export const config = createConfig({
  chains: [scroll, scrollSepolia],
  connectors: [
    injected(),
    metaMask(),
    walletConnect({
      projectId: import.meta.env.VITE_WALLETCONNECT_PROJECT_ID || 'demo-project-id',
    }),
  ],
  transports: {
    [scroll.id]: http(),
    [scrollSepolia.id]: http(),
  },
})
