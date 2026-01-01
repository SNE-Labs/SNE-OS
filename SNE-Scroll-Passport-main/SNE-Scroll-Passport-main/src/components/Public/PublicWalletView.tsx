import { useEffect, useState } from 'react'
import { formatETH } from '../../utils/formatters'
import { Wallet, ExternalLink, Copy, Check } from 'lucide-react'
import { DEFAULT_CHAIN } from '../../utils/scrollConfig'
import { createPublicClient, http } from 'viem'
import { scrollSepolia } from 'viem/chains'

interface PublicWalletViewProps {
  address: `0x${string}`
}

export default function PublicWalletView({ address }: PublicWalletViewProps) {
  const [balance, setBalance] = useState<bigint | null>(null)
  const [isLoading, setIsLoading] = useState(false) // Start as false - no auto-fetch
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  const cacheKey = `sne-balance-cache-${address.toLowerCase()}`
  const cacheTime = 5 * 60 * 1000 // 5 minutes cache

  // Check cache on mount - don't auto-fetch
  useEffect(() => {
    const cached = localStorage.getItem(cacheKey)
    if (cached) {
      try {
        const { balance, timestamp } = JSON.parse(cached)
        if (Date.now() - timestamp < cacheTime) {
          setBalance(BigInt(balance))
        }
      } catch (e) {
        // Invalid cache
      }
    }
  }, [address, cacheKey, cacheTime])

  const loadBalance = async () => {
    setIsLoading(true)
    setError(null)
    const cached = localStorage.getItem(cacheKey)

    try {
      const rpcUrl = import.meta.env.DEV 
        ? '/api/rpc' 
        : 'https://sepolia-rpc.scroll.io'

      const client = createPublicClient({
        chain: scrollSepolia,
        transport: http(rpcUrl, { timeout: 10000 }),
      })

      const bal = await client.getBalance({ 
        address: address as `0x${string}`,
      })

      // Cache the result
      localStorage.setItem(cacheKey, JSON.stringify({
        balance: bal.toString(),
        timestamp: Date.now()
      }))

      setBalance(bal)
      setIsLoading(false)
    } catch (err: any) {
      console.error('[PublicWalletView] Error:', err)
      
      // On rate limit, try to use cache even if expired
      if (err.status === 429 || err.message?.includes('429')) {
        if (cached) {
          try {
            const { balance } = JSON.parse(cached)
            setBalance(BigInt(balance))
            setIsLoading(false)
            setError(null)
            console.log('[PublicWalletView] Using cached balance due to rate limit')
            return
          } catch (e) {
            // Cache invalid
          }
        }
        setError('RPC temporariamente indisponível (rate limit). Tente novamente em alguns minutos.')
      } else {
        setError(err.message || 'Erro ao buscar saldo')
      }
      setBalance(null)
      setIsLoading(false)
    }
  }

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(address)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error('Error copying:', err)
    }
  }

  const explorerUrl = `${DEFAULT_CHAIN.blockExplorers.default.url}/address/${address}`

  return (
    <div className="max-w-6xl mx-auto">
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-3xl font-bold">Public Wallet View</h1>
          <a
            href={explorerUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 px-4 py-2 bg-scroll-dark border border-scroll-dark rounded-lg hover:border-sne-neon/50 transition-colors text-sm"
          >
            <ExternalLink className="w-4 h-4 text-gray-400" />
            <span className="text-gray-400">Ver no ScrollScan</span>
          </a>
        </div>

        <div className="bg-scroll-dark border border-scroll-dark rounded-lg p-4 mb-6">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-sne-neon/10 rounded-lg">
              <Wallet className="w-5 h-5 text-sne-neon" />
            </div>
            <div className="flex-1">
              <p className="text-xs text-gray-500 mb-1">Endereço</p>
              <p className="font-mono text-sm text-white">{address}</p>
            </div>
            <button
              onClick={handleCopy}
              className="p-2 hover:bg-scroll-darker rounded-lg transition-colors"
              title="Copiar endereço"
            >
              {copied ? (
                <Check className="w-4 h-4 text-sne-neon" />
              ) : (
                <Copy className="w-4 h-4 text-gray-400 hover:text-sne-neon" />
              )}
            </button>
          </div>
        </div>
      </div>

      <div className="bg-scroll-dark border border-sne-neon/30 rounded-lg p-8 mb-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-3 bg-sne-neon/10 rounded-lg">
            <Wallet className="w-6 h-6 text-sne-neon" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-gray-300">Saldo ETH</h2>
            <p className="text-sm text-gray-500">Scroll Network</p>
          </div>
        </div>

        {isLoading ? (
          <div className="animate-pulse mt-6">
            <div className="h-12 bg-scroll-darker rounded w-48 mb-2"></div>
            <div className="h-4 bg-scroll-darker rounded w-32"></div>
          </div>
        ) : error ? (
          <div className="mt-6">
            <div className="text-2xl font-bold font-mono text-yellow-400 mb-2">
              Erro
            </div>
            <p className="text-sm text-gray-400 mb-4">{error}</p>
            <button
              onClick={loadBalance}
              className="px-4 py-2 bg-sne-neon/10 border border-sne-neon/50 rounded-lg text-sne-neon hover:bg-sne-neon/20 transition-colors"
            >
              Tentar Novamente
            </button>
          </div>
        ) : balance !== null ? (
          <div className="mt-6">
            <div className="text-4xl font-bold font-mono text-sne-neon mb-2">
              {formatETH(balance)} ETH
            </div>
            <p className="text-sm text-gray-400">
              {balance.toString()} Wei
            </p>
            <button
              onClick={loadBalance}
              className="mt-4 px-4 py-2 bg-scroll-darker border border-scroll-dark rounded-lg text-gray-400 hover:text-sne-neon transition-colors text-sm"
            >
              Atualizar
            </button>
          </div>
        ) : (
          <div className="mt-6">
            <p className="text-sm text-gray-400 mb-4">
              Clique no botão abaixo para buscar o saldo
            </p>
            <button
              onClick={loadBalance}
              className="px-4 py-2 bg-sne-neon/10 border border-sne-neon/50 rounded-lg text-sne-neon hover:bg-sne-neon/20 transition-colors"
            >
              Buscar Saldo
            </button>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        <div className="bg-scroll-dark border border-scroll-dark rounded-lg p-6">
          <h3 className="text-lg font-semibold mb-2">Tokens ERC-20</h3>
          <p className="text-sm text-gray-400 mb-4">
            Lista de tokens detidos por este endereço
          </p>
          <div className="text-xs text-gray-500 bg-scroll-darker rounded p-3">
            Em desenvolvimento...
          </div>
        </div>
      </div>

      <div className="bg-scroll-dark border border-scroll-dark rounded-lg p-6">
        <h3 className="text-lg font-semibold mb-2">Histórico de Transações</h3>
        <p className="text-sm text-gray-400 mb-4">
          Últimas transações deste endereço
        </p>
        <div className="text-xs text-gray-500 bg-scroll-darker rounded p-3 mb-4">
          Em desenvolvimento...
        </div>
        <a
          href={explorerUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="text-sm text-sne-neon hover:text-sne-cyan flex items-center gap-2"
        >
          <ExternalLink className="w-4 h-4" />
          Ver histórico completo no ScrollScan
        </a>
      </div>
    </div>
  )
}
