import type { WatchlistItem } from '../../types/wallet.types'

const STORAGE_KEY = 'sne_passport_watchlist'

export function getWatchlist(): WatchlistItem[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    return stored ? JSON.parse(stored) : []
  } catch (error) {
    console.error('Error loading watchlist:', error)
    return []
  }
}

export function saveWatchlist(watchlist: WatchlistItem[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(watchlist))
  } catch (error) {
    console.error('Error saving watchlist:', error)
  }
}

export function addToWatchlist(address: string, label?: string): boolean {
  const watchlist = getWatchlist()

  // Check if address already exists
  if (watchlist.some(item => item.address.toLowerCase() === address.toLowerCase())) {
    return false
  }

  const newItem: WatchlistItem = {
    address: address.toLowerCase(),
    label: label?.trim() || undefined,
    addedAt: Date.now(),
  }

  watchlist.push(newItem)
  saveWatchlist(watchlist)
  return true
}

export function removeFromWatchlist(address: string): void {
  const watchlist = getWatchlist()
  const filtered = watchlist.filter(item => item.address.toLowerCase() !== address.toLowerCase())
  saveWatchlist(filtered)
}

export function updateWatchlistItem(address: string, updates: Partial<WatchlistItem>): void {
  const watchlist = getWatchlist()
  const index = watchlist.findIndex(item => item.address.toLowerCase() === address.toLowerCase())

  if (index !== -1) {
    watchlist[index] = { ...watchlist[index], ...updates }
    saveWatchlist(watchlist)
  }
}

export function clearWatchlist(): void {
  localStorage.removeItem(STORAGE_KEY)
}


