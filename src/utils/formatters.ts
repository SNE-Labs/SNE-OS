/**
 * Utilitários para formatação de valores específicos do Passport
 */

/**
 * Formata um valor em Wei para ETH com decimais apropriados
 */
export function formatETH(value: bigint | string, decimals: number = 4): string {
  try {
    const val = typeof value === 'string' ? BigInt(value) : value
    const ethValue = Number(val) / Math.pow(10, 18)

    if (ethValue === 0) return '0'

    // Para valores muito pequenos, mostrar mais decimais
    if (ethValue < 0.0001) {
      return ethValue.toFixed(6)
    }

    // Para valores normais, limitar a 4 casas decimais
    return ethValue.toFixed(decimals).replace(/\.?0+$/, '')
  } catch (error) {
    console.error('Error formatting ETH value:', error)
    return '0'
  }
}

/**
 * Formata um valor de gas price
 */
export function formatGasPrice(gwei: number): string {
  if (gwei >= 100) {
    return `${(gwei / 100).toFixed(1)}K`
  }
  return gwei.toFixed(2)
}

/**
 * Formata um timestamp para "X ago"
 */
export function formatTimeAgo(timestamp: number): string {
  const now = Date.now()
  const diff = now - timestamp

  const minutes = Math.floor(diff / (1000 * 60))
  const hours = Math.floor(diff / (1000 * 60 * 60))
  const days = Math.floor(diff / (1000 * 60 * 60 * 24))

  if (days > 0) return `${days}d ago`
  if (hours > 0) return `${hours}h ago`
  if (minutes > 0) return `${minutes}m ago`
  return 'now'
}
