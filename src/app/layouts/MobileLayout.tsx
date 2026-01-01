import { Suspense, lazy, useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Activity, Shield, Key, BarChart3, DollarSign, FileText } from 'lucide-react';

// Lazy load mobile pages
const MobileHome = lazy(() => import('../pages/mobile/Home').then(m => ({ default: m.MobileHome })));
const MobileRadar = lazy(() => import('../pages/mobile/Radar').then(m => ({ default: m.MobileRadar })));
const MobileVault = lazy(() => import('../pages/mobile/Vault').then(m => ({ default: m.MobileVault })));
const MobilePass = lazy(() => import('../pages/mobile/Pass').then(m => ({ default: m.MobilePass })));
const MobilePricing = lazy(() => import('../pages/mobile/Pricing').then(m => ({ default: m.MobilePricing })));
const MobileStatus = lazy(() => import('../pages/mobile/Status').then(m => ({ default: m.MobileStatus })));
const MobileDocs = lazy(() => import('../pages/mobile/Docs').then(m => ({ default: m.MobileDocs })));

// Loading component for mobile
function MobileSkeleton() {
  return (
    <div className="flex-1 flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
    </div>
  );
}

// Basic mobile styles
const mobileStyles = `
  .mobile-layout {
    display: flex;
    flex-direction: column;
    height: 100vh;
    background: var(--bg-0, #ffffff);
  }

  .mobile-content-area {
    flex: 1;
    overflow-y: auto;
    padding: 16px;
  }

  .mobile-tab-bar {
    display: flex;
    height: 83px;
    background: rgba(255, 255, 255, 0.8);
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

// Inject styles
if (typeof document !== 'undefined') {
  const styleSheet = document.createElement('style');
  styleSheet.textContent = mobileStyles;
  document.head.appendChild(styleSheet);
}

export function MobileLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const isInternalNavigation = useRef(false);

  const [activeTab, setActiveTab] = useState(() => {
    // Determinar tab ativa baseada na rota atual
    const path = location.pathname;
    if (path.includes('/radar')) return 'radar';
    if (path.includes('/vault')) return 'vault';
    if (path.includes('/pass')) return 'pass';
    if (path.includes('/pricing')) return 'pricing';
    if (path.includes('/status')) return 'status';
    if (path.includes('/docs')) return 'docs';
    return 'radar'; // default
  });

  const tabs = [
    { id: 'radar', label: 'Radar', icon: 'Activity' as const },
    { id: 'vault', label: 'Vault', icon: 'Shield' as const },
    { id: 'pass', label: 'Pass', icon: 'Key' as const },
    { id: 'pricing', label: 'Pricing', icon: 'DollarSign' as const },
    { id: 'status', label: 'Status', icon: 'BarChart3' as const },
    { id: 'docs', label: 'Docs', icon: 'FileText' as const },
  ];

  // Função para mudar tab e atualizar URL
  const handleTabChange = (tabId: string) => {
    if (tabId === activeTab) return; // Evitar mudanças desnecessárias

    isInternalNavigation.current = true;
    setActiveTab(tabId);

    // Atualizar URL apenas quando necessário
    const tabRoutes = {
      radar: '/radar',
      vault: '/vault',
      pass: '/pass',
      pricing: '/pricing',
      status: '/status',
      docs: '/docs'
    };

    const newRoute = tabRoutes[tabId as keyof typeof tabRoutes] || '/radar';
    if (location.pathname !== newRoute) {
      navigate(newRoute, { replace: true });
    }

    // Reset flag after navigation
    setTimeout(() => {
      isInternalNavigation.current = false;
    }, 100);
  };

  // Sincronizar tab com rota atual (apenas navegação externa)
  useEffect(() => {
    // Só sincronizar se não foi navegação interna
    if (isInternalNavigation.current) return;

    const path = location.pathname;
    let newTab = 'radar';

    if (path === '/radar') newTab = 'radar';
    else if (path === '/vault') newTab = 'vault';
    else if (path === '/pass') newTab = 'pass';
    else if (path === '/pricing') newTab = 'pricing';
    else if (path === '/status') newTab = 'status';
    else if (path === '/docs') newTab = 'docs';

    if (newTab !== activeTab) {
      setActiveTab(newTab);
    }
  }, [location.pathname]); // Só depende de location.pathname

  // Get current component based on active tab
  const tabComponents = {
    radar: MobileRadar,
    vault: MobileVault,
    pass: MobilePass,
    pricing: MobilePricing,
    status: MobileStatus,
    docs: MobileDocs
  };

  const CurrentComponent = tabComponents[activeTab as keyof typeof tabComponents] || MobileRadar;

  return (
    <div className="mobile-layout">
      {/* Main Content Area */}
      <div className="mobile-content-area">
        <Suspense fallback={<MobileSkeleton />}>
          <CurrentComponent />
        </Suspense>
      </div>

      {/* Simple Tab Bar */}
      <div className="mobile-tab-bar">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            className={`mobile-tab-item ${activeTab === tab.id ? 'active' : ''}`}
            onClick={() => handleTabChange(tab.id)}
          >
            {tab.icon === 'Activity' && <Activity size={20} />}
            {tab.icon === 'Shield' && <Shield size={20} />}
            {tab.icon === 'Key' && <Key size={20} />}
            {tab.icon === 'BarChart3' && <BarChart3 size={20} />}
            <span>{tab.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

// Map routes to components
const routeComponents = {
  '/': MobileRadar, // Default to radar
  '/radar': MobileRadar,
  '/vault': MobileVault,
  '/pass': MobilePass,
  '/pricing': MobilePricing,
  '/status': MobileStatus,
  '/docs': MobileDocs,
};