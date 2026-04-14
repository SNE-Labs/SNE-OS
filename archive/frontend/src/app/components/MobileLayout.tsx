import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { BottomTabBar, type TabId } from './mobile/BottomTabBar';
import { useWallet } from '../../hooks/useWallet';
import { shortenAddress } from '../../lib/utils';
import { cn } from '../../lib/utils';

interface MobileLayoutProps {
  children: React.ReactNode;
}

// Mapear rotas para tabs
const routeToTab: Record<string, TabId> = {
  '/': 'radar',
  '/dashboard': 'radar',
  '/chart': 'radar',
  '/analysis': 'radar',
  '/pricing': 'pricing',
};

const tabToRoute: Record<TabId, string> = {
  radar: '/dashboard',
  vault: '/dashboard', // Temporário - redireciona para dashboard
  pass: '/dashboard', // Temporário - redireciona para dashboard
  pricing: '/pricing',
  status: '/dashboard', // Temporário - redireciona para dashboard
  docs: '/dashboard', // Temporário - redireciona para dashboard
};

export function MobileLayout({ children }: MobileLayoutProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const { address, isAuthenticated, tier } = useWallet();
  const [activeTab, setActiveTab] = useState<TabId>('radar');
  const [isMobile, setIsMobile] = useState(false);

  // Detectar mobile
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Sincronizar tab ativa com rota atual
  useEffect(() => {
    const currentTab = routeToTab[location.pathname] || 'radar';
    setActiveTab(currentTab);
  }, [location.pathname]);

  // Navegar quando tab mudar
  const handleTabChange = (tab: TabId) => {
    setActiveTab(tab);
    const route = tabToRoute[tab];
    if (route) {
      navigate(route);
    }
  };

  // Se não for mobile, não renderizar layout mobile
  if (!isMobile) {
    return <>{children}</>;
  }

  return (
    <div className="dark h-screen flex flex-col bg-[var(--bg-0)] overflow-hidden">
      {/* Mobile viewport container - iPhone 375x812 */}
      <div className="flex-1 flex flex-col mx-auto w-full max-w-[375px] border-x border-[var(--stroke-1)]">
        {/* Screen content */}
        <div className="flex-1 overflow-hidden">
          {children}
        </div>

        {/* Bottom Tab Bar */}
        <BottomTabBar
          activeTab={activeTab}
          onTabChange={handleTabChange}
          badges={{
            // Adicionar badges dinâmicos aqui se necessário
          }}
        />
      </div>
    </div>
  );
}

