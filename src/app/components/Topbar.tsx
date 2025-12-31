import { Bell, ChevronDown } from 'lucide-react';

interface TopbarProps {
  isWalletConnected: boolean;
  walletAddress: string;
  onConnectWallet: () => void;
  currentApp: string;
  onAppChange: (app: string) => void;
}

export function Topbar({ isWalletConnected, walletAddress, onConnectWallet, currentApp, onAppChange }: TopbarProps) {
  const apps = ['Radar', 'Pass', 'Vault'];

  return (
    <header
      className="h-16 border-b flex items-center justify-between px-6"
      style={{ backgroundColor: 'var(--bg-1)', borderColor: 'var(--stroke-1)' }}
    >
      {/* App Switcher */}
      <div className="flex items-center gap-2">
        <button
          className="flex items-center gap-2 px-3 py-2 rounded-lg"
          style={{ backgroundColor: 'var(--bg-2)', borderWidth: '1px', borderColor: 'var(--stroke-1)' }}
        >
          <span className="text-sm font-medium" style={{ color: 'var(--text-1)' }}>
            {currentApp}
          </span>
          <ChevronDown size={16} style={{ color: 'var(--text-3)' }} />
        </button>
      </div>

      {/* Right Actions */}
      <div className="flex items-center gap-3">
        {/* Tier Badge */}
        <div
          className="px-3 py-1.5 rounded-lg text-xs font-semibold"
          style={{ backgroundColor: 'var(--stroke-2)', color: 'var(--text-2)' }}
        >
          FREE TIER
        </div>

        {/* Network Indicator */}
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full" style={{ backgroundColor: 'var(--ok-green)' }} />
          <span className="text-xs" style={{ color: 'var(--text-3)' }}>Scroll L2</span>
        </div>

        {/* Notifications */}
        <button
          className="p-2 rounded-lg hover:bg-[var(--bg-2)] transition-colors"
        >
          <Bell size={18} style={{ color: 'var(--text-2)' }} />
        </button>

        {/* Connect Wallet Button */}
        {!isWalletConnected ? (
          <button
            onClick={onConnectWallet}
            className="px-4 py-2 rounded-lg font-medium text-sm transition-all"
            style={{
              backgroundColor: 'var(--accent-orange)',
              color: '#FFFFFF',
            }}
          >
            Connect Wallet
          </button>
        ) : (
          <div
            className="px-4 py-2 rounded-lg font-mono text-sm"
            style={{ backgroundColor: 'var(--bg-2)', color: 'var(--text-1)', borderWidth: '1px', borderColor: 'var(--stroke-1)' }}
          >
            {walletAddress}
          </div>
        )}
      </div>
    </header>
  );
}
