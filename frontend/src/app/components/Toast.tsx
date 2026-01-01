import { useEffect, useState } from 'react'
import { X, CheckCircle, AlertCircle, Info, AlertTriangle } from 'lucide-react'
import { cn } from '../../lib/utils'

interface ToastProps {
  id: string
  title?: string
  description?: string
  variant?: 'success' | 'error' | 'warning' | 'info'
  duration?: number
  onClose: (id: string) => void
}

export function Toast({
  id,
  title,
  description,
  variant = 'info',
  duration = 5000,
  onClose
}: ToastProps) {
  const [isVisible, setIsVisible] = useState(true)

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(false)
      setTimeout(() => onClose(id), 300) // Allow animation to complete
    }, duration)

    return () => clearTimeout(timer)
  }, [id, duration, onClose])

  const icons = {
    success: CheckCircle,
    error: AlertCircle,
    warning: AlertTriangle,
    info: Info
  }

  const colors = {
    success: 'text-[#00C48C] bg-[#00C48C]/10 border-[#00C48C]/20',
    error: 'text-[#FF4D4F] bg-[#FF4D4F]/10 border-[#FF4D4F]/20',
    warning: 'text-[#FFC857] bg-[#FFC857]/10 border-[#FFC857]/20',
    info: 'text-[#4A90E2] bg-[#4A90E2]/10 border-[#4A90E2]/20'
  }

  const Icon = icons[variant]

  return (
    <div
      className={cn(
        'flex items-start gap-3 p-4 rounded-lg border backdrop-blur-sm transition-all duration-300',
        colors[variant],
        isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'
      )}
    >
      <Icon className="h-5 w-5 mt-0.5 flex-shrink-0" />
      <div className="flex-1 min-w-0">
        {title && (
          <div className="font-medium text-white">
            {title}
          </div>
        )}
        {description && (
          <div className="text-sm text-white/80 mt-1">
            {description}
          </div>
        )}
      </div>
      <button
        onClick={() => onClose(id)}
        className="flex-shrink-0 text-white/60 hover:text-white transition-colors"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  )
}

// Toast Container Component
interface ToastContainerProps {
  toasts: Array<{
    id: string
    title?: string
    description?: string
    variant?: 'success' | 'error' | 'warning' | 'info'
  }>
  onRemove: (id: string) => void
}

export function ToastContainer({ toasts, onRemove }: ToastContainerProps) {
  return (
    <div className="fixed top-4 right-4 z-50 space-y-2 max-w-sm">
      {toasts.map((toast) => (
        <Toast
          key={toast.id}
          id={toast.id}
          title={toast.title}
          description={toast.description}
          variant={toast.variant}
          onClose={onRemove}
        />
      ))}
    </div>
  )
}
