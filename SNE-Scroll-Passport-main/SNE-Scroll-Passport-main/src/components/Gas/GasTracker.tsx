import { useEffect, useState } from 'react'
import { formatGasPrice } from '../../utils/formatters'
import { createPublicClient, http } from 'viem'
import { scrollSepolia } from 'viem/chains'

export default function GasTracker() {
  const [gasPrice, setGasPrice] = useState<bigint | null>(null)
  const [isLoading, setIsLoading] = useState(false) // Start as false - no auto-fetch

  useEffect(() => {
    // Check cache first
    const cacheKey = 'sne-gas-price-cache'
    const cacheTime = 5 * 60 * 1000 // 5 minutes cache
    
    const cached = localStorage.getItem(cacheKey)
    if (cached) {
      try {
        const { price, timestamp } = JSON.parse(cached)
        if (Date.now() - timestamp < cacheTime) {
          setGasPrice(BigInt(price))
          setIsLoading(false)
          return // Use cached value
        }
      } catch (e) {
        // Invalid cache, continue to fetch
      }
    }

    // Don't auto-fetch - only fetch when user explicitly requests
  }, [])

  // Update document title
  useEffect(() => {
    if (gasPrice) {
      const formatted = formatGasPrice(gasPrice)
      document.title = `Scroll Gas: ${formatted} | SNE Pass`
    } else {
      document.title = `SNE Scroll Pass`
    }
  }, [gasPrice])

  if (isLoading) {
    return (
      <div className="px-3 py-1.5 bg-scroll-dark border border-scroll-dark rounded-lg">
        <span className="text-xs text-gray-500">Loading gas...</span>
      </div>
    )
  }

  if (!gasPrice && !isLoading) {
    return (
      <button
        onClick={() => {
          setIsLoading(true)
          const cacheKey = 'sne-gas-price-cache'
          const cacheTime = 5 * 60 * 1000
          
          const cached = localStorage.getItem(cacheKey)
          if (cached) {
            try {
              const { price, timestamp } = JSON.parse(cached)
              if (Date.now() - timestamp < cacheTime) {
                setGasPrice(BigInt(price))
                setIsLoading(false)
                return
              }
            } catch (e) {}
          }
          
          const rpcUrl = import.meta.env.DEV ? '/api/rpc' : 'https://sepolia-rpc.scroll.io'
          const scrollClient = createPublicClient({
            chain: scrollSepolia,
            transport: http(rpcUrl, { timeout: 5000 }),
          })
          
          scrollClient.getGasPrice()
            .then((price) => {
              localStorage.setItem(cacheKey, JSON.stringify({
                price: price.toString(),
                timestamp: Date.now()
              }))
              setGasPrice(price)
              setIsLoading(false)
            })
            .catch((error) => {
              console.error('Error fetching gas:', error)
              setIsLoading(false)
            })
        }}
        className="px-3 py-1.5 bg-scroll-dark border border-scroll-dark rounded-lg hover:border-sne-neon/30 transition-colors"
        title="Clique para buscar preço do gas"
      >
        <span className="text-xs text-gray-500">Gas: Clique para buscar</span>
      </button>
    )
  }

  if (!gasPrice) return null

  const formatted = formatGasPrice(gasPrice)

  return (
    <div className="flex items-center gap-2 px-3 py-1.5 bg-scroll-dark border border-sne-neon/30 rounded-lg">
      <span className="text-xs text-gray-400">Gas:</span>
      <span className="text-sm font-mono text-sne-neon">{formatted}</span>
    </div>
  )
}

