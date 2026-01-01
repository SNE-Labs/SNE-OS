import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { WagmiProvider } from 'wagmi'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { RouterProvider } from 'react-router-dom'
import { Toaster } from 'sonner'
import { wagmiConfig } from './lib/wagmi'
import { router } from './router'
import './styles/index.css'

const queryClient = new QueryClient()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        <RouterProvider router={router} />
        <Toaster 
          position="top-right" 
          toastOptions={{
            style: {
              background: '#111216',
              color: '#F7F7F8',
              border: '1px solid rgba(255, 255, 255, 0.1)',
            },
            success: {
              style: {
                background: '#00C48C',
                color: '#0B0B0B',
              },
            },
            error: {
              style: {
                background: '#FF4D4F',
                color: '#F7F7F8',
              },
            },
          }}
        />
      </QueryClientProvider>
    </WagmiProvider>
  </StrictMode>,
)

