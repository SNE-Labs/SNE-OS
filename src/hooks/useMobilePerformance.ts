import { useState, useEffect, useCallback } from 'react';
import { usePlatform } from './usePlatform';

// Tipos para métricas de performance mobile
interface MobilePerformanceMetrics {
  // Tempos de carregamento
  initialLoadTime: number;
  tabBarLoadTime: number;
  containerLoadTime: number;
  pageSwitchTime: number;

  // Gestos e interações
  gestureCount: number;
  swipeLeftCount: number;
  swipeRightCount: number;
  tapCount: number;

  // Performance de animações
  animationFrameDrops: number;
  averageAnimationDuration: number;

  // Rede e recursos
  networkRequests: number;
  cacheHits: number;
  bundleSize: number;

  // Experiência do usuário
  timeToInteractive: number;
  largestContentfulPaint: number;
  firstInputDelay: number;
}

interface PerformanceEvent {
  type: 'load' | 'gesture' | 'animation' | 'navigation' | 'error';
  name: string;
  value: number;
  timestamp: number;
  metadata?: Record<string, any>;
}

export function useMobilePerformance() {
  const { isMobile, deviceCapabilities } = usePlatform();
  const [metrics, setMetrics] = useState<MobilePerformanceMetrics>({
    initialLoadTime: 0,
    tabBarLoadTime: 0,
    containerLoadTime: 0,
    pageSwitchTime: 0,
    gestureCount: 0,
    swipeLeftCount: 0,
    swipeRightCount: 0,
    tapCount: 0,
    animationFrameDrops: 0,
    averageAnimationDuration: 0,
    networkRequests: 0,
    cacheHits: 0,
    bundleSize: 0,
    timeToInteractive: 0,
    largestContentfulPaint: 0,
    firstInputDelay: 0,
  });

  const [events, setEvents] = useState<PerformanceEvent[]>([]);

  // Registrar evento de performance
  const recordEvent = useCallback((event: Omit<PerformanceEvent, 'timestamp'>) => {
    const performanceEvent: PerformanceEvent = {
      ...event,
      timestamp: Date.now(),
    };

    setEvents(prev => [...prev.slice(-100), performanceEvent]); // Manter últimos 100 eventos

    // Atualizar métricas agregadas
    setMetrics(prev => {
      const newMetrics = { ...prev };

      switch (event.type) {
        case 'load':
          if (event.name === 'tabBar') newMetrics.tabBarLoadTime = event.value;
          if (event.name === 'container') newMetrics.containerLoadTime = event.value;
          if (event.name === 'initial') newMetrics.initialLoadTime = event.value;
          if (event.name === 'pageSwitch') newMetrics.pageSwitchTime = event.value;
          break;

        case 'gesture':
          newMetrics.gestureCount++;
          if (event.name === 'swipeLeft') newMetrics.swipeLeftCount++;
          if (event.name === 'swipeRight') newMetrics.swipeRightCount++;
          if (event.name === 'tap') newMetrics.tapCount++;
          break;

        case 'animation':
          if (event.name === 'frameDrop') newMetrics.animationFrameDrops++;
          if (event.name === 'duration') {
            // Calcular média móvel
            newMetrics.averageAnimationDuration =
              (newMetrics.averageAnimationDuration + event.value) / 2;
          }
          break;
      }

      return newMetrics;
    });

    // Log em desenvolvimento
    if (process.env.NODE_ENV === 'development') {
      console.log(`📊 Mobile Performance: ${event.type} - ${event.name}: ${event.value}ms`, event.metadata);
    }
  }, []);

  // Medir tempo de carregamento de componentes
  const measureLoadTime = useCallback((componentName: string, startTime: number) => {
    const loadTime = Date.now() - startTime;
    recordEvent({
      type: 'load',
      name: componentName,
      value: loadTime,
    });
  }, [recordEvent]);

  // Medir gestos
  const measureGesture = useCallback((gestureType: string, metadata?: Record<string, any>) => {
    recordEvent({
      type: 'gesture',
      name: gestureType,
      value: 0, // Gestos não têm duração, apenas contagem
      metadata,
    });
  }, [recordEvent]);

  // Medir animações
  const measureAnimation = useCallback((animationName: string, duration: number) => {
    recordEvent({
      type: 'animation',
      name: animationName,
      value: duration,
    });
  }, [recordEvent]);

  // Web Vitals tracking
  useEffect(() => {
    if (!isMobile || typeof window === 'undefined') return;

    // Largest Contentful Paint
    new PerformanceObserver((list) => {
      const entries = list.getEntries();
      const lastEntry = entries[entries.length - 1];
      setMetrics(prev => ({
        ...prev,
        largestContentfulPaint: lastEntry.startTime,
      }));
    }).observe({ entryTypes: ['largest-contentful-paint'] });

    // First Input Delay
    new PerformanceObserver((list) => {
      const entries = list.getEntries();
      entries.forEach((entry: any) => {
        setMetrics(prev => ({
          ...prev,
          firstInputDelay: entry.processingStart - entry.startTime,
        }));
      });
    }).observe({ entryTypes: ['first-input'] });

    // Time to Interactive
    const navEntry = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
    if (navEntry) {
      setMetrics(prev => ({
        ...prev,
        timeToInteractive: navEntry.domInteractive - navEntry.fetchStart,
      }));
    }
  }, [isMobile]);

  // Network request monitoring
  useEffect(() => {
    if (!isMobile || typeof window === 'undefined') return;

    const observer = new PerformanceObserver((list) => {
      list.getEntries().forEach((entry: any) => {
        if (entry.initiatorType === 'fetch' || entry.initiatorType === 'xmlhttprequest') {
          setMetrics(prev => ({
            ...prev,
            networkRequests: prev.networkRequests + 1,
          }));
        }
      });
    });

    observer.observe({ entryTypes: ['resource'] });

    return () => observer.disconnect();
  }, [isMobile]);

  // Bundle size estimation
  useEffect(() => {
    if (!isMobile || typeof window === 'undefined') return;

    // Estimar tamanho do bundle baseado nos recursos carregados
    const estimateBundleSize = () => {
      const resources = performance.getEntriesByType('resource') as PerformanceResourceTiming[];
      const jsResources = resources.filter(r => r.name.endsWith('.js'));

      const totalSize = jsResources.reduce((acc, resource) => {
        return acc + (resource.transferSize || 0);
      }, 0);

      setMetrics(prev => ({
        ...prev,
        bundleSize: totalSize,
      }));
    };

    // Estimar após carregamento inicial
    setTimeout(estimateBundleSize, 3000);
  }, [isMobile]);

  // Cache hit monitoring (se disponível)
  useEffect(() => {
    if (!isMobile || typeof window === 'undefined') return;

    const observer = new PerformanceObserver((list) => {
      list.getEntries().forEach((entry: any) => {
        if (entry.transferSize === 0 && entry.decodedBodySize > 0) {
          // Cache hit
          setMetrics(prev => ({
            ...prev,
            cacheHits: prev.cacheHits + 1,
          }));
        }
      });
    });

    observer.observe({ entryTypes: ['resource'] });

    return () => observer.disconnect();
  }, [isMobile]);

  // Detectar frame drops (usando requestAnimationFrame)
  useEffect(() => {
    if (!isMobile || typeof window === 'undefined') return;

    let lastFrameTime = performance.now();
    let frameCount = 0;

    const checkFrameRate = (currentTime: number) => {
      const deltaTime = currentTime - lastFrameTime;

      if (deltaTime > 16.67) { // Mais de 60fps
        setMetrics(prev => ({
          ...prev,
          animationFrameDrops: prev.animationFrameDrops + 1,
        }));
      }

      lastFrameTime = currentTime;
      frameCount++;

      if (frameCount < 300) { // Monitor por ~5 segundos
        requestAnimationFrame(checkFrameRate);
      }
    };

    requestAnimationFrame(checkFrameRate);
  }, [isMobile]);

  // Export metrics for external monitoring
  const exportMetrics = useCallback(() => {
    return {
      metrics,
      events: events.slice(-50), // Últimos 50 eventos
      deviceInfo: {
        isMobile,
        ...deviceCapabilities,
        userAgent: navigator.userAgent,
        screenSize: `${window.innerWidth}x${window.innerHeight}`,
      },
    };
  }, [metrics, events, isMobile, deviceCapabilities]);

  // Send metrics to monitoring service (em produção)
  const sendMetrics = useCallback(async () => {
    if (process.env.NODE_ENV !== 'production') return;

    try {
      const metricsData = exportMetrics();
      // await fetch('/api/metrics/mobile', {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify(metricsData),
      // });
      console.log('📊 Mobile metrics sent:', metricsData);
    } catch (error) {
      console.error('Failed to send mobile metrics:', error);
    }
  }, [exportMetrics]);

  // Send metrics periodically
  useEffect(() => {
    if (!isMobile) return;

    const interval = setInterval(sendMetrics, 60000); // A cada minuto
    return () => clearInterval(interval);
  }, [isMobile, sendMetrics]);

  return {
    metrics,
    events,
    recordEvent,
    measureLoadTime,
    measureGesture,
    measureAnimation,
    exportMetrics,
    sendMetrics,
  };
}

