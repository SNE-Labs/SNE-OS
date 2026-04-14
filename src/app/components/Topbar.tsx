import { useAuth } from '@/lib/auth/AuthProvider';
import { useLocation } from 'react-router-dom';

import { resolveRouteMeta } from '../navigation';
import { formatAddress } from '@/utils/format';
import { WalletConnect } from './passport/WalletConnect';

export function Topbar() {
  const { isAuthenticated, address, tier } = useAuth();
  const location = useLocation();
  const routeMeta = resolveRouteMeta(location.pathname);
  const sessionLabel = tier === 'free' ? 'GRATUITO' : tier === 'pro' ? 'PRO' : tier?.toUpperCase();

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
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full" style={{ backgroundColor: 'var(--ok-green)' }} />
          <span className="text-xs" style={{ color: 'var(--text-3)' }}>{routeMeta.context}</span>
        </div>

        {!isAuthenticated ? (
          <WalletConnect showConnectButton connectButtonLabel="Conectar carteira" />
        ) : (
          <div
            className="px-3 py-2 rounded-lg flex items-center gap-3"
            style={{ backgroundColor: 'var(--bg-2)', color: 'var(--text-1)', borderWidth: '1px', borderColor: 'var(--stroke-1)' }}
          >
            <div
              className="px-2 py-1 rounded text-[11px] font-semibold uppercase"
              style={{ backgroundColor: 'var(--stroke-2)', color: 'var(--text-2)' }}
            >
              {sessionLabel}
            </div>
            <div className="text-right">
              <div className="text-[10px] uppercase" style={{ color: 'var(--text-3)' }}>
                Carteira
              </div>
              <div className="font-mono text-sm" style={{ color: 'var(--text-1)' }}>
                {address ? formatAddress(address) : 'Conectada'}
              </div>
            </div>
          </div>
        )}
      </div>
    </header>
  );
}
