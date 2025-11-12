'use client';

import LZString from 'lz-string';
import { encodeFilmKeys, decodeFilmKeys, loadMappings } from './film-mapping';

const WATCHLIST_KEY = 'film-festival-watchlist';
const WATCHED_KEY = 'film-festival-watched';

export interface WatchlistItem {
  filmKey: string;
  title: string;
  addedAt: string;
  priority?: boolean;
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
    
    // Check if already exists - preserve priority if it does
    const existingItem = items.find(item => item.filmKey === filmKey);
    if (existingItem) {
      // Preserve existing priority when re-adding
      return;
    }
    
    items.push({
      filmKey,
      title,
      addedAt: new Date().toISOString()
    });
    
    localStorage.setItem(WATCHLIST_KEY, JSON.stringify(items));
    
    // Dispatch custom event to notify components
    window.dispatchEvent(new Event('watchlist-changed'));
  } catch (e) {
    console.error('Error adding to watchlist:', e);
  }
}

// Remove from watchlist
export function removeFromWatchlist(filmKey: string): void {
  if (typeof window === 'undefined') return;
  
  try {
    const items = getWatchlistItems();
    // Remove item (priority is automatically removed since item is deleted)
    const filtered = items.filter(item => item.filmKey !== filmKey);
    localStorage.setItem(WATCHLIST_KEY, JSON.stringify(filtered));
    
    // Dispatch custom event to notify components
    window.dispatchEvent(new Event('watchlist-changed'));
  } catch (e) {
    console.error('Error removing from watchlist:', e);
  }
}

