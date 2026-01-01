import { useAccount } from 'wagmi'
import BalanceDisplay from '../components/Balance/BalanceDisplay'
import { Wallet } from 'lucide-react'

export default function Home() {
  const { isConnected } = useAccount()

  return (
    <div className="max-w-6xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Dashboard</h1>
        <p className="text-gray-400">
          Painel de controle da sua wallet na Scroll Network
        </p>
      </div>

      {!isConnected ? (
        <div className="bg-scroll-dark border border-scroll-dark rounded-lg p-12 text-center">
          <Wallet className="w-16 h-16 text-gray-600 mx-auto mb-4" />
          <h2 className="text-xl font-semibold mb-2 text-gray-300">
            Conecte sua wallet para começar
          </h2>
          <p className="text-gray-500">
            Use o botão "Connect Wallet" no canto superior direito
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          <BalanceDisplay />
        </div>
      )}
    </div>
  )
}

