import { BrowserRouter, Routes, Route, Navigate, useLocation, useParams } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { WagmiProvider, createConfig, http } from 'wagmi';
import { injected, walletConnect } from 'wagmi/connectors';
import { arbitrum, arbitrumSepolia, base, mainnet, optimism, polygon, scroll } from 'viem/chains';
import { Suspense, useEffect, useState, type ReactNode } from 'react';
import { AnimatePresence, motion } from 'framer-motion';

// Desktop Components (carregados normalmente)
import { Sidebar } from './components/Sidebar';
import { Topbar } from './components/Topbar';
import { BottomDock } from './components/BottomDock';
import { TapeWire } from './components/TapeWire';
import { ShellCommandPalette } from './components/ShellCommandPalette';
import { AsciiHaze, type AtmosphereKey } from './components/AsciiHaze';
import { ChunkLoadBoundary } from './components/ChunkLoadBoundary';
import { SNEField } from './components/field/SNEField';
import { LivingSystemLayer } from './components/LivingSystemLayer';
import { RouteSeo } from './RouteSeo';
import { lazyRoute, pickLazyExport } from './utils/lazyRoute';

// Desktop Pages (carregadas normalmente)
import { Home } from './pages/Home';
import { Blog } from './pages/Blog';
import { BlogPost } from './pages/BlogPost';
import { Pricing } from './pages/Pricing';
import { Status } from './pages/Status';
import { Docs } from './pages/Docs';

// Desktop Pages (lazy loaded para performance)
const DesktopRadar = lazyRoute(() => import('./pages/Radar').then((m) => pickLazyExport(m, 'Radar')));
const DesktopSwaps = lazyRoute(() => import('./pages/Swaps').then((m) => pickLazyExport(m, 'Swaps')));
const DesktopVault = lazyRoute(() => import('./pages/Vault').then((m) => pickLazyExport(m, 'Vault')));
const DesktopPass = lazyRoute(() => import('./pages/Pass').then((m) => pickLazyExport(m, 'Pass')));
const DesktopKeys = lazyRoute(() => import('./pages/Keys').then((m) => pickLazyExport(m, 'Keys')));
const DesktopSecrets = lazyRoute(() => import('./pages/Secrets').then((m) => pickLazyExport(m, 'Secrets')));

// Desktop Auth Page (lazy loaded, fullscreen outside main layout)
const AuthDesktop = lazyRoute(() => import('./pages/AuthDesktop').then((m) => pickLazyExport(m, 'AuthDesktop')));

// Mobile components (lazy loaded only when needed)
const MobileLayout = lazyRoute(() => import('./layouts/MobileLayout').then((m) => pickLazyExport(m, 'MobileLayout')));

import { AuthProvider } from '@/lib/auth/AuthProvider.tsx';
import { EntitlementsProvider } from '@/lib/auth/EntitlementsProvider.tsx';
import { CHAIN_RPC_URLS } from '@/lib/rpcUrls';
import { TronWalletProvider } from '@/lib/tron/TronWalletProvider';
import { useSeoMeta } from '@/lib/seo/useSeoMeta';
import { useIsMobile } from '../hooks/useIsMobile';

const SUPPORTED_CHAINS = [arbitrum, arbitrumSepolia, mainnet, optimism, base, polygon, scroll] as const;

