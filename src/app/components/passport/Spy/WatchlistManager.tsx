import { useState } from 'react'
import { useWatchlist } from '../../../../hooks/useWatchlist'
import { isAddress } from 'viem'
import { Plus, AlertCircle } from 'lucide-react'
import WatchlistItem from './WatchlistItem'

export default function WatchlistManager() {
  const { watchlist, add, remove } = useWatchlist()
  const [showAddForm, setShowAddForm] = useState(false)
  const [newAddress, setNewAddress] = useState('')
  const [newLabel, setNewLabel] = useState('')
  const [error, setError] = useState<string | null>(null)

  const handleAdd = () => {
    setError(null)

    if (!newAddress.trim()) {
      setError('Por favor, insira um endereço')
      return
    }

    if (!isAddress(newAddress.trim())) {
      setError('Endereço inválido. Use um endereço Ethereum válido (0x...)')
      return
    }

    const success = add(newAddress.trim(), newLabel.trim() || undefined)

    if (success) {
      setNewAddress('')
      setNewLabel('')
      setShowAddForm(false)
    } else {
      setError('Este endereço já está na watchlist')
    }
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold" style={{ color: 'var(--text-1)' }}>Watchlist</h2>
          <p className="text-sm" style={{ color: 'var(--text-3)' }}>
            Monitore múltiplas carteiras simultaneamente
          </p>
        </div>
        <button
          onClick={() => setShowAddForm(!showAddForm)}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors"
          style={{ backgroundColor: 'var(--accent-orange)', color: '#FFFFFF' }}
        >
          <Plus size={16} />
          Adicionar
        </button>
      </div>

      {/* Add Form */}
      {showAddForm && (
        <div
          className="rounded-lg p-4 space-y-3"
          style={{ backgroundColor: 'var(--bg-2)', border: '1px solid var(--stroke-1)' }}
        >
          <div>
            <label className="block text-sm mb-1" style={{ color: 'var(--text-2)' }}>
              Endereço *
            </label>
            <input
              type="text"
              value={newAddress}
              onChange={(e) => {
                setNewAddress(e.target.value)
                setError(null)
              }}
              placeholder="0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb"
              className="w-full px-3 py-2 rounded font-mono text-sm"
              style={{
                backgroundColor: 'var(--bg-3)',
                border: '1px solid var(--stroke-1)',
                color: 'var(--text-1)',
              }}
            />
          </div>
          <div>
            <label className="block text-sm mb-1" style={{ color: 'var(--text-2)' }}>
              Label (opcional)
            </label>
            <input
              type="text"
              value={newLabel}
              onChange={(e) => setNewLabel(e.target.value)}
              placeholder="Ex: Whale #1, Minha Carteira, etc."
              className="w-full px-3 py-2 rounded text-sm"
              style={{
                backgroundColor: 'var(--bg-3)',
                border: '1px solid var(--stroke-1)',
                color: 'var(--text-1)',
              }}
            />
          </div>
          {error && (
            <div className="flex items-center gap-2 text-sm" style={{ color: 'var(--danger-red)' }}>
              <AlertCircle size={16} />
              <span>{error}</span>
            </div>
          )}
          <div className="flex gap-2">
            <button
              onClick={handleAdd}
              className="flex-1 px-4 py-2 rounded text-sm font-medium"
              style={{ backgroundColor: 'var(--accent-orange)', color: '#FFFFFF' }}
            >
              Adicionar
            </button>
            <button
              onClick={() => {
                setShowAddForm(false)
                setNewAddress('')
                setNewLabel('')
                setError(null)
              }}
              className="px-4 py-2 rounded text-sm"
              style={{ backgroundColor: 'var(--bg-3)', color: 'var(--text-2)' }}
            >
              Cancelar
            </button>
          </div>
        </div>
      )}

      {/* Watchlist Items */}
      {watchlist.length === 0 ? (
        <div
          className="rounded-lg p-8 text-center"
          style={{ backgroundColor: 'var(--bg-2)', border: '1px solid var(--stroke-1)' }}
        >
          <p className="mb-2" style={{ color: 'var(--text-3)' }}>Nenhuma carteira na watchlist</p>
          <p className="text-sm" style={{ color: 'var(--text-3)' }}>
            Adicione carteiras para monitorar seus saldos e movimentações
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {watchlist.map((item) => (
            <WatchlistItem
              key={item.address}
              item={item}
              onRemove={() => remove(item.address)}
            />
          ))}
        </div>
      )}
    </div>
  )
}


