import { Command, ShieldCheck, Wallet } from 'lucide-react';
import { useAuth } from '@/lib/auth/AuthProvider';
import { useLocation } from 'react-router-dom';

import { resolveRouteMeta } from '../navigation';
import { formatAddress } from '@/utils/format';

export function BottomBar() {
  const { isAuthenticated, address } = useAuth();
  const location = useLocation();
  const routeMeta = resolveRouteMeta(location.pathname);

  return (
    <footer
      className="h-12 border-t flex items-center justify-between px-6"
      style={{ backgroundColor: 'var(--bg-1)', borderColor: 'var(--stroke-1)' }}
    >
      <div className="flex items-center gap-6">
        <div className="flex items-center gap-2">
          <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: 'var(--ok-green)' }} />
          <span className="text-xs" style={{ color: 'var(--text-3)' }}>{routeMeta.context}</span>
        </div>

        <div className="flex items-center gap-2">
          <ShieldCheck size={12} style={{ color: 'var(--text-3)' }} />
          <span className="text-xs" style={{ color: 'var(--text-3)' }}>Módulo:</span>
          <span className="text-xs font-semibold" style={{ color: 'var(--text-2)' }}>
            {routeMeta.title}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <Wallet size={12} style={{ color: 'var(--text-3)' }} />
          <span className="text-xs" style={{ color: 'var(--text-3)' }}>Sessão:</span>
          <span className="text-xs font-mono" style={{ color: isAuthenticated && address ? 'var(--ok-green)' : 'var(--text-3)' }}>
            {isAuthenticated && address ? formatAddress(address) : 'Sem carteira'}
          </span>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <Command size={12} style={{ color: 'var(--text-3)' }} />
        <span className="text-xs" style={{ color: 'var(--text-3)' }}>⌘K para paleta de comandos</span>
      </div>
    </footer>
  );
}