// Hook específico para monitoring de gestos
export function useGestureAnalytics() {
  const { measureGesture } = useMobilePerformance();

  const trackSwipe = useCallback((direction: 'left' | 'right', distance: number, velocity: number) => {
    measureGesture(`swipe${direction.charAt(0).toUpperCase() + direction.slice(1)}`, {
      distance,
      velocity,
    });
  }, [measureGesture]);

  const trackTap = useCallback((element: string) => {
    measureGesture('tap', { element });
  }, [measureGesture]);

  const trackLongPress = useCallback((element: string, duration: number) => {
    measureGesture('longPress', { element, duration });
  }, [measureGesture]);

  return {
    trackSwipe,
    trackTap,
    trackLongPress,
  };
}

// Hook para monitoring de animações
export function useAnimationPerformance() {
  const { measureAnimation } = useMobilePerformance();

  const measureFramerMotion = useCallback((animationName: string, element: HTMLElement) => {
    if (!element) return;

    const startTime = performance.now();

    // Usar MutationObserver para detectar fim da animação
    const observer = new MutationObserver(() => {
      const duration = performance.now() - startTime;
      measureAnimation(animationName, duration);
    });

    // Monitorar mudanças de estilo (Framer Motion usa transform)
    observer.observe(element, {
      attributes: true,
      attributeFilter: ['style'],
    });

    // Cleanup após timeout
    setTimeout(() => observer.disconnect(), 2000);
  }, [measureAnimation]);

  return {
    measureFramerMotion,
  };
}


