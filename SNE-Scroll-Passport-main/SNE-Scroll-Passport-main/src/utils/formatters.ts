import { formatUnits } from 'viem'

/**
 * Format ETH value from Wei
 */
export function formatETH(value: bigint, decimals: number = 18): string {
  if (!value || value === 0n) {
    console.log('formatETH: value is 0 or null')
    return '0'
  }
  
  try {
    const formatted = formatUnits(value, decimals)
    const num = parseFloat(formatted)
    
    console.log('formatETH:', {
      valueWei: value.toString(),
      formatted,
      num,
      isNaN: isNaN(num),
    })
    
    if (num === 0 || isNaN(num)) {
      console.warn('formatETH: num is 0 or NaN', { value: value.toString(), formatted, num })
      return '0'
    }
    
    // For very small values, show more precision
    if (num < 0.000001) {
      // Show up to 18 decimal places for very small amounts
      const result = num.toFixed(18).replace(/\.?0+$/, '')
      return result || '0'
    }
    if (num < 0.0001) {
      return num.toFixed(6).replace(/\.?0+$/, '')
    }
    if (num < 0.01) {
      return num.toFixed(4).replace(/\.?0+$/, '')
    }
    if (num < 1) {
      return num.toFixed(4).replace(/\.?0+$/, '')
    }
    if (num < 1000) {
      return num.toFixed(2).replace(/\.?0+$/, '')
    }
    
    return num.toLocaleString('en-US', {
      maximumFractionDigits: 2,
      minimumFractionDigits: 2,
    })
  } catch (error) {
    console.error('Error formatting ETH:', error, value.toString())
    return '0'
  }
}

/**
 * Format address (0x1234...5678)
 */
export function formatAddress(address: string, chars: number = 4): string {
  if (!address) return ''
  return `${address.slice(0, chars + 2)}...${address.slice(-chars)}`
}

/**
 * Format gas price
 */
export function formatGasPrice(gasPrice: bigint): string {
  const gwei = formatUnits(gasPrice, 9)
  const num = parseFloat(gwei)
  
  // Scroll has very low gas, so show more precision
  if (num < 0.01) {
    return `${num.toFixed(4)} gwei`
  }
  if (num < 1) {
    return `${num.toFixed(3)} gwei`
  }
  return `${num.toFixed(2)} gwei`
}

/**
 * Format USD value
 */
export function formatUSD(value: number): string {
  if (value < 0.01) return '< $0.01'
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value)
}

