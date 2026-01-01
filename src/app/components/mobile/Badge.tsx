import React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../ui/utils';

const badgeVariants = cva(
  'inline-flex items-center justify-center px-2.5 py-1 transition-colors border',
  {
    variants: {
      variant: {
        success: 'bg-[var(--success-dim)] text-[var(--success)] border-[var(--success)]/20',
        warning: 'bg-[var(--warning-dim)] text-[var(--warning)] border-[var(--warning)]/20',
        danger: 'bg-[var(--danger-dim)] text-[var(--danger)] border-[var(--danger)]/20',
        info: 'bg-[var(--info-dim)] text-[var(--info)] border-[var(--info)]/20',
        neutral: 'bg-[var(--bg-2)] text-[var(--text-2)] border-[var(--stroke-1)]',
        orange: 'bg-[var(--accent-orange-dim)] text-[var(--accent-orange)] border-[var(--accent-orange)]/20',
        free: 'bg-[var(--bg-2)] text-[var(--text-2)] border-[var(--stroke-2)]',
        pro: 'bg-gradient-to-r from-[var(--accent-orange-dim)] to-[var(--warning-dim)] text-[var(--accent-orange)] border-[var(--accent-orange)]/30',
        enterprise: 'bg-gradient-to-r from-[var(--info-dim)] to-[var(--success-dim)] text-[var(--info)] border-[var(--info)]/30',
      },
      size: {
        sm: 'text-[10px] h-5 rounded-full',
        md: 'text-xs h-6 rounded-full',
        lg: 'text-sm h-7 rounded-full',
      },
      rounded: {
        full: 'rounded-full',
        lg: 'rounded-[14px]',
      },
    },
    defaultVariants: {
      variant: 'neutral',
      size: 'md',
      rounded: 'full',
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {
  children: React.ReactNode;
}

export function Badge({ className, variant, size, rounded, children, ...props }: BadgeProps) {
  return (
    <span className={cn(badgeVariants({ variant, size, rounded }), className)} {...props}>
      {children}
    </span>
  );
}

