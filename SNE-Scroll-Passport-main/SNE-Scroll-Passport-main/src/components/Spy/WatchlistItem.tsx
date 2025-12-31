import { useState, useEffect, useCallback } from 'react'
import type { WatchlistItem as WatchlistItemType } from '../../types/wallet.types'
import { formatETH, formatAddress } from '../../utils/formatters'
import { X, ExternalLink, Edit2, Check } from 'lucide-react'
import { Link } from 'react-router-dom'
import { DEFAULT_CHAIN } from '../../utils/scrollConfig'
import { useWatchlist } from '../../hooks/useWatchlist'
import { createPublicClient, http } from 'viem'
import { scrollSepolia } from 'viem/chains'

interface WatchlistItemProps {
  item: WatchlistItemType
  onRemove: () => void
}

export default function WatchlistItem({ item, onRemove }: WatchlistItemProps) {
  const { update } = useWatchlist()
  const [balance, setBalance] = useState<bigint | null>(null)
  const [isLoading, setIsLoading] = useState(false) // Start as false - no auto-fetch
  const [isEditing, setIsEditing] = useState(false)
  const [editLabel, setEditLabel] = useState(item.label || '')

  const cacheKey = `sne-balance-cache-${item.address.toLowerCase()}`
  const cacheTime = 5 * 60 * 1000 // 5 minutes cache

  // Check cache on mount - don't auto-fetch
  useEffect(() => {
    if (!item.address) {
      setIsLoading(false)
      return
    }

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
  }, [item.address, cacheKey, cacheTime])

  const fetchBalance = useCallback(async () => {
    if (!item.address) return

    setIsLoading(true)
    const cached = localStorage.getItem(cacheKey)

    try {
      const rpcUrl = import.meta.env.DEV 
        ? '/api/rpc' 
        : 'https://sepolia-rpc.scroll.io'
      
      const scrollClient = createPublicClient({
        chain: scrollSepolia,
        transport: http(rpcUrl, {
          timeout: 10000,
        }),
      })
      
      const bal = await scrollClient.getBalance({
        address: item.address as `0x${string}`,
      })
      
      // Cache the result
      localStorage.setItem(cacheKey, JSON.stringify({
        balance: bal.toString(),
        timestamp: Date.now()
      }))
      
      setBalance(bal)
      setIsLoading(false)
    } catch (error: any) {
      console.error('[WatchlistItem] Error fetching balance:', error)
      
      // On rate limit, try to use cache even if expired
      if (error.status === 429 || error.message?.includes('429')) {
        if (cached) {
          try {
            const { balance } = JSON.parse(cached)
            setBalance(BigInt(balance))
            setIsLoading(false)
            console.log('[WatchlistItem] Using cached balance due to rate limit')
            return
          } catch (e) {
            // Cache invalid
          }
        }
        console.warn('[WatchlistItem] Rate limited - no cache available')
      }
      
      setBalance(null)
      setIsLoading(false)
    }
  }, [item.address, cacheKey])

  const explorerUrl = `${DEFAULT_CHAIN.blockExplorers.default.url}/address/${item.address}`

  return (
    <div className="bg-scroll-dark border border-scroll-dark rounded-lg p-4 hover:border-sne-neon/30 transition-colors group">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          {/* Label */}
          <div className="flex items-center gap-2 mb-2">
            {isEditing ? (
              <div className="flex items-center gap-2 flex-1">
                <input
                  type="text"
                  value={editLabel}
                  onChange={(e) => setEditLabel(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      update(item.address, { label: editLabel || undefined })
                      setIsEditing(false)
                    }
                    if (e.key === 'Escape') {
                      setIsEditing(false)
                      setEditLabel(item.label || '')
                    }
                  }}
                  className="flex-1 px-2 py-1 bg-scroll-darker border border-sne-neon/50 rounded text-white text-sm focus:outline-none"
                  autoFocus
                />
                <button
                  onClick={() => {
                    update(item.address, { label: editLabel || undefined })
                    setIsEditing(false)
                  }}
                  className="p-1 hover:bg-scroll-darker rounded"
                >
                  <Check className="w-4 h-4 text-sne-neon" />
                </button>
              </div>
            ) : (
              <>
                {item.label ? (
                  <h3 className="font-semibold text-white">{item.label}</h3>
                ) : (
                  <h3 className="font-semibold text-gray-400">Sem label</h3>
                )}
                <button
                  onClick={() => setIsEditing(true)}
                  className="p-1 hover:bg-scroll-darker rounded opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <Edit2 className="w-3 h-3 text-gray-400 hover:text-sne-neon" />
                </button>
              </>
            )}
          </div>

          {/* Address */}
          <div className="flex items-center gap-2 mb-3">
            <p className="font-mono text-sm text-gray-400">
              {formatAddress(item.address, 6)}
            </p>
            <Link
              to={`/public/${item.address}`}
              className="text-sne-neon hover:text-sne-cyan text-sm"
            >
              Ver detalhes
            </Link>
          </div>

          {/* Balance */}
          {isLoading ? (
            <div className="animate-pulse">
              <div className="h-4 bg-scroll-darker rounded w-24"></div>
            </div>
          ) : balance === null ? (
            <div className="space-y-2">
              <p className="text-sm font-mono text-gray-500">
                Não carregado
              </p>
              <button
                onClick={fetchBalance}
                className="text-xs px-2 py-1 bg-sne-neon/10 border border-sne-neon/50 rounded text-sne-neon hover:bg-sne-neon/20 transition-colors"
              >
                Carregar Saldo
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              <p className="text-lg font-mono text-sne-neon">
                {formatETH(balance)} ETH
              </p>
              <button
                onClick={fetchBalance}
                className="text-xs px-2 py-1 bg-scroll-darker border border-scroll-dark rounded text-gray-400 hover:text-sne-neon transition-colors"
              >
                Atualizar
              </button>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          <a
            href={explorerUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="p-2 hover:bg-scroll-darker rounded-lg transition-colors"
            title="Ver no ScrollScan"
          >
            <ExternalLink className="w-4 h-4 text-gray-400 hover:text-sne-neon" />
          </a>
          <button
            onClick={onRemove}
            className="p-2 hover:bg-red-500/10 rounded-lg transition-colors"
            title="Remover da watchlist"
          >
            <X className="w-4 h-4 text-gray-400 hover:text-red-400" />
          </button>
        </div>
      </div>
    </div>
  )
}
