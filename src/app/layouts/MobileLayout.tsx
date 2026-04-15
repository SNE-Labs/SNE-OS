import { Suspense, lazy, useEffect, useMemo, useState } from 'react';
import { Navigate, Route, Routes, useLocation, useNavigate, useParams } from 'react-router-dom';
import { Activity, ArrowLeftRight, BadgeCheck, BookOpen, FileText, Grid2x2, House, KeyRound, LockKeyhole, Shield, X } from 'lucide-react';

const MobileHome = lazy(() => import('../pages/mobile/Home').then((m) => ({ default: m.MobileHome })));
const MobileRadar = lazy(() => import('../pages/mobile/Radar').then((m) => ({ default: m.MobileRadar })));
const MobileSwaps = lazy(() => import('../pages/mobile/Swaps').then((m) => ({ default: m.MobileSwaps })));
const MobileVault = lazy(() => import('../pages/mobile/Vault').then((m) => ({ default: m.MobileVault })));
const MobilePass = lazy(() => import('../pages/mobile/Pass').then((m) => ({ default: m.MobilePass })));
const MobileKeys = lazy(() => import('../pages/mobile/Keys').then((m) => ({ default: m.MobileKeys })));
const MobileSecrets = lazy(() => import('../pages/mobile/Secrets').then((m) => ({ default: m.MobileSecrets })));
const MobileDocs = lazy(() => import('../pages/mobile/Docs').then((m) => ({ default: m.MobileDocs })));
const MobileBlog = lazy(() => import('../pages/mobile/Blog').then((m) => ({ default: m.MobileBlog })));
const MobileBlogPost = lazy(() => import('../pages/mobile/BlogPost').then((m) => ({ default: m.MobileBlogPost })));
const MobileStatus = lazy(() => import('../pages/mobile/Status').then((m) => ({ default: m.MobileStatus })));

