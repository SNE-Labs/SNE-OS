import { useAccount, useBalance } from 'wagmi'
import { formatETH } from '../../utils/formatters'
import { Wallet } from 'lucide-react'

export default function BalanceDisplay() {
  const { address } = useAccount()
  const { data: balance, isLoading, error } = useBalance({
    address: address,
  })

  if (isLoading) {
    return (
      <div className="bg-scroll-dark border border-scroll-dark rounded-lg p-8">
        <div className="animate-pulse">
          <div className="h-8 bg-scroll-darker rounded w-48 mb-4"></div>
          <div className="h-4 bg-scroll-darker rounded w-32"></div>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-scroll-dark border border-sne-neon/30 rounded-lg p-8">
      <div className="flex items-center gap-3 mb-4">
        <div className="p-3 bg-sne-neon/10 rounded-lg">
          <Wallet className="w-6 h-6 text-sne-neon" />
        </div>
        <div>
          <h2 className="text-lg font-semibold text-gray-300">Saldo ETH</h2>
          <p className="text-sm text-gray-500">Scroll Network</p>
        </div>
      </div>

      {error ? (
        <div className="mt-6">
          <div className="text-2xl font-bold font-mono text-yellow-400 mb-2">
            Erro ao buscar saldo
          </div>
          <p className="text-sm text-gray-400">
            Não foi possível conectar ao RPC da Scroll.
          </p>
        </div>
      ) : balance ? (
        <div className="mt-6">
          <div className="text-4xl font-bold font-mono text-sne-neon mb-2">
            {formatETH(balance.value)} ETH
          </div>
          <p className="text-sm text-gray-400">
            {balance.value.toString()} Wei
          </p>
        </div>
      ) : null}
    </div>
  )
}

