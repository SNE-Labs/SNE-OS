import React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../../lib/utils';

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 transition-all active:scale-95 disabled:opacity-50 disabled:pointer-events-none',
  {
    variants: {
      variant: {
        primary: 'bg-[var(--accent-orange)] text-white border border-[var(--accent-orange)] hover:bg-[var(--accent-orange)]/90',
        secondary: 'bg-[var(--bg-2)] text-[var(--text-1)] border border-[var(--stroke-2)] hover:bg-[var(--bg-elevated)]',
        ghost: 'text-[var(--text-2)] hover:text-[var(--text-1)] hover:bg-[var(--bg-2)]',
        destructive: 'bg-[var(--danger)] text-white border border-[var(--danger)] hover:bg-[var(--danger)]/90',
        icon: 'text-[var(--text-2)] hover:text-[var(--text-1)] hover:bg-[var(--bg-2)]',
      },
      size: {
        sm: 'h-8 px-3 text-sm rounded-lg',
        md: 'h-11 px-4 rounded-xl',
        lg: 'h-12 px-6 rounded-xl',
        icon: 'h-10 w-10 rounded-xl',
      },
    },
    defaultVariants: {
      variant: 'primary',
      size: 'md',
    },
  }
);

export interface MobileButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  children: React.ReactNode;
}

export function MobileButton({ 
  className, 
  variant, 
  size, 
  children, 
  ...props 
}: MobileButtonProps) {
  return (
    <button className={cn(buttonVariants({ variant, size }), className)} {...props}>
      {children}
    </button>
  );
}

