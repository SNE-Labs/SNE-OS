// ============================================
// SNE RADAR - CHART OVERLAYS v2.2
// Elementos visuais sobrepostos no gráfico
// ============================================

import { useEffect, useRef } from 'react'
import type { IMarkerData } from 'lightweight-charts'
import { adaptPriceToLightweight } from '../../lib/chartAdapter'
import { safeToFixed } from '../../lib/utils'
import type { ChartOverlaysProps } from '../../types/chart'

export function ChartOverlays({
  supports = [],
  resistances = [],
  currentPrice,
  analysisData
}: ChartOverlaysProps) {
  const priceLineRef = useRef<unknown>(null)
  const supportLinesRef = useRef<unknown[]>([])
  const resistanceLinesRef = useRef<unknown[]>([])
  const markerRef = useRef<unknown>(null)

  // ============================================
  // PRICE LINE MANAGEMENT
  // ============================================

  useEffect(() => {
    // Cleanup previous price line
    if (priceLineRef.current) {
      try {
        priceLineRef.current.remove()
      } catch (error) {
        console.warn('ChartOverlays: Error removing price line', error)
      }
      priceLineRef.current = null
    }

    // Add new price line if we have a chart and price
    if (currentPrice && window.chartInstance) {
      try {
        const priceLineData = adaptPriceToLightweight(currentPrice)
        const priceLine = window.chartInstance.addPriceLine(priceLineData)
        priceLineRef.current = priceLine
      } catch (error) {
        console.error('ChartOverlays: Error adding price line', error)
      }
    }

    return () => {
      if (priceLineRef.current) {
        try {
          priceLineRef.current.remove()
        } catch (error) {
          console.warn('ChartOverlays: Error cleaning up price line', error)
        }
        priceLineRef.current = null
      }
    }
  }, [currentPrice])

  // ============================================
  // SUPPORT LINES MANAGEMENT
  // ============================================

  useEffect(() => {
    // Cleanup previous support lines
    supportLinesRef.current.forEach(line => {
      try {
        line.remove()
      } catch (error) {
        console.warn('ChartOverlays: Error removing support line', error)
      }
    })
    supportLinesRef.current = []

    // Add new support lines
    if (supports.length > 0 && window.chartInstance) {
      supports.forEach((support, index) => {
        try {
          const line = window.chartInstance.addPriceLine(support)
          supportLinesRef.current.push(line)
        } catch (error) {
          console.error(`ChartOverlays: Error adding support line ${index}`, error)
        }
      })
    }

    return () => {
      supportLinesRef.current.forEach(line => {
        try {
          line.remove()
        } catch (error) {
          console.warn('ChartOverlays: Error cleaning up support line', error)
        }
      })
      supportLinesRef.current = []
    }
  }, [supports])

  // ============================================
  // RESISTANCE LINES MANAGEMENT
  // ============================================

  useEffect(() => {
    // Cleanup previous resistance lines
    resistanceLinesRef.current.forEach(line => {
      try {
        line.remove()
      } catch (error) {
        console.warn('ChartOverlays: Error removing resistance line', error)
      }
    })
    resistanceLinesRef.current = []

    // Add new resistance lines
    if (resistances.length > 0 && window.chartInstance) {
      resistances.forEach((resistance, index) => {
        try {
          const line = window.chartInstance.addPriceLine(resistance)
          resistanceLinesRef.current.push(line)
        } catch (error) {
          console.error(`ChartOverlays: Error adding resistance line ${index}`, error)
        }
      })
    }

    return () => {
      resistanceLinesRef.current.forEach(line => {
        try {
          line.remove()
        } catch (error) {
          console.warn('ChartOverlays: Error cleaning up resistance line', error)
        }
      })
      resistanceLinesRef.current = []
    }
  }, [resistances])

  // ============================================
  // ANALYSIS-BASED OVERLAYS
  // ============================================

  useEffect(() => {
    if (!analysisData || !window.chartInstance) return

    const overlays: any[] = []

    // Add entry price line if available
    if (analysisData.entryPrice) {
      try {
        const entryLine = window.chartInstance.addPriceLine({
          price: analysisData.entryPrice,
          color: analysisData.signal === 'BUY' ? '#00C48C' : '#FF4D4F',
          lineWidth: 2,
          lineStyle: 1, // Dashed
          axisLabelVisible: true,
          title: `ENTRY: $${safeToFixed(analysisData.entryPrice, 2)}`
        })
        overlays.push(entryLine)
      } catch (error) {
        console.error('ChartOverlays: Error adding entry price line', error)
      }
    }

    return () => {
      overlays.forEach(overlay => {
        try {
          overlay.remove()
        } catch (error) {
          console.warn('ChartOverlays: Error cleaning up analysis overlay', error)
        }
      })
    }
  }, [analysisData])

  // ============================================
  // ANALYSIS SIGNALS AS MARKERS
  // ============================================

  useEffect(() => {
    if (!analysisData?.signal || !window.chartInstance) return

    // Cleanup previous marker
    if (markerRef.current) {
      try {
        // Remove marker from series (need to get the series first)
        const series = window.chartInstance.timeScale()
        // This is a simplified approach - in real implementation,
        // we'd need to maintain reference to the candlestick series
        console.log('Would remove previous marker')
      } catch (error) {
        console.warn('ChartOverlays: Error removing marker', error)
      }
    }

    // Add signal marker if we have signal data
    if (analysisData.timestamp && analysisData.signal) {
      try {
        // Get candlestick series (assuming it's available globally for now)
        if ((window as any).candlestickSeries) {
          const marker: IMarkerData = {
            time: (analysisData.timestamp / 1000) as any,
            position: analysisData.signal === 'BUY' ? 'belowBar' : 'aboveBar',
            color: analysisData.signal === 'BUY' ? '#00C48C' : '#FF4D4F',
            shape: analysisData.signal === 'BUY' ? 'arrowUp' : 'arrowDown',
            text: `${analysisData.signal} (${analysisData.score_0_100 || 0}/100)`
          }

          ;(window as any).candlestickSeries.setMarkers([marker])
          markerRef.current = marker
        }
      } catch (error) {
        console.error('ChartOverlays: Error adding signal marker', error)
      }
    }

    return () => {
      if (markerRef.current && (window as any).candlestickSeries) {
        try {
          (window as any).candlestickSeries.setMarkers([])
        } catch (error) {
          console.warn('ChartOverlays: Error cleaning up marker', error)
        }
        markerRef.current = null
      }
    }
  }, [analysisData])

  // This component doesn't render anything visible - it manages chart overlays
  return null
}
