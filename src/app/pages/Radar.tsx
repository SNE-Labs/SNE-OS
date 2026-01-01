import { TrendingUp, TrendingDown, Eye, Lock, RefreshCw, X, BarChart3, DollarSign, Activity, Clock } from 'lucide-react';
import { useState } from 'react';
import { RightPanel } from '../components/RightPanel';
import { useMarketSummary, useSignals } from '../../hooks/useRadarData';
import { useEntitlements } from '../../lib/auth/useEntitlements';

interface RadarProps {
  isWalletConnected: boolean;
}

export function Radar({ isWalletConnected }: RadarProps) {
  const [showAssetDetails, setShowAssetDetails] = useState(false);

  // Dados reais das APIs
  const { data: marketData, isLoading: marketLoading, refetch: refetchMarket } = useMarketSummary();
  const { data: signalsData, isLoading: signalsLoading, refetch: refetchSignals } = useSignals('BTC/USD', '4H', isWalletConnected);
  const { entitlements } = useEntitlements();

  // Verificar se usuário tem acesso (baseado em entitlements)
  const hasAccess = entitlements?.features?.includes('radar.access') || false;

  // Dados da watchlist (fallback para dados mock se API falhar)
  const watchlist = signalsData?.signals || [
    { symbol: 'BTC/USD', signal: 'Loading...', strength: 'Weak' as const, timeframe: '4H', updated: 'now', change: '--' },
    { symbol: 'ETH/USD', signal: 'Loading...', strength: 'Weak' as const, timeframe: '1H', updated: 'now', change: '--' },
  ];

  // Função para refresh dos dados
  const handleRefresh = () => {
    refetchMarket();
    if (hasAccess) {
      refetchSignals();
    }
  };

  return (
    <div className="flex flex-1">
      {/* Main Content */}
      <div className="flex-1 px-8 py-6 overflow-y-auto">
        {/* Preview Mode Banner */}
        {!hasAccess && (
          <div
            className="mb-6 p-4 rounded-lg flex items-center justify-between"
            style={{ backgroundColor: 'var(--bg-3)', borderWidth: '1px', borderColor: 'var(--warn-amber)' }}
          >
            <div className="flex items-center gap-3">
              <Lock size={20} style={{ color: 'var(--warn-amber)' }} />
              <div>
                <p className="text-sm font-medium" style={{ color: 'var(--text-1)' }}>
                  {entitlements?.tier === 'free' ? 'Free Tier - Limited Access' : 'Access Required'}
                </p>
                <p className="text-xs" style={{ color: 'var(--text-3)' }}>
                  {isWalletConnected
                    ? 'Upgrade to Pro for full market analysis'
                    : 'Connect wallet to access market data'
                  }
                </p>
              </div>
            </div>
            <button
              className="px-4 py-2 rounded-lg text-sm font-medium transition-colors"
              style={{ backgroundColor: 'var(--accent-orange)', color: '#FFFFFF' }}
            >
              {isWalletConnected ? 'Upgrade to Pro' : 'Connect Wallet'}
            </button>
          </div>
        )}

        {/* Kicker + Title + Refresh */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs uppercase tracking-wider" style={{ color: 'var(--text-3)' }}>
              Market
            </p>
            <button
              onClick={handleRefresh}
              disabled={marketLoading || signalsLoading}
              className="flex items-center gap-2 px-3 py-1 rounded text-xs transition-colors hover:bg-[var(--bg-3)] disabled:opacity-50"
              style={{ color: 'var(--accent-orange)' }}
            >
              <RefreshCw size={12} className={marketLoading || signalsLoading ? 'animate-spin' : ''} />
              Refresh
            </button>
          </div>
          <h1 className="text-4xl font-semibold" style={{ color: 'var(--text-1)' }}>
            Trending
          </h1>
        </div>

        {/* Hero Card - BTC Overview */}
        <div
          className="rounded-xl p-6 mb-6"
          style={{
            backgroundColor: 'var(--bg-2)',
            borderWidth: '1px',
            borderColor: 'var(--stroke-1)',
            boxShadow: 'var(--shadow-1)',
          }}
        >
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-lg font-semibold mb-1" style={{ color: 'var(--text-1)' }}>
                BTC/USD Overview
              </h2>
              <p className="text-xs" style={{ color: 'var(--text-3)' }}>Real-time market intelligence</p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowAssetDetails(true)}
                className="px-4 py-2 rounded-lg text-sm font-medium hover:opacity-80 transition-opacity"
                style={{ backgroundColor: 'var(--bg-3)', color: 'var(--text-1)', borderWidth: '1px', borderColor: 'var(--stroke-1)' }}
              >
                <Eye size={16} className="inline mr-2" />
                View
              </button>
              <button
                onClick={() => {
                  if (hasAccess) {
                    alert('Trading interface coming soon! This feature will be available in the next update.');
                  } else {
                    alert('Upgrade to Pro tier to access trading features.');
                  }
                }}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-opacity ${
                  hasAccess ? 'hover:opacity-80 cursor-pointer' : 'opacity-50 cursor-not-allowed'
                }`}
                disabled={!hasAccess}
                style={{ backgroundColor: 'var(--bg-3)', color: hasAccess ? 'var(--text-1)' : 'var(--text-3)', borderWidth: '1px', borderColor: 'var(--stroke-1)' }}
              >
                <Lock size={16} className="inline mr-2" />
                Trade
              </button>
            </div>
          </div>

          {/* Mini Stats */}
          <div className="grid grid-cols-3 gap-4">
            <div
              className="p-4 rounded-lg"
              style={{ backgroundColor: 'var(--bg-3)', borderWidth: '1px', borderColor: 'var(--stroke-1)' }}
            >
              <span className="text-xs uppercase block mb-1" style={{ color: 'var(--text-3)' }}>BTC Dominance</span>
              <p className="text-xl font-semibold font-mono" style={{ color: 'var(--text-1)' }}>
                {marketData?.btc_dominance ? `${marketData.btc_dominance.toFixed(1)}` : '--'}<span className="text-sm" style={{ color: 'var(--text-3)' }}>%</span>
              </p>
            </div>
            <div
              className="p-4 rounded-lg"
              style={{ backgroundColor: 'var(--bg-3)', borderWidth: '1px', borderColor: 'var(--stroke-1)' }}
            >
              <span className="text-xs uppercase block mb-1" style={{ color: 'var(--text-3)' }}>Market Cap</span>
              <p className="text-xl font-semibold font-mono" style={{ color: 'var(--text-1)' }}>
                {marketData?.market_cap ? marketData.market_cap : '--'}
              </p>
            </div>
            <div
              className="p-4 rounded-lg"
              style={{ backgroundColor: 'var(--bg-3)', borderWidth: '1px', borderColor: 'var(--stroke-1)' }}
            >
              <span className="text-xs uppercase block mb-1" style={{ color: 'var(--text-3)' }}>24h Volume</span>
              <p className="text-xl font-semibold font-mono" style={{ color: 'var(--text-1)' }}>
                {marketData?.volume_24h ? marketData.volume_24h : '--'}
              </p>
            </div>
          </div>
        </div>

        {/* Watchlist / Signals */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold uppercase tracking-wide" style={{ color: 'var(--text-2)' }}>
              Watchlist / Signals {signalsLoading && <span className="text-xs text-[var(--text-3)]">(loading...)</span>}
            </h3>
            <button
              disabled={!hasAccess}
              className="text-xs disabled:opacity-50 disabled:cursor-not-allowed"
              style={{ color: hasAccess ? 'var(--accent-orange)' : 'var(--text-3)' }}
              onClick={() => alert('Watchlist management coming soon!')}
            >
              {hasAccess ? 'Add Symbol' : 'Upgrade Required'}
            </button>
          </div>

          <div
            className="rounded-lg overflow-hidden"
            style={{ backgroundColor: 'var(--bg-2)', borderWidth: '1px', borderColor: 'var(--stroke-1)' }}
          >
            {/* Table Header */}
            <div
              className="grid grid-cols-6 gap-4 px-4 py-3 border-b"
              style={{ backgroundColor: 'var(--bg-1)', borderColor: 'var(--stroke-1)' }}
            >
              <span className="text-xs font-semibold uppercase" style={{ color: 'var(--text-3)' }}>Symbol</span>
              <span className="text-xs font-semibold uppercase" style={{ color: 'var(--text-3)' }}>Signal</span>
              <span className="text-xs font-semibold uppercase" style={{ color: 'var(--text-3)' }}>Strength</span>
              <span className="text-xs font-semibold uppercase" style={{ color: 'var(--text-3)' }}>Timeframe</span>
              <span className="text-xs font-semibold uppercase" style={{ color: 'var(--text-3)' }}>Updated</span>
              <span className="text-xs font-semibold uppercase text-right" style={{ color: 'var(--text-3)' }}>Change</span>
            </div>

            {/* Table Rows */}
            {watchlist.map((item, index) => (
              <div
                key={index}
                className="grid grid-cols-6 gap-4 px-4 py-3 border-b hover:bg-[var(--bg-3)] transition-colors cursor-pointer"
                style={{ borderColor: 'var(--stroke-1)' }}
              >
                <span className="text-sm font-semibold" style={{ color: 'var(--text-1)' }}>{item.symbol}</span>
                <span className="text-sm" style={{ color: 'var(--text-2)' }}>{item.signal}</span>
                <div className="flex items-center gap-2">
                  <div
                    className="w-1.5 h-1.5 rounded-full"
                    style={{
                      backgroundColor:
                        item.strength === 'Strong'
                          ? 'var(--ok-green)'
                          : item.strength === 'Moderate'
                          ? 'var(--warn-amber)'
                          : 'var(--text-3)',
                    }}
                  />
                  <span className="text-sm" style={{ color: 'var(--text-2)' }}>{item.strength}</span>
                </div>
                <span className="text-sm font-mono" style={{ color: 'var(--text-3)' }}>{item.timeframe}</span>
                <span className="text-sm font-mono" style={{ color: 'var(--text-3)' }}>{item.updated}</span>
                <div className="text-right">
                  <span
                    className="text-sm font-mono font-semibold flex items-center justify-end gap-1"
                    style={{ color: item.change.startsWith('+') ? 'var(--ok-green)' : 'var(--danger-red)' }}
                  >
                    {item.change.startsWith('+') ? (
                      <TrendingUp size={14} />
                    ) : (
                      <TrendingDown size={14} />
                    )}
                    {item.change}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right Panel */}
      <RightPanel
        tags={[
          { label: 'Timeframe', value: '4H' },
          { label: 'Market', value: 'Crypto' },
          { label: 'BTC Dominance', value: marketData?.btc_dominance ? `${marketData.btc_dominance.toFixed(1)}%` : 'Loading...' },
          { label: 'Fear & Greed', value: marketData?.fear_greed_index ? `${marketData.fear_greed_index}/100` : 'Loading...' },
        ]}
        alerts={
          hasAccess && marketData?.top_movers?.length ?
            marketData.top_movers.slice(0, 2).map(mover => ({
              message: `${mover.symbol}: ${mover.change24h >= 0 ? '+' : ''}${(mover.change24h * 100).toFixed(1)}%`,
              type: (mover.change24h >= 0 ? 'success' : 'warning') as 'success' | 'warning',
              time: 'Live'
            }))
            :
            [
              { message: 'Connect wallet for live signals', type: 'info' as const, time: 'Now' }
            ]
        }
        actions={[
          { label: 'Refresh Data', icon: 'RefreshCw' },
          { label: 'Upgrade to Pro', icon: 'ArrowUp' },
          { label: 'View Docs', icon: 'FileText' },
        ]}
      />

      {/* Asset Details Modal */}
      {showAssetDetails && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black bg-opacity-50"
            onClick={() => setShowAssetDetails(false)}
          />

          {/* Modal */}
          <div
            className="relative w-full max-w-2xl mx-4 rounded-lg"
            style={{ backgroundColor: 'var(--bg-1)', borderWidth: '1px', borderColor: 'var(--stroke-1)' }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b" style={{ borderColor: 'var(--stroke-1)' }}>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: 'var(--accent-orange)' }}>
                  <DollarSign size={20} style={{ color: '#FFFFFF' }} />
                </div>
                <div>
                  <h2 className="text-xl font-semibold" style={{ color: 'var(--text-1)' }}>BTC/USD Details</h2>
                  <p className="text-sm" style={{ color: 'var(--text-3)' }}>Bitcoin vs US Dollar</p>
                </div>
              </div>
              <button
                onClick={() => setShowAssetDetails(false)}
                className="p-2 rounded-lg hover:bg-[var(--bg-2)] transition-colors"
              >
                <X size={20} style={{ color: 'var(--text-2)' }} />
              </button>
            </div>

            {/* Content */}
            <div className="p-6">
              {/* Stats Grid */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                <div className="p-4 rounded-lg text-center" style={{ backgroundColor: 'var(--bg-2)' }}>
                  <DollarSign size={20} className="mx-auto mb-2" style={{ color: 'var(--accent-orange)' }} />
                  <p className="text-xs uppercase tracking-wide" style={{ color: 'var(--text-3)' }}>Price</p>
                  <p className="text-lg font-semibold" style={{ color: 'var(--text-1)' }}>
                    ${marketData?.price || '43,250'}
                  </p>
                </div>

                <div className="p-4 rounded-lg text-center" style={{ backgroundColor: 'var(--bg-2)' }}>
                  <TrendingUp size={20} className="mx-auto mb-2" style={{ color: 'var(--ok-green)' }} />
                  <p className="text-xs uppercase tracking-wide" style={{ color: 'var(--text-3)' }}>24h Change</p>
                  <p className="text-lg font-semibold" style={{ color: 'var(--ok-green)' }}>
                    +{marketData?.change24h || '2.4'}%
                  </p>
                </div>

                <div className="p-4 rounded-lg text-center" style={{ backgroundColor: 'var(--bg-2)' }}>
                  <BarChart3 size={20} className="mx-auto mb-2" style={{ color: 'var(--text-2)' }} />
                  <p className="text-xs uppercase tracking-wide" style={{ color: 'var(--text-3)' }}>Volume</p>
                  <p className="text-lg font-semibold" style={{ color: 'var(--text-1)' }}>
                    ${marketData?.volume || '28.5B'}
                  </p>
                </div>

                <div className="p-4 rounded-lg text-center" style={{ backgroundColor: 'var(--bg-2)' }}>
                  <Activity size={20} className="mx-auto mb-2" style={{ color: 'var(--text-2)' }} />
                  <p className="text-xs uppercase tracking-wide" style={{ color: 'var(--text-3)' }}>Signal</p>
                  <p className="text-lg font-semibold" style={{ color: watchlist[0]?.signal === 'BUY' ? 'var(--ok-green)' : watchlist[0]?.signal === 'SELL' ? 'var(--danger-red)' : 'var(--text-2)' }}>
                    {watchlist[0]?.signal || 'HOLD'}
                  </p>
                </div>
              </div>

              {/* Additional Info */}
              <div className="space-y-4">
                <div className="p-4 rounded-lg" style={{ backgroundColor: 'var(--bg-2)' }}>
                  <h3 className="font-medium mb-2" style={{ color: 'var(--text-1)' }}>Market Information</h3>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span style={{ color: 'var(--text-3)' }}>Market Cap:</span>
                      <span style={{ color: 'var(--text-1)' }} className="ml-2 font-medium">$850B</span>
                    </div>
                    <div>
                      <span style={{ color: 'var(--text-3)' }}>24h High:</span>
                      <span style={{ color: 'var(--text-1)' }} className="ml-2 font-medium">${marketData?.high24h || '44,200'}</span>
                    </div>
                    <div>
                      <span style={{ color: 'var(--text-3)' }}>24h Low:</span>
                      <span style={{ color: 'var(--text-1)' }} className="ml-2 font-medium">${marketData?.low24h || '42,100'}</span>
                    </div>
                    <div>
                      <span style={{ color: 'var(--text-3)' }}>Last Update:</span>
                      <span style={{ color: 'var(--text-1)' }} className="ml-2 font-medium">
                        <Clock size={12} className="inline mr-1" />
                        {new Date().toLocaleTimeString()}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="p-4 rounded-lg" style={{ backgroundColor: 'var(--bg-2)' }}>
                  <h3 className="font-medium mb-2" style={{ color: 'var(--text-1)' }}>Trading Signal Details</h3>
                  <div className="text-sm">
                    <p style={{ color: 'var(--text-2)' }}>
                      Current signal strength: <span className="font-medium" style={{ color: 'var(--text-1)' }}>
                        {watchlist[0]?.strength || 'Medium'}
                      </span>
                    </p>
                    <p style={{ color: 'var(--text-2)' }}>
                      Timeframe: <span className="font-medium" style={{ color: 'var(--text-1)' }}>
                        {watchlist[0]?.timeframe || '4H'}
                      </span>
                    </p>
                    <p style={{ color: 'var(--text-3)' }} className="mt-2">
                      {hasAccess ? 'Real-time analysis available' : 'Connect wallet for live signals'}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
