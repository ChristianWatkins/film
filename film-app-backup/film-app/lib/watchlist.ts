'use client';

const WATCHLIST_KEY = 'film-festival-watchlist';

export interface WatchlistItem {
  filmKey: string;
  title: string;
  addedAt: string;
}

// Get all watchlist items
export function getWatchlist(): Set<string> {
  if (typeof window === 'undefined') return new Set();
  
  try {
    const stored = localStorage.getItem(WATCHLIST_KEY);
    if (stored) {
      const items: WatchlistItem[] = JSON.parse(stored);
      return new Set(items.map(item => item.filmKey));
    }
  } catch (e) {
    console.error('Error reading watchlist:', e);
  }
  
  return new Set();
}

// Get detailed watchlist items
export function getWatchlistItems(): WatchlistItem[] {
  if (typeof window === 'undefined') return [];
  
  try {
    const stored = localStorage.getItem(WATCHLIST_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (e) {
    console.error('Error reading watchlist:', e);
  }
  
  return [];
}

// Add to watchlist
export function addToWatchlist(filmKey: string, title: string): void {
  if (typeof window === 'undefined') return;
  
  try {
    const items = getWatchlistItems();
    
    // Don't add duplicates
    if (items.some(item => item.filmKey === filmKey)) return;
    
    items.push({
      filmKey,
      title,
      addedAt: new Date().toISOString()
    });
    
    localStorage.setItem(WATCHLIST_KEY, JSON.stringify(items));
  } catch (e) {
    console.error('Error adding to watchlist:', e);
  }
}

// Remove from watchlist
export function removeFromWatchlist(filmKey: string): void {
  if (typeof window === 'undefined') return;
  
  try {
    const items = getWatchlistItems();
    const filtered = items.filter(item => item.filmKey !== filmKey);
    localStorage.setItem(WATCHLIST_KEY, JSON.stringify(filtered));
  } catch (e) {
    console.error('Error removing from watchlist:', e);
  }
}

// Toggle watchlist
export function toggleWatchlist(filmKey: string, title: string): boolean {
  const watchlist = getWatchlist();
  const isInWatchlist = watchlist.has(filmKey);
  
  if (isInWatchlist) {
    removeFromWatchlist(filmKey);
    return false;
  } else {
    addToWatchlist(filmKey, title);
    return true;
  }
}

// Export watchlist as JSON
export function exportWatchlist(): string {
  const items = getWatchlistItems();
  return JSON.stringify(items, null, 2);
}

// Import watchlist from JSON
export function importWatchlist(jsonString: string): boolean {
  if (typeof window === 'undefined') return false;
  
  try {
    const items = JSON.parse(jsonString);
    localStorage.setItem(WATCHLIST_KEY, JSON.stringify(items));
    return true;
  } catch (e) {
    console.error('Error importing watchlist:', e);
    return false;
  }
}

// Clear watchlist
export function clearWatchlist(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(WATCHLIST_KEY);
}

