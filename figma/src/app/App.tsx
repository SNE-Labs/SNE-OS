import { useState } from 'react';
import { TrendingUp, TrendingDown, Activity, BarChart3, Menu, X, Wallet, Zap } from 'lucide-react';
import { Button } from './components/Button';
import { shortenAddress, formatCurrency, formatPercentage } from './lib/utils';
import { cn } from './lib/utils';

type Tier = 'free' | 'premium' | 'pro';
type View = 'dashboard' | 'charts' | 'analysis' | 'pricing';

// Mock Data
const topMovers = [
  { symbol: 'BTC/USDT', price: 43250.50, change24h: 5.23, volume: '2.5B' },
  { symbol: 'ETH/USDT', price: 2280.75, change24h: -2.14, volume: '1.8B' },
  { symbol: 'SOL/USDT', price: 98.32, change24h: 12.45, volume: '850M' },
  { symbol: 'BNB/USDT', price: 315.20, change24h: 3.67, volume: '620M' },
  { symbol: 'XRP/USDT', price: 0.5234, change24h: -1.23, volume: '450M' },
];

function App() {
  const [currentView, setCurrentView] = useState<View>('dashboard');
  const [tier, setTier] = useState<Tier>('free');
  const [isConnected, setIsConnected] = useState(false);
  const [walletAddress] = useState('0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb');
  const [menuOpen, setMenuOpen] = useState(false);
  const [showWalletModal, setShowWalletModal] = useState(false);

  const tierLimits = {
    free: { analyses: 3, symbols: 1, watchlist: 3 },
    premium: { analyses: 50, symbols: 3, watchlist: 10 },
    pro: { analyses: 1000, symbols: Infinity, watchlist: Infinity },
  };

  const currentLimits = tierLimits[tier];

  const handleConnectWallet = () => {
    setShowWalletModal(true);
  };

  const connectWallet = (provider: string) => {
    // Mock wallet connection
    setIsConnected(true);
    setShowWalletModal(false);
  };

  return (
    <div className="min-h-screen bg-[#0B0B0B] text-[#F7F7F8]">
      {/* Wallet Connect Modal */}
      {showWalletModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
          <div className="bg-[#111216] border border-[rgba(255,255,255,0.1)] rounded-[10px] p-8 max-w-md w-full mx-4">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-semibold">Conectar Carteira</h3>
              <button onClick={() => setShowWalletModal(false)}>
                <X className="w-5 h-5" />
              </button>
            </div>
            <p className="text-[#A6A6A6] text-sm mb-6">
              Conecte sua wallet para acessar o SNE Radar
            </p>
            <div className="space-y-3">
              {['MetaMask', 'WalletConnect', 'Injected'].map((provider) => (
                <button
                  key={provider}
                  onClick={() => connectWallet(provider)}
                  className="w-full bg-[#1B1B1F] border border-[rgba(255,255,255,0.1)] rounded-md px-6 py-4 hover:border-[#FF6A00] hover:bg-[#1B1B1F] transition-all duration-150 text-left"
                >
                  <div className="flex items-center gap-3">
                    <Wallet className="w-5 h-5" />
                    <span>{provider}</span>
                  </div>
                </button>
              ))}
            </div>
            <p className="text-xs text-[#A6A6A6] mt-6 text-center">
              Ao conectar, você concorda com nossos Termos de Uso
            </p>
          </div>
        </div>
      )}

      {/* Navigation */}
      <nav className="sticky top-0 z-50 bg-[#0B0B0B] border-b border-[rgba(255,255,255,0.1)] h-16">
        <div className="container mx-auto px-6 h-full flex items-center justify-between">
          {/* Logo */}
          <div className="flex items-center gap-8">
            <div className="flex items-center gap-2">
              <Zap className="w-6 h-6 text-[#FF6A00]" />
              <h1 className="font-mono font-bold text-xl">SNE Radar</h1>
            </div>
            
            {/* Desktop Nav */}
            <div className="hidden md:flex items-center gap-6">
              <button
                onClick={() => setCurrentView('dashboard')}
                className={cn(
                  'text-sm transition-colors',
                  currentView === 'dashboard' ? 'text-[#F7F7F8] border-b-2 border-[#FF6A00] pb-0.5' : 'text-[#A6A6A6] hover:text-[#F7F7F8]'
                )}
              >
                Dashboard
              </button>
              <button
                onClick={() => setCurrentView('charts')}
                className={cn(
                  'text-sm transition-colors',
                  currentView === 'charts' ? 'text-[#F7F7F8] border-b-2 border-[#FF6A00] pb-0.5' : 'text-[#A6A6A6] hover:text-[#F7F7F8]'
                )}
              >
                Charts
              </button>
              <button
                onClick={() => setCurrentView('analysis')}
                className={cn(
                  'text-sm transition-colors',
                  currentView === 'analysis' ? 'text-[#F7F7F8] border-b-2 border-[#FF6A00] pb-0.5' : 'text-[#A6A6A6] hover:text-[#F7F7F8]'
                )}
              >
                Analysis
              </button>
            </div>
          </div>

          {/* Right Side */}
          <div className="flex items-center gap-4">
            {/* Tier Badge & Wallet */}
            {isConnected ? (
              <div className="hidden md:flex items-center gap-3">
                <button
                  onClick={() => setCurrentView('pricing')}
                  className={cn(
                    'px-3 py-1 rounded-full text-xs font-mono font-medium transition-all hover:scale-105',
                    tier === 'free' && 'bg-[#1B1B1F] text-[#A6A6A6] hover:bg-[#252529]',
                    tier === 'premium' && 'bg-[rgba(255,106,0,0.2)] text-[#FF6A00] hover:bg-[rgba(255,106,0,0.3)]',
                    tier === 'pro' && 'bg-[rgba(255,200,87,0.2)] text-[#FFC857] hover:bg-[rgba(255,200,87,0.3)]'
                  )}
                >
                  {tier.toUpperCase()}
                </button>
                <span className="font-mono text-sm text-[#A6A6A6]">
                  {shortenAddress(walletAddress)}
                </span>
              </div>
            ) : (
              <Button onClick={handleConnectWallet} size="sm">
                <Wallet className="w-4 h-4 mr-2 inline" />
                Conectar Carteira
              </Button>
            )}

            {/* Mobile Menu Toggle */}
            <button
              className="md:hidden"
              onClick={() => setMenuOpen(!menuOpen)}
            >
              {menuOpen ? <X /> : <Menu />}
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        {menuOpen && (
          <div className="md:hidden bg-[#111216] border-t border-[rgba(255,255,255,0.1)] p-4">
            <div className="flex flex-col gap-3">
              <button onClick={() => { setCurrentView('dashboard'); setMenuOpen(false); }} className="text-left py-2">Dashboard</button>
              <button onClick={() => { setCurrentView('charts'); setMenuOpen(false); }} className="text-left py-2">Charts</button>
              <button onClick={() => { setCurrentView('analysis'); setMenuOpen(false); }} className="text-left py-2">Analysis</button>
              <button onClick={() => { setCurrentView('pricing'); setMenuOpen(false); }} className="text-left py-2">Pricing</button>
            </div>
          </div>
        )}
      </nav>

      {/* Main Content */}
      <main className="container mx-auto px-6 py-8">
        {currentView === 'dashboard' && <DashboardView tier={tier} currentLimits={currentLimits} setCurrentView={setCurrentView} />}
        {currentView === 'charts' && <ChartsView tier={tier} />}
        {currentView === 'analysis' && <AnalysisView tier={tier} currentLimits={currentLimits} />}
        {currentView === 'pricing' && <PricingView currentTier={tier} setTier={setTier} setCurrentView={setCurrentView} />}
      </main>
    </div>
  );
}

