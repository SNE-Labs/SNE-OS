import { useRef, useCallback, useState, useEffect } from 'react';
import { useDrag } from '@use-gesture/react';
import { useReducedMotion } from './usePlatform';

interface SwipeConfig {
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  threshold?: number; // Minimum distance for swipe recognition
  velocity?: number; // Minimum velocity for swipe recognition
  enabled?: boolean;
}

export function useSwipeGesture({
  onSwipeLeft,
  onSwipeRight,
  threshold = 50,
  velocity = 0.2,
  enabled = true
}: SwipeConfig) {
  const elementRef = useRef<HTMLDivElement>(null);
  const prefersReducedMotion = useReducedMotion();

  const bind = useDrag(
    ({ down, movement: [mx], direction: [xDir], velocity: [vx], event }) => {
      if (!enabled || prefersReducedMotion) return;

      // Only handle horizontal swipes
      if (Math.abs(mx) < Math.abs(movement[1])) return;

      const trigger = Math.abs(mx) > threshold && Math.abs(vx) > velocity;

      if (!down && trigger) {
        if (xDir > 0) {
          // Swipe right - go back
          onSwipeRight?.();
        } else {
          // Swipe left - go forward/next
          onSwipeLeft?.();
        }
      }

      // Prevent default browser behavior during swipe
      if (down && Math.abs(mx) > 10) {
        event.preventDefault();
      }
    },
    {
      axis: 'x', // Only horizontal
      bounds: { left: -100, right: 100, top: 0, bottom: 0 },
      rubberband: true,
      filterTaps: true,
    }
  );

  // Enhanced bind function with ref
  const enhancedBind = useCallback(() => ({
    ...bind(),
    ref: elementRef,
  }), [bind]);

  return {
    bind: enhancedBind,
    ref: elementRef,
  };
}

// Hook específico para navegação entre containers
export function useContainerSwipe(
  onNext?: () => void,
  onPrevious?: () => void,
  options?: Partial<SwipeConfig>
) {
  return useSwipeGesture({
    onSwipeLeft: onNext,
    onSwipeRight: onPrevious,
    threshold: 75, // More sensitive for container navigation
    velocity: 0.15, // Lower velocity threshold
    ...options,
  });
}

// Hook para detectar tipo de swipe (útil para analytics)
export function useSwipeAnalytics(
  onSwipe: (direction: 'left' | 'right', distance: number, velocity: number) => void,
  options?: Partial<SwipeConfig>
) {
  return useSwipeGesture({
    ...options,
    onSwipeLeft: () => onSwipe('left', 0, 0), // Will be overridden by bind
    onSwipeRight: () => onSwipe('right', 0, 0), // Will be overridden by bind
  });
}

// Hook para swipe em elementos específicos (não tela inteira)
export function useElementSwipe(
  elementRef: React.RefObject<HTMLElement>,
  config: SwipeConfig
) {
  const { threshold = 50, velocity = 0.2, enabled = true } = config;
  const prefersReducedMotion = useReducedMotion();

  const bind = useDrag(
    ({ down, movement: [mx], direction: [xDir], velocity: [vx] }) => {
      if (!enabled || prefersReducedMotion) return;

      const trigger = Math.abs(mx) > threshold && Math.abs(vx) > velocity;

      if (!down && trigger) {
        if (xDir > 0) {
          config.onSwipeRight?.();
        } else {
          config.onSwipeLeft?.();
        }
      }
    },
    {
      axis: 'x',
      filterTaps: true,
      // Use the element ref instead of document
      target: elementRef,
    }
  );

  return bind;
}

// Utility function to detect swipe direction and strength
export function getSwipeInfo(movement: number[], velocity: number[]): {
  direction: 'left' | 'right' | 'up' | 'down';
  distance: number;
  velocity: number;
  strength: 'weak' | 'medium' | 'strong';
} {
  const [mx, my] = movement;
  const [vx, vy] = velocity;

  const absX = Math.abs(mx);
  const absY = Math.abs(my);

  let direction: 'left' | 'right' | 'up' | 'down';
  let distance: number;
  let velocity: number;

  if (absX > absY) {
    // Horizontal swipe
    direction = mx > 0 ? 'right' : 'left';
    distance = absX;
    velocity = Math.abs(vx);
  } else {
    // Vertical swipe
    direction = my > 0 ? 'down' : 'up';
    distance = absY;
    velocity = Math.abs(vy);
  }

  // Determine strength based on velocity and distance
  let strength: 'weak' | 'medium' | 'strong' = 'weak';
  if (velocity > 1.5 || distance > 200) {
    strength = 'strong';
  } else if (velocity > 0.8 || distance > 100) {
    strength = 'medium';
  }

  return { direction, distance, velocity, strength };
}

// Hook para detectar se o dispositivo suporta toques
export function useTouchSupport() {
  const [hasTouch, setHasTouch] = useState(false);

  useEffect(() => {
    const checkTouch = () => {
      setHasTouch(
        'ontouchstart' in window ||
        navigator.maxTouchPoints > 0 ||
        // @ts-ignore - Safari specific
        navigator.msMaxTouchPoints > 0
      );
    };

    checkTouch();
  }, []);

  return hasTouch;
}
