import * as React from 'react'
import { cn } from '../../lib/utils'

interface SkeletonProps {
  className?: string
  variant?: 'text' | 'rectangular' | 'circular'
  width?: string | number
  height?: string | number
  style?: React.CSSProperties
}

export function Skeleton({
  className,
  variant = 'rectangular',
  width,
  height
}: SkeletonProps) {
  const baseClasses = 'animate-pulse bg-white/10 rounded'

  const variantClasses = {
    text: 'h-4',
    rectangular: 'w-full',
    circular: 'rounded-full'
  }

  const style = {
    ...(width && { width: typeof width === 'number' ? `${width}px` : width }),
    ...(height && { height: typeof height === 'number' ? `${height}px` : height })
  }

  return (
    <div
      className={cn(baseClasses, variantClasses[variant], className)}
      style={style}
    />
  )
}

// Skeleton components for common patterns
export function CardSkeleton() {
  return (
    <div className="bg-[#111216] border border-white/10 rounded-lg p-4">
      <Skeleton className="h-6 w-3/4 mb-4" />
      <Skeleton className="h-4 w-full mb-2" />
      <Skeleton className="h-4 w-2/3" />
    </div>
  )
}

export function ButtonSkeleton({ width = '100px' }: { width?: string }) {
  return <Skeleton className="h-10 rounded-lg" style={{ width }} />
}

export function TextSkeleton({ lines = 3 }: { lines?: number }) {
  return (
    <div className="space-y-2">
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton
          key={i}
          variant="text"
          className={i === lines - 1 ? 'w-2/3' : 'w-full'}
        />
      ))}
    </div>
  )
}
