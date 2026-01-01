import { useAccount, useConnect, useDisconnect } from 'wagmi';
import { injected } from 'wagmi/connectors';
import { Button } from '../ui/button';
import { Wallet, LogOut, CheckCircle2 } from 'lucide-react';
import { formatAddress } from '../../../utils/format';

/**
 * Componente de conexão de wallet
 * PoC para Sprint 1 - integração básica com Wagmi
 */
export function WalletConnect() {
  const { address, isConnected } = useAccount();
  const { connect, isPending } = useConnect();
  const { disconnect } = useDisconnect();

  if (isConnected && address) {
    return (
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2 px-3 py-2 rounded border" style={{
          backgroundColor: 'var(--sne-surface-1)',
          borderColor: 'var(--sne-accent)',
          borderWidth: '1px'
        }}>
          <div className="relative">
            <Wallet className="w-4 h-4" style={{ color: 'var(--sne-accent)' }} />
            <CheckCircle2 className="w-3 h-3 absolute -top-1 -right-1" style={{ color: 'var(--sne-accent)' }} fill="currentColor" />
          </div>
          <div className="flex flex-col">
            <span style={{ color: 'var(--sne-text-primary)', fontSize: '0.9rem', fontWeight: 600, fontFamily: 'var(--font-family-mono)' }}>
              {formatAddress(address)}
            </span>
            <span style={{ color: 'var(--sne-text-secondary)', fontSize: '0.75rem' }}>
              Scroll L2
            </span>
          </div>
        </div>
        <Button
          onClick={() => disconnect()}
          variant="outline"
          size="sm"
          className="flex items-center gap-2"
        >
          <LogOut className="w-4 h-4" />
          Desconectar
        </Button>
      </div>
    );
  }

  return (
    <Button
      onClick={() => connect({ connector: injected() })}
      disabled={isPending}
      style={{ backgroundColor: 'var(--sne-accent)', color: '#0B0B0B' }}
      className="flex items-center gap-2"
    >
      <Wallet className="w-4 h-4" />
      {isPending ? 'Conectando...' : 'Conectar Wallet'}
    </Button>
  );
}


