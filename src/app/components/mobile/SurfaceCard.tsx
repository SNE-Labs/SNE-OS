import React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../ui/utils';

const cardVariants = cva(
  'transition-all border',
  {
    variants: {
      variant: {
        default: 'bg-[var(--bg-1)] border-[var(--stroke-1)]',
        elevated: 'bg-[var(--bg-elevated)] border-[var(--stroke-2)] shadow-lg shadow-black/20',
        interactive: 'bg-[var(--bg-1)] border-[var(--stroke-1)] hover:border-[var(--stroke-2)] active:scale-[0.98]',
        warning: 'bg-[var(--warning-dim)] border-[var(--warning)]/20',
        danger: 'bg-[var(--danger-dim)] border-[var(--danger)]/20',
        success: 'bg-[var(--success-dim)] border-[var(--success)]/20',
      },
      padding: {
        none: 'p-0',
        sm: 'p-3',
        md: 'p-4',
        lg: 'p-6',
      },
      rounded: {
        default: 'rounded-2xl',
        lg: 'rounded-[18px]',
        xl: 'rounded-3xl',
      },
    },
    defaultVariants: {
      variant: 'default',
      padding: 'md',
      rounded: 'default',
    },
  }
);

export interface SurfaceCardProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof cardVariants> {
  children: React.ReactNode;
}

export function SurfaceCard({ 
  className, 
  variant, 
  padding, 
  rounded, 
  children, 
  ...props 
}: SurfaceCardProps) {
  return (
    <div className={cn(cardVariants({ variant, padding, rounded }), className)} {...props}>
      {children}
    </div>
  );
}

