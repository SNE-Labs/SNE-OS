import type { ReactNode } from 'react'
import { cn } from '../../lib/utils'

interface BadgeProps {
  children: ReactNode
  variant?: 'default' | 'success' | 'warning' | 'error' | 'info'
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

export function Badge({
  children,
  variant = 'default',
  size = 'md',
  className
}: BadgeProps) {
  const baseClasses = 'inline-flex items-center font-medium rounded-full'

  const variantClasses = {
    default: 'bg-white/10 text-white',
    success: 'bg-[#00C48C]/20 text-[#00C48C] border border-[#00C48C]/30',
    warning: 'bg-[#FFC857]/20 text-[#FFC857] border border-[#FFC857]/30',
    error: 'bg-[#FF4D4F]/20 text-[#FF4D4F] border border-[#FF4D4F]/30',
    info: 'bg-[#4A90E2]/20 text-[#4A90E2] border border-[#4A90E2]/30'
  }

  const sizeClasses = {
    sm: 'px-2 py-1 text-xs',
    md: 'px-3 py-1 text-sm',
    lg: 'px-4 py-2 text-base'
  }

  return (
    <span
      className={cn(
        baseClasses,
        variantClasses[variant],
        sizeClasses[size],
        className
      )}
    >
      {children}
    </span>
  )
}
