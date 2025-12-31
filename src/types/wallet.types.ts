export interface TokenBalance {
  address: string
  symbol: string
  name: string
  decimals: number
  balance: bigint
  valueUSD?: number
}

export interface WatchlistItem {
  address: string
  label?: string
  addedAt: number
}

export interface ContractInfo {
  address: string
  name?: string
  verified: boolean
  risk: 'low' | 'medium' | 'high'
  type?: string
}

export type Mode = 'view' | 'trade'
