import { kv } from '@vercel/kv'

export interface WatchlistItem {
  filmKey: string
  filmTitle: string
  addedAt: string
}

// Add film to user's watchlist
export async function addToWatchlist(userId: string, filmKey: string, filmTitle: string): Promise<void> {
  const watchlistKey = `watchlist:${userId}`
  const existingWatchlist = await kv.get(watchlistKey) as WatchlistItem[] || []
  
  // Check if film is already in watchlist
  const isAlreadyAdded = existingWatchlist.some(item => item.filmKey === filmKey)
  if (isAlreadyAdded) {
    return // Film already in watchlist
  }
  
  const newItem: WatchlistItem = {
    filmKey,
    filmTitle,
    addedAt: new Date().toISOString()
  }
  
  const updatedWatchlist = [...existingWatchlist, newItem]
  await kv.set(watchlistKey, updatedWatchlist)
}

// Remove film from user's watchlist
export async function removeFromWatchlist(userId: string, filmKey: string): Promise<void> {
  const watchlistKey = `watchlist:${userId}`
  const existingWatchlist = await kv.get(watchlistKey) as WatchlistItem[] || []
  
  const updatedWatchlist = existingWatchlist.filter(item => item.filmKey !== filmKey)
  await kv.set(watchlistKey, updatedWatchlist)
}

// Get user's watchlist
export async function getUserWatchlist(userId: string): Promise<WatchlistItem[]> {
  const watchlistKey = `watchlist:${userId}`
  const watchlist = await kv.get(watchlistKey) as WatchlistItem[] || []
  
  // Sort by most recently added
  return watchlist.sort((a, b) => new Date(b.addedAt).getTime() - new Date(a.addedAt).getTime())
}

// Check if film is in user's watchlist
export async function isInWatchlist(userId: string, filmKey: string): Promise<boolean> {
  const watchlist = await getUserWatchlist(userId)
  return watchlist.some(item => item.filmKey === filmKey)
}

// Get watchlist film keys only (for filtering)
export async function getWatchlistFilmKeys(userId: string): Promise<string[]> {
  const watchlist = await getUserWatchlist(userId)
  return watchlist.map(item => item.filmKey)
}