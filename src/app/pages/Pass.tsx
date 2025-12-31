import { useState } from 'react';
import { useAccount } from 'wagmi';
import { Shield, Eye, Search, Wallet, CheckCircle2, AlertCircle } from 'lucide-react';
import BalanceDisplay from '../components/passport/Balance/BalanceDisplay';
import WatchlistManager from '../components/passport/Spy/WatchlistManager';
import { RightPanel } from '../components/RightPanel';

export function Pass() {
  const { isConnected } = useAccount();
  const [currentView, setCurrentView] = useState<'dashboard' | 'public' | 'spy'>('dashboard');
  const [searchAddress, setSearchAddress] = useState('');
  const [error, setError] = useState<string | null>(null);

  const tabs = [
    { id: 'dashboard', label: 'Dashboard', icon: Shield },
    { id: 'public', label: 'Public View', icon: Search },
    { id: 'spy', label: 'Spy Mode', icon: Eye },
  ];

  return (
    <div className="flex flex-1">
      <div className="flex-1 px-8 py-6 overflow-y-auto">
        <div className="mb-6">
          <p className="text-xs uppercase tracking-wider mb-2" style={{ color: 'var(--text-3)' }}>Passport</p>
          <h1 className="text-4xl font-semibold" style={{ color: 'var(--text-1)' }}>SNE Scroll Passport</h1>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mb-6" style={{ backgroundColor: 'var(--bg-2)', borderRadius: '8px', padding: '4px' }}>
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setCurrentView(tab.id as any)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                currentView === tab.id
                  ? 'bg-[var(--accent-orange)] text-white'
                  : 'text-[var(--text-2)] hover:text-[var(--text-1)]'
              }`}
            >
              <tab.icon size={16} />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Content based on current view */}
        {currentView === 'dashboard' && (
          <div className="space-y-6">
            {!isConnected ? (
              <div
                className="rounded-xl p-12 text-center"
                style={{ backgroundColor: 'var(--bg-2)', border: '1px solid var(--stroke-1)' }}
              >
                <Wallet size={48} style={{ color: 'var(--text-3)', margin: '0 auto 16px' }} />
                <h2 style={{ color: 'var(--text-1)', fontSize: '24px', fontWeight: '600', marginBottom: '8px' }}>
                  Conecte sua wallet para começar
                </h2>
                <p style={{ color: 'var(--text-3)' }}>
                  Use o botão "Connect Wallet" no canto superior direito
                </p>
              </div>
            ) : (
              <div className="space-y-6">
                <BalanceDisplay />
              </div>
            )}
          </div>
        )}

        {currentView === 'public' && (
          <div className="space-y-6">
            <div className="mb-8">
              <h2 className="text-2xl font-semibold mb-2" style={{ color: 'var(--text-1)' }}>
                Public View
              </h2>
              <p style={{ color: 'var(--text-3)' }}>
                Visualize qualquer endereço na Scroll Network sem conectar sua wallet
              </p>
            </div>

            {/* Search Form */}
            <div
              className="rounded-xl p-6"
              style={{ backgroundColor: 'var(--bg-2)', border: '1px solid var(--stroke-1)' }}
            >
              <form className="space-y-4">
                <div className="flex gap-3">
                  <div className="flex-1 relative">
                    <Search
                      size={18}
                      style={{ color: 'var(--text-3)', position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }}
                    />
                    <input
                      type="text"
                      value={searchAddress}
                      onChange={(e) => {
                        setSearchAddress(e.target.value);
                        setError(null);
                      }}
                      placeholder="0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb"
                      className="w-full pl-10 pr-4 py-3 rounded-lg font-mono text-sm"
                      style={{
                        backgroundColor: 'var(--bg-3)',
                        border: '1px solid var(--stroke-1)',
                        color: 'var(--text-1)',
                      }}
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={!searchAddress.trim()}
                    className="px-6 py-3 rounded-lg text-sm font-medium flex items-center gap-2"
                    style={{
                      backgroundColor: 'var(--accent-orange)',
                      color: '#FFFFFF',
                      opacity: !searchAddress.trim() ? 0.5 : 1,
                    }}
                  >
                    <Search size={16} />
                    Buscar
                  </button>
                </div>

                {error && (
                  <div className="flex items-center gap-2" style={{ color: 'var(--danger-red)' }}>
                    <AlertCircle size={16} />
                    <span className="text-sm">{error}</span>
                  </div>
                )}
              </form>
            </div>

            {/* Info Card */}
            <div
              className="rounded-xl p-6"
              style={{ backgroundColor: 'var(--bg-2)', border: '1px solid var(--stroke-1)' }}
            >
              <div className="flex items-start gap-4">
                <div
                  className="p-3 rounded-lg"
                  style={{ backgroundColor: 'var(--accent-orange)', opacity: 0.1 }}
                >
                  <Wallet size={24} style={{ color: 'var(--accent-orange)' }} />
                </div>
                <div>
                  <h3 className="text-lg font-semibold mb-2" style={{ color: 'var(--text-1)' }}>
                    Como usar
                  </h3>
                  <ul className="space-y-2 text-sm" style={{ color: 'var(--text-3)' }}>
                    <li>• Cole qualquer endereço Ethereum válido (0x...)</li>
                    <li>• Visualize saldo, tokens e histórico de transações</li>
                    <li>• Não é necessário conectar sua wallet</li>
                    <li>• Funciona com qualquer endereço na Scroll Network</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        )}

        {currentView === 'spy' && (
          <div className="space-y-6">
            <div className="mb-8">
              <div className="flex items-center gap-3 mb-2">
                <div
                  className="p-2 rounded-lg"
                  style={{ backgroundColor: 'var(--accent-orange)', opacity: 0.1 }}
                >
                  <Eye size={24} style={{ color: 'var(--accent-orange)' }} />
                </div>
                <div>
                  <h2 className="text-2xl font-semibold" style={{ color: 'var(--text-1)' }}>
                    Spy Mode
                  </h2>
                  <p style={{ color: 'var(--text-3)' }}>
                    Monitore carteiras e acompanhe movimentações
                  </p>
                </div>
              </div>
            </div>

            {/* Info Card */}
            <div
              className="rounded-xl p-6 mb-6"
              style={{ backgroundColor: 'var(--bg-2)', border: '1px solid var(--accent-orange)', borderOpacity: 0.3 }}
            >
              <h3 className="text-lg font-semibold mb-2" style={{ color: 'var(--text-1)' }}>
                Como funciona
              </h3>
              <ul className="space-y-2 text-sm" style={{ color: 'var(--text-3)' }}>
                <li>• Adicione carteiras à sua watchlist para monitorar saldos</li>
                <li>• Visualize saldos em tempo real sem conectar sua wallet</li>
                <li>• Compare múltiplas carteiras lado a lado</li>
                <li>• Dados salvos localmente no seu navegador</li>
              </ul>
            </div>

            {/* Watchlist Manager */}
            <WatchlistManager />
          </div>
        )}
      </div>

      <RightPanel
        tags={[
          { label: 'Network', value: 'Scroll L2' },
          { label: 'Mode', value: currentView },
          { label: 'Status', value: isConnected ? 'Connected' : 'Disconnected' }
        ]}
        alerts={[
          { message: 'Passport conectado à Scroll Network', type: 'success', time: 'agora' }
        ]}
        actions={[
          { label: 'View Docs', icon: 'FileText' },
          { label: 'Gas Tracker', icon: 'Zap' },
          { label: 'Settings', icon: 'Settings' }
        ]}
      />
    </div>
  );
}
