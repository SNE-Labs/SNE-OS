import React, { useState, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useReducedMotion } from '@/hooks/usePlatform';
import { useContainerSwipe } from '@/hooks/useSwipeGesture';
import { useMobilePerformance } from '@/hooks/useMobilePerformance';

interface Container {
  id: string;
  component: React.ComponentType;
  props?: any;
  title?: string;
}

interface ContainerProps {
  children: React.ReactNode;
  direction?: number; // 1 = forward, -1 = backward
  className?: string;
  onSwipeLeft?: () => void; // Next container
  onSwipeRight?: () => void; // Previous container
  enableSwipe?: boolean;
}

export function MobileContainer({
  children,
  direction = 1,
  className = '',
  onSwipeLeft,
  onSwipeRight,
  enableSwipe = true
}: ContainerProps) {
  const prefersReducedMotion = useReducedMotion();
  const { deviceCapabilities, isMobile } = usePlatform();
  const { measureLoadTime, measureAnimation } = useMobilePerformance();

  // Detectar dispositivos low-end para animações mais leves
  const isLowEndDevice = deviceCapabilities.isLowEndDevice ||
    (!deviceCapabilities.supportsWebGL && !deviceCapabilities.hasGyroscope);

  // Swipe gesture support
  const { bind } = useContainerSwipe(
    onSwipeLeft, // Next (swipe left)
    onSwipeRight, // Previous (swipe right)
    { enabled: enableSwipe && !prefersReducedMotion }
  );

  // Performance monitoring
  useEffect(() => {
    if (!isMobile) return;

    const loadStartTime = performance.now();

    // Medir tempo até o componente estar pronto
    const measureContainerLoad = () => {
      const loadTime = performance.now() - loadStartTime;
      measureLoadTime('container', loadTime);
    };

    // Medir quando o conteúdo estiver renderizado
    const timer = setTimeout(measureContainerLoad, 100);
    return () => clearTimeout(timer);
  }, [isMobile, measureLoadTime]);

  // Animações otimizadas baseadas no dispositivo
  const getOptimizedVariants = () => {
    if (prefersReducedMotion) {
      // Sem animações
      return {
        enter: { x: 0, opacity: 1, scale: 1 },
        center: { x: 0, opacity: 1, scale: 1 },
        exit: { x: 0, opacity: 0, scale: 1 },
      };
    }

    if (isLowEndDevice) {
      // Animações leves para dispositivos low-end
      return {
        enter: (direction: number) => ({
          x: direction > 0 ? 100 : -100,
          opacity: 0,
        }),
        center: {
          x: 0,
          opacity: 1,
        },
        exit: (direction: number) => ({
          x: direction < 0 ? 100 : -100,
          opacity: 0,
        }),
      };
    }

    // Animações completas para dispositivos high-end
    return {
      enter: (direction: number) => ({
        x: direction > 0 ? 300 : -300,
        opacity: 0,
        scale: 0.95,
        rotateY: direction > 0 ? -15 : 15,
      }),
      center: {
        x: 0,
        opacity: 1,
        scale: 1,
        rotateY: 0,
      },
      exit: (direction: number) => ({
        x: direction < 0 ? 300 : -300,
        opacity: 0,
        scale: 0.95,
        rotateY: direction < 0 ? -15 : 15,
      }),
    };
  };

  const variants = getOptimizedVariants();

  const getOptimizedTransition = () => {
    if (prefersReducedMotion) {
      return { duration: 0 };
    }

    if (isLowEndDevice) {
      return {
        type: "tween" as const,
        duration: 0.2,
        ease: "easeOut",
      };
    }

    // Transição completa para high-end
    return {
      type: "spring" as const,
      stiffness: 400,
      damping: 30,
      mass: 0.8,
    };
  };

  const transition = getOptimizedTransition();

  return (
    <motion.div
      className={`mobile-container ${className}`}
      custom={direction}
      variants={variants}
      initial="enter"
      animate="center"
      exit="exit"
      transition={transition}
      style={{
        willChange: 'transform, opacity',
        backfaceVisibility: 'hidden',
        perspective: 1000,
      }}
      {...bind()} // Attach swipe gestures
      onAnimationStart={() => {
        if (isMobile && !prefersReducedMotion) {
          // Medir início da animação
          (window as any).__animationStart = performance.now();
        }
      }}
      onAnimationComplete={() => {
        if (isMobile && !prefersReducedMotion && (window as any).__animationStart) {
          const duration = performance.now() - (window as any).__animationStart;
          measureAnimation('container_transition', duration);
          delete (window as any).__animationStart;
        }
      }}
    >
      {children}
    </motion.div>
  );
}

// Hook para gerenciar navegação de containers
export function useContainerNavigation() {
  const [stack, setStack] = useState<Container[]>([]);
  const [direction, setDirection] = useState(1);

  const push = useCallback((container: Omit<Container, 'id'>) => {
    const newContainer = {
      ...container,
      id: `container-${Date.now()}-${Math.random()}`,
    };
    setDirection(1);
    setStack(prev => [...prev, newContainer]);
  }, []);

  const pop = useCallback(() => {
    if (stack.length > 1) {
      setDirection(-1);
      setStack(prev => prev.slice(0, -1));
    }
  }, [stack.length]);

  const replace = useCallback((container: Omit<Container, 'id'>) => {
    const newContainer = {
      ...container,
      id: `container-${Date.now()}-${Math.random()}`,
    };
    setDirection(0); // No slide animation for replace
    setStack(prev => [...prev.slice(0, -1), newContainer]);
  }, []);

  const reset = useCallback((containers: Omit<Container, 'id'>[]) => {
    const newContainers = containers.map(container => ({
      ...container,
      id: `container-${Date.now()}-${Math.random()}`,
    }));
    setDirection(0);
    setStack(newContainers);
  }, []);

  return {
    stack,
    direction,
    push,
    pop,
    replace,
    reset,
    current: stack[stack.length - 1],
    canGoBack: stack.length > 1,
  };
}

// CSS para containers
const containerStyles = `
  .mobile-container {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 83px; /* Above tab bar */
    overflow-y: auto;
    overflow-x: hidden;
    -webkit-overflow-scrolling: touch;
    background: var(--bg-0, #ffffff);
  }

  /* Performance optimizations */
  .mobile-container * {
    -webkit-transform: translate3d(0, 0, 0);
    transform: translate3d(0, 0, 0);
    -webkit-backface-visibility: hidden;
    backface-visibility: hidden;
    -webkit-perspective: 1000px;
    perspective: 1000px;
  }

  /* Smooth scrolling */
  .mobile-container {
    scroll-behavior: smooth;
    -webkit-overflow-scrolling: touch;
  }

  /* Hide scrollbar but keep functionality */
  .mobile-container::-webkit-scrollbar {
    display: none;
  }

  /* Dark mode support */
  @media (prefers-color-scheme: dark) {
    .mobile-container {
      background: var(--bg-0, #000000);
    }
  }
`;

// Inject styles
if (typeof document !== 'undefined') {
  const styleSheet = document.createElement('style');
  styleSheet.textContent = containerStyles;
  document.head.appendChild(styleSheet);
}
