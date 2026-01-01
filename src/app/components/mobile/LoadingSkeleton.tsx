import React from 'react';
import { cn } from '../ui/utils';

export interface LoadingSkeletonProps {
  className?: string;
  variant?: 'text' | 'card' | 'circle' | 'stat';
}

export function LoadingSkeleton({ className, variant = 'text' }: LoadingSkeletonProps) {
  const baseClasses = 'animate-pulse bg-[var(--bg-2)]';

  const variantClasses = {
    text: 'h-4 rounded',
    card: 'h-32 rounded-2xl',
    circle: 'h-12 w-12 rounded-full',
    stat: 'h-20 rounded-xl',
  };

  return (
    <div className={cn(baseClasses, variantClasses[variant], className)} />
  );
}

export function LoadingSkeletonGroup({ count = 3 }: { count?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: count }).map((_, i) => (
        <LoadingSkeleton key={i} variant="card" />
      ))}
    </div>
  );
}

