// ============================================
// SNE RADAR - CHART CORE v2.2
// Base Lightweight Charts com lifecycle e resize
// ============================================

import { useEffect, useRef, useImperativeHandle, forwardRef } from 'react'
import type { IChartApi} from 'lightweight-charts';
import { createChart, ColorType } from 'lightweight-charts'
import type { ChartConfig } from '../../types/chart'

interface ChartCoreProps {
  width: number
  height: number
  config?: Partial<ChartConfig>
  onChartReady?: (chart: IChartApi) => void
  onChartError?: (error: Error) => void
  className?: string
}

export interface ChartCoreRef {
  chart: IChartApi | null
  container: HTMLDivElement | null
}

// ============================================
// DEFAULT CONFIG
// ============================================

const defaultConfig: ChartConfig = {
  width: 800,
  height: 400,
  backgroundColor: '#0B0B0B',
  textColor: '#F7F7F8',
  gridColor: 'rgba(255, 255, 255, 0.1)',
  upColor: '#00C48C',
  downColor: '#FF4D4F',
  borderVisible: false,
  gridVisible: true,
  timeScale: {
    timeVisible: true,
    secondsVisible: false,
    borderColor: 'rgba(255, 255, 255, 0.1)'
  },
  priceScale: {
    borderColor: 'rgba(255, 255, 255, 0.1)',
    mode: 0 // PriceScaleMode.Normal
  }
}

// ============================================
// COMPONENT
// ============================================

export const ChartCore = forwardRef<ChartCoreRef, ChartCoreProps>(({
  width,
  height,
  config = {},
  onChartReady,
  onChartError,
  className
}, ref) => {
  const containerRef = useRef<HTMLDivElement>(null)
  const chartRef = useRef<IChartApi | null>(null)

  // Expose chart and container to parent
  useImperativeHandle(ref, () => ({
    chart: chartRef.current,
    container: containerRef.current
  }), [])

  // ============================================
  // CHART INITIALIZATION
  // ============================================

  useEffect(() => {
    if (!containerRef.current) return

    try {
      // Merge configs
      const finalConfig: ChartConfig = {
        ...defaultConfig,
        ...config,
        width,
        height
      }

      // Create chart
      const chart = createChart(containerRef.current, {
        layout: {
          background: { type: ColorType.Solid, color: finalConfig.backgroundColor },
          textColor: finalConfig.textColor
        },
        grid: {
          vertLines: { color: finalConfig.gridColor },
          horzLines: { color: finalConfig.gridColor }
        },
        width: finalConfig.width,
        height: finalConfig.height,
        timeScale: finalConfig.timeScale,
        rightPriceScale: finalConfig.priceScale,
        crosshair: {
          mode: 1, // CrosshairMode.Normal
          vertLine: {
            width: 1,
            color: finalConfig.gridColor,
            style: 3 // LineStyle.Solid
          },
          horzLine: {
            width: 1,
            color: finalConfig.gridColor,
            style: 3 // LineStyle.Solid
          }
        }
      })

      chartRef.current = chart

      // Notify parent
      onChartReady?.(chart)

    } catch (error) {
      console.error('ChartCore: Failed to initialize chart', error)
      onChartError?.(error as Error)
    }

    // ============================================
    // CLEANUP
    // ============================================

    return () => {
      if (chartRef.current) {
        try {
          chartRef.current.remove()
        } catch (error) {
          console.warn('ChartCore: Error during cleanup', error)
        }
        chartRef.current = null
      }
    }
  }, [width, height, config, onChartReady, onChartError])

  // ============================================
  // RESIZE HANDLER
  // ============================================

  useEffect(() => {
    if (!chartRef.current) return

    const handleResize = () => {
      if (containerRef.current && chartRef.current) {
        const rect = containerRef.current.getBoundingClientRect()
        chartRef.current.applyOptions({
          width: rect.width,
          height: rect.height
        })
      }
    }

    // Initial resize
    handleResize()

    // Listen for resize
    window.addEventListener('resize', handleResize)

    return () => {
      window.removeEventListener('resize', handleResize)
    }
  }, [])

  return (
    <div
      ref={containerRef}
      className={className}
      style={{
        width: `${width}px`,
        height: `${height}px`,
        position: 'relative'
      }}
    />
  )
})

ChartCore.displayName = 'ChartCore'
