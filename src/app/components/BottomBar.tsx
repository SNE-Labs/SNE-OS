import { Activity, Command } from 'lucide-react';

interface BottomBarProps {
  isWalletConnected: boolean;
  walletAddress: string;
}

export function BottomBar({ isWalletConnected, walletAddress }: BottomBarProps) {
  return (
    <footer
      className="h-12 border-t flex items-center justify-between px-6"
      style={{ backgroundColor: 'var(--bg-1)', borderColor: 'var(--stroke-1)' }}
    >
      <div className="flex items-center gap-6">
        {/* Network Status */}
        <div className="flex items-center gap-2">
          <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: 'var(--ok-green)' }} />
          <span className="text-xs" style={{ color: 'var(--text-3)' }}>Scroll L2</span>
          <span className="text-xs font-mono" style={{ color: 'var(--text-2)' }}>Block 8,234,567</span>
        </div>

        {/* Wallet Status */}
        <div className="flex items-center gap-2">
          <span className="text-xs" style={{ color: 'var(--text-3)' }}>Wallet:</span>
          <span className="text-xs font-mono" style={{ color: isWalletConnected ? 'var(--ok-green)' : 'var(--text-3)' }}>
            {isWalletConnected ? walletAddress : 'Not connected'}
          </span>
        </div>

        {/* Mode Toggle */}
        <div className="flex items-center gap-2">
          <span className="text-xs" style={{ color: 'var(--text-3)' }}>Mode:</span>
          <span className="text-xs font-semibold" style={{ color: 'var(--warn-amber)' }}>
            Preview (read-only)
          </span>
        </div>

        {/* Latency */}
        <div className="flex items-center gap-2">
          <Activity size={12} style={{ color: 'var(--text-3)' }} />
          <span className="text-xs font-mono" style={{ color: 'var(--text-2)' }}>23ms</span>
        </div>
      </div>

      {/* Command Palette Hint */}
      <div className="flex items-center gap-2">
        <Command size={12} style={{ color: 'var(--text-3)' }} />
        <span className="text-xs" style={{ color: 'var(--text-3)' }}>Press ⌘K for command palette</span>
      </div>
    </footer>
  );
}
