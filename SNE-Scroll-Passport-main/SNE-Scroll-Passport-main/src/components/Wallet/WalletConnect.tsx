import { useAccount, useConnect, useDisconnect } from 'wagmi'
import { Wallet, LogOut } from 'lucide-react'
import { formatAddress } from '../../utils/formatters'

export default function WalletConnect() {
  const { address, isConnected } = useAccount()
  const { connect, connectors, isPending } = useConnect()
  const { disconnect } = useDisconnect()

  if (isConnected && address) {
    return (
      <div className="flex items-center gap-3">
        <div className="px-3 py-1.5 bg-scroll-dark border border-sne-neon/30 rounded-lg">
          <span className="text-sm font-mono text-sne-neon">
            {formatAddress(address)}
          </span>
        </div>
        <button
          onClick={() => disconnect()}
          className="p-2 hover:bg-scroll-dark rounded-lg transition-colors"
          title="Disconnect"
        >
          <LogOut className="w-4 h-4 text-gray-400 hover:text-sne-neon" />
        </button>
      </div>
    )
  }

  return (
    <div className="relative">
      <button
        onClick={() => {
          const injected = connectors.find(c => c.id === 'injected')
          if (injected) connect({ connector: injected })
        }}
        disabled={isPending}
        className="flex items-center gap-2 px-4 py-2 bg-sne-neon/10 border border-sne-neon/50 rounded-lg hover:bg-sne-neon/20 transition-colors disabled:opacity-50"
      >
        <Wallet className="w-4 h-4 text-sne-neon" />
        <span className="text-sm font-medium text-sne-neon">
          {isPending ? 'Connecting...' : 'Connect Wallet'}
        </span>
      </button>
    </div>
  )
}

