// ============================================
// SNE RADAR - CHART PAGE v2.2
// Página de gráficos usando InteractiveChart modular
// ============================================

import { useState } from 'react'
import { useWallet } from '../hooks/useWallet'
import { useUIStore } from '../stores/ui'
import { useChartData } from '../hooks/useChartData'
import { Card } from '../app/components/Card'
import { safeToFixed } from '../lib/utils'
import { InteractiveChart } from '../components/InteractiveChart'
import { cn, safeNumber } from '../lib/utils'

export default function ChartPage() {
  const { tier, isAuthenticated } = useWallet()
  const { symbol, timeframe, setSymbol, setTimeframe } = useUIStore()

  // Indicators from chart data (temporary - will be enhanced)
  const { data: chartData, isLoading: chartLoading } = useChartData(symbol, timeframe)

  const availableTimeframes = tier === 'free'
    ? ['15m', '1h', '4h', '1d']
    : ['1m', '5m', '15m', '1h', '4h', '1d']

  if (!isAuthenticated) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <p className="text-white/70 mb-4">Conecte sua wallet para acessar os gráficos</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Chart Controls */}
      <Card>
        <div className="flex flex-wrap items-center gap-4">
          <div>
            <label className="block text-sm font-medium text-white/70 mb-2">
              Símbolo
            </label>
            <select
              value={symbol}
              onChange={(e) => setSymbol(e.target.value)}
              className="bg-[#0B0B0B] border border-white/20 rounded-md px-4 py-3 font-mono text-white focus:border-[#FF6A00] focus:outline-none"
            >
              <option value="BTCUSDT">BTCUSDT</option>
              {tier !== 'free' && <option value="ETHUSDT">ETHUSDT</option>}
              {tier === 'pro' && <option value="SOLUSDT">SOLUSDT</option>}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-white/70 mb-2">
              Timeframe
            </label>
            <div className="flex gap-2 flex-wrap">
              {['1m', '5m', '15m', '1h', '4h', '1d'].map((tf) => {
                const isAvailable = availableTimeframes.includes(tf)
                return (
                  <button
                    key={tf}
                    onClick={() => isAvailable && setTimeframe(tf)}
                    disabled={!isAvailable}
                    className={cn(
                      'px-3 py-2 rounded-md text-sm font-mono transition-all',
                      timeframe === tf && isAvailable
                        ? 'bg-[#FF6A00] text-white'
                        : 'bg-[#1B1B1F] border border-white/10 hover:border-[#FF6A00] text-white',
                      !isAvailable && 'opacity-30 cursor-not-allowed'
                    )}
                  >
                    {tf}
                  </button>
                )
              })}
            </div>
          </div>
        </div>
      </Card>

      {/* Interactive Chart */}
      <InteractiveChart
        symbol={symbol}
        timeframe={timeframe}
        width={1200}
        height={600}
        showControls={true}
      />

      {/* Indicators Sidebar */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* RSI - Sempre disponível */}
        <Card>
          <div className="text-sm text-white/70 mb-2">RSI (14)</div>
          {chartLoading ? (
            <div className="h-8 w-16 bg-white/10 rounded animate-pulse"></div>
          ) : (
            <div className={cn(
              'text-2xl font-mono font-bold',
              chartData?.candles && chartData.candles.length > 0
                ? 'text-white'
                : 'text-white/50'
            )}>
              {/* TODO: Calculate RSI from candle data */}
              --
            </div>
          )}
        </Card>

        {/* Volume - Sempre disponível */}
        <Card>
          <div className="text-sm text-white/70 mb-2">Volume Total</div>
          {chartLoading ? (
            <div className="h-8 w-16 bg-white/10 rounded animate-pulse"></div>
          ) : (
            <div className="text-2xl font-mono font-bold text-white">
              {chartData?.candles
                ? safeToFixed((chartData.candles.reduce((sum, c) => sum + (c.volume || 0), 0) / 1e6), 1) + 'M'
                : '--'
              }
            </div>
          )}
        </Card>

        {/* Supports Count */}
        <Card>
          <div className="text-sm text-white/70 mb-2">Suportes</div>
          {chartLoading ? (
            <div className="h-8 w-16 bg-white/10 rounded animate-pulse"></div>
          ) : (
            <div className="text-2xl font-mono font-bold text-[#00C48C]">
              {chartData?.levels?.supports?.length || 0}
            </div>
          )}
        </Card>

        {/* Resistances Count */}
        <Card>
          <div className="text-sm text-white/70 mb-2">Resistências</div>
          {chartLoading ? (
            <div className="h-8 w-16 bg-white/10 rounded animate-pulse"></div>
          ) : (
            <div className="text-2xl font-mono font-bold text-[#FF4D4F]">
              {chartData?.levels?.resistances?.length || 0}
            </div>
          )}
        </Card>
      </div>

      {/* Upgrade Prompt for Free Users */}
      {tier === 'free' && (
        <Card variant="bordered" className="border-[#FF6A00]/50 bg-[#FF6A00]/5">
          <div className="text-center">
            <p className="text-[#FF6A00] mb-2">
              🚀 Upgrade to Premium for advanced indicators, more timeframes, and real-time data
            </p>
            <p className="text-sm text-white/70">
              Gráficos profissionais com indicadores técnicos avançados
            </p>
          </div>
        </Card>
      )}
    </div>
  )
}

