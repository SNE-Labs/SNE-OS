import { lazy, useState, useEffect, useCallback } from 'react';
import { usePlatform } from './usePlatform';

// Lazy loaded mobile components
const LazyTabBar = lazy(() => import('../app/components/mobile/TabBar').then(m => ({ default: m.MobileTabBar })));
const LazyContainer = lazy(() => import('../app/components/mobile/Container').then(m => ({ default: m.MobileContainer })));
const LazyMobileLayout = lazy(() => import('../app/layouts/MobileLayout').then(m => ({ default: m.MobileLayout })));

// Mobile pages (já lazy loaded no MobileLayout, mas podemos preload)
const LazyMobileHome = lazy(() => import('../app/pages/mobile/Home').then(m => ({ default: m.MobileHome })));
const LazyMobilePricing = lazy(() => import('../app/pages/mobile/Pricing').then(m => ({ default: m.MobilePricing })));
const LazyMobileDocs = lazy(() => import('../app/pages/mobile/Docs').then(m => ({ default: m.MobileDocs })));

export function useLazyMobileComponents() {
  const { isMobile } = usePlatform();
  const [loadedComponents, setLoadedComponents] = useState<Set<string>>(new Set());

  // Component loading states
  const [tabBarLoaded, setTabBarLoaded] = useState(false);
  const [containerLoaded, setContainerLoaded] = useState(false);
  const [layoutLoaded, setLayoutLoaded] = useState(false);

  // Preload strategy based on user behavior
  const preloadComponent = useCallback((componentName: string) => {
    if (!isMobile || loadedComponents.has(componentName)) return;

    switch (componentName) {
      case 'tabBar':
        // TabBar is critical, load immediately
        import('../app/components/mobile/TabBar').then(() => {
          setTabBarLoaded(true);
          setLoadedComponents(prev => new Set(prev).add(componentName));
        });
        break;

      case 'container':
        // Container is critical for navigation
        import('../app/components/mobile/Container').then(() => {
          setContainerLoaded(true);
          setLoadedComponents(prev => new Set(prev).add(componentName));
        });
        break;

      case 'layout':
        // Mobile layout is critical for mobile users
        import('../app/layouts/MobileLayout').then(() => {
          setLayoutLoaded(true);
          setLoadedComponents(prev => new Set(prev).add(componentName));
        });
        break;

      case 'pages':
        // Preload all mobile pages
        Promise.all([
          import('../app/pages/mobile/Home'),
          import('../app/pages/mobile/Pricing'),
          import('../app/pages/mobile/Docs'),
        ]).then(() => {
          setLoadedComponents(prev => new Set(prev).add(componentName));
        });
        break;
    }
  }, [isMobile, loadedComponents]);

  // Smart preload based on platform
  useEffect(() => {
    if (!isMobile) return;

    // Critical components - load immediately
    preloadComponent('tabBar');
    preloadComponent('container');
    preloadComponent('layout');

    // Non-critical components - preload after interaction
    const timer = setTimeout(() => {
      preloadComponent('pages');
    }, 1000); // 1s delay to prioritize critical components

    return () => clearTimeout(timer);
  }, [isMobile, preloadComponent]);

  // Preload on user interaction hints
  useEffect(() => {
    if (!isMobile) return;

    const handleMouseMove = (e: MouseEvent) => {
      // If mouse is near bottom of screen (where tab bar would be), preload
      if (e.clientY > window.innerHeight - 100) {
        preloadComponent('tabBar');
      }
    };

    const handleScroll = () => {
      // If user scrolls quickly, they might be navigating - preload container
      preloadComponent('container');
    };

    // Touch events for mobile
    const handleTouchStart = () => {
      preloadComponent('container');
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('scroll', handleScroll, { passive: true });
    window.addEventListener('touchstart', handleTouchStart, { passive: true });

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('touchstart', handleTouchStart);
    };
  }, [isMobile, preloadComponent]);

  return {
    // Component loaders
    TabBar: tabBarLoaded ? LazyTabBar : null,
    Container: containerLoaded ? LazyContainer : null,
    MobileLayout: layoutLoaded ? LazyMobileLayout : null,

    // Loading states
    tabBarLoaded,
    containerLoaded,
    layoutLoaded,

    // Preload function for manual control
    preloadComponent,

    // Utility function to check if component is loaded
    isLoaded: (componentName: string) => loadedComponents.has(componentName),
  };
}

