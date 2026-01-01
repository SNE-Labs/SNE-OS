import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { WagmiProvider, createConfig, http, injected } from 'wagmi';
import { scroll } from 'viem/chains';
import { Suspense, lazy } from 'react';
import React from 'react';

// Desktop Components (carregados normalmente)
import { Sidebar } from './components/Sidebar';
import { Topbar } from './components/Topbar';
import { BottomBar } from './components/BottomBar';

// Desktop Pages (carregadas normalmente)
import { Home } from './pages/Home';
import { Pricing } from './pages/Pricing';
import { Status } from './pages/Status';
import { Docs } from './pages/Docs';

// Desktop Pages (lazy loaded para performance)
const DesktopRadar = lazy(() => import('./pages/Radar').then(m => ({ default: m.Radar })));
const DesktopVault = lazy(() => import('./pages/Vault').then(m => ({ default: m.Vault })));
const DesktopPass = lazy(() => import('./pages/Pass').then(m => ({ default: m.Pass })));

// Mobile components (lazy loaded only when needed)
const getMobileComponents = () => ({
  MobileRadar: lazy(() => import('./pages/mobile/Radar').then(m => ({ default: m.MobileRadar }))),
  MobileVault: lazy(() => import('./pages/mobile/Vault').then(m => ({ default: m.MobileVault }))),
  MobilePass: lazy(() => import('./pages/mobile/Pass').then(m => ({ default: m.MobilePass }))),
  MobileLayout: lazy(() => import('./layouts/MobileLayout').then(m => ({ default: m.MobileLayout })))
});

import { AuthProvider } from '@/lib/auth/AuthProvider.tsx';
import { EntitlementsProvider } from '@/lib/auth/EntitlementsProvider.tsx';

// Componente que decide qual layout usar baseado na plataforma
function AppContent() {
  // Simplified platform detection without complex hooks
  const [isMobile, setIsMobile] = React.useState(false);
  const [MobileComponents, setMobileComponents] = React.useState<any>(null);

  React.useEffect(() => {
    const checkMobile = () => {
      const mobile = window.innerWidth <= 768;
      setIsMobile(mobile);

      // Lazy load mobile components only when mobile is detected
      if (mobile && !MobileComponents) {
        getMobileComponents().then(setMobileComponents);
      }
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, [MobileComponents]);

  if (isMobile && MobileComponents) {
    const { MobileLayout } = MobileComponents;
    return (
      <Suspense fallback={<MobileSkeleton />}>
        <MobileLayout />
      </Suspense>
    );
  }

  if (isMobile && !MobileComponents) {
    return <MobileSkeleton />;
  }

  // Desktop Layout (existing)
  return (
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
              <Suspense fallback={<DesktopSkeleton />}>
                <Routes>
                  <Route path="/" element={<Navigate to="/home" replace />} />
                  <Route path="/home" element={<Home />} />
                  <Route path="/radar" element={<DesktopRadar />} />
                  <Route path="/pass" element={<DesktopPass />} />
                  <Route path="/vault" element={<DesktopVault />} />
                  <Route path="/pricing" element={<Pricing />} />
                  <Route path="/status" element={<Status />} />
                  <Route path="/docs" element={<Docs />} />
                </Routes>
              </Suspense>
            </main>
          </div>
        </div>
      </div>

      {/* Bottom Bar - Session Bar */}
      <BottomBar />
    </div>
  );
}

// Skeleton para desktop
function DesktopSkeleton() {
  return (
    <div className="flex-1 flex items-center justify-center">
      <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );
}

// Skeleton para mobile
function MobileSkeleton() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );
}

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

  // Create Wagmi config for Scroll Network with MetaMask support
  const wagmiConfig = createConfig({
    chains: [scroll],
    connectors: [
      injected(), // MetaMask and other injected wallets
    ],
    transports: {
      [scroll.id]: http(),
    },
    ssr: true, // Server-side rendering safe
  });

  return (
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <EntitlementsProvider>
            <BrowserRouter>
              <AppContent />
            </BrowserRouter>
          </EntitlementsProvider>
        </AuthProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}
