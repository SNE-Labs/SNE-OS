import { Bell, ChevronDown, X } from 'lucide-react';
import { useAuth } from '@/lib/auth/AuthProvider';
import { useState } from 'react';
import { useLocation } from 'react-router-dom';

import { resolveRouteMeta } from '../navigation';

export function Topbar() {
  const { isConnected, isAuthenticated, address, tier, connect } = useAuth();
  const location = useLocation();
  const routeMeta = resolveRouteMeta(location.pathname);
  const [showNotifications, setShowNotifications] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [connectError, setConnectError] = useState<string | null>(null);

  const handleConnect = async () => {
    setIsConnecting(true);
    setConnectError(null);

    try {
      await connect();
    } catch (error: any) {
      console.error('Conexão com carteira falhou:', error);
      setConnectError(error.message || 'Falha ao conectar a carteira.');
    } finally {
      setIsConnecting(false);
    }
  };

  return (
    <header
      className="h-16 border-b flex items-center justify-between px-6"
      style={{ backgroundColor: 'var(--bg-1)', borderColor: 'var(--stroke-1)' }}
    >
      <div className="min-w-0">
        <div className="text-lg font-semibold truncate" style={{ color: 'var(--text-1)' }}>
          {routeMeta.title}
        </div>
        <div className="text-xs truncate" style={{ color: 'var(--text-3)' }}>
          {routeMeta.descriptor}
        </div>
      </div>

      {/* Right Actions */}
      <div className="flex items-center gap-3">
        <div
          className="px-3 py-1.5 rounded-lg text-xs font-semibold uppercase"
          style={{ backgroundColor: 'var(--stroke-2)', color: 'var(--text-2)' }}
        >
          {tier === 'free' ? 'GRATUITO' : tier === 'pro' ? 'PRO' : tier?.toUpperCase()}
        </div>

        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full" style={{ backgroundColor: 'var(--ok-green)' }} />
          <span className="text-xs" style={{ color: 'var(--text-3)' }}>{routeMeta.context}</span>
        </div>

        {/* Notifications */}
        <button
          onClick={() => setShowNotifications(true)}
          className="p-2 rounded-lg hover:bg-[var(--bg-2)] transition-colors"
        >
          <Bell size={18} style={{ color: 'var(--text-2)' }} />
        </button>

        {/* Connect Wallet Button */}
        {!isConnected ? (
          <div className="flex flex-col items-end">
            <button
              onClick={handleConnect}
              disabled={isConnecting}
              className="px-4 py-2 rounded-lg font-medium text-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              style={{
                backgroundColor: 'var(--accent-orange)',
                color: '#FFFFFF',
              }}
            >
              {isConnecting ? 'Conectando...' : 'Conectar Carteira'}
            </button>
            {connectError && (
              <p className="text-xs mt-1 max-w-xs text-right" style={{ color: 'var(--danger-red)' }}>
                {connectError}
              </p>
            )}
          </div>
        ) : (
          <div
            className="px-4 py-2 rounded-lg font-mono text-sm"
            style={{ backgroundColor: 'var(--bg-2)', color: 'var(--text-1)', borderWidth: '1px', borderColor: 'var(--stroke-1)' }}
          >
            {address ? `${address.slice(0, 6)}...${address.slice(-4)}` : 'Connected'}
          </div>
        )}
      </div>

      {/* Notifications Modal */}
      {showNotifications && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black bg-opacity-50"
            onClick={() => setShowNotifications(false)}
          />

          {/* Modal */}
          <div
            className="relative w-full max-w-md mx-4 rounded-lg"
            style={{ backgroundColor: 'var(--bg-1)', borderWidth: '1px', borderColor: 'var(--stroke-1)' }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b" style={{ borderColor: 'var(--stroke-1)' }}>
              <h3 className="font-semibold" style={{ color: 'var(--text-1)' }}>Notificações</h3>
              <button
                onClick={() => setShowNotifications(false)}
                className="p-1 rounded-lg hover:bg-[var(--bg-2)] transition-colors"
              >
                <X size={18} style={{ color: 'var(--text-2)' }} />
              </button>
            </div>

            {/* Content */}
            <div className="p-4">
              <div className="space-y-3">
                <div className="p-3 rounded-lg" style={{ backgroundColor: 'var(--bg-2)' }}>
                  <div className="flex items-start gap-3">
                    <div className="w-2 h-2 rounded-full mt-2" style={{ backgroundColor: 'var(--accent-orange)' }} />
                    <div className="flex-1">
                      <p className="text-sm font-medium" style={{ color: 'var(--text-1)' }}>
                        Bem-vindo ao SNE OS
                      </p>
                      <p className="text-xs" style={{ color: 'var(--text-3)' }}>
                        Conecte sua carteira para acessar todas as funcionalidades.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="p-3 rounded-lg" style={{ backgroundColor: 'var(--bg-2)' }}>
                  <div className="flex items-start gap-3">
                    <div className="w-2 h-2 rounded-full mt-2" style={{ backgroundColor: 'var(--ok-green)' }} />
                    <div className="flex-1">
                      <p className="text-sm font-medium" style={{ color: 'var(--text-1)' }}>
                        {routeMeta.context}
                      </p>
                      <p className="text-xs" style={{ color: 'var(--text-3)' }}>
                        {routeMeta.descriptor}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-4 pt-3 border-t text-center" style={{ borderColor: 'var(--stroke-1)' }}>
                <p className="text-xs" style={{ color: 'var(--text-3)' }}>
                  Nenhuma nova notificação
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