// Dashboard View
function DashboardView({ tier, currentLimits, setCurrentView }: { tier: Tier; currentLimits: any; setCurrentView: (view: View) => void }) {
  return (
    <div className="space-y-8">
      {/* Market Summary */}
      <section>
        <h2 className="text-2xl font-semibold mb-6">Market Summary</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <MetricCard label="BTC Dominance" value="48.2%" trend={1.2} />
          <MetricCard label="Market Cap" value="$1.8T" trend={-0.5} />
          <MetricCard label="24h Volume" value="$95B" trend={5.3} />
          <MetricCard label="Fear & Greed" value="62" subtitle="Greed" color="success" />
        </div>
      </section>

      {/* Top Movers */}
      <section>
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-semibold">Top Movers</h2>
          {tier === 'free' && (
            <span className="text-sm text-[#A6A6A6]">
              Showing top 5 • <button onClick={() => setCurrentView('pricing')} className="text-[#FF6A00] hover:underline">Upgrade for more</button>
            </span>
          )}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {topMovers.slice(0, tier === 'free' ? 5 : 10).map((mover, idx) => (
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
              0/{currentLimits.analyses}
            </div>
          </div>
          <div className="bg-[#111216] border border-[rgba(255,255,255,0.1)] rounded-[10px] p-6">
            <div className="text-sm text-[#A6A6A6] mb-2">Taxa de Sucesso</div>
            <div className="text-3xl font-mono font-bold text-[#00C48C]">
              --
            </div>
          </div>
          <div className="bg-[#111216] border border-[rgba(255,255,255,0.1)] rounded-[10px] p-6">
            <div className="text-sm text-[#A6A6A6] mb-2">Melhor Setup</div>
            <div className="text-xl font-mono font-bold">
              --
            </div>
          </div>
          <div className="bg-[#111216] border border-[rgba(255,255,255,0.1)] rounded-[10px] p-6">
            <div className="text-sm text-[#A6A6A6] mb-2">Próxima Análise</div>
            <div className="text-xl font-mono font-bold">
              Disponível
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

// Charts View
function ChartsView({ tier }: { tier: Tier }) {
  const [selectedSymbol, setSelectedSymbol] = useState('BTCUSDT');
  const [timeframe, setTimeframe] = useState('1h');

  return (
    <div className="space-y-6">
      {/* Chart Controls */}
      <div className="flex flex-wrap items-center gap-4">
        <select
          value={selectedSymbol}
          onChange={(e) => setSelectedSymbol(e.target.value)}
          className="bg-[#111216] border border-[rgba(255,255,255,0.1)] rounded-md px-4 py-2 font-mono"
        >
          <option>BTCUSDT</option>
          <option>ETHUSDT</option>
          <option>SOLUSDT</option>
        </select>

        <div className="flex gap-2">
          {['1m', '5m', '15m', '1h', '4h', '1d'].map((tf) => (
            <button
              key={tf}
              onClick={() => setTimeframe(tf)}
              disabled={tier === 'free' && !['15m', '1h', '4h', '1d'].includes(tf)}
              className={cn(
                'px-3 py-1.5 rounded-md text-sm font-mono transition-all',
                timeframe === tf
                  ? 'bg-[#FF6A00] text-white'
                  : 'bg-[#111216] border border-[rgba(255,255,255,0.1)] hover:border-[#FF6A00]',
                tier === 'free' && !['15m', '1h', '4h', '1d'].includes(tf) && 'opacity-30 cursor-not-allowed'
              )}
            >
              {tf}
            </button>
          ))}
        </div>
      </div>

      {/* Chart Area */}
      <div className="bg-[#111216] border border-[rgba(255,255,255,0.1)] rounded-[10px] p-6 min-h-[600px] flex items-center justify-center">
        <div className="text-center text-[#A6A6A6]">
          <BarChart3 className="w-16 h-16 mx-auto mb-4 opacity-30" />
          <p>Chart View - {selectedSymbol} {timeframe}</p>
          <p className="text-sm mt-2">(TradingView Lightweight Charts integration)</p>
        </div>
      </div>

      {/* Indicators Sidebar */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-[#111216] border border-[rgba(255,255,255,0.1)] rounded-[10px] p-4">
          <div className="text-sm text-[#A6A6A6] mb-2">RSI (14)</div>
          <div className="text-2xl font-mono font-bold">65.2</div>
        </div>
        <div className="bg-[#111216] border border-[rgba(255,255,255,0.1)] rounded-[10px] p-4">
          <div className="text-sm text-[#A6A6A6] mb-2">MACD</div>
          <div className="text-2xl font-mono font-bold text-[#00C48C]">+125</div>
        </div>
        <div className="bg-[#111216] border border-[rgba(255,255,255,0.1)] rounded-[10px] p-4">
          <div className="text-sm text-[#A6A6A6] mb-2">Volume</div>
          <div className="text-2xl font-mono font-bold">2.5M</div>
        </div>
      </div>
    </div>
  );
}

// Analysis View
function AnalysisView({ tier, currentLimits }: { tier: Tier; currentLimits: any }) {
  const [analysisResult, setAnalysisResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const runAnalysis = () => {
    setLoading(true);
    setTimeout(() => {
      setAnalysisResult({
        score: 75,
        setup: 'Bull Flag Breakout',
        probability: 68,
        riskReward: 2.5,
        entry: 43280,
        sl: 42100,
        tp1: 44500,
        tp2: 45800,
        tp3: 47200,
      });
      setLoading(false);
    }, 2000);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-semibold">Technical Analysis</h2>
        <span className="text-sm text-[#A6A6A6]">
          Análises hoje: <span className="text-[#FF6A00] font-mono">0/{currentLimits.analyses}</span>
        </span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Controls */}
        <div className="space-y-4">
          <select className="w-full bg-[#111216] border border-[rgba(255,255,255,0.1)] rounded-md px-4 py-3 font-mono">
            <option>BTCUSDT</option>
            <option>ETHUSDT</option>
          </select>

          <select className="w-full bg-[#111216] border border-[rgba(255,255,255,0.1)] rounded-md px-4 py-3 font-mono">
            <option>1h</option>
            <option>4h</option>
            <option>1d</option>
          </select>

          <Button onClick={runAnalysis} disabled={loading} className="w-full">
            {loading ? 'Analyzing...' : 'Executar Análise'}
          </Button>
        </div>

        {/* Results */}
        <div className="lg:col-span-2">
          {analysisResult ? (
            <div className="bg-[#111216] border border-[rgba(255,255,255,0.1)] rounded-[10px] p-6 space-y-6">
              <div>
                <div className="text-sm text-[#A6A6A6] mb-2">Score Geral</div>
                <div className="text-5xl font-mono font-bold text-[#FF6A00]">{analysisResult.score}/100</div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-sm text-[#A6A6A6] mb-1">Setup Identificado</div>
                  <div className="text-xl font-semibold">{analysisResult.setup}</div>
                </div>
                <div>
                  <div className="text-sm text-[#A6A6A6] mb-1">Probabilidade</div>
                  <div className="text-xl font-semibold text-[#00C48C]">{analysisResult.probability}%</div>
                </div>
              </div>

              <div>
                <div className="text-sm text-[#A6A6A6] mb-3">Níveis Operacionais</div>
                <div className="space-y-2">
                  <div className="flex justify-between items-center p-3 bg-[#1B1B1F] rounded-md border border-[rgba(0,200,140,0.3)]">
                    <span className="text-sm">Entry</span>
                    <span className="font-mono font-bold text-[#00C48C]">{formatCurrency(analysisResult.entry)}</span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-[#1B1B1F] rounded-md border border-[rgba(255,77,79,0.3)]">
                    <span className="text-sm">Stop Loss</span>
                    <span className="font-mono font-bold text-[#FF4D4F]">{formatCurrency(analysisResult.sl)}</span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-[#1B1B1F] rounded-md border border-[rgba(255,200,87,0.3)]">
                    <span className="text-sm">TP1</span>
                    <span className="font-mono font-bold text-[#FFC857]">{formatCurrency(analysisResult.tp1)}</span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-[#1B1B1F] rounded-md border border-[rgba(255,200,87,0.3)]">
                    <span className="text-sm">TP2</span>
                    <span className="font-mono font-bold text-[#FFC857]">{formatCurrency(analysisResult.tp2)}</span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-[#1B1B1F] rounded-md border border-[rgba(255,200,87,0.3)]">
                    <span className="text-sm">TP3</span>
                    <span className="font-mono font-bold text-[#FFC857]">{formatCurrency(analysisResult.tp3)}</span>
                  </div>
                </div>
              </div>

              <div>
                <div className="text-sm text-[#A6A6A6] mb-2">Risk/Reward Ratio</div>
                <div className="text-2xl font-mono font-bold">1:{analysisResult.riskReward}</div>
              </div>
            </div>
          ) : (
            <div className="bg-[#111216] border border-[rgba(255,255,255,0.1)] rounded-[10px] p-12 flex items-center justify-center min-h-[400px]">
              <div className="text-center text-[#A6A6A6]">
                <Activity className="w-16 h-16 mx-auto mb-4 opacity-30" />
                <p>Selecione um símbolo e clique em "Executar Análise"</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Pricing View
function PricingView({ currentTier, setTier, setCurrentView }: { currentTier: Tier; setTier: (tier: Tier) => void; setCurrentView: (view: View) => void }) {
  const tiers = [
    {
      name: 'Free',
      price: 'R$ 0',
      period: '/mês',
      tier: 'free' as Tier,
      badge: 'GRÁTIS',
      badgeColor: 'bg-[#1B1B1F] text-[#A6A6A6]',
      features: [
        { text: 'Dashboard básico (Top 5)', available: true },
        { text: '3 análises/dia', available: true },
        { text: '1 símbolo no chart', available: true },
        { text: 'Timeframes limitados', available: true },
        { text: 'Sem backtest', available: false },
        { text: 'Sem alertas', available: false },
      ],
    },
    {
      name: 'Premium',
      price: 'R$ 199',
      period: '/mês',
      tier: 'premium' as Tier,
      badge: 'POPULAR',
      badgeColor: 'bg-[rgba(255,106,0,0.2)] text-[#FF6A00]',
      features: [
        { text: 'Dashboard completo', available: true },
        { text: '50 análises/dia', available: true },
        { text: 'Multi-timeframe', available: true },
        { text: 'Alertas ilimitados', available: true },
        { text: 'Backtest básico', available: true },
        { text: 'Histórico 30 dias', available: true },
      ],
      popular: true,
    },
    {
      name: 'Pro',
      price: 'R$ 799',
      period: '/mês',
      tier: 'pro' as Tier,
      badge: 'PROFISSIONAL',
      badgeColor: 'bg-[rgba(255,200,87,0.2)] text-[#FFC857]',
      features: [
        { text: 'Tudo do Premium', available: true },
        { text: '1000 análises/dia', available: true },
        { text: 'DOM completo', available: true },
        { text: 'Backtest avançado', available: true },
        { text: 'Webhooks', available: true },
        { text: 'Histórico ilimitado', available: true },
        { text: 'SLA 99.9%', available: true },
      ],
    },
  ];

  return (
    <div className="space-y-12">
      <div className="text-center">
        <h2 className="text-4xl font-bold mb-4">Escolha seu plano</h2>
        <p className="text-[#A6A6A6] text-lg">Análise técnica avançada para traders profissionais</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {tiers.map((tierData) => (
          <div
            key={tierData.tier}
            className={cn(
              'bg-gradient-to-br from-[#111216] to-[#1B1B1F] border rounded-[10px] p-8 relative transition-all duration-150',
              tierData.popular
                ? 'border-[#FF6A00] shadow-[0_8px_24px_rgba(255,106,0,0.15)]'
                : 'border-[rgba(255,255,255,0.1)] hover:border-[#FF6A00]'
            )}
          >
            <div className={cn('inline-block px-3 py-1 rounded-full text-xs font-medium mb-6', tierData.badgeColor)}>
              {tierData.badge}
            </div>

            <div className="mb-6">
              <div className="text-4xl font-bold mb-2">
                {tierData.price}
                <span className="text-lg text-[#A6A6A6] font-normal">{tierData.period}</span>
              </div>
            </div>

            <div className="space-y-3 mb-8">
              {tierData.features.map((feature, idx) => (
                <div key={idx} className="flex items-start gap-3">
                  {feature.available ? (
                    <span className="text-[#00C48C] mt-0.5">✓</span>
                  ) : (
                    <span className="text-[#FF4D4F] mt-0.5">✗</span>
                  )}
                  <span className={cn('text-sm', !feature.available && 'text-[#A6A6A6]')}>
                    {feature.text}
                  </span>
                </div>
              ))}
            </div>

            <Button
              variant={currentTier === tierData.tier ? 'secondary' : tierData.popular ? 'primary' : 'secondary'}
              className="w-full"
              onClick={() => {
                setTier(tierData.tier);
                setCurrentView('dashboard');
              }}
            >
              {currentTier === tierData.tier ? 'Plano Atual' : `Assinar ${tierData.name}`}
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
}

// Metric Card Component
function MetricCard({ label, value, trend, subtitle, color }: {
  label: string;
  value: string;
  trend?: number;
  subtitle?: string;
  color?: 'success' | 'warning' | 'critical';
}) {
  const colorMap = {
    success: 'text-[#00C48C]',
    warning: 'text-[#FFC857]',
    critical: 'text-[#FF4D4F]',
  };

  return (
    <div className="bg-gradient-to-br from-[#111216] to-[#1B1B1F] border border-[rgba(255,255,255,0.1)] rounded-[10px] p-6 hover:-translate-y-0.5 transition-all duration-150">
      <div className="text-sm text-[#A6A6A6] mb-2 uppercase tracking-wider">{label}</div>
      <div className={cn('text-3xl font-mono font-bold mb-1', color && colorMap[color])}>
        {value}
      </div>
      {subtitle && <div className="text-sm text-[#A6A6A6]">{subtitle}</div>}
      {trend !== undefined && (
        <div className={cn('flex items-center gap-1 text-sm font-medium', trend >= 0 ? 'text-[#00C48C]' : 'text-[#FF4D4F]')}>
          {trend >= 0 ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
          {formatPercentage(Math.abs(trend))}
        </div>
      )}
    </div>
  );
}

export default App;