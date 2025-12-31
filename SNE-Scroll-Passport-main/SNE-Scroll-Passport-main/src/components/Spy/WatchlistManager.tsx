import { useState } from 'react'
import { useWatchlist } from '../../hooks/useWatchlist'
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
          <h2 className="text-xl font-semibold">Watchlist</h2>
          <p className="text-sm text-gray-400">
            Monitore múltiplas carteiras simultaneamente
          </p>
        </div>
        <button
          onClick={() => setShowAddForm(!showAddForm)}
          className="flex items-center gap-2 px-4 py-2 bg-sne-neon/10 border border-sne-neon/50 rounded-lg hover:bg-sne-neon/20 transition-colors text-sne-neon"
        >
          <Plus className="w-4 h-4" />
          Adicionar
        </button>
      </div>

      {/* Add Form */}
      {showAddForm && (
        <div className="bg-scroll-dark border border-scroll-dark rounded-lg p-4 space-y-3">
          <div>
            <label className="block text-sm text-gray-400 mb-1">
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
              className="w-full px-3 py-2 bg-scroll-darker border border-scroll-dark rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-sne-neon/50 font-mono text-sm"
            />
          </div>
          <div>
            <label className="block text-sm text-gray-400 mb-1">
              Label (opcional)
            </label>
            <input
              type="text"
              value={newLabel}
              onChange={(e) => setNewLabel(e.target.value)}
              placeholder="Ex: Whale #1, Minha Carteira, etc."
              className="w-full px-3 py-2 bg-scroll-darker border border-scroll-dark rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-sne-neon/50 text-sm"
            />
          </div>
          {error && (
            <div className="flex items-center gap-2 text-red-400 text-sm">
              <AlertCircle className="w-4 h-4" />
              <span>{error}</span>
            </div>
          )}
          <div className="flex gap-2">
            <button
              onClick={handleAdd}
              className="flex-1 px-4 py-2 bg-sne-neon/10 border border-sne-neon/50 rounded-lg text-sne-neon hover:bg-sne-neon/20 transition-colors"
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
              className="px-4 py-2 bg-scroll-darker border border-scroll-dark rounded-lg text-gray-400 hover:text-white transition-colors"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}

      {/* Watchlist Items */}
      {watchlist.length === 0 ? (
        <div className="bg-scroll-dark border border-scroll-dark rounded-lg p-8 text-center">
          <p className="text-gray-400 mb-2">Nenhuma carteira na watchlist</p>
          <p className="text-sm text-gray-500">
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

