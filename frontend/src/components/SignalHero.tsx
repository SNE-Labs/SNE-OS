// ============================================
// SNE RADAR - SIGNAL HERO COMPONENT v2.2
// Componente central da UX - reproduz SignalHero.vue
// ============================================

// React import not needed for this component
import { TrendingUp, TrendingDown, ArrowRight, DollarSign, Shield } from 'lucide-react'
import { cn } from '../lib/utils'
import { formatScore } from '../lib/scoreDisplay'
import type { AnalysisResult } from '../types/analysis'

const TrendingUpIcon = TrendingUp
const TrendingDownIcon = TrendingDown
const DollarSignIcon = DollarSign
const ShieldIcon = Shield

// ============================================
// PROPS INTERFACE
// ============================================

interface SignalHeroProps {
  analysis: AnalysisResult
  onActionClick?: (data: { signal: string; entryPrice?: number; score: number }) => void
  className?: string
}

// ============================================
// UTILITY FUNCTIONS
// ============================================

const getSignalType = (recommendation?: string): string => {
  if (!recommendation) return 'ESPECULATIVO'

  const lower = recommendation.toLowerCase()
  if (lower.includes('long') || lower.includes('compra') || lower.includes('buy')) return 'LONG'
  if (lower.includes('short') || lower.includes('venda') || lower.includes('sell')) return 'SHORT'
  return 'ESPECULATIVO'
}

const getRiskMessage = (riskLevel?: string): string => {
  if (!riskLevel) return ''

  const lower = riskLevel.toLowerCase()
  if (lower.includes('baixo')) return 'Risco controlado, stop loss próximo'
  if (lower.includes('medio')) return 'Atenção aos stops, volatilidade moderada'
  if (lower.includes('alto')) return 'Risco elevado, considere reduzir posição'
  return ''
}

const getRiskLevelOnly = (riskLevel?: string): string => {
  if (!riskLevel) return 'N/A'

  const lower = riskLevel.toLowerCase()
  if (lower.includes('baixo')) return 'BAIXO'
  if (lower.includes('medio') || lower.includes('médio')) return 'MÉDIO'
  if (lower.includes('alto')) return 'ALTO'
  return riskLevel.split(' - ')[0] // Pegar apenas a primeira parte
}

// ============================================
// COMPONENT
// ============================================

