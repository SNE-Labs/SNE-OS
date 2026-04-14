import { useEffect, useRef, useState } from 'react'
import { createChart, ColorType } from 'lightweight-charts'
import type { Time , IChartApi, ISeriesApi, CandlestickData} from 'lightweight-charts'
import { chartApi } from '../services'
import { useWallet } from '../hooks/useWallet'
import { cn, safeNumber } from '../lib/utils'

interface ChartProps {
  symbol?: string
  timeframe?: string
  height?: number
}

export default function Chart({ symbol = 'BTCUSDT', timeframe = '1h', height = 600 }: ChartProps) {
  const chartContainerRef = useRef<HTMLDivElement>(null)
  const chartRef = useRef<IChartApi | null>(null)
  const seriesRef = useRef<ISeriesApi<'Candlestick'> | null>(null)
  const { tier, isAuthenticated } = useWallet()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!chartContainerRef.current || !isAuthenticated) return

    // Criar chart
    const chart = createChart(chartContainerRef.current, {
      layout: {
        background: { type: ColorType.Solid, color: '#111216' },
        textColor: '#F7F7F8',
      },
      grid: {
        vertLines: { color: 'rgba(255, 255, 255, 0.05)' },
        horzLines: { color: 'rgba(255, 255, 255, 0.05)' },
      },
      width: chartContainerRef.current.clientWidth,
      height: height,
      timeScale: {
        timeVisible: true,
        secondsVisible: false,
        borderColor: 'rgba(255, 255, 255, 0.1)',
      },
      rightPriceScale: {
        borderColor: 'rgba(255, 255, 255, 0.1)',
      },
    })

    // Criar série de candlestick
    const candlestickSeries = chart.addCandlestickSeries({
      upColor: '#00C48C',
      downColor: '#FF4D4F',
      borderVisible: false,
      wickUpColor: '#00C48C',
      wickDownColor: '#FF4D4F',
    })

    chartRef.current = chart
    seriesRef.current = candlestickSeries

    // Carregar dados
    const loadData = async () => {
      try {
        setLoading(true)
        setError(null)
        const response = await chartApi.getCandles(symbol, timeframe, 500)
        const rawData = response.data?.candles || response.data || []

        // Converter para formato do Lightweight Charts com validação
        const chartData: CandlestickData[] = rawData
          .filter((candle: any) => candle && typeof candle === 'object')
          .map((candle: any) => ({
            time: (safeNumber(candle.time, Date.now()) / 1000) as Time,
            open: safeNumber(candle.open, 0),
            high: safeNumber(candle.high, 0),
            low: safeNumber(candle.low, 0),
            close: safeNumber(candle.close, 0),
          }))
          .filter(candle => candle.open > 0 && candle.close > 0)

        candlestickSeries.setData(chartData)
        chart.timeScale().fitContent()
      } catch (err: any) {
        console.error('Failed to load chart data:', err)
        setError(err.response?.data?.error || 'Erro ao carregar dados do gráfico')
      } finally {
        setLoading(false)
      }
    }

    loadData()

    // Atualizar dados periodicamente
    const interval = setInterval(loadData, 30000) // A cada 30s

    // Responsividade
    const handleResize = () => {
      if (chartContainerRef.current) {
        chart.applyOptions({ width: chartContainerRef.current.clientWidth })
      }
    }

    window.addEventListener('resize', handleResize)

    return () => {
      clearInterval(interval)
      window.removeEventListener('resize', handleResize)
      chart.remove()
    }
  }, [symbol, timeframe, height, isAuthenticated])

  if (!isAuthenticated) {
    return (
      <div className="bg-[#111216] border border-[rgba(255,255,255,0.1)] rounded-[10px] p-12 flex items-center justify-center" style={{ height }}>
        <div className="text-center text-[#A6A6A6]">
          <p>Conecte sua wallet para visualizar o gráfico</p>
        </div>
      </div>
    )
  }

  if (loading && !seriesRef.current) {
    return (
      <div className="bg-[#111216] border border-[rgba(255,255,255,0.1)] rounded-[10px] p-12 flex items-center justify-center" style={{ height }}>
        <div className="text-center text-[#A6A6A6]">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#FF6A00] mx-auto mb-4"></div>
          <p>Carregando gráfico...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-[#111216] border border-[rgba(255,255,255,0.1)] rounded-[10px] p-12 flex items-center justify-center" style={{ height }}>
        <div className="text-center text-[#FF4D4F]">
          <p>{error}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-[#111216] border border-[rgba(255,255,255,0.1)] rounded-[10px] p-6">
      <div ref={chartContainerRef} style={{ width: '100%', height: `${height}px` }} />
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center bg-[#111216]/80 rounded-[10px]">
          <div className="text-center text-[#A6A6A6]">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#FF6A00] mx-auto mb-2"></div>
            <p className="text-sm">Atualizando...</p>
          </div>
        </div>
      )}
    </div>
  )
}

