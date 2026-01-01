import { useAccount, useBalance } from 'wagmi'
import { formatETH } from '../../../../utils/formatters'
import { Wallet } from 'lucide-react'

export default function BalanceDisplay() {
  const { address } = useAccount()
  const { data: balance, isLoading, error } = useBalance({
    address: address,
  })

  if (isLoading) {
    return (
      <div
        className="rounded-xl p-8"
        style={{ backgroundColor: 'var(--bg-2)', border: '1px solid var(--stroke-1)' }}
      >
        <div className="animate-pulse">
          <div className="h-8 rounded w-48 mb-4" style={{ backgroundColor: 'var(--bg-3)' }}></div>
          <div className="h-4 rounded w-32" style={{ backgroundColor: 'var(--bg-3)' }}></div>
        </div>
      </div>
    )
  }

  return (
    <div
      className="rounded-xl p-8"
      style={{ backgroundColor: 'var(--bg-2)', border: '1px solid var(--accent-orange)', borderOpacity: 0.3 }}
    >
      <div className="flex items-center gap-3 mb-4">
        <div
          className="p-3 rounded-lg"
          style={{ backgroundColor: 'var(--accent-orange)', opacity: 0.1 }}
        >
          <Wallet size={24} style={{ color: 'var(--accent-orange)' }} />
        </div>
        <div>
          <h2 className="text-lg font-semibold" style={{ color: 'var(--text-1)' }}>Saldo ETH</h2>
          <p className="text-sm" style={{ color: 'var(--text-3)' }}>Scroll Network</p>
        </div>
      </div>

      {error ? (
        <div className="mt-6">
          <div className="text-2xl font-bold font-mono mb-2" style={{ color: 'var(--warn-amber)' }}>
            Erro ao buscar saldo
          </div>
          <p className="text-sm" style={{ color: 'var(--text-3)' }}>
            Não foi possível conectar ao RPC da Scroll.
          </p>
        </div>
      ) : balance ? (
        <div className="mt-6">
          <div className="text-4xl font-bold font-mono mb-2" style={{ color: 'var(--accent-orange)' }}>
            {formatETH(balance.value)} ETH
          </div>
          <p className="text-sm" style={{ color: 'var(--text-3)' }}>
            {balance.value.toString()} Wei
          </p>
        </div>
      ) : null}
    </div>
  )
}


