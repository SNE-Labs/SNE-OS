import { Suspense, lazy, useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Activity, House, Key, KeyRound, LockKeyhole, Shield } from 'lucide-react';

const MobileHome = lazy(() => import('../pages/mobile/Home').then((m) => ({ default: m.MobileHome })));
const MobileRadar = lazy(() => import('../pages/mobile/Radar').then((m) => ({ default: m.MobileRadar })));
const MobileVault = lazy(() => import('../pages/mobile/Vault').then((m) => ({ default: m.MobileVault })));
const MobilePass = lazy(() => import('../pages/mobile/Pass').then((m) => ({ default: m.MobilePass })));
const MobileKeys = lazy(() => import('../pages/mobile/Keys').then((m) => ({ default: m.MobileKeys })));
const MobileSecrets = lazy(() => import('../pages/mobile/Secrets').then((m) => ({ default: m.MobileSecrets })));
const MobileDocs = lazy(() => import('../pages/mobile/Docs').then((m) => ({ default: m.MobileDocs })));
const MobileBlog = lazy(() => import('../pages/mobile/Blog').then((m) => ({ default: m.MobileBlog })));
const MobileBlogPost = lazy(() => import('../pages/mobile/BlogPost').then((m) => ({ default: m.MobileBlogPost })));

function MobileSkeleton() {
  return (
    <div className="flex-1 flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );
}

const mobileStyles = `
  .mobile-layout {
    display: flex;
    flex-direction: column;
    height: 100vh;
    background: var(--bg-0, #ffffff);
  }

  .mobile-content-area {
    flex: 1;
    min-height: 0;
    overflow: hidden;
  }

  .mobile-tab-bar {
    display: flex;
    height: 83px;
    background: rgba(255, 255, 255, 0.88);
    backdrop-filter: blur(20px);
    border-top: 0.5px solid rgba(0, 0, 0, 0.1);
    z-index: 1000;
  }

  .mobile-tab-item {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 8px;
    border: none;
    background: transparent;
    color: #8E8E93;
    font-size: 10px;
    font-weight: 500;
    transition: color 0.2s ease;
  }

  .mobile-tab-item.active {
    color: #007AFF;
  }
`;

if (typeof document !== 'undefined' && !document.querySelector('style[data-mobile-layout="true"]')) {
  const styleSheet = document.createElement('style');
  styleSheet.dataset.mobileLayout = 'true';
  styleSheet.textContent = mobileStyles;
  document.head.appendChild(styleSheet);
}

const TAB_ROUTES = {
  home: '/home',
  radar: '/radar',
  vault: '/vault',
  pass: '/pass',
  secrets: '/secrets',
  keys: '/keys',
} as const;

const tabs = [
  { id: 'home', label: 'Home', icon: House },
  { id: 'radar', label: 'Radar', icon: Activity },
  { id: 'vault', label: 'Vault', icon: Shield },
  { id: 'pass', label: 'Pass', icon: Key },
  { id: 'secrets', label: 'Secrets', icon: LockKeyhole },
  { id: 'keys', label: 'Keys', icon: KeyRound },
] as const;

function resolveTabFromPath(pathname: string): keyof typeof TAB_ROUTES {
  if (pathname === '/' || pathname.startsWith('/home')) return 'home';
  if (pathname.startsWith('/radar')) return 'radar';
  if (pathname.startsWith('/vault')) return 'vault';
  if (pathname.startsWith('/pass')) return 'pass';
  if (pathname.startsWith('/secrets')) return 'secrets';
  if (pathname.startsWith('/keys')) return 'keys';
  return 'home';
}

function resolveComponent(pathname: string) {
  if (pathname === '/' || pathname.startsWith('/home')) return MobileHome;
  if (pathname.startsWith('/radar')) return MobileRadar;
  if (pathname.startsWith('/vault')) return MobileVault;
  if (pathname.startsWith('/pass')) return MobilePass;
  if (pathname.startsWith('/secrets')) return MobileSecrets;
  if (pathname.startsWith('/keys')) return MobileKeys;
  if (pathname.startsWith('/docs')) return MobileDocs;
  if (pathname.startsWith('/intel/')) return MobileBlogPost;
  if (pathname.startsWith('/intel')) return MobileBlog;
  if (pathname.startsWith('/blog/')) return MobileBlogPost;
  if (pathname.startsWith('/blog')) return MobileBlog;
  return MobileHome;
}

export function MobileLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const isInternalNavigation = useRef(false);

  const [activeTab, setActiveTab] = useState<keyof typeof TAB_ROUTES>(() => resolveTabFromPath(location.pathname));

  const handleTabChange = (tabId: keyof typeof TAB_ROUTES) => {
    if (tabId === activeTab && location.pathname === TAB_ROUTES[tabId]) return;

    isInternalNavigation.current = true;
    setActiveTab(tabId);

    const nextRoute = TAB_ROUTES[tabId];
    if (location.pathname !== nextRoute) {
      navigate(nextRoute, { replace: true });
    }

    window.setTimeout(() => {
      isInternalNavigation.current = false;
    }, 100);
  };

  useEffect(() => {
    if (isInternalNavigation.current) return;
    const nextTab = resolveTabFromPath(location.pathname);
    if (nextTab !== activeTab) {
      setActiveTab(nextTab);
    }
  }, [activeTab, location.pathname]);

  const CurrentComponent = resolveComponent(location.pathname);

  return (
    <div className="mobile-layout">
      <div className="mobile-content-area">
        <Suspense fallback={<MobileSkeleton />}>
          <CurrentComponent />
        </Suspense>
      </div>

      <div className="mobile-tab-bar">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              className={`mobile-tab-item ${activeTab === tab.id ? 'active' : ''}`}
              onClick={() => handleTabChange(tab.id)}
            >
              <Icon size={20} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
