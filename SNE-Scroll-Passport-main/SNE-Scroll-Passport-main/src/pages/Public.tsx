import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { isAddress } from 'viem'
import { Search, Wallet, AlertCircle } from 'lucide-react'
import PublicWalletView from '../components/Public/PublicWalletView'

export default function Public() {
  const navigate = useNavigate()
  const { address: urlAddress } = useParams()
  const [searchAddress, setSearchAddress] = useState(urlAddress || '')
  const [error, setError] = useState<string | null>(null)
  const [isSearching, setIsSearching] = useState(false)

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!searchAddress.trim()) {
      setError('Por favor, insira um endereço')
      return
    }

    // Validate address
    if (!isAddress(searchAddress.trim())) {
      setError('Endereço inválido. Use um endereço Ethereum válido (0x...)')
      return
    }

    setIsSearching(true)

    // If address is valid, navigate directly
    // The PublicWalletView component will handle fetching the balance
    if (isAddress(searchAddress.trim())) {
      navigate(`/public/${searchAddress.trim()}`)
      setIsSearching(false)
    } else {
      setError('Endereço inválido')
      setIsSearching(false)
    }
  }

  // If address in URL, show the view
  if (urlAddress && isAddress(urlAddress)) {
    return <PublicWalletView address={urlAddress as `0x${string}`} />
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Public View</h1>
        <p className="text-gray-400">
          Visualize qualquer endereço na Scroll Network sem conectar sua wallet
        </p>
      </div>

      {/* Search Form */}
      <div className="bg-scroll-dark border border-scroll-dark rounded-lg p-6 mb-6">
        <form onSubmit={handleSearch} className="space-y-4">
          <div className="flex gap-3">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                value={searchAddress}
                onChange={(e) => {
                  setSearchAddress(e.target.value)
                  setError(null)
                }}
                placeholder="0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb"
                className="w-full pl-10 pr-4 py-3 bg-scroll-darker border border-scroll-dark rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-sne-neon/50 font-mono text-sm"
              />
            </div>
            <button
              type="submit"
              disabled={isSearching}
              className="px-6 py-3 bg-sne-neon/10 border border-sne-neon/50 rounded-lg text-sne-neon hover:bg-sne-neon/20 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              <Search className="w-4 h-4" />
              {isSearching ? 'Buscando...' : 'Buscar'}
            </button>
          </div>

          {error && (
            <div className="flex items-center gap-2 text-red-400 text-sm">
              <AlertCircle className="w-4 h-4" />
              <span>{error}</span>
            </div>
          )}
        </form>
      </div>

      {/* Info Card */}
      <div className="bg-scroll-dark border border-scroll-dark rounded-lg p-6">
        <div className="flex items-start gap-4">
          <div className="p-3 bg-sne-neon/10 rounded-lg">
            <Wallet className="w-6 h-6 text-sne-neon" />
          </div>
          <div>
            <h3 className="text-lg font-semibold mb-2">Como usar</h3>
            <ul className="space-y-2 text-sm text-gray-400">
              <li>• Cole qualquer endereço Ethereum válido (0x...)</li>
              <li>• Visualize saldo, tokens e histórico de transações</li>
              <li>• Não é necessário conectar sua wallet</li>
              <li>• Funciona com qualquer endereço na Scroll Network</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}
