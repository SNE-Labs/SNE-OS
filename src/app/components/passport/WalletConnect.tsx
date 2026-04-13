import { useDisconnect } from 'wagmi';
import { CheckCircle2, LogOut, Wallet } from 'lucide-react';

import { formatAddress } from '../../../utils/format';
import { useAuth } from '@/lib/auth/AuthProvider';

type WalletConnectProps = {
  showConnectButton?: boolean;
  showDisconnectButton?: boolean;
};

export function WalletConnect({
  showConnectButton = false,
  showDisconnectButton = false,
}: WalletConnectProps) {
  const { address, isConnected, isAuthenticated, connect, logout } = useAuth();
  const { disconnect } = useDisconnect();

  const handleLogout = async () => {
    await logout();
    disconnect();
  };

  if (isAuthenticated && isConnected && address) {
    if (!showDisconnectButton && !showConnectButton) {
      return null;
    }

    return (
      <div className="flex items-center gap-3">
        <div
          className="flex items-center gap-2 px-3 py-2 rounded-lg"
          style={{
            backgroundColor: 'var(--bg-2)',
            borderColor: 'var(--stroke-1)',
            borderWidth: '1px',
          }}
        >
          <div className="relative">
            <Wallet className="w-4 h-4" style={{ color: 'var(--accent-orange)' }} />
            <CheckCircle2 className="w-3 h-3 absolute -top-1 -right-1" style={{ color: 'var(--accent-orange)' }} fill="currentColor" />
          </div>
          <div className="flex flex-col">
            <span
              style={{
                color: 'var(--text-1)',
                fontSize: '0.9rem',
                fontWeight: 600,
                fontFamily: 'var(--font-family-mono)',
              }}
            >
              {formatAddress(address)}
            </span>
            <span style={{ color: 'var(--text-3)', fontSize: '0.75rem' }}>
              Sessão autenticada
            </span>
          </div>
        </div>
        {showDisconnectButton ? (
          <button
            onClick={() => void handleLogout()}
            className="px-3 py-2 rounded-lg text-sm inline-flex items-center gap-2"
            style={{ backgroundColor: 'var(--bg-3)', color: 'var(--text-1)', borderWidth: '1px', borderColor: 'var(--stroke-1)' }}
          >
            <LogOut className="w-4 h-4" />
            Desconectar
          </button>
        ) : null}
      </div>
    );
  }

  if (!showConnectButton) {
    return null;
  }

  return (
    <button
      onClick={() => void connect()}
      className="px-4 py-2 rounded-lg text-sm font-medium inline-flex items-center gap-2"
      style={{ backgroundColor: 'var(--accent-orange)', color: '#FFFFFF' }}
    >
      <Wallet className="w-4 h-4" />
      {isConnected ? 'Autenticar SIWE' : 'Conectar Wallet'}
    </button>
  );
}
