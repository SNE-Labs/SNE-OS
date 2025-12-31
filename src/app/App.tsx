import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { WagmiProvider, createConfig, http } from 'wagmi';
import { scroll } from 'viem/chains';
import { Sidebar } from './components/Sidebar';
import { Topbar } from './components/Topbar';
import { BottomBar } from './components/BottomBar';
import { Home } from './pages/Home';
import { Radar } from './pages/Radar';
import { Pass } from './pages/Pass';
import { Vault } from './pages/Vault';
import { Pricing } from './pages/Pricing';
import { Status } from './pages/Status';
import { Docs } from './pages/Docs';
import { AuthProvider } from '@/lib/auth/AuthProvider.tsx';
import { EntitlementsProvider } from '@/lib/auth/EntitlementsProvider.tsx';

export default function App() {
  // Create QueryClient for React Query
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        refetchOnWindowFocus: false,
      },
    },
  });

  // Create Wagmi config for Scroll Network (read-only, não interfere com MetaMask)
  const wagmiConfig = createConfig({
    chains: [scroll],
    transports: {
      [scroll.id]: http(),
    },
    // Configuração para não conectar automaticamente
    ssr: true, // Server-side rendering safe
  });

  return (
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <EntitlementsProvider>
        <BrowserRouter>
          <div className="min-h-screen flex flex-col" style={{ backgroundColor: 'var(--bg-0)' }}>
            {/* Main Layout */}
            <div className="flex flex-1">
              {/* Left Sidebar - Fixed 300px */}
              <Sidebar />

              {/* Center Content - Fluid */}
              <div className="flex-1 flex flex-col">
                {/* Topbar */}
                <Topbar />

                {/* Main Content Area with Right Panel */}
                <div className="flex flex-1 overflow-hidden">
                  {/* Center Content */}
                  <main className="flex-1 overflow-y-auto">
                    <Routes>
                      <Route path="/" element={<Navigate to="/home" replace />} />
                      <Route path="/home" element={<Home />} />
                      <Route path="/radar" element={<Radar />} />
                      <Route path="/pass" element={<Pass />} />
                      <Route path="/vault" element={<Vault />} />
                      <Route path="/pricing" element={<Pricing />} />
                      <Route path="/status" element={<Status />} />
                      <Route path="/docs" element={<Docs />} />
                    </Routes>
                  </main>
                </div>
              </div>
            </div>

            {/* Bottom Bar - Session Bar */}
            <BottomBar />
          </div>
        </BrowserRouter>
      </EntitlementsProvider>
    </AuthProvider>
    </QueryClientProvider>
    </WagmiProvider>
  );
}