// Hook for lazy loading individual mobile pages with smart prefetching
export function useLazyMobilePage(pageName: string) {
  const [PageComponent, setPageComponent] = useState<React.ComponentType | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const { isMobile } = usePlatform();

  const loadPage = useCallback(async () => {
    if (!isMobile || PageComponent || isLoading) return;

    setIsLoading(true);
    try {
      let module;
      switch (pageName) {
        case 'Home':
          module = await import('../app/pages/mobile/Home');
          break;
        case 'Pricing':
          module = await import('../app/pages/mobile/Pricing');
          break;
        case 'Docs':
          module = await import('../app/pages/mobile/Docs');
          break;
        default:
          throw new Error(`Unknown page: ${pageName}`);
      }

      setPageComponent(() => module.default);
    } catch (error) {
      console.error(`Failed to load mobile page ${pageName}:`, error);
    } finally {
      setIsLoading(false);
    }
  }, [isMobile, PageComponent, isLoading, pageName]);

  // Auto-load based on navigation patterns
  useEffect(() => {
    if (!isMobile) return;

    // Load immediately for critical pages
    if (['Radar', 'Vault', 'Pass', 'Status'].includes(pageName)) {
      loadPage();
      return;
    }

    // Load on demand for secondary pages
    const timer = setTimeout(() => {
      loadPage();
    }, 2000); // 2s delay

    return () => clearTimeout(timer);
  }, [isMobile, pageName, loadPage]);

  return {
    PageComponent,
    isLoading,
    loadPage,
  };
}

// Hook for prefetching adjacent routes
export function useMobilePrefetch(currentRoute: string) {
  const { isMobile } = usePlatform();

  useEffect(() => {
    if (!isMobile) return;

    // Define adjacent routes for prefetching
    const routeMap: Record<string, string[]> = {
      '/radar': ['/vault', '/pass'],
      '/vault': ['/radar', '/pass', '/status'],
      '/pass': ['/vault', '/status'],
      '/status': ['/pass', '/vault'],
    };

    const adjacentRoutes = routeMap[currentRoute] || [];

    // Prefetch adjacent routes after a delay
    const timer = setTimeout(() => {
      adjacentRoutes.forEach(route => {
        const link = document.createElement('link');
        link.rel = 'prefetch';
        link.href = route;
        document.head.appendChild(link);
      });
    }, 3000); // 3s delay to not interfere with current page load

    return () => clearTimeout(timer);
  }, [currentRoute, isMobile]);
}

// Performance monitoring hook for mobile components
export function useMobilePerformance() {
  const [metrics, setMetrics] = useState({
    tabBarLoadTime: 0,
    containerLoadTime: 0,
    pageSwitchTime: 0,
    gestureResponseTime: 0,
  });

  const measureLoadTime = useCallback((component: string, startTime: number) => {
    const loadTime = Date.now() - startTime;

    setMetrics(prev => ({
      ...prev,
      [`${component}LoadTime`]: loadTime,
    }));

    // Log performance metrics
    if (process.env.NODE_ENV === 'development') {
      console.log(`Mobile ${component} loaded in ${loadTime}ms`);
    }
  }, []);

  const measurePageSwitch = useCallback((startTime: number) => {
    const switchTime = Date.now() - startTime;
    setMetrics(prev => ({
      ...prev,
      pageSwitchTime: switchTime,
    }));
  }, []);

  return {
    metrics,
    measureLoadTime,
    measurePageSwitch,
  };
}