function MobileSkeleton() {
  return (
    <div className="flex-1 flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );
}

const mobileStyles = `
  .mobile-layout {
    position: relative;
    display: flex;
    flex-direction: column;
    height: 100vh;
    background:
      radial-gradient(circle at top, rgba(255, 140, 66, 0.08), transparent 34%),
      linear-gradient(180deg, rgba(255,255,255,0.02), rgba(255,255,255,0)),
      var(--bg-0, #05070c);
  }

  .mobile-content-area {
    flex: 1;
    min-height: 0;
    overflow: hidden;
  }

  .mobile-floating-dock-wrap {
    position: fixed;
    left: 50%;
    bottom: calc(env(safe-area-inset-bottom, 0px) + 14px);
    transform: translateX(-50%);
    z-index: 1200;
    display: flex;
    align-items: center;
    gap: 10px;
    pointer-events: none;
  }

  .mobile-floating-dock,
  .mobile-more-trigger,
  .mobile-more-sheet,
  .mobile-more-backdrop {
    pointer-events: auto;
  }

  .mobile-floating-dock {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 8px;
    border-radius: 999px;
    background: rgba(8, 12, 20, 0.82);
    border: 1px solid rgba(255,255,255,0.08);
    box-shadow: 0 20px 48px rgba(0,0,0,0.32);
    backdrop-filter: blur(22px);
    -webkit-backdrop-filter: blur(22px);
  }

  .mobile-dock-item {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    height: 46px;
    padding: 0 12px;
    border: none;
    border-radius: 999px;
    background: transparent;
    color: rgba(214, 220, 230, 0.74);
    transition: all 0.22s ease;
    white-space: nowrap;
  }

  .mobile-dock-item.active {
    background: rgba(255, 140, 66, 0.16);
    color: #ffffff;
    box-shadow: inset 0 0 0 1px rgba(255,255,255,0.06);
  }

  .mobile-dock-item .label {
    overflow: hidden;
    max-width: 0;
    opacity: 0;
    font-size: 12px;
    font-weight: 600;
    letter-spacing: 0.01em;
    transition: max-width 0.22s ease, opacity 0.18s ease;
  }

  .mobile-dock-item.active .label {
    max-width: 80px;
    opacity: 1;
  }

  .mobile-more-trigger {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 48px;
    height: 48px;
    border: none;
    border-radius: 999px;
    background: rgba(8, 12, 20, 0.82);
    border: 1px solid rgba(255,255,255,0.08);
    color: rgba(214, 220, 230, 0.8);
    box-shadow: 0 20px 48px rgba(0,0,0,0.32);
    backdrop-filter: blur(22px);
    -webkit-backdrop-filter: blur(22px);
    transition: transform 0.18s ease, color 0.18s ease, background 0.18s ease;
  }

  .mobile-more-trigger.open {
    color: #ffffff;
    background: rgba(255, 140, 66, 0.2);
  }

  .mobile-more-backdrop {
    position: fixed;
    inset: 0;
    z-index: 1150;
    background: rgba(2, 6, 12, 0.42);
    backdrop-filter: blur(6px);
    -webkit-backdrop-filter: blur(6px);
  }

  .mobile-more-sheet {
    position: fixed;
    left: 50%;
    bottom: calc(env(safe-area-inset-bottom, 0px) + 78px);
    transform: translateX(-50%);
    width: min(92vw, 360px);
    z-index: 1190;
    padding: 14px;
    border-radius: 28px;
    background: rgba(8, 12, 20, 0.9);
    border: 1px solid rgba(255,255,255,0.08);
    box-shadow: 0 26px 64px rgba(0,0,0,0.34);
    backdrop-filter: blur(22px);
    -webkit-backdrop-filter: blur(22px);
  }

  .mobile-more-sheet-grid {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 10px;
  }

  .mobile-more-item {
    display: flex;
    flex-direction: column;
    gap: 8px;
    padding: 14px;
    border: 1px solid rgba(255,255,255,0.08);
    border-radius: 18px;
    background: rgba(255,255,255,0.03);
    color: #ffffff;
    text-align: left;
  }

  .mobile-more-item-label {
    font-size: 14px;
    font-weight: 600;
  }

  .mobile-more-item-copy {
    font-size: 12px;
    color: rgba(214, 220, 230, 0.68);
    line-height: 1.4;
  }
`;

if (typeof document !== 'undefined' && !document.querySelector('style[data-mobile-layout="true"]')) {
  const styleSheet = document.createElement('style');
  styleSheet.dataset.mobileLayout = 'true';
  styleSheet.textContent = mobileStyles;
  document.head.appendChild(styleSheet);
}

const PRIMARY_ROUTES = {
  home: '/home',
  radar: '/radar',
  intel: '/intel',
  vault: '/vault',
} as const;

const primaryTabs = [
  { id: 'home', label: 'Home', icon: House },
  { id: 'radar', label: 'Radar', icon: Activity },
  { id: 'intel', label: 'Intel', icon: FileText },
  { id: 'vault', label: 'Vault', icon: Shield },
] as const;

const moreItems = [
  {
    label: 'Swaps',
    path: '/swaps',
    icon: ArrowLeftRight,
    copy: 'Mover, converter e usar USDT em ambiente multichain.',
  },
  {
    label: 'Passport',
    path: '/pass',
    icon: BadgeCheck,
    copy: 'Conta, wallets vinculadas e lookup publico.',
  },
  {
    label: 'Secrets',
    path: '/secrets',
    icon: LockKeyhole,
    copy: 'Cofre local e superfícies sensíveis do OS.',
  },
  {
    label: 'Keys',
    path: '/keys',
    icon: KeyRound,
    copy: 'Chaves, credenciais e superfícies de integração.',
  },
  {
    label: 'Docs',
    path: '/docs',
    icon: BookOpen,
    copy: 'Guias, contexto e documentação operacional.',
  },
  {
    label: 'Status',
    path: '/status',
    icon: Activity,
    copy: 'Saúde da stack e sinais de disponibilidade.',
  },
];

type PrimaryTabId = keyof typeof PRIMARY_ROUTES;

function resolvePrimaryTab(pathname: string): PrimaryTabId {
  if (pathname === '/' || pathname.startsWith('/home')) return 'home';
  if (pathname.startsWith('/radar')) return 'radar';
  if (pathname.startsWith('/intel') || pathname.startsWith('/blog')) return 'intel';
  if (pathname.startsWith('/vault')) return 'vault';
  return 'home';
}

function MobileLegacyBlogRedirect() {
  const params = useParams();
  if (params.topic) return <Navigate to={`/intel/topic/${params.topic}`} replace />;
  if (params.chain) return <Navigate to={`/intel/chain/${params.chain}`} replace />;
  if (params.asset) return <Navigate to={`/intel/asset/${params.asset}`} replace />;
  return <Navigate to={`/intel/${params.slug ?? ''}`} replace />;
}

export function MobileLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<PrimaryTabId>(() => resolvePrimaryTab(location.pathname));
  const [moreOpen, setMoreOpen] = useState(false);

  useEffect(() => {
    setActiveTab(resolvePrimaryTab(location.pathname));
    setMoreOpen(false);
  }, [location.pathname]);

  const activeTitle = useMemo(
    () => primaryTabs.find((tab) => tab.id === activeTab)?.label ?? 'Home',
    [activeTab]
  );

  const handlePrimaryNavigate = (tabId: PrimaryTabId) => {
    const nextRoute = PRIMARY_ROUTES[tabId];
    setActiveTab(tabId);
    if (location.pathname !== nextRoute) navigate(nextRoute);
  };

  const handleMoreNavigate = (path: string) => {
    setMoreOpen(false);
    if (location.pathname !== path) navigate(path);
  };

  return (
    <div className="mobile-layout">
      <div className="mobile-content-area">
        <Suspense fallback={<MobileSkeleton />}>
          <Routes>
            <Route path="/" element={<Navigate to="/home" replace />} />
            <Route path="/home" element={<MobileHome />} />
            <Route path="/radar" element={<MobileRadar />} />
            <Route path="/radar/:symbol" element={<MobileRadar />} />
            <Route path="/swaps" element={<MobileSwaps />} />
            <Route path="/intel" element={<MobileBlog />} />
            <Route path="/intel/topic/:topic" element={<MobileBlog />} />
            <Route path="/intel/chain/:chain" element={<MobileBlog />} />
            <Route path="/intel/asset/:asset" element={<MobileBlog />} />
            <Route path="/intel/:slug" element={<MobileBlogPost />} />
            <Route path="/blog" element={<Navigate to="/intel" replace />} />
            <Route path="/blog/topic/:topic" element={<MobileLegacyBlogRedirect />} />
            <Route path="/blog/chain/:chain" element={<MobileLegacyBlogRedirect />} />
            <Route path="/blog/asset/:asset" element={<MobileLegacyBlogRedirect />} />
            <Route path="/blog/:slug" element={<MobileLegacyBlogRedirect />} />
            <Route path="/vault" element={<MobileVault />} />
            <Route path="/pass" element={<MobilePass />} />
            <Route path="/keys" element={<MobileKeys />} />
            <Route path="/secrets" element={<MobileSecrets />} />
            <Route path="/docs" element={<MobileDocs />} />
            <Route path="/status" element={<MobileStatus />} />
            <Route path="*" element={<Navigate to="/home" replace />} />
          </Routes>
        </Suspense>
      </div>

      {moreOpen && <button className="mobile-more-backdrop" aria-label="Fechar menu adicional" onClick={() => setMoreOpen(false)} />}

      {moreOpen && (
        <div className="mobile-more-sheet">
          <div className="flex items-center justify-between gap-3 mb-4">
            <div>
              <div className="text-[11px] uppercase tracking-[0.18em]" style={{ color: 'rgba(214, 220, 230, 0.58)' }}>
                Navegação estendida
              </div>
              <div className="text-sm font-semibold" style={{ color: '#ffffff' }}>
                Extras do OS
              </div>
            </div>
            <button className="mobile-more-trigger open" aria-label="Fechar menu" onClick={() => setMoreOpen(false)}>
              <X size={18} />
            </button>
          </div>

          <div className="mobile-more-sheet-grid">
            {moreItems.map((item) => {
              const Icon = item.icon;
              return (
                <button key={item.path} className="mobile-more-item" onClick={() => handleMoreNavigate(item.path)}>
                  <Icon size={18} style={{ color: 'var(--accent-orange)' }} />
                  <div className="mobile-more-item-label">{item.label}</div>
                  <div className="mobile-more-item-copy">{item.copy}</div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      <div className="mobile-floating-dock-wrap" aria-label={`Dock móvel, foco atual em ${activeTitle}`}>
        <div className="mobile-floating-dock">
          {primaryTabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                className={`mobile-dock-item ${isActive ? 'active' : ''}`}
                onClick={() => handlePrimaryNavigate(tab.id)}
                aria-current={isActive ? 'page' : undefined}
              >
                <Icon size={18} />
                <span className="label">{tab.label}</span>
              </button>
            );
          })}
        </div>

        <button
          className={`mobile-more-trigger ${moreOpen ? 'open' : ''}`}
          aria-label="Abrir módulos extras"
          onClick={() => setMoreOpen((value) => !value)}
        >
          <Grid2x2 size={18} />
        </button>
      </div>
    </div>
  );
}
