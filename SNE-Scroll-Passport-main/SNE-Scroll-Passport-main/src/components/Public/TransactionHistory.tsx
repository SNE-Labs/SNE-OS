import { useState } from 'react'
import { createPublicClient, http } from 'viem'
import { scrollSepolia } from 'viem/chains'
import { ExternalLink, ArrowUpRight, ArrowDownLeft, Clock, CheckCircle2, XCircle } from 'lucide-react'
import { formatAddress, formatETH } from '../../utils/formatters'
import { DEFAULT_CHAIN } from '../../utils/scrollConfig'

interface Transaction {
  hash: string
  from: string
  to: string | null
  value: bigint
  timestamp: number | null
  status: 'success' | 'failed' | 'pending'
  blockNumber: bigint | null
}

interface TransactionHistoryProps {
  address: `0x${string}`
}

export default function TransactionHistory({ address }: TransactionHistoryProps) {
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [isLoading, setIsLoading] = useState(false) // Start as false, only load on demand
  const [error, setError] = useState<string | null>(null)
  const [hasSearched, setHasSearched] = useState(false)

  const fetchTransactions = async () => {
    if (hasSearched) return // Don't search again if already searched
    
    setHasSearched(true)
    
    const doFetch = async () => {
      try {
        setIsLoading(true)
        setError(null)

        // Use proxy in development to avoid CORS issues
        const rpcUrl = import.meta.env.DEV 
          ? '/api/rpc' 
          : 'https://sepolia-rpc.scroll.io'
        
        // Create client for Scroll Sepolia with timeout
        const client = createPublicClient({
          chain: scrollSepolia,
          transport: http(rpcUrl, {
            timeout: 10000, // 10 second timeout
          }),
        })

        // Get recent blocks to search
        const currentBlock = await client.getBlockNumber()
        const blocksToSearch = 10000 // Search last 10000 blocks
        const startBlock = currentBlock > BigInt(blocksToSearch) 
          ? currentBlock - BigInt(blocksToSearch) 
          : 0n

        console.log('Searching transactions from block', startBlock.toString(), 'to', currentBlock.toString())

        const txMap = new Map<string, Transaction>()

        // Search blocks sequentially but efficiently
        // Process in smaller batches to avoid rate limiting
        const batchSize = 5 // Very small batches to avoid rate limiting
        let foundCount = 0
        let blocksSearched = 0
        const maxBlocksToSearch = 100 // Very limited to prevent rate limiting
        const delayBetweenBatches = 500 // 500ms delay between batches to avoid rate limit
        
        for (let blockOffset = 0; blockOffset < maxBlocksToSearch; blockOffset += batchSize) {
          const batchPromises: Promise<void>[] = []
          
          // Process batch of blocks
          for (let i = 0; i < batchSize; i++) {
            const blockNum = currentBlock - BigInt(blockOffset + i)
            if (blockNum < startBlock) break

            batchPromises.push(
              client.getBlock({ blockNumber: blockNum, includeTransactions: true })
                .then(async (block) => {
                  blocksSearched++
                  
                  if (!block.transactions || block.transactions.length === 0) return

                  for (const tx of block.transactions) {
                    if (typeof tx === 'object') {
                      const txObj = tx as { from: string; to: string | null; hash: string; value: bigint }
                      const isRelevant = 
                        txObj.from.toLowerCase() === address.toLowerCase() ||
                        (txObj.to && txObj.to.toLowerCase() === address.toLowerCase())

                      if (isRelevant && !txMap.has(txObj.hash)) {
                        foundCount++
                        
                        try {
                          const receipt = await client.getTransactionReceipt({ 
                            hash: txObj.hash as `0x${string}` 
                          }).catch(() => null)
                          
                          txMap.set(txObj.hash, {
                            hash: txObj.hash,
                            from: txObj.from,
                            to: txObj.to,
                            value: txObj.value,
                            timestamp: block.timestamp ? Number(block.timestamp) : null,
                            status: receipt?.status === 'success' ? 'success' as const : receipt?.status === 'reverted' ? 'failed' as const : 'pending' as const,
                            blockNumber: receipt?.blockNumber || block.number,
                          })
                        } catch (err) {
                          // If receipt not found, transaction might be pending
                          txMap.set(txObj.hash, {
                            hash: txObj.hash,
                            from: txObj.from,
                            to: txObj.to,
                            value: txObj.value,
                            timestamp: block.timestamp ? Number(block.timestamp) : null,
                            status: 'pending' as const,
                            blockNumber: block.number,
                          })
                        }
                      }
                    }
                  }
                })
                .catch((err) => {
                  // Skip errors for individual blocks (rate limiting, etc.)
                  if (err.message?.includes('429') || err.message?.includes('rate limit')) {
                    console.warn('Rate limit hit, stopping search')
                    throw new Error('RATE_LIMIT')
                  }
                })
            )
          }

          try {
            await Promise.all(batchPromises)
          } catch (err: any) {
            if (err.message === 'RATE_LIMIT') {
              console.warn('Rate limit detected, stopping search')
              break
            }
          }
          
          // Add delay between batches to avoid rate limiting
          if (blockOffset + batchSize < maxBlocksToSearch && txMap.size < 20) {
            await new Promise(resolve => setTimeout(resolve, delayBetweenBatches))
          }
          
          // Log progress every 50 blocks
          if (blocksSearched % 50 === 0 && blocksSearched > 0) {
            console.log(`Searched ${blocksSearched} blocks, found ${txMap.size} transactions`)
          }
          
          // If we found enough transactions, stop searching
          if (txMap.size >= 20) {
            console.log(`Found ${txMap.size} transactions, stopping search after ${blocksSearched} blocks`)
            break
          }
        }

        console.log(`Search complete: ${blocksSearched} blocks searched, ${txMap.size} transactions found`)

        const validTxs = Array.from(txMap.values())
        
        // Sort by block number (newest first)
        validTxs.sort((a, b) => {
          if (!a.blockNumber || !b.blockNumber) return 0
          return b.blockNumber > a.blockNumber ? 1 : -1
        })

        setTransactions(validTxs.slice(0, 20)) // Limit to 20 most recent
        setIsLoading(false)
      } catch (err: any) {
        console.error('Error fetching transactions:', err)
        if (err.message === 'RATE_LIMIT') {
          setError('Muitas requisições. Por favor, aguarde alguns segundos e tente novamente, ou use o link para ScrollScan abaixo.')
        } else {
          setError('Erro ao buscar transações. Use o link para ScrollScan para ver o histórico completo.')
        }
        setIsLoading(false)
      }
    }

    await doFetch()
  }

  // Don't auto-fetch, only fetch when user clicks button
  // useEffect(() => {
  //   fetchTransactions()
  // }, [address])

  const explorerUrl = (hash: string) => 
    `${DEFAULT_CHAIN.blockExplorers.default.url}/tx/${hash}`

  const isOutgoing = (tx: Transaction) => 
    tx.from.toLowerCase() === address.toLowerCase()

  const formatDate = (timestamp: number | null) => {
    if (!timestamp) return 'N/A'
    return new Date(timestamp * 1000).toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  if (!hasSearched && !isLoading) {
    return (
      <div className="bg-scroll-dark border border-scroll-dark rounded-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">Histórico de Transações</h3>
        </div>
        <p className="text-sm text-gray-400 mb-4">
          Clique no botão abaixo para buscar transações recentes.
        </p>
        <button
          onClick={fetchTransactions}
          disabled={isLoading}
          className="px-4 py-2 bg-sne-neon/10 border border-sne-neon/50 rounded-lg text-sne-neon hover:bg-sne-neon/20 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLoading ? 'Buscando...' : 'Buscar Transações'}
        </button>
        <div className="mt-4">
          <a
            href={`${DEFAULT_CHAIN.blockExplorers.default.url}/address/${address}`}
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

  if (isLoading) {
    return (
      <div className="bg-scroll-dark border border-scroll-dark rounded-lg p-6">
        <h3 className="text-lg font-semibold mb-4">Histórico de Transações</h3>
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="animate-pulse">
              <div className="h-16 bg-scroll-darker rounded"></div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-scroll-dark border border-scroll-dark rounded-lg p-6">
        <h3 className="text-lg font-semibold mb-2">Histórico de Transações</h3>
        <p className="text-sm text-red-400 mb-4">{error}</p>
        <button
          onClick={fetchTransactions}
          className="px-4 py-2 bg-sne-neon/10 border border-sne-neon/50 rounded-lg text-sne-neon hover:bg-sne-neon/20 transition-colors"
        >
          Tentar Novamente
        </button>
      </div>
    )
  }

  if (transactions.length === 0) {
    return (
      <div className="bg-scroll-dark border border-scroll-dark rounded-lg p-6">
        <h3 className="text-lg font-semibold mb-2">Histórico de Transações</h3>
        <p className="text-sm text-gray-400 mb-2">
          Nenhuma transação encontrada nos últimos blocos pesquisados.
        </p>
        <p className="text-xs text-gray-500 mb-4">
          A busca é limitada para evitar rate limiting. Para histórico completo, use o ScrollScan.
        </p>
        <a
          href={`${DEFAULT_CHAIN.blockExplorers.default.url}/address/${address}`}
          target="_blank"
          rel="noopener noreferrer"
          className="text-sm text-sne-neon hover:text-sne-cyan flex items-center gap-2"
        >
          <ExternalLink className="w-4 h-4" />
          Ver histórico completo no ScrollScan
        </a>
      </div>
    )
  }

  return (
    <div className="bg-scroll-dark border border-scroll-dark rounded-lg p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold">Histórico de Transações</h3>
        <span className="text-xs text-gray-400">
          {transactions.length} transação{transactions.length !== 1 ? 'ões' : ''}
        </span>
      </div>

      <div className="space-y-3 max-h-96 overflow-y-auto">
        {transactions.map((tx) => (
          <div
            key={tx.hash}
            className="bg-scroll-darker border border-scroll-dark rounded-lg p-4 hover:border-sne-neon/30 transition-colors"
          >
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-2">
                  {isOutgoing(tx) ? (
                    <ArrowUpRight className="w-4 h-4 text-red-400" />
                  ) : (
                    <ArrowDownLeft className="w-4 h-4 text-sne-neon" />
                  )}
                  <span className="text-sm font-medium">
                    {isOutgoing(tx) ? 'Enviado' : 'Recebido'}
                  </span>
                  {tx.status === 'success' && (
                    <CheckCircle2 className="w-3 h-3 text-sne-neon" />
                  )}
                  {tx.status === 'failed' && (
                    <XCircle className="w-3 h-3 text-red-400" />
                  )}
                  {tx.status === 'pending' && (
                    <Clock className="w-3 h-3 text-yellow-400" />
                  )}
                </div>

                <div className="space-y-1 text-sm">
                  <div className="flex items-center gap-2">
                    <span className="text-gray-400">Para:</span>
                    <span className="font-mono text-gray-300">
                      {tx.to ? formatAddress(tx.to, 4) : 'Contract Creation'}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-gray-400">Valor:</span>
                    <span className="font-mono text-sne-neon">
                      {formatETH(tx.value)} ETH
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-gray-400">Hash:</span>
                    <span className="font-mono text-gray-500 text-xs">
                      {formatAddress(tx.hash, 6)}
                    </span>
                  </div>
                  {tx.timestamp && (
                    <div className="flex items-center gap-2">
                      <span className="text-gray-400">Data:</span>
                      <span className="text-gray-300 text-xs">
                        {formatDate(tx.timestamp)}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              <a
                href={explorerUrl(tx.hash)}
                target="_blank"
                rel="noopener noreferrer"
                className="p-2 hover:bg-scroll-dark rounded-lg transition-colors"
                title="Ver no ScrollScan"
              >
                <ExternalLink className="w-4 h-4 text-gray-400 hover:text-sne-neon" />
              </a>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-4 pt-4 border-t border-scroll-dark">
        <a
          href={`${DEFAULT_CHAIN.blockExplorers.default.url}/address/${address}`}
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

