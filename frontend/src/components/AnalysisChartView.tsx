// ============================================
// SNE RADAR - ANALYSIS CHART VIEW v2.2
// Visualização integrada: Análise + Gráfico em tempo real
// ============================================

import { useState } from 'react'
import { useUIStore } from '../stores/ui'
import { useAnalysis, useAnalyzeMutation } from '../hooks/useMarketData'
import { SignalHero } from './SignalHero'
import { ConfluenceGrid } from './ConfluenceGrid'
import { InteractiveChart } from './InteractiveChart'
import { Card } from '../app/components/Card'
import { Button } from '../app/components/Button'
import { toast } from 'sonner'

interface AnalysisChartViewProps {
  className?: string
}

export function AnalysisChartView({ className }: AnalysisChartViewProps) {
  const { symbol, timeframe } = useUIStore()
  const [viewMode, setViewMode] = useState<'split' | 'chart-only' | 'analysis-only'>('split')

  // React Query hooks
  const {
    data: analysisData,
    isLoading: analysisLoading,
    error: analysisError,
    refetch: refetchAnalysis
  } = useAnalysis(symbol, timeframe, true)

  const analyzeMutation = useAnalyzeMutation()

  // Handlers
  const handleRunAnalysis = () => {
    analyzeMutation.mutate(
      { symbol, timeframe },
      {
        onSuccess: () => {
          toast.success('Análise atualizada!')
        },
        onError: (error: unknown) => {
          toast.error((error as Error)?.message || 'Erro ao executar análise')
        }
      }
    )
  }

  const handleSignalAction = (data: { signal: string; entryPrice?: number; score: number }) => {
    toast.info(`Sinal ${data.signal} - Entrada: $${data.entryPrice?.toFixed(2) || 'N/A'}`)
    // TODO: Implementar integração com trading
  }

  // Loading states
  const isLoading = analysisLoading || analyzeMutation.isPending
  const hasError = !!analysisError

  return (
    <div className={className}>
      {/* Header Controls */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-white">Análise Técnica Integrada</h2>
          <p className="text-white/70 text-sm mt-1">
            {symbol} - {timeframe} • Sinais em tempo real no gráfico
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* View Mode Toggle */}
          <div className="flex bg-[#1B1B1F] rounded-lg p-1">
            <button
              onClick={() => setViewMode('split')}
              className={`px-3 py-1 rounded text-sm font-medium transition-all ${
                viewMode === 'split'
                  ? 'bg-[#FF6A00] text-white'
                  : 'text-white/70 hover:text-white'
              }`}
            >
              Dividido
            </button>
            <button
              onClick={() => setViewMode('chart-only')}
              className={`px-3 py-1 rounded text-sm font-medium transition-all ${
                viewMode === 'chart-only'
                  ? 'bg-[#FF6A00] text-white'
                  : 'text-white/70 hover:text-white'
              }`}
            >
              Apenas Gráfico
            </button>
            <button
              onClick={() => setViewMode('analysis-only')}
              className={`px-3 py-1 rounded text-sm font-medium transition-all ${
                viewMode === 'analysis-only'
                  ? 'bg-[#FF6A00] text-white'
                  : 'text-white/70 hover:text-white'
              }`}
            >
              Apenas Análise
            </button>
          </div>

          {/* Refresh Button */}
          <Button
            onClick={handleRunAnalysis}
            disabled={isLoading}
            loading={isLoading}
          >
            {isLoading ? 'Analisando...' : '🔄 Atualizar'}
          </Button>
        </div>
      </div>

      {/* Error State */}
      {hasError && (
        <Card className="border-red-500/50 mb-6">
          <div className="text-center py-6">
            <div className="text-red-400 mb-4">
              Erro ao carregar análise: {(analysisError as Error).message}
            </div>
            <Button
              onClick={() => refetchAnalysis()}
              variant="outline"
              size="sm"
            >
              Tentar Novamente
            </Button>
          </div>
        </Card>
      )}

      {/* Content based on view mode */}
      {viewMode === 'split' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left: Analysis */}
          <div className="space-y-6">
            {analysisData ? (
              <>
                <SignalHero
                  analysis={analysisData}
                  onActionClick={handleSignalAction}
                />

                {analysisData.confluencia && (
                  <ConfluenceGrid
                    score={analysisData.confluencia.score || analysisData.score_0_100}
                    interpretation={analysisData.confluencia.interpretacao}
                    validations={analysisData.confluencia.validacoes}
                  />
                )}
              </>
            ) : (
              <Card>
                <div className="text-center py-12">
                  <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#FF6A00] mx-auto mb-4"></div>
                  <p className="text-white/70">Carregando análise...</p>
                </div>
              </Card>
            )}
          </div>

          {/* Right: Chart */}
          <div>
            <InteractiveChart
              symbol={symbol}
              timeframe={timeframe}
              width={600}
              height={400}
              showControls={true}
            />
          </div>
        </div>
      )}

      {viewMode === 'chart-only' && (
        <InteractiveChart
          symbol={symbol}
          timeframe={timeframe}
          width={1200}
          height={500}
          showControls={true}
        />
      )}

      {viewMode === 'analysis-only' && (
        <div className="max-w-2xl mx-auto space-y-6">
          {analysisData ? (
            <>
              <SignalHero
                analysis={analysisData}
                onActionClick={handleSignalAction}
              />

              {analysisData.confluencia && (
                <ConfluenceGrid
                  score={analysisData.confluencia.score || analysisData.score_0_100}
                  interpretation={analysisData.confluencia.interpretacao}
                  validations={analysisData.confluencia.validacoes}
                />
              )}
            </>
          ) : (
            <Card>
              <div className="text-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#FF6A00] mx-auto mb-4"></div>
                <p className="text-white/70">Carregando análise...</p>
              </div>
            </Card>
          )}
        </div>
      )}

      {/* Analysis Info Footer */}
      {analysisData && (
        <div className="mt-6 text-center text-xs text-white/50">
          Análise atualizada em {new Date(analysisData.timestamp || Date.now()).toLocaleTimeString('pt-BR')}
          {' • '}
          Score: {analysisData.score_0_100}/100
          {' • '}
          Sinal: {analysisData.signal || 'N/A'}
        </div>
      )}
    </div>
  )
}
