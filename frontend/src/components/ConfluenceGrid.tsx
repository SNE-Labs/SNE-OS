// ============================================
// SNE RADAR - CONFLUENCE GRID COMPONENT v2.2
// Grid visual de validações de confluência
// ============================================

import { CheckCircle, XCircle, AlertCircle } from 'lucide-react'
import { cn, safeToFixed } from '../lib/utils'

const CheckCircleIcon = CheckCircle
const XCircleIcon = XCircle
const AlertCircleIcon = AlertCircle

// ============================================
// PROPS INTERFACE
// ============================================

interface ConfluenceGridProps {
  score: number
  interpretation?: string
  validations?: string[]
  className?: string
}

// ============================================
// COMPONENT
// ============================================

export function ConfluenceGrid({
  score,
  interpretation,
  validations = [],
  className
}: ConfluenceGridProps) {
  // Helper function to get validation status
  const getValidationStatus = (validation: string) => {
    const lower = validation.toLowerCase()

    // Check for positive indicators
    if (lower.includes('ema8 > ema21') || lower.includes('ema21 > ema50')) {
      return 'positive'
    }
    if (lower.includes('preço acima') || lower.includes('suporte validado')) {
      return 'positive'
    }
    if (lower.includes('volume acima') || lower.includes('tendência')) {
      return 'positive'
    }

    // Check for negative indicators
    if (lower.includes('ema8 < ema21') || lower.includes('resistência próxima')) {
      return 'negative'
    }
    if (lower.includes('volume baixo') || lower.includes('baixa liquidez')) {
      return 'negative'
    }

    // Neutral or unknown
    return 'neutral'
  }

  // Helper function to get status icon
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'positive':
        return <CheckCircleIcon className="h-4 w-4 text-[#00C48C]" />
      case 'negative':
        return <XCircleIcon className="h-4 w-4 text-[#FF4D4F]" />
      default:
        return <AlertCircleIcon className="h-4 w-4 text-[#FFC857]" />
    }
  }

  return (
    <div className={cn('w-full', className)}>
      <div className="bg-[#111216] border border-white/10 rounded-lg p-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-white">Confluência</h3>
          <div className="flex items-center gap-2">
            <span className="text-sm text-white/70">Score:</span>
            <span className={cn(
              'px-2 py-1 rounded text-sm font-mono tabular-nums',
              {
                'bg-[#00C48C]/20 text-[#00C48C] border border-[#00C48C]/30': score >= 75,
                'bg-white/20 text-white border border-white/30': score >= 50 && score < 75,
                'bg-[#FFC857]/20 text-[#FFC857] border border-[#FFC857]/30': score >= 25 && score < 50,
                'bg-[#FF4D4F]/20 text-[#FF4D4F] border border-[#FF4D4F]/30': score < 25
              }
            )}>
              {safeToFixed(score, 0)}/100
            </span>
          </div>
        </div>

        {/* Interpretation */}
        {interpretation && (
          <div className="mb-4 p-3 bg-black/30 rounded border border-white/10">
            <p className="text-sm text-white/80 leading-relaxed">
              {interpretation}
            </p>
          </div>
        )}

        {/* Validations Grid */}
        {validations.length > 0 && (
          <div className="grid grid-cols-1 gap-2">
            {validations.map((validation, index) => {
              const status = getValidationStatus(validation)

              return (
                <div
                  key={index}
                  className={cn(
                    'flex items-center gap-3 p-3 rounded border transition-colors',
                    {
                      'bg-[#00C48C]/10 border-[#00C48C]/20': status === 'positive',
                      'bg-[#FF4D4F]/10 border-[#FF4D4F]/20': status === 'negative',
                      'bg-white/5 border-white/10': status === 'neutral'
                    }
                  )}
                >
                  {getStatusIcon(status)}
                  <span className="text-sm text-white flex-1">
                    {validation}
                  </span>
                </div>
              )
            })}
          </div>
        )}

        {/* Empty state */}
        {validations.length === 0 && (
          <div className="text-center py-8 text-white/50">
            <AlertCircleIcon className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">Nenhuma validação disponível</p>
          </div>
        )}
      </div>
    </div>
  )
}
