// ============================================
// SNE RADAR - INTERACTIVE CHART v2.2
// Componente principal que combina os 4 módulos do chart
// ============================================

import * as React from 'react'
import { useRef, useState, useCallback, useEffect } from 'react'
import { useUIStore } from '../stores/ui'
import { useChartData, useCurrentPrice } from '../hooks/useChartData'
import { useAnalysis } from '../hooks/useMarketData'
import { ChartCore, type ChartCoreRef } from './chart/ChartCore'
import { ChartOverlays } from './chart/ChartOverlays'
import { Card } from '../app/components/Card'
import { Button } from '../app/components/Button'
import { logger } from '../lib/logger'
import { safeToFixed } from '../lib/utils'
import type { ChartConfig } from '../types/chart'

const chartLogger = logger.child('InteractiveChart')

interface InteractiveChartProps {
  symbol?: string
  timeframe?: string
  width?: number
  height?: number
  showControls?: boolean
  className?: string
}

// ============================================
// COMPONENT
// ============================================

export function InteractiveChart({
  symbol: propSymbol,
  timeframe: propTimeframe,
  width = 800,
  height = 400,
  showControls = true,
  className
}: InteractiveChartProps) {
  // Use props or Zustand state
  const uiSymbol = useUIStore(state => state.symbol)
  const uiTimeframe = useUIStore(state => state.timeframe)

  const symbol = propSymbol || uiSymbol
  const timeframe = propTimeframe || uiTimeframe

  // Local state
  const [chartConfig, setChartConfig] = useState<Partial<ChartConfig>>({
    backgroundColor: '#0B0B0B',
    textColor: '#F7F7F8',
    gridColor: 'rgba(255, 255, 255, 0.1)',
    upColor: '#00C48C',
    downColor: '#FF4D4F'
  })

  const [zoomLevel, setZoomLevel] = useState(100)
  const [isFullscreen, setIsFullscreen] = useState(false)

  // Refs
  const chartCoreRef = useRef<ChartCoreRef>(null)
  const candlestickSeriesRef = useRef<any>(null)

  // ============================================
  // DATA HOOKS
  // ============================================

  const {
    data: chartData,
    isLoading: chartLoading,
    error: chartError,
    refetch: refetchChart
  } = useChartData(symbol, timeframe, true)

  const {
    data: currentPriceData,
    isLoading: priceLoading
  } = useCurrentPrice(symbol, timeframe, true)

  // Analysis data for overlays
  const {
    data: analysisData,
    isLoading: analysisLoading
  } = useAnalysis(symbol, timeframe, true)

  // Combined loading state
  const isLoading = chartLoading || priceLoading
  const hasError = !!chartError

  // ============================================
  // CHART INITIALIZATION CALLBACK
  // ============================================

  const handleChartReady = useCallback((chart: any) => {
    chartLogger.info('Chart initialized successfully', { symbol, timeframe })

    // Store chart instance globally for overlays (temporary solution)
    ;(window as any).chartInstance = chart

    try {
      // Debug: Check if chart object is valid
      chartLogger.debug('Chart object received', {
        chartType: typeof chart,
        hasAddCandlestickSeries: typeof chart.addCandlestickSeries,
        chartKeys: Object.keys(chart).slice(0, 5),
        availableMethods: Object.getOwnPropertyNames(chart).filter(name => typeof chart[name] === 'function').slice(0, 10)
      })

      // Create candlestick series - try different API versions
      let addSeriesMethod = chart.addCandlestickSeries || chart.addCandlestick || chart.addSeries

      if (typeof addSeriesMethod !== 'function') {
        // Fallback: try to access via prototype or different method names
        const proto = Object.getPrototypeOf(chart)
        addSeriesMethod = proto?.addCandlestickSeries || proto?.addCandlestick || proto?.addSeries

        if (typeof addSeriesMethod !== 'function') {
          throw new Error(`Chart API not available. Available methods: ${Object.getOwnPropertyNames(chart).join(', ')}`)
        }
      }

      const candlestickSeries = addSeriesMethod.call(chart, {
        upColor: chartConfig.upColor,
        downColor: chartConfig.downColor,
        borderVisible: false,
        wickUpColor: chartConfig.upColor,
        wickDownColor: chartConfig.downColor
      })

      candlestickSeriesRef.current = candlestickSeries

      // Set initial data if available
      if (chartData?.candles) {
        candlestickSeries.setData(chartData.candles)
        chartLogger.debug('Initial candle data set', {
          candleCount: chartData.candles.length
        })
      }

    } catch (error) {
      chartLogger.error('Error setting up candlestick series', error)
      // Re-throw to trigger onChartError callback
      throw error
    }
  }, [chartConfig, chartData, symbol, timeframe])

  const handleChartError = useCallback((error: Error) => {
    chartLogger.error('Chart initialization failed', error)
  }, [])

  // ============================================
  // DATA UPDATE EFFECTS
  // ============================================

  // Update candle data when chart data changes
  useEffect(() => {
    if (candlestickSeriesRef.current && chartData?.candles) {
      try {
        candlestickSeriesRef.current.setData(chartData.candles)
        chartLogger.debug('Candle data updated', {
          candleCount: chartData.candles.length
        })
      } catch (error) {
        chartLogger.error('Error updating candle data', error)
      }
    }
  }, [chartData?.candles])

  // ============================================
  // CONTROL HANDLERS
  // ============================================

  const handleRefresh = useCallback(() => {
    chartLogger.debug('Manual refresh triggered')
    refetchChart()
  }, [refetchChart])

  const handleZoomIn = useCallback(() => {
    if (chartCoreRef.current?.chart) {
      try {
        chartCoreRef.current.chart.zoomIn()
        setZoomLevel(prev => Math.min(prev + 25, 500))
        chartLogger.debug('Zoom in', { newZoom: zoomLevel + 25 })
      } catch (error) {
        chartLogger.error('Error zooming in', error)
      }
    }
  }, [zoomLevel])

  const handleZoomOut = useCallback(() => {
    if (chartCoreRef.current?.chart) {
      try {
        chartCoreRef.current.chart.zoomOut()
        setZoomLevel(prev => Math.max(prev - 25, 25))
        chartLogger.debug('Zoom out', { newZoom: zoomLevel - 25 })
      } catch (error) {
        chartLogger.error('Error zooming out', error)
      }
    }
  }, [zoomLevel])

  const handleToggleFullscreen = useCallback(() => {
    setIsFullscreen(prev => !prev)
    chartLogger.debug('Fullscreen toggled', { isFullscreen: !isFullscreen })
  }, [isFullscreen])

  // ============================================
  // RENDER
  // ============================================

  if (hasError) {
    return (
      <Card className={className}>
        <div className="text-center py-12">
          <div className="text-red-400 mb-4">
            Erro ao carregar gráfico: {(chartError as Error).message}
          </div>
          <div className="space-x-2">
            <Button onClick={handleRefresh} variant="outline" size="sm">
              Tentar Novamente
            </Button>
          </div>
        </div>
      </Card>
    )
  }

  return (
    <div className={className}>
      {/* Chart Header with Controls */}
      {showControls && (
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-4">
            <h3 className="text-lg font-bold text-white">
              {symbol} - {timeframe}
            </h3>
            {currentPriceData && (
              <div className="text-sm text-white/70">
                Atual: <span className="text-[#00C48C] font-mono">
                  ${safeToFixed(currentPriceData.price, 2)}
                </span>
              </div>
            )}
          </div>

          <div className="flex items-center gap-2">
            {/* Zoom Controls */}
            <div className="flex items-center gap-1 bg-[#1B1B1F] rounded px-2 py-1">
              <button
                onClick={handleZoomOut}
                disabled={zoomLevel <= 25}
                className="px-2 py-1 text-white/70 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed"
                title="Diminuir zoom"
              >
                ➖
              </button>
              <span className="text-xs text-white/70 min-w-[40px] text-center">
                {zoomLevel}%
              </span>
              <button
                onClick={handleZoomIn}
                disabled={zoomLevel >= 500}
                className="px-2 py-1 text-white/70 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed"
                title="Aumentar zoom"
              >
                ➕
              </button>
            </div>

            {/* Refresh Button */}
            <Button
              onClick={handleRefresh}
              disabled={isLoading}
              variant="outline"
              size="sm"
            >
              {isLoading ? '⏳' : '🔄'}
            </Button>

            {/* Fullscreen Toggle */}
            <Button
              onClick={handleToggleFullscreen}
              variant="outline"
              size="sm"
            >
              {isFullscreen ? '🗗' : '🗖'}
            </Button>
          </div>
        </div>
      )}

      {/* Chart Container */}
      <Card className="relative overflow-hidden">
        <div
          className="relative"
          style={{
            width: isFullscreen ? '100vw' : `${width}px`,
            height: isFullscreen ? '100vh' : `${height}px`
          }}
        >
          {/* Loading State */}
          {isLoading && (
            <div className="absolute inset-0 bg-[#0B0B0B]/80 flex items-center justify-center z-10">
              <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#FF6A00] mx-auto mb-4"></div>
                <p className="text-white/70">Carregando gráfico...</p>
              </div>
            </div>
          )}

          {/* Chart Core */}
          <ChartCore
            ref={chartCoreRef}
            width={isFullscreen ? window.innerWidth : width}
            height={isFullscreen ? window.innerHeight : height}
            config={chartConfig}
            onChartReady={handleChartReady}
            onChartError={handleChartError}
          />

          {/* Chart Overlays */}
          <ChartOverlays
            supports={chartData?.levels?.supports || []}
            resistances={chartData?.levels?.resistances || []}
            currentPrice={currentPriceData?.price}
            analysisData={analysisData ? {
              signal: analysisData.signal,
              entryPrice: analysisData.entryPrice,
              score_0_100: analysisData.score_0_100,
              timestamp: Date.now(), // Use current timestamp for marker
              recommendation: analysisData.recommendation
            } : undefined}
          />
        </div>
      </Card>

      {/* Debug Info (temporary) */}
      {chartData && (
        <div className="mt-2 text-xs text-white/50">
          {chartData.metadata?.candleCount || 0} candles •
          {chartData.metadata?.hasLevels ? 'Com níveis' : 'Sem níveis'} •
          Última atualização: {new Date(chartData.timestamp).toLocaleTimeString()}
        </div>
      )}
    </div>
  )
}

// React types are available globally
