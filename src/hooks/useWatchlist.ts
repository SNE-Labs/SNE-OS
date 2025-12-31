import { useState, useEffect } from 'react'
import type { WatchlistItem } from '../types/wallet.types'
import {
  getWatchlist,
  addToWatchlist,
  removeFromWatchlist,
  updateWatchlistItem,
} from '../services/storage/watchlistStorage'

export function useWatchlist() {
  const [watchlist, setWatchlist] = useState<WatchlistItem[]>([])

  useEffect(() => {
    setWatchlist(getWatchlist())
  }, [])

  const add = (address: string, label?: string) => {
    const success = addToWatchlist(address, label)
    if (success) {
      setWatchlist(getWatchlist())
    }
    return success
  }

  const remove = (address: string) => {
    removeFromWatchlist(address)
    setWatchlist(getWatchlist())
  }

  const update = (address: string, updates: Partial<WatchlistItem>) => {
    updateWatchlistItem(address, updates)
    setWatchlist(getWatchlist())
  }

  const refresh = () => {
    setWatchlist(getWatchlist())
  }

  return {
    watchlist,
    add,
    remove,
    update,
    refresh,
  }
}
