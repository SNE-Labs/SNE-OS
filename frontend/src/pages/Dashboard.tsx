import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { TrendingUp, TrendingDown } from 'lucide-react'
import { useWallet } from '../hooks/useWallet'
import { dashboardApi } from '../services/api'
import { formatCurrency, formatPercentage, safeNumber, safeString, cn } from '../lib/utils'

interface MetricCardProps {
  label: string
  value: string
  trend?: number
  subtitle?: string
  color?: 'success' | 'warning' | 'critical'
}

function MetricCard({ label, value, trend, subtitle, color }: MetricCardProps) {
  const colorMap = {
    success: 'text-[#00C48C]',
    warning: 'text-[#FFC857]',
    critical: 'text-[#FF4D4F]',
  }

  return (
    <div className="bg-gradient-to-br from-[#111216] to-[#1B1B1F] border border-[rgba(255,255,255,0.1)] rounded-[10px] p-6 hover:-translate-y-0.5 transition-all duration-150">
      <div className="text-sm text-[#A6A6A6] mb-2 uppercase tracking-wider">{label}</div>
      <div className={cn('text-3xl font-mono font-bold mb-1', color && colorMap[color])}>
        {value}
      </div>
      {subtitle && <div className="text-sm text-[#A6A6A6]">{subtitle}</div>}
      {trend !== undefined && (
        <div className={cn('flex items-center gap-1 text-sm font-medium mt-2', trend >= 0 ? 'text-[#00C48C]' : 'text-[#FF4D4F]')}>
          {trend >= 0 ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
          {formatPercentage(Math.abs(trend))}
        </div>
      )}
    </div>
  )
}

export default function Dashboard() {
  const { tier, isAuthenticated } = useWallet()
  const [loading, setLoading] = useState(true)
  const [data, setData] = useState<any>(null)

  const tierLimits = {
    free: { analyses: 3, symbols: 1, watchlist: 3 },
    premium: { analyses: 50, symbols: 3, watchlist: 10 },
    pro: { analyses: 1000, symbols: Infinity, watchlist: Infinity },
  }

  const currentLimits = tierLimits[tier]

  useEffect(() => {
    if (!isAuthenticated) return

    const loadData = async () => {
      try {
        setLoading(true)
        const response = await dashboardApi.getSummary()
        setData(response.data)
      } catch (error) {
        console.error('Failed to load dashboard:', error)
      } finally {
        setLoading(false)
      }
    }

    loadData()
    const interval = setInterval(loadData, 30000) // Polling a cada 30s
    return () => clearInterval(interval)
  }, [isAuthenticated])

  if (!isAuthenticated) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <p className="text-[#A6A6A6] mb-4">Conecte sua wallet para acessar o dashboard</p>
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="space-y-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="bg-[#111216] border border-[rgba(255,255,255,0.1)] rounded-[10px] p-6 animate-pulse">
              <div className="h-4 w-24 bg-[#1B1B1F] rounded mb-4"></div>
              <div className="h-8 w-32 bg-[#1B1B1F] rounded"></div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  const topMovers = data?.top_movers || []

  return (
    <div className="space-y-8">
      {/* Market Summary */}
      <section>
        <h2 className="text-2xl font-semibold mb-6">Market Summary</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <MetricCard
            label="BTC Dominance"
            value={data?.market_summary ? `${safeNumber(data.market_summary.btc_dominance, 0).toFixed(1)}%` : '--'}
            trend={1.2}
          />
          <MetricCard
            label="Market Cap"
            value={data?.market_summary?.market_cap ? `$${data.market_summary.market_cap}` : '--'}
            trend={-0.5}
          />
          <MetricCard
            label="24h Volume"
            value={data?.market_summary?.volume_24h ? `$${data.market_summary.volume_24h}` : '--'}
            trend={5.3}
          />
          <MetricCard
            label="Fear & Greed"
            value={data?.market_summary?.fear_greed_index?.toString() || '--'}
            subtitle={data?.market_summary?.fear_greed_index ?
              (data.market_summary.fear_greed_index > 75 ? "Extreme Greed" :
               data.market_summary.fear_greed_index > 55 ? "Greed" :
               data.market_summary.fear_greed_index > 45 ? "Neutral" :
               data.market_summary.fear_greed_index > 25 ? "Fear" : "Extreme Fear") : ""}
            color={data?.market_summary?.fear_greed_index ?
              (data.market_summary.fear_greed_index > 55 ? "success" :
               data.market_summary.fear_greed_index > 45 ? "warning" : "critical") : undefined}
          />
        </div>
      </section>

      {/* Top Movers */}
      <section>
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-semibold">Top Movers</h2>
          {tier === 'free' && (
            <span className="text-sm text-[#A6A6A6]">
              Showing top 5 • <Link to="/pricing" className="text-[#FF6A00] hover:underline">Upgrade for more</Link>
            </span>
          )}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {topMovers.slice(0, tier === 'free' ? 5 : 10).map((mover: any, idx: number) => (
            <div
              key={idx}
              className="bg-gradient-to-br from-[#111216] to-[#1B1B1F] border border-[rgba(255,255,255,0.1)] rounded-[10px] p-6 hover:border-[#FF6A00] hover:-translate-y-0.5 transition-all duration-150 cursor-pointer"
            >
              <div className="flex items-center justify-between mb-2">
                <span className="font-mono font-semibold">{mover.symbol}</span>
                <span className={cn(
                  'text-sm font-medium',
                  mover.change24h >= 0 ? 'text-[#00C48C]' : 'text-[#FF4D4F]'
                )}>
                  {formatPercentage(mover.change24h)}
                </span>
              </div>
              <div className="text-2xl font-bold mb-1">{formatCurrency(mover.price)}</div>
              <div className="text-sm text-[#A6A6A6]">Vol: {mover.volume}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Quick Stats */}
      <section>
        <h2 className="text-2xl font-semibold mb-6">Quick Stats</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-[#111216] border border-[rgba(255,255,255,0.1)] rounded-[10px] p-6">
            <div className="text-sm text-[#A6A6A6] mb-2">Análises Hoje</div>
            <div className="text-3xl font-mono font-bold text-[#FF6A00]">
              {safeNumber(data?.stats?.analyses_today, 0)}/{currentLimits.analyses}
            </div>
          </div>
          <div className="bg-[#111216] border border-[rgba(255,255,255,0.1)] rounded-[10px] p-6">
            <div className="text-sm text-[#A6A6A6] mb-2">Taxa de Sucesso</div>
            <div className="text-3xl font-mono font-bold text-[#00C48C]">
              {data?.stats?.success_rate ? `${safeNumber(data.stats.success_rate, 0).toFixed(1)}%` : '--'}
            </div>
          </div>
          <div className="bg-[#111216] border border-[rgba(255,255,255,0.1)] rounded-[10px] p-6">
            <div className="text-sm text-[#A6A6A6] mb-2">Melhor Setup</div>
            <div className="text-xl font-mono font-bold">
              {safeString(data?.stats?.best_setup, '--')}
            </div>
          </div>
          <div className="bg-[#111216] border border-[rgba(255,255,255,0.1)] rounded-[10px] p-6">
            <div className="text-sm text-[#A6A6A6] mb-2">Próxima Análise</div>
            <div className="text-xl font-mono font-bold">
              {data?.stats?.next_analysis_available ? 'Disponível' : 'Aguardar'}
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}