// Toggle watchlist
export function toggleWatchlist(filmKey: string, title: string): boolean {
  const watchlist = getWatchlist();
  const isInWatchlist = watchlist.has(filmKey);
  
  console.log(`[watchlist] toggleWatchlist called - filmKey: ${filmKey}, title: ${title}, currently in watchlist: ${isInWatchlist}`);
  
  if (isInWatchlist) {
    removeFromWatchlist(filmKey);
    console.log(`[watchlist] Removed from watchlist, returning false`);
    return false;
  } else {
    addToWatchlist(filmKey, title);
    console.log(`[watchlist] Added to watchlist, returning true`);
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

// Export watchlist as compressed base64-encoded string with short codes
export async function exportWatchlistAsBase64(): Promise<string> {
  const items = getWatchlistItems();
  
  // Store filmKeys and priorities
  const filmKeys = items.map(item => item.filmKey);
  const priorities: Record<string, boolean> = {};
  items.forEach(item => {
    if (item.priority === true) {
      priorities[item.filmKey] = true;
    }
  });
  
  // Convert film keys to short codes (e.g., "no-other-land-2024" -> "a4g")
  const shortCodesString = await encodeFilmKeys(filmKeys);
  
  // Create data object with codes and priorities
  // Map priorities from filmKeys to short codes
  const mappings = await loadMappings();
  const priorityCodes: Record<string, boolean> = {};
  Object.keys(priorities).forEach(filmKey => {
    const code = mappings.filmKeyToCode[filmKey];
    if (code) {
      priorityCodes[code] = true;
    }
  });
  
  const exportData = {
    codes: shortCodesString,
    priorities: priorityCodes
  };
  
  // Compress and encode using URL-safe compression (produces shorter strings)
  if (typeof window !== 'undefined') {
    return LZString.compressToEncodedURIComponent(JSON.stringify(exportData));
  }
  return '';
}

// Validate watchlist item structure
function isValidWatchlistItem(item: any): item is WatchlistItem {
  const hasRequiredFields = (
    typeof item === 'object' &&
    item !== null &&
    typeof item.filmKey === 'string' &&
    typeof item.title === 'string' &&
    typeof item.addedAt === 'string'
  );
  
  if (!hasRequiredFields) return false;
  
  // Check for valid property count (3 required + 1 optional priority)
  const keys = Object.keys(item);
  if (keys.length < 3 || keys.length > 4) return false;
  
  // Validate filmKey format (alphanumeric, dash, underscore only)
  if (!/^[a-zA-Z0-9_-]+$/.test(item.filmKey)) return false;
  
  // Validate title length
  if (item.title.length === 0 || item.title.length >= 500) return false;
  
  // Validate date format
  if (isNaN(Date.parse(item.addedAt))) return false;
  
  // Validate priority if present
  if ('priority' in item && typeof item.priority !== 'boolean') return false;
  
  return true;
}

// Import watchlist from compressed base64-encoded string with strict validation
export async function importWatchlistFromBase64(base64String: string): Promise<{ success: boolean; error?: string; itemsImported?: number }> {
  if (typeof window === 'undefined') {
    return { success: false, error: 'Not available in server environment' };
  }
  
  try {
    // Use shared validation function
    const result = await validateBase64FavoritesString(base64String);
    
    if (!result.success || !result.filmKeys) {
      return { success: false, error: result.error || 'Validation failed' };
    }
    
    // Get priority information if available
    const priorityMap = result.priorities || new Map<string, boolean>();
    
    // Create watchlist items from validated film keys
    const validItems: WatchlistItem[] = [];
    const now = new Date().toISOString();
    
    for (const filmKey of result.filmKeys) {
      const item: WatchlistItem = {
        filmKey,
        title: '', // Empty title - will be populated from film data when needed
        addedAt: now
      };
      
      // Add priority if it was set
      if (priorityMap.has(filmKey) && priorityMap.get(filmKey) === true) {
        item.priority = true;
      }
      
      validItems.push(item);
    }
    
    // All validation passed, save to localStorage
    // Wrap in try-catch in case localStorage is full or unavailable
    try {
      localStorage.setItem(WATCHLIST_KEY, JSON.stringify(validItems));
    } catch (storageError) {
      return { success: false, error: 'Failed to save favorites' };
    }
    
    return { success: true, itemsImported: validItems.length };
  } catch (e) {
    console.error('Error importing watchlist:', e);
    return { success: false, error: 'Unexpected error during import' };
  }
}

// Clear watchlist
export function clearWatchlist(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(WATCHLIST_KEY);
}

// ===== PRIORITY FUNCTIONS =====

// Toggle priority for a film
export function togglePriority(filmKey: string): boolean {
  if (typeof window === 'undefined') return false;
  
  try {
    const items = getWatchlistItems();
    const item = items.find(item => item.filmKey === filmKey);
    
    if (!item) {
      // Film not in watchlist, can't set priority
      return false;
    }
    
    // Toggle priority
    const newPriority = !item.priority;
    item.priority = newPriority;
    
    // If priority is false, remove the property to keep data clean
    if (!newPriority) {
      delete item.priority;
    }
    
    localStorage.setItem(WATCHLIST_KEY, JSON.stringify(items));
    
    // Dispatch custom event to notify components
    window.dispatchEvent(new Event('watchlist-changed'));
    
    return newPriority;
  } catch (e) {
    console.error('Error toggling priority:', e);
    return false;
  }
}

// Get all priority films
export function getPriorityFilms(): Set<string> {
  if (typeof window === 'undefined') return new Set();
  
  try {
    const items = getWatchlistItems();
    return new Set(
      items
        .filter(item => item.priority === true)
        .map(item => item.filmKey)
    );
  } catch (e) {
    console.error('Error reading priority films:', e);
    return new Set();
  }
}

// ===== WATCHED MOVIES FUNCTIONS =====

// Get all watched movies
export function getWatchedMovies(): Set<string> {
  if (typeof window === 'undefined') return new Set();
  
  try {
    const stored = localStorage.getItem(WATCHED_KEY);
    if (stored) {
      const items: WatchlistItem[] = JSON.parse(stored);
      return new Set(items.map(item => item.filmKey));
    }
  } catch (e) {
    console.error('Error reading watched movies:', e);
  }
  
  return new Set();
}

// Get detailed watched movie items
export function getWatchedMoviesItems(): WatchlistItem[] {
  if (typeof window === 'undefined') return [];
  
  try {
    const stored = localStorage.getItem(WATCHED_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (e) {
    console.error('Error reading watched movies:', e);
  }
  
  return [];
}

// Add to watched movies (and remove from watchlist)
export function addToWatched(filmKey: string, title: string): void {
  if (typeof window === 'undefined') return;
  
  try {
    const items = getWatchedMoviesItems();
    
    // Don't add duplicates
    if (items.some(item => item.filmKey === filmKey)) return;
    
    items.push({
      filmKey,
      title,
      addedAt: new Date().toISOString()
    });
    
    localStorage.setItem(WATCHED_KEY, JSON.stringify(items));
    
    // Remove from watchlist/favorites
    removeFromWatchlist(filmKey);
  } catch (e) {
    console.error('Error adding to watched movies:', e);
  }
}

// Remove from watched movies
export function removeFromWatched(filmKey: string): void {
  if (typeof window === 'undefined') return;
  
  try {
    const items = getWatchedMoviesItems();
    const filtered = items.filter(item => item.filmKey !== filmKey);
    localStorage.setItem(WATCHED_KEY, JSON.stringify(filtered));
  } catch (e) {
    console.error('Error removing from watched movies:', e);
  }
}

// Toggle watched status
export function toggleWatched(filmKey: string, title: string): boolean {
  const watchedMovies = getWatchedMovies();
  const isWatched = watchedMovies.has(filmKey);
  
  if (isWatched) {
    removeFromWatched(filmKey);
    // Add back to watchlist/favorites when unwatching
    addToWatchlist(filmKey, title);
    return false;
  } else {
    addToWatched(filmKey, title);
    return true;
  }
}

// Clear watched movies
export function clearWatchedMovies(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(WATCHED_KEY);
}

// Generate shareable URL for favorites
export async function generateShareableUrl(listName?: string): Promise<string> {
  if (typeof window === 'undefined') return '';
  
  const base64String = await exportWatchlistAsBase64();
  if (!base64String) return '';
  
  // String is already URL-safe from compressToEncodedURIComponent
  const encodedString = base64String;
  
  // Build URL with optional name parameter
  let shareUrl = `${window.location.origin}/shared-favorites?favs=${encodedString}`;
  
  if (listName && listName.trim()) {
    const encodedName = encodeURIComponent(listName.trim());
    shareUrl = `${window.location.origin}/shared-favorites?name=${encodedName}&favs=${encodedString}`;
  }
  
  return shareUrl;
}

// Generate shareable URL from a custom list of film keys
export async function generateShareableUrlFromFilmKeys(filmKeys: string[], listName?: string): Promise<string> {
  if (typeof window === 'undefined') return '';
  
  if (!filmKeys || filmKeys.length === 0) {
    return '';
  }
  
  // Get priority information for these film keys
  const items = getWatchlistItems();
  const priorities: Record<string, boolean> = {};
  items.forEach(item => {
    if (item.priority === true && filmKeys.includes(item.filmKey)) {
      priorities[item.filmKey] = true;
    }
  });
  
  // Convert film keys to short codes (e.g., "no-other-land-2024" -> "a4g")
  const shortCodesString = await encodeFilmKeys(filmKeys);
  
  // Map priorities from filmKeys to short codes
  const mappings = await loadMappings();
  const priorityCodes: Record<string, boolean> = {};
  Object.keys(priorities).forEach(filmKey => {
    const code = mappings.filmKeyToCode[filmKey];
    if (code) {
      priorityCodes[code] = true;
    }
  });
  
  // Create data object with codes and priorities
  const exportData = {
    codes: shortCodesString,
    priorities: priorityCodes
  };
  
  // Compress and encode using URL-safe compression (produces shorter strings)
  const encodedString = LZString.compressToEncodedURIComponent(JSON.stringify(exportData));
  
  // Build URL with optional name parameter
  let shareUrl = `${window.location.origin}/shared-favorites?favs=${encodedString}`;
  
  if (listName && listName.trim()) {
    const encodedName = encodeURIComponent(listName.trim());
    shareUrl = `${window.location.origin}/shared-favorites?name=${encodedName}&favs=${encodedString}`;
  }
  
  return shareUrl;
}

// Parse shared favorites from URL parameter
export async function parseSharedFavorites(urlParam: string): Promise<{ success: boolean; error?: string; filmKeys?: string[]; priorities?: Map<string, boolean> }> {
  if (!urlParam) {
    return { success: false, error: 'No data provided' };
  }
  
  try {
    // String is already decoded from URL parameter
    const decodedString = urlParam;
    
    // Reuse the import validation (without actually saving to localStorage)
    const result = await validateBase64FavoritesString(decodedString);
    
    if (result.success && result.filmKeys) {
      return { 
        success: true, 
        filmKeys: result.filmKeys,
        priorities: result.priorities
      };
    }
    
    return { success: false, error: result.error || 'Invalid data' };
  } catch (e) {
    console.error('Error parsing shared favorites:', e);
    return { success: false, error: 'Failed to parse shared favorites' };
  }
}

// Validate base64 string and return film keys (used by both import and share)
async function validateBase64FavoritesString(base64String: string): Promise<{ success: boolean; error?: string; filmKeys?: string[]; priorities?: Map<string, boolean> }> {
  try {
    // Input type validation
    if (typeof base64String !== 'string') {
      return { success: false, error: 'Invalid input type' };
    }
    
    // Trim whitespace
    const trimmedString = base64String.trim();
    
    // Validate format for URL-safe compressed string (alphanumeric and URL-safe characters)
    if (!/^[A-Za-z0-9+/=\-_*!~'()]+$/.test(trimmedString)) {
      return { success: false, error: 'Invalid format' };
    }
    
    // Validate length (reasonable limits)
    if (trimmedString.length > 100000) { // ~75KB of data
      return { success: false, error: 'Data too large' };
    }
    
    if (trimmedString.length === 0) {
      return { success: false, error: 'Empty data' };
    }
    
    // Check for suspicious patterns that might indicate injection attempts
    if (trimmedString.includes('<script') || trimmedString.includes('javascript:') || trimmedString.includes('onerror=')) {
      return { success: false, error: 'Invalid data format' };
    }
    
    // Decompress from URL-safe encoding
    let decompressedData: string | null;
    try {
      decompressedData = LZString.decompressFromEncodedURIComponent(trimmedString);
      if (!decompressedData) {
        return { success: false, error: 'Failed to decompress data' };
      }
      
      // Additional validation after decompression
      if (typeof decompressedData !== 'string') {
        return { success: false, error: 'Invalid decompressed data' };
      }
      
      // Check decompressed string length
      if (decompressedData.length > 500000) { // Max 500KB uncompressed
        return { success: false, error: 'Decompressed data too large' };
      }
    } catch (e) {
      return { success: false, error: 'Failed to decode string' };
    }
    
    // Try to parse as JSON (new format with priorities) or as string (old format)
    let shortCodesString: string;
    let priorityCodes: Record<string, boolean> | undefined;
    
    try {
      const parsed = JSON.parse(decompressedData);
      // New format: { codes: "...", priorities: {...} }
      if (parsed && typeof parsed === 'object' && typeof parsed.codes === 'string') {
        shortCodesString = parsed.codes;
        if (parsed.priorities && typeof parsed.priorities === 'object') {
          priorityCodes = parsed.priorities;
        }
      } else {
        // Fallback to old format (just a string)
        shortCodesString = decompressedData;
      }
    } catch (e) {
      // Old format: just a string of codes
      shortCodesString = decompressedData;
    }
    
    // Decode short codes back to film keys
    let filmKeys: string[];
    try {
      filmKeys = await decodeFilmKeys(shortCodesString);
    } catch (e) {
      return { success: false, error: 'Failed to decode film keys' };
    }
    
    // Validate array length
    if (filmKeys.length > 10000) {
      return { success: false, error: 'Too many items (max 10,000)' };
    }
    
    if (filmKeys.length === 0) {
      return { success: false, error: 'No favorites found' };
    }
    
    // Validate each filmKey
    const validKeys: string[] = [];
    const seenKeys = new Set<string>(); // Prevent duplicates
    
    for (const filmKey of filmKeys) {
      // Skip if already processed (remove duplicates)
      if (seenKeys.has(filmKey)) {
        continue;
      }
      
      // Validate filmKey format (alphanumeric, dash, underscore only)
      if (!/^[a-zA-Z0-9_-]+$/.test(filmKey)) {
        return { success: false, error: 'Invalid film ID detected' };
      }
      
      // Validate length (min and max)
      if (filmKey.length < 3 || filmKey.length > 200) {
        return { success: false, error: 'Invalid film ID length' };
      }
      
      // Prevent common injection patterns
      const lowerKey = filmKey.toLowerCase();
      if (lowerKey.includes('script') || lowerKey.includes('eval') || lowerKey.includes('function')) {
        return { success: false, error: 'Invalid film ID format' };
      }
      
      seenKeys.add(filmKey);
      validKeys.push(filmKey);
    }
    
    // Final validation - ensure we have valid items
    if (validKeys.length === 0) {
      return { success: false, error: 'No valid favorites found' };
    }
    
    // Map priority codes back to film keys if priorities were provided
    const priorityMap = new Map<string, boolean>();
    if (priorityCodes) {
      const mappings = await loadMappings();
      Object.keys(priorityCodes).forEach(code => {
        const filmKey = mappings.codeToFilmKey[code];
        if (filmKey && validKeys.includes(filmKey) && priorityCodes[code] === true) {
          priorityMap.set(filmKey, true);
        }
      });
    }
    
    return { success: true, filmKeys: validKeys, priorities: priorityMap };
  } catch (e) {
    console.error('Error validating favorites string:', e);
    return { success: false, error: 'Unexpected error during validation' };
  }
}

