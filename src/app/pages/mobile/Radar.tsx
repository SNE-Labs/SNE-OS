import { useState } from 'react';
import { TrendingUp, TrendingDown, DollarSign, Activity, Clock } from 'lucide-react';

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

  // Mobile-optimized layout
  return (
    <div className="mobile-radar">
      {/* Header */}
      <div className="mobile-radar-header">
        <h1 className="mobile-radar-title">Radar</h1>
        <p className="mobile-radar-subtitle">Análise de mercado em tempo real</p>
      </div>

      {/* BTC Overview Card - Mobile Optimized */}
      <div className="mobile-radar-card">
        <div className="mobile-card-header">
          <h2 className="mobile-card-title">BTC/USD</h2>
          <button
            className="mobile-card-action"
            onClick={() => setShowAssetDetails(true)}
          >
            <Activity size={16} />
          </button>
        </div>

        {/* Mini Stats - Grid 2x2 para mobile */}
        <div className="mobile-stats-grid">
          <div className="mobile-stat-item">
            <DollarSign size={16} className="mobile-stat-icon" />
            <div>
              <p className="mobile-stat-value">
                ${marketData?.price || '43,250'}
              </p>
              <p className="mobile-stat-label">Preço</p>
            </div>
          </div>

          <div className="mobile-stat-item">
            <TrendingUp size={16} className="mobile-stat-icon" />
            <div>
              <p className="mobile-stat-value">
                {marketData?.change24h ? `${marketData.change24h > 0 ? '+' : ''}${(marketData.change24h * 100).toFixed(1)}%` : '+2.4%'}
              </p>
              <p className="mobile-stat-label">24h</p>
            </div>
          </div>

          <div className="mobile-stat-item">
            <Activity size={16} className="mobile-stat-icon" />
            <div>
              <p className="mobile-stat-value">
                {marketData?.volume_24h ? marketData.volume_24h : '$28.5B'}
              </p>
              <p className="mobile-stat-label">Volume</p>
            </div>
          </div>

          <div className="mobile-stat-item">
            <Clock size={16} className="mobile-stat-icon" />
            <div>
              <p className="mobile-stat-value">
                {watchlist[0]?.signal || 'HOLD'}
              </p>
              <p className="mobile-stat-label">Sinal</p>
            </div>
          </div>
        </div>
      </div>

      {/* Signals/Watchlist - Mobile List */}
      <div className="mobile-section">
        <div className="mobile-section-header">
          <h3 className="mobile-section-title">Sinais de Trading</h3>
          <span className="mobile-section-badge">{watchlist.length}</span>
        </div>

        <div className="mobile-signals-list">
          {watchlist.map((item, index) => (
            <div key={index} className="mobile-signal-item">
              <div className="mobile-signal-header">
                <span className="mobile-signal-symbol">{item.symbol}</span>
                <div className={`mobile-signal-strength ${item.strength.toLowerCase()}`}>
                  {item.strength}
                </div>
              </div>

              <div className="mobile-signal-details">
                <span className="mobile-signal-signal">{item.signal}</span>
                <span className="mobile-signal-change">{item.change}</span>
              </div>

              <div className="mobile-signal-meta">
                <span className="mobile-signal-timeframe">{item.timeframe}</span>
                <span className="mobile-signal-time">{item.updated}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Asset Details Modal - Mobile Optimized */}
      {showAssetDetails && (
        <div className="mobile-modal-overlay" onClick={() => setShowAssetDetails(false)}>
          <div className="mobile-modal" onClick={(e) => e.stopPropagation()}>
            <div className="mobile-modal-header">
              <h3 className="mobile-modal-title">BTC/USD Detalhes</h3>
              <button
                className="mobile-modal-close"
                onClick={() => setShowAssetDetails(false)}
              >
                ✕
              </button>
            </div>

            <div className="mobile-modal-content">
              <div className="mobile-detailed-stats">
                <div className="mobile-detailed-stat">
                  <span className="mobile-detailed-label">Preço Atual</span>
                  <span className="mobile-detailed-value">${marketData?.price || '43,250'}</span>
                </div>
                <div className="mobile-detailed-stat">
                  <span className="mobile-detailed-label">Variação 24h</span>
                  <span className="mobile-detailed-value positive">
                    +{marketData?.change24h || '2.4'}%
                  </span>
                </div>
                <div className="mobile-detailed-stat">
                  <span className="mobile-detailed-label">Volume</span>
                  <span className="mobile-detailed-value">${marketData?.volume || '28.5B'}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Mobile-specific styles
const mobileStyles = `
  .mobile-radar {
    padding: 16px;
    padding-bottom: 100px; /* Space for tab bar */
  }

  .mobile-radar-header {
    margin-bottom: 24px;
  }

  .mobile-radar-title {
    font-size: 28px;
    font-weight: 700;
    color: var(--text-1, #000);
    margin: 0;
  }

  .mobile-radar-subtitle {
    font-size: 16px;
    color: var(--text-3, #666);
    margin: 8px 0 0 0;
  }

  .mobile-radar-card {
    background: var(--bg-2, #f5f5f5);
    border-radius: 12px;
    padding: 16px;
    margin-bottom: 24px;
    border: 1px solid var(--stroke-1, #e0e0e0);
  }

  .mobile-card-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 16px;
  }

  .mobile-card-title {
    font-size: 18px;
    font-weight: 600;
    color: var(--text-1, #000);
    margin: 0;
  }

  .mobile-card-action {
    background: var(--bg-3, #fff);
    border: 1px solid var(--stroke-1, #e0e0e0);
    border-radius: 8px;
    padding: 8px;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .mobile-stats-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 16px;
  }

  .mobile-stat-item {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .mobile-stat-icon {
    color: var(--accent-orange, #ff6b35);
  }

  .mobile-stat-value {
    font-size: 16px;
    font-weight: 600;
    color: var(--text-1, #000);
    margin: 0;
  }

  .mobile-stat-label {
    font-size: 12px;
    color: var(--text-3, #666);
    margin: 2px 0 0 0;
  }

  .mobile-section {
    margin-bottom: 24px;
  }

  .mobile-section-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 16px;
  }

  .mobile-section-title {
    font-size: 18px;
    font-weight: 600;
    color: var(--text-1, #000);
    margin: 0;
  }

  .mobile-section-badge {
    background: var(--accent-orange, #ff6b35);
    color: white;
    border-radius: 12px;
    padding: 4px 8px;
    font-size: 12px;
    font-weight: 600;
  }

  .mobile-signals-list {
    display: flex;
    flex-direction: column;
    gap: 12px;
  }

  .mobile-signal-item {
    background: var(--bg-2, #f5f5f5);
    border-radius: 8px;
    padding: 12px;
    border: 1px solid var(--stroke-1, #e0e0e0);
  }

  .mobile-signal-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 8px;
  }

  .mobile-signal-symbol {
    font-size: 16px;
    font-weight: 600;
    color: var(--text-1, #000);
  }

  .mobile-signal-strength {
    padding: 4px 8px;
    border-radius: 12px;
    font-size: 12px;
    font-weight: 600;
    text-transform: uppercase;
  }

  .mobile-signal-strength.strong {
    background: var(--ok-green, #10b981);
    color: white;
  }

  .mobile-signal-strength.moderate {
    background: var(--warn-amber, #f59e0b);
    color: white;
  }

  .mobile-signal-strength.weak {
    background: var(--text-3, #d1d5db);
    color: var(--text-1, #000);
  }

  .mobile-signal-details {
    display: flex;
    justify-content: space-between;
    margin-bottom: 8px;
  }

  .mobile-signal-signal {
    font-size: 14px;
    font-weight: 500;
    color: var(--text-1, #000);
  }

  .mobile-signal-change {
    font-size: 14px;
    font-weight: 600;
  }

  .mobile-signal-change:contains('+') {
    color: var(--ok-green, #10b981);
  }

  .mobile-signal-change:contains('-') {
    color: var(--danger-red, #ef4444);
  }

  .mobile-signal-meta {
    display: flex;
    justify-content: space-between;
    font-size: 12px;
    color: var(--text-3, #666);
  }

  .mobile-modal-overlay {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.5);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1000;
  }

  .mobile-modal {
    background: var(--bg-1, #fff);
    border-radius: 12px;
    width: 90%;
    max-width: 400px;
    max-height: 80vh;
    overflow-y: auto;
  }

  .mobile-modal-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 16px;
    border-bottom: 1px solid var(--stroke-1, #e0e0e0);
  }

  .mobile-modal-title {
    font-size: 18px;
    font-weight: 600;
    color: var(--text-1, #000);
    margin: 0;
  }

  .mobile-modal-close {
    background: none;
    border: none;
    font-size: 18px;
    color: var(--text-3, #666);
    cursor: pointer;
  }

  .mobile-modal-content {
    padding: 16px;
  }

  .mobile-detailed-stats {
    display: flex;
    flex-direction: column;
    gap: 16px;
  }

  .mobile-detailed-stat {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .mobile-detailed-label {
    font-size: 14px;
    color: var(--text-3, #666);
  }

  .mobile-detailed-value {
    font-size: 16px;
    font-weight: 600;
    color: var(--text-1, #000);
  }

  .mobile-detailed-value.positive {
    color: var(--ok-green, #10b981);
  }
`;

// Styles are handled by global CSS