// Componente que decide qual layout usar baseado na plataforma
function AppContent() {
  const location = useLocation();
  const isMobile = useIsMobile();
  const [sidebarPinned, setSidebarPinned] = useState(() => {
    if (typeof window === 'undefined') return false;
    return window.localStorage.getItem('sne:shell:sidebar-pinned') === 'true';
  });
  const [sidebarExpanded, setSidebarExpanded] = useState(sidebarPinned);
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem('sne:shell:sidebar-pinned', sidebarPinned ? 'true' : 'false');
    if (sidebarPinned) {
      setSidebarExpanded(true);
    }
  }, [sidebarPinned]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        setCommandPaletteOpen(true);
      }
      if (event.key === 'Escape' && !sidebarPinned) {
        setSidebarExpanded(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [sidebarPinned]);

  // Só renderiza mobile se realmente for mobile (evita flickering)
  if (isMobile) {
    return (
      <ChunkLoadBoundary>
        <Suspense fallback={<MobileSkeleton />}>
          <RouteSeo />
          <MobileLayout />
        </Suspense>
      </ChunkLoadBoundary>
    );
  }

  // Desktop Layout (existing)
  const atmosphereClass = resolveAtmosphereClass(location.pathname);

  return (
    <div className={`shell-frame ${atmosphereClass}`} style={{ backgroundColor: 'var(--bg-0)' }}>
      <RouteSeo />
      <SNEField pathname={location.pathname} />
      <AsciiHaze atmosphereKey={atmosphereClass} />
      <LivingSystemLayer pathname={location.pathname} />
      <div className="relative z-10 h-dvh overflow-hidden">
        {!sidebarPinned && sidebarExpanded ? (
          <button
            type="button"
            aria-label="Fechar sidebar"
            onClick={() => setSidebarExpanded(false)}
            className="fixed inset-0 z-30 hidden bg-black/15 lg:block"
            style={{ backgroundColor: 'var(--shell-overlay)' }}
          />
        ) : null}

        <Sidebar
          expanded={sidebarExpanded}
          pinned={sidebarPinned}
          onExpand={() => setSidebarExpanded(true)}
          onCollapse={() => setSidebarExpanded(false)}
          onTogglePin={() => setSidebarPinned((value) => !value)}
        />

        <div className="flex h-dvh flex-col lg:pl-[var(--sidebar-rail-width)]">
          <Topbar
            onOpenCommandPalette={() => setCommandPaletteOpen(true)}
            onToggleSidebarPin={() => setSidebarPinned((value) => !value)}
            sidebarPinned={sidebarPinned}
          />
          <TapeWire />

          <main className="shell-main flex-1 overflow-y-auto">
            <ChunkLoadBoundary>
              <Suspense fallback={<DesktopSkeleton />}>
                <AnimatedRouteFrame routeKey={location.pathname}>
                  <Routes location={location}>
                    <Route path="/" element={<Navigate to="/home" replace />} />
                    <Route path="/home" element={<Home />} />
                    <Route path="/intel" element={<Blog />} />
                    <Route path="/intel/topic/:topic" element={<Blog />} />
                    <Route path="/intel/chain/:chain" element={<Blog />} />
                    <Route path="/intel/asset/:asset" element={<Blog />} />
                    <Route path="/intel/:slug" element={<BlogPost />} />
                    <Route path="/blog" element={<Navigate to="/intel" replace />} />
                    <Route path="/blog/topic/:topic" element={<LegacyBlogRedirect />} />
                    <Route path="/blog/chain/:chain" element={<LegacyBlogRedirect />} />
                    <Route path="/blog/asset/:asset" element={<LegacyBlogRedirect />} />
                    <Route path="/blog/:slug" element={<LegacyBlogRedirect />} />
                    <Route path="/radar" element={<DesktopRadar />} />
                    <Route path="/radar/:symbol" element={<DesktopRadar />} />
                    <Route path="/swaps" element={<DesktopSwaps />} />
                    <Route path="/pass" element={<DesktopPass />} />
                    <Route path="/vault" element={<DesktopVault />} />
                    <Route path="/keys" element={<DesktopKeys />} />
                    <Route path="/secrets" element={<DesktopSecrets />} />
                    <Route path="/pricing" element={<Pricing />} />
                    <Route path="/status" element={<Status />} />
                    <Route path="/docs" element={<Docs />} />
                  </Routes>
                </AnimatedRouteFrame>
              </Suspense>
            </ChunkLoadBoundary>
          </main>
        </div>

        <BottomDock
          onOpenCommandPalette={() => setCommandPaletteOpen(true)}
          onToggleSidebarPin={() => setSidebarPinned((value) => !value)}
          sidebarPinned={sidebarPinned}
        />
        <ShellCommandPalette open={commandPaletteOpen} onOpenChange={setCommandPaletteOpen} />
      </div>
    </div>
  );
}

function AnimatedRouteFrame({ routeKey, children }: { routeKey: string; children: ReactNode }) {
  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div
        key={routeKey}
        className="shell-route-frame"
        initial={{ opacity: 0, y: 12, filter: 'blur(10px)' }}
        animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
        exit={{ opacity: 0, y: -8, filter: 'blur(8px)' }}
        transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}

