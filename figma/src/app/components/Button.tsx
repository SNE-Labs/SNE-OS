import { ButtonHTMLAttributes, forwardRef } from 'react';
import { cn } from '../lib/utils';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', children, ...props }, ref) => {
    const variants = {
      primary: 'bg-[#FF6A00] text-[#F7F7F8] hover:bg-[#E65A00] shadow-[0_6px_18px_rgba(255,106,0,0.12)] hover:-translate-y-0.5 transition-all duration-150',
      secondary: 'bg-transparent border border-[rgba(255,255,255,0.1)] text-[#F7F7F8] hover:bg-[#1B1B1F] hover:border-[#FF6A00] transition-all duration-150',
      ghost: 'bg-transparent text-[#F7F7F8] hover:bg-[#1B1B1F] transition-all duration-150'
    };

    const sizes = {
      sm: 'px-3 py-1.5 text-sm',
      md: 'px-4 py-2',
      lg: 'px-6 py-3 text-lg'
    };

    return (
      <button
        ref={ref}
        className={cn(
          'rounded-md font-medium transition-all duration-150',
          variants[variant],
          sizes[size],
          'disabled:opacity-50 disabled:cursor-not-allowed',
          className
        )}
        {...props}
      >
        {children}
      </button>
    );
  }
);

Button.displayName = 'Button';
