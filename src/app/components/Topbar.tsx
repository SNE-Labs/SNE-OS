import { Bell, ChevronDown } from 'lucide-react';
import { useAuth } from '@/lib/auth/AuthProvider';

export function Topbar() {
  const { isConnected, address, connect } = useAuth();

  return (
    <header
      className="h-16 border-b flex items-center justify-between px-6"
      style={{ backgroundColor: 'var(--bg-1)', borderColor: 'var(--stroke-1)' }}
    >
      {/* Logo/Title */}
      <div className="flex items-center gap-2">
        <span className="text-lg font-semibold" style={{ color: 'var(--text-1)' }}>
          SNE OS
        </span>
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
        {!isConnected ? (
          <button
            onClick={connect}
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
            {address ? `${address.slice(0, 6)}...${address.slice(-4)}` : 'Connected'}
          </div>
        )}
      </div>
    </header>
  );
}