export function SignalHero({ analysis, onActionClick, className }: SignalHeroProps) {
  // Computed values
  const isBuy = analysis.signal === 'BUY'
  const isSell = analysis.signal === 'SELL'
  const signalText = isBuy ? 'COMPRAR' : isSell ? 'VENDER' : 'AGUARDAR'

  const riskLevel = getRiskLevelOnly(analysis.riskLevel)
  const riskMessage = getRiskMessage(analysis.riskLevel)
  const signalType = getSignalType(analysis.recommendation)

  // Format price function
  const formatPrice = (price?: number): string => {
    if (!price || isNaN(price)) return '--'
    return price.toLocaleString('pt-BR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    })
  }

  // Handle action click
  const handleActionClick = () => {
    onActionClick?.({
      signal: analysis.signal,
      entryPrice: analysis.entryPrice,
      score: analysis.score_0_100
    })
  }

  return (
    <div className={cn('w-full mb-6', className)}>
      <div className="bg-[#0a0a0a] rounded-lg border-2 p-6 text-center border-white/30 shadow-2xl shadow-white/5">
        {/* Badge de Tipo de Operação */}
        <div className="inline-block px-3 py-1 mb-4 rounded-full text-xs font-bold bg-white/20 text-white border border-white/50">
          {signalType}
        </div>

        {/* Botão Principal de Ação */}
        <button
          className={cn(
            'w-full py-6 px-8 rounded-lg font-bold text-2xl mb-4 transition-all duration-300 transform hover:scale-105 active:scale-95 focus:outline-none focus:ring-2 focus:ring-offset-2 min-h-[120px] flex flex-col items-center justify-center gap-2',
            {
              'bg-gradient-to-br from-green-600 to-green-800 text-white hover:from-green-500 hover:to-green-700 focus:ring-green-500 shadow-lg shadow-green-500/40':
                isBuy,
              'bg-gradient-to-br from-red-600 to-red-800 text-white hover:from-red-500 hover:to-red-700 focus:ring-red-500 shadow-lg shadow-red-500/40':
                isSell,
              'bg-gray-700 text-white border-2 border-white/50 hover:bg-gray-600 focus:ring-white':
                !isBuy && !isSell
            }
          )}
          onClick={handleActionClick}
        >
          <div className="flex items-center justify-center w-16 h-16">
            {isBuy && <TrendingUpIcon size={48} className="text-white" aria-label="Sinal de compra" />}
            {isSell && <TrendingDownIcon size={48} className="text-white" aria-label="Sinal de venda" />}
            {!isBuy && !isSell && <ArrowRight size={48} className="text-white" aria-label="Aguardar sinal" />}
          </div>
          <div className="text-3xl font-mono tracking-wider">
            {signalText}
          </div>
        </button>

        {/* Score com Progress Bar */}
        <div className="mb-4">
          <div className="flex justify-between items-baseline mb-2">
            <span className="text-xs text-white/70 tracking-wider">SCORE</span>
            <div className="flex items-baseline gap-1">
              <span className="text-2xl font-bold text-white tabular-nums">
                {formatScore(analysis.score_0_100).replace('/100', '')}
              </span>
              <span className="text-sm text-white/50">/100</span>
            </div>
          </div>
          <div className="w-full h-3 bg-gray-700 rounded-full overflow-hidden border border-white/20">
            <div
              className={cn(
                'h-full transition-all duration-500 ease-out',
                {
                  'bg-gradient-to-r from-green-500 to-green-600': analysis.score_0_100 >= 80,
                  'bg-gradient-to-r from-white to-green-500': analysis.score_0_100 >= 60 && analysis.score_0_100 < 80,
                  'bg-gradient-to-r from-yellow-500 to-yellow-600': analysis.score_0_100 >= 40 && analysis.score_0_100 < 60,
                  'bg-gradient-to-r from-red-500 to-red-600': analysis.score_0_100 < 40
                }
              )}
              style={{ width: `${Math.min(100, Math.max(0, analysis.score_0_100))}%` }}
            />
          </div>
        </div>

        {/* Recomendação */}
        {analysis.recommendation && (
          <div className="text-sm text-white/80 mb-3 px-4 py-2 bg-black/50 rounded border border-white/20">
            {analysis.recommendation}
          </div>
        )}

        {/* Preço de Entrada */}
        {analysis.entryPrice && (
          <div className="mb-3">
            <div className="flex items-center justify-center gap-2">
              <DollarSignIcon size={14} className="text-white/70" />
              <span className="text-xs text-white/70 tracking-wider">ENTRY</span>
              <span className="text-xl font-bold text-white tabular-nums">
                ${formatPrice(analysis.entryPrice)}
              </span>
            </div>
          </div>
        )}

        {/* Risco */}
        {analysis.riskLevel && (
          <div className="flex flex-col items-center gap-2">
            <div className="flex items-center gap-2">
              <ShieldIcon size={14} className="text-white/70" />
              <span className="text-xs text-white/70 tracking-wider">RISK</span>
              <span
                className={cn(
                  'px-3 py-1 rounded-full text-xs font-bold',
                  {
                    'bg-green-500/20 text-green-400 border border-green-500/50': riskLevel === 'BAIXO',
                    'bg-yellow-500/20 text-yellow-400 border border-yellow-500/50': riskLevel === 'MÉDIO',
                    'bg-red-500/20 text-red-400 border border-red-500/50': riskLevel === 'ALTO'
                  }
                )}
              >
                {riskLevel}
              </span>
            </div>
            {riskMessage && (
              <span className="text-xs text-white/60 text-center max-w-xs">
                {riskMessage}
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
