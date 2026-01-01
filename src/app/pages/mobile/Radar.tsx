import { useState } from 'react';
import { TrendingUp, TrendingDown, DollarSign, Activity, Clock, Info } from 'lucide-react';
import { MobilePageShell, SurfaceCard, MobileButton, ListItem, Badge, StatGrid } from '../../components/mobile';

export function MobileRadar() {
  const [showAssetDetails, setShowAssetDetails] = useState(false);

  // Mock data para evitar crashes
  const marketData = {
    price: 45123.45,
    change24h: 2.34,
    volume24h: 28500000000,
    marketCap: 890000000000
  };

  const signalsData = {
    signals: [
      { symbol: 'BTC/USD', signal: 'BUY', strength: 'STRONG', timestamp: new Date() },
      { symbol: 'ETH/USD', signal: 'HOLD', strength: 'MODERATE', timestamp: new Date() }
    ]
  };

  // Simular acesso básico para evitar crashes
  const hasAccess = true;

  // Dados da watchlist (fallback para dados mock se API falhar)
  const watchlist = signalsData?.signals || [
    {
      symbol: 'BTC/USD',
      signal: 'HOLD',
      strength: 'Moderate' as const,
      timeframe: '4H',
      updated: new Date().toLocaleTimeString(),
      change: '+2.4%'
    },
  ];

  // Preparar dados para StatGrid
  const btcStats = [
    {
      label: 'Price',
      value: `$${marketData?.price.toLocaleString() || '43,250'}`,
    },
    {
      label: '24h',
      value: marketData?.change24h ? `${marketData.change24h > 0 ? '+' : ''}${(marketData.change24h * 100).toFixed(1)}%` : '+2.4%',
      delta: { value: '+2.4%', positive: true },
    },
    {
      label: 'Volume',
      value: '$28.5B',
    },
    {
      label: 'Signal',
      value: watchlist[0]?.signal || 'HOLD',
    },
  ];

  return (
    <MobilePageShell
      title="Radar"
      subtitle="Análise de mercado em tempo real"
      action={
        <button className="p-2 hover:bg-[var(--bg-2)] rounded-lg transition-colors">
          <Info className="w-5 h-5 text-[var(--text-2)]" />
        </button>
      }
      showContext={true}
    >
      {/* BTC Overview */}
      <SurfaceCard>
        <div className="mb-4">
          <h3 className="text-[var(--text-1)] mb-1">BTC/USD Overview</h3>
          <p className="text-sm text-[var(--text-2)]">Real-time market data</p>
        </div>
        <StatGrid stats={btcStats} columns={2} />
      </SurfaceCard>

      {/* Current Signal */}
      <SurfaceCard variant="elevated">
        <div className="mb-4">
          <h3 className="text-[var(--text-1)] mb-1">Current Signal</h3>
          <p className="text-sm text-[var(--text-2)]">BTC/USD Analysis</p>
        </div>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Badge variant="success" size="lg">BUY</Badge>
            <div>
              <span className="text-[var(--text-1)] block">Strong Signal</span>
              <span className="text-xs text-[var(--text-2)]">Confidence: 87%</span>
            </div>
          </div>
          <MobileButton
            variant="icon"
            onClick={() => setShowAssetDetails(true)}
          >
            <Activity className="w-5 h-5" />
          </MobileButton>
        </div>
      </SurfaceCard>

      {/* Trading Signals List */}
      <SurfaceCard padding="none">
        <div className="p-4 border-b border-[var(--stroke-1)]">
          <div className="flex items-center justify-between">
            <h3 className="text-[var(--text-1)]">Trading Signals</h3>
            <Badge variant="neutral">{watchlist.length}</Badge>
          </div>
        </div>
        {watchlist.map((item, index) => (
          <ListItem
            key={index}
            title={item.symbol}
            subtitle={item.strength}
            badge={{
              label: item.signal,
              variant: item.signal === 'BUY' ? 'success' :
                      item.signal === 'SELL' ? 'danger' : 'warning'
            }}
            showChevron
            onClick={() => console.log(`View ${item.symbol}`)}
          />
        ))}
      </SurfaceCard>

      {/* CTA */}
      <MobileButton variant="primary" className="w-full">
        Upgrade to Pro
      </MobileButton>

      {/* Asset Details Modal */}
      {showAssetDetails && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-[var(--bg-1)] border border-[var(--stroke-1)] rounded-2xl p-6 m-4 max-w-sm w-full">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-[var(--text-1)] text-lg font-semibold">BTC/USD Details</h3>
              <button
                onClick={() => setShowAssetDetails(false)}
                className="text-[var(--text-3)] hover:text-[var(--text-1)]"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-[var(--text-2)]">Current Price</span>
                <span className="text-[var(--text-1)] font-mono">
                  ${marketData?.price.toLocaleString() || '43,250'}
                </span>
              </div>

              <div className="flex justify-between items-center">
                <span className="text-[var(--text-2)]">24h Change</span>
                <span className="text-[var(--success)] font-mono">
                  +{(marketData?.change24h || 2.4).toFixed(1)}%
                </span>
              </div>

              <div className="flex justify-between items-center">
                <span className="text-[var(--text-2)]">Volume</span>
                <span className="text-[var(--text-1)] font-mono">$28.5B</span>
              </div>
            </div>

            <MobileButton
              variant="secondary"
              className="w-full mt-6"
              onClick={() => setShowAssetDetails(false)}
            >
              Close
            </MobileButton>
          </div>
        </div>
      )}
    </MobilePageShell>
  );
}

