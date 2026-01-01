import { lazy } from 'react';
import { motion } from 'framer-motion';
import { Activity, Shield, Key, BarChart3 } from 'lucide-react';
import { usePlatform } from '@/hooks/usePlatform';

// Lazy load icons para performance
const iconMap = {
  Activity: lazy(() => import('lucide-react').then(m => ({ default: m.Activity }))),
  Shield: lazy(() => import('lucide-react').then(m => ({ default: m.Shield }))),
  Key: lazy(() => import('lucide-react').then(m => ({ default: m.Key }))),
  BarChart3: lazy(() => import('lucide-react').then(m => ({ default: m.BarChart3 }))),
};

interface Tab {
  id: string;
  label: string;
  icon: keyof typeof iconMap;
  badge?: string | number;
}

interface TabBarProps {
  tabs: Tab[];
  activeTab: string;
  onTabChange: (tabId: string) => void;
}

export function MobileTabBar({ tabs, activeTab, onTabChange }: TabBarProps) {
  return (
    <div className="mobile-tab-bar">
      <div className="mobile-tab-bar-content">
        {tabs.map((tab) => (
          <TabBarItem
            key={tab.id}
            tab={tab}
            isActive={activeTab === tab.id}
            onClick={() => onTabChange(tab.id)}
          />
        ))}
      </div>

      {/* Safe area para iOS */}
      <div className="mobile-tab-bar-safe-area" />
    </div>
  );
}

interface TabBarItemProps {
  tab: Tab;
  isActive: boolean;
  onClick: () => void;
}

function TabBarItem({ tab, isActive, onClick }: TabBarItemProps) {
  const { deviceCapabilities, prefersReducedMotion } = usePlatform();
  const IconComponent = iconMap[tab.icon];

  // Otimizar animações baseado no dispositivo
  const getTapAnimation = () => {
    if (prefersReducedMotion) return {};
    if (deviceCapabilities.isLowEndDevice) {
      return { scale: 0.98, transition: { duration: 0.1 } };
    }
    return {
      scale: 0.92,
      transition: { type: "spring", stiffness: 400, damping: 17 }
    };
  };

  const getBadgeAnimation = () => {
    if (prefersReducedMotion) return { scale: tab.badge ? 1 : 0 };
    if (deviceCapabilities.isLowEndDevice) {
      return {
        scale: tab.badge ? 1 : 0,
        transition: { duration: 0.2, ease: "easeOut" }
      };
    }
    return {
      scale: tab.badge ? 1 : 0,
      transition: { type: "spring", stiffness: 500, damping: 25 }
    };
  };

  return (
    <motion.button
      className={`mobile-tab-item ${isActive ? 'active' : ''}`}
      onClick={onClick}
      whileTap={getTapAnimation()}
      style={{
        willChange: prefersReducedMotion ? 'auto' : 'transform',
        transform: 'translate3d(0, 0, 0)', // Force GPU acceleration
      }}
    >
      <div className="mobile-tab-icon-container">
        <IconComponent size={20} />
        {tab.badge && (
          <motion.span
            className="mobile-tab-badge"
            animate={getBadgeAnimation()}
            style={{
              transform: 'translate3d(0, 0, 0)', // Force GPU acceleration
            }}
          >
            {tab.badge}
          </motion.span>
        )}
      </div>
      <span className="mobile-tab-label">{tab.label}</span>
    </motion.button>
  );
}

// CSS-in-JS para performance (evita carregar CSS separado)
const styles = `
  .mobile-tab-bar {
    position: fixed;
    bottom: 0;
    left: 0;
    right: 0;
    background: rgba(255, 255, 255, 0.8);
    backdrop-filter: blur(20px);
    -webkit-backdrop-filter: blur(20px);
    border-top: 0.5px solid rgba(0, 0, 0, 0.1);
    z-index: 1000;
  }

  .mobile-tab-bar-content {
    display: flex;
    height: 83px; /* iOS standard height */
    padding-bottom: env(safe-area-inset-bottom, 0px);
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
    position: relative;
    min-height: 49px;
  }

  .mobile-tab-item.active {
    color: #007AFF;
  }

  .mobile-tab-icon-container {
    position: relative;
    margin-bottom: 2px;
  }

  .mobile-tab-badge {
    position: absolute;
    top: -8px;
    right: -8px;
    background: #FF3B30;
    color: white;
    border-radius: 10px;
    padding: 2px 6px;
    font-size: 10px;
    font-weight: 600;
    min-width: 16px;
    text-align: center;
    border: 2px solid white;
  }

  .mobile-tab-label {
    font-size: 10px;
    line-height: 1;
  }

  /* iOS safe area */
  .mobile-tab-bar-safe-area {
    height: env(safe-area-inset-bottom, 0px);
    background: rgba(255, 255, 255, 0.8);
  }

  /* Dark mode support */
  @media (prefers-color-scheme: dark) {
    .mobile-tab-bar {
      background: rgba(28, 28, 30, 0.8);
      border-top-color: rgba(255, 255, 255, 0.1);
    }

    .mobile-tab-bar-safe-area {
      background: rgba(28, 28, 30, 0.8);
    }
  }

  /* Reduced motion support */
  @media (prefers-reduced-motion: reduce) {
    .mobile-tab-item {
      transition: none;
    }
  }
`;

// Inject styles
if (typeof document !== 'undefined') {
  const styleSheet = document.createElement('style');
  styleSheet.textContent = styles;
  document.head.appendChild(styleSheet);
}
