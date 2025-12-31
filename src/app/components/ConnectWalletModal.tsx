import { X, Wallet } from 'lucide-react';

interface ConnectWalletModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConnect: () => void;
}

export function ConnectWalletModal({ isOpen, onClose, onConnect }: ConnectWalletModalProps) {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ backgroundColor: 'rgba(7, 9, 11, 0.8)' }}
      onClick={onClose}
    >
      <div
        className="rounded-xl p-6 w-[440px] relative"
        style={{
          backgroundColor: 'var(--bg-2)',
          borderWidth: '1px',
          borderColor: 'var(--stroke-2)',
          boxShadow: 'var(--shadow-2)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-lg hover:bg-[var(--bg-3)] transition-colors"
        >
          <X size={18} style={{ color: 'var(--text-3)' }} />
        </button>

        {/* Header */}
        <div className="mb-6">
          <h2 className="text-xl font-semibold mb-2" style={{ color: 'var(--text-1)' }}>
            Connect Wallet
          </h2>
          <p className="text-sm" style={{ color: 'var(--text-3)' }}>
            Connect your wallet to access SNE OS Pro features
          </p>
        </div>

        {/* Wallet Options */}
        <div className="space-y-3">
          <button
            onClick={onConnect}
            className="w-full flex items-center justify-between p-4 rounded-lg border transition-all hover:border-[var(--accent-orange)]"
            style={{
              backgroundColor: 'var(--bg-3)',
              borderColor: 'var(--stroke-1)',
            }}
          >
            <div className="flex items-center gap-3">
              <div
                className="w-10 h-10 rounded-lg flex items-center justify-center"
                style={{ backgroundColor: 'var(--stroke-2)' }}
              >
                <Wallet size={20} style={{ color: 'var(--text-1)' }} />
              </div>
              <span className="font-medium" style={{ color: 'var(--text-1)' }}>
                MetaMask
              </span>
            </div>
            <span className="text-xs" style={{ color: 'var(--text-3)' }}>
              Popular
            </span>
          </button>

          <button
            onClick={onConnect}
            className="w-full flex items-center justify-between p-4 rounded-lg border transition-all hover:border-[var(--accent-orange)]"
            style={{
              backgroundColor: 'var(--bg-3)',
              borderColor: 'var(--stroke-1)',
            }}
          >
            <div className="flex items-center gap-3">
              <div
                className="w-10 h-10 rounded-lg flex items-center justify-center"
                style={{ backgroundColor: 'var(--stroke-2)' }}
              >
                <Wallet size={20} style={{ color: 'var(--text-1)' }} />
              </div>
              <span className="font-medium" style={{ color: 'var(--text-1)' }}>
                WalletConnect
              </span>
            </div>
          </button>
        </div>

        {/* Footer Note */}
        <div className="mt-6 pt-6 border-t" style={{ borderColor: 'var(--stroke-1)' }}>
          <p className="text-xs text-center" style={{ color: 'var(--text-3)' }}>
            By connecting, you agree to SNE OS Terms of Service
          </p>
        </div>
      </div>
    </div>
  );
}
