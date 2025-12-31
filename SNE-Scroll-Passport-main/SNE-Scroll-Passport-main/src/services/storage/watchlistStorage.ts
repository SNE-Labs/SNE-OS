import type { WatchlistItem } from '../../types/wallet.types'

const WATCHLIST_KEY = 'sne-scroll-watchlist'

export function getWatchlist(): WatchlistItem[] {
  try {
    if (typeof window === 'undefined' || !window.localStorage) {
      return []
    }
    const stored = localStorage.getItem(WATCHLIST_KEY)
    if (!stored) return []
    const parsed = JSON.parse(stored)
    // Validate structure
    if (!Array.isArray(parsed)) return []
    return parsed.filter(item => 
      item && 
      typeof item.address === 'string' &&
      typeof item.addedAt === 'number'
    )
  } catch (error) {
    console.error('Error reading watchlist:', error)
    return []
  }
}

export function saveWatchlist(items: WatchlistItem[]): void {
  try {
    localStorage.setItem(WATCHLIST_KEY, JSON.stringify(items))
  } catch (error) {
    console.error('Error saving watchlist:', error)
  }
}

export function addToWatchlist(address: string, label?: string): boolean {
  const watchlist = getWatchlist()
  
  // Check if already exists
  if (watchlist.some(item => item.address.toLowerCase() === address.toLowerCase())) {
    return false
  }

  const newItem: WatchlistItem = {
    address,
    label,
    addedAt: Date.now(),
  }

  watchlist.push(newItem)
  saveWatchlist(watchlist)
  return true
}

export function removeFromWatchlist(address: string): void {
  const watchlist = getWatchlist()
  const filtered = watchlist.filter(
    item => item.address.toLowerCase() !== address.toLowerCase()
  )
  saveWatchlist(filtered)
}

export function updateWatchlistItem(address: string, updates: Partial<WatchlistItem>): void {
  const watchlist = getWatchlist()
  const updated = watchlist.map(item => {
    if (item.address.toLowerCase() === address.toLowerCase()) {
      return { ...item, ...updates }
    }
    return item
  })
  saveWatchlist(updated)
}

