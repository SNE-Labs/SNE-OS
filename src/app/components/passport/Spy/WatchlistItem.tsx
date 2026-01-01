import { useState } from 'react'
import { useBalance } from 'wagmi'
import { formatAddress } from '../../../../utils/format'
import { formatETH } from '../../../../utils/formatters'
import { X, ExternalLink } from 'lucide-react'
import type { WatchlistItem as WatchlistItemType } from '../../../../types/wallet.types'

interface WatchlistItemProps {
  item: WatchlistItemType
  onRemove: (address: string) => void
}

export default function WatchlistItem({ item, onRemove }: WatchlistItemProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  const { data: balance, isLoading } = useBalance({
    address: item.address as `0x${string}`,
    enabled: isExpanded,
  })

  return (
    <div
      className="rounded-lg p-4"
      style={{ backgroundColor: 'var(--bg-2)', border: '1px solid var(--stroke-1)' }}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <code
              className="font-mono text-sm"
              style={{ color: 'var(--accent-orange)' }}
            >
              {formatAddress(item.address)}
            </code>
            {item.label && (
              <span
                className="px-2 py-0.5 rounded text-xs"
                style={{ backgroundColor: 'var(--bg-3)', color: 'var(--text-3)' }}
              >
                {item.label}
              </span>
            )}
          </div>
          <div className="text-xs" style={{ color: 'var(--text-3)' }}>
            Adicionado {new Date(item.addedAt).toLocaleDateString()}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="px-3 py-1 rounded text-xs"
            style={{ backgroundColor: 'var(--bg-3)', color: 'var(--text-2)' }}
          >
            {isExpanded ? 'Ocultar' : 'Ver Saldo'}
          </button>

          <a
            href={`https://scrollscan.com/address/${item.address}`}
            target="_blank"
            rel="noopener noreferrer"
            className="p-2 rounded hover:bg-[var(--bg-3)] transition-colors"
            title="Ver no ScrollScan"
          >
            <ExternalLink size={14} style={{ color: 'var(--accent-orange)' }} />
          </a>

          <button
            onClick={() => onRemove(item.address)}
            className="p-2 rounded hover:bg-[var(--bg-3)] transition-colors"
            title="Remover da watchlist"
          >
            <X size={14} style={{ color: 'var(--danger-red)' }} />
          </button>
        </div>
      </div>

      {/* Expanded Content */}
      {isExpanded && (
        <div
          className="pt-3 border-t"
          style={{ borderColor: 'var(--stroke-1)' }}
        >
          {isLoading ? (
            <div className="flex items-center gap-2">
              <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2" style={{ borderColor: 'var(--accent-orange)' }}></div>
              <span className="text-sm" style={{ color: 'var(--text-3)' }}>Carregando saldo...</span>
            </div>
          ) : balance ? (
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-medium" style={{ color: 'var(--text-1)' }}>
                  {formatETH(balance.value)} ETH
                </div>
                <div className="text-xs" style={{ color: 'var(--text-3)' }}>
                  {balance.value.toString()} Wei
                </div>
              </div>
              <div className="text-right">
                <div className="text-xs" style={{ color: 'var(--text-3)' }}>
                  Scroll L2
                </div>
              </div>
            </div>
          ) : (
            <div className="text-sm" style={{ color: 'var(--danger-red)' }}>
              Erro ao carregar saldo
            </div>
          )}
        </div>
      )}
    </div>
  )
}


