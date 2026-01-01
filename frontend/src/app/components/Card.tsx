import type { ReactNode } from 'react'
import { cn } from '../../lib/utils'

interface CardProps {
  children: ReactNode
  className?: string
  padding?: 'none' | 'sm' | 'md' | 'lg'
  variant?: 'default' | 'elevated' | 'bordered'
  onClick?: () => void
}

export function Card({
  children,
  className,
  padding = 'md',
  variant = 'default',
  onClick
}: CardProps) {
  const baseClasses = 'rounded-lg transition-colors duration-200'

  const variantClasses = {
    default: 'bg-[#111216] border border-white/10',
    elevated: 'bg-[#1B1B1F] border border-white/10 shadow-lg',
    bordered: 'bg-[#0B0B0B] border-2 border-white/20'
  }

  const paddingClasses = {
    none: 'p-0',
    sm: 'p-3',
    md: 'p-4',
    lg: 'p-6'
  }

  return (
    <div
      className={cn(
        baseClasses,
        variantClasses[variant],
        paddingClasses[padding],
        onClick && 'cursor-pointer hover:border-white/20',
        className
      )}
      onClick={onClick}
    >
      {children}
    </div>
  )
}