function resolveAtmosphereClass(pathname: string): AtmosphereKey {
  if (pathname.startsWith('/radar')) return 'shell-frame--radar';
  if (pathname.startsWith('/swaps')) return 'shell-frame--vault';
  if (pathname.startsWith('/intel') || pathname.startsWith('/blog')) return 'shell-frame--intel';
  if (pathname.startsWith('/pass')) return 'shell-frame--passport';
  if (pathname.startsWith('/vault')) return 'shell-frame--vault';
  if (pathname.startsWith('/keys') || pathname.startsWith('/secrets')) return 'shell-frame--keys';
  if (pathname.startsWith('/pricing')) return 'shell-frame--vault';
  if (pathname.startsWith('/docs') || pathname.startsWith('/status')) return 'shell-frame--docs';
  return 'shell-frame--home';
}

function LegacyBlogRedirect() {
  const params = useParams();
  if (params.topic) return <Navigate to={`/intel/topic/${params.topic}`} replace />;
  if (params.chain) return <Navigate to={`/intel/chain/${params.chain}`} replace />;
  if (params.asset) return <Navigate to={`/intel/asset/${params.asset}`} replace />;
  return <Navigate to={`/intel/${params.slug ?? ''}`} replace />;
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

// Skeleton para auth (terminal style)
function AuthSkeleton() {
  return (
    <div className="min-h-screen w-full bg-black flex items-center justify-center">
      <div className="w-12 h-12 border-4 border-green-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );
}

export default function App() {
  const walletConnectProjectId = import.meta.env.VITE_WALLETCONNECT_PROJECT_ID?.trim();
  const walletConnectUrl = import.meta.env.VITE_SIWE_ORIGIN?.trim() || 'https://snelabs.space';

  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            retry: false,
            refetchOnWindowFocus: false,
          },
        },
      })
  );

  const [wagmiConfig] = useState(() =>
    createConfig({
      chains: [...SUPPORTED_CHAINS],
      connectors: [
        injected(),
        ...(walletConnectProjectId
          ? [
              walletConnect({
                projectId: walletConnectProjectId,
                showQrModal: true,
                metadata: {
                  name: 'SNE OS',
                  description: 'SNE OS wallet authentication',
                  url: walletConnectUrl,
                  icons: [`${walletConnectUrl.replace(/\/$/, '')}/favicon.ico`],
                },
              }),
            ]
          : []),
      ],
      transports: {
        [mainnet.id]: http(CHAIN_RPC_URLS.mainnet),
        [arbitrumSepolia.id]: http(CHAIN_RPC_URLS.arbitrumSepolia),
        [arbitrum.id]: http(CHAIN_RPC_URLS.arbitrum),
        [optimism.id]: http(CHAIN_RPC_URLS.optimism),
        [base.id]: http(CHAIN_RPC_URLS.base),
        [polygon.id]: http(CHAIN_RPC_URLS.polygon),
        [scroll.id]: http(CHAIN_RPC_URLS.scroll),
      },
      ssr: true,
    })
  );

  return (
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        <TronWalletProvider>
          <AuthProvider>
            <EntitlementsProvider>
              <BrowserRouter>
                <Routes>
                  {/* Desktop Auth Route - Fullscreen outside main layout */}
                  <Route path="/auth" element={
                    <ChunkLoadBoundary>
                      <Suspense fallback={<AuthSkeleton />}>
                        <AuthSeo />
                        <AuthDesktop />
                      </Suspense>
                    </ChunkLoadBoundary>
                  } />

                  {/* Main App Routes */}
                  <Route path="/*" element={<AppContent />} />
                </Routes>
              </BrowserRouter>
            </EntitlementsProvider>
          </AuthProvider>
        </TronWalletProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}

function AuthSeo() {
  useSeoMeta({
    title: 'Autenticação | SNE OS',
    description: 'Fluxo de autenticação do SNE OS para dispositivos e superfícies protegidas.',
    canonicalPath: '/auth',
    robots: 'noindex, nofollow, noarchive',
  });
  return null;
}
