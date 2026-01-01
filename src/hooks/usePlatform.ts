import { useState, useEffect } from 'react';

/**
 * Hook simplificado para detectar plataforma
 * Versão segura para evitar crashes
 */
export function usePlatform() {
  const [isMobile, setIsMobile] = useState(false);
  const [isTablet, setIsTablet] = useState(false);
  const [isDesktop, setIsDesktop] = useState(true);

  useEffect(() => {
    const mobileQuery = window.matchMedia('(max-width: 768px)');
    const tabletQuery = window.matchMedia('(min-width: 769px) and (max-width: 1024px)');

    const updatePlatform = () => {
      const mobile = mobileQuery.matches;
      const tablet = tabletQuery.matches && !mobile;
      const desktop = !mobile && !tablet;

      setIsMobile(mobile);
      setIsTablet(tablet);
      setIsDesktop(desktop);
    };

    mobileQuery.addEventListener('change', updatePlatform);
    tabletQuery.addEventListener('change', updatePlatform);

    updatePlatform();

    return () => {
      mobileQuery.removeEventListener('change', updatePlatform);
      tabletQuery.removeEventListener('change', updatePlatform);
    };
  }, []);

  // Capacidades básicas e seguras
  const deviceCapabilities = {
    hasTouch: typeof window !== 'undefined' && ('ontouchstart' in window || navigator.maxTouchPoints > 0),
    hasGyroscope: typeof window !== 'undefined' && 'DeviceOrientationEvent' in window,
    isLowEndDevice: false, // Simplificado para evitar detecção complexa
    prefersReducedMotion: typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches,
    supportsWebGL: false, // Simplificado
    supportsWebRTC: false, // Simplificado
  };

  return {
    isMobile,
    isTablet,
    isDesktop,
    deviceCapabilities,
    platform: isMobile ? 'mobile' : isTablet ? 'tablet' : 'desktop',
  };
}

/**
 * Hook para detectar se devemos usar animações reduzidas
 */
export function useReducedMotion() {
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    setPrefersReducedMotion(mediaQuery.matches);

    const handleChange = (event: MediaQueryListEvent) => {
      setPrefersReducedMotion(event.matches);
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  return prefersReducedMotion;
}

/**
 * Hook para detectar orientação do dispositivo
 */
export function useOrientation() {
  const [orientation, setOrientation] = useState<'portrait' | 'landscape'>('portrait');

  useEffect(() => {
    const updateOrientation = () => {
      setOrientation(window.innerHeight > window.innerWidth ? 'portrait' : 'landscape');
    };

    updateOrientation();
    window.addEventListener('resize', updateOrientation);
    window.addEventListener('orientationchange', updateOrientation);

    return () => {
      window.removeEventListener('resize', updateOrientation);
      window.removeEventListener('orientationchange', updateOrientation);
    };
  }, []);

  return orientation;
}
