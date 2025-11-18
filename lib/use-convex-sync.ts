'use client';

import { useEffect, useRef } from 'react';
import { useQuery } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { getSyncId, replaceWatchlistItems, getWatchlistItems } from './watchlist';

// Hook to listen for Convex changes and update local storage
// This should be used in a component that's always rendered (like FilmGrid)
export function useConvexSync() {
  const syncId = getSyncId();
  
  // Check if Convex is available (env var is set)
  const convexUrl = typeof window !== 'undefined' ? process.env.NEXT_PUBLIC_CONVEX_URL : null;
  const isConvexAvailable = convexUrl && !convexUrl.includes('placeholder');
  
  // Subscribe to Convex favorites for this syncId (only if Convex is available)
  const convexFavorites = useQuery(
    api.favorites.getFavorites,
    (syncId && isConvexAvailable) ? { syncId } : 'skip'
  );
  
  const lastSyncedRef = useRef<string>('');
  const hasInitializedRef = useRef(false);
  const skipNextUpdateRef = useRef(false);

  // Update local storage when Convex data changes
  useEffect(() => {
    if (!syncId || !isConvexAvailable || convexFavorites === undefined) {
      hasInitializedRef.current = false;
      return;
    }
    
    const convexString = JSON.stringify(convexFavorites);
    
    // On first load after mount, check if we need to sync
    if (!hasInitializedRef.current) {
      hasInitializedRef.current = true;
      const localItems = getWatchlistItems();
      const localString = JSON.stringify(localItems);
      
      // If local and Convex don't match, update local (page refresh case)
      if (localString !== convexString) {
        console.log('[useConvexSync] Initial sync: local and Convex differ, updating local', {
          syncId,
          localCount: localItems.length,
          convexCount: convexFavorites.length
        });
        replaceWatchlistItems(convexFavorites);
      }
      
      lastSyncedRef.current = convexString;
      return;
    }
    
    // Skip update if it was triggered by our own sync (to avoid loops)
    if (skipNextUpdateRef.current) {
      skipNextUpdateRef.current = false;
      lastSyncedRef.current = convexString;
      return;
    }
    
    // Only update if Convex data has changed (real-time update from another device)
    if (convexString !== lastSyncedRef.current) {
      console.log('[useConvexSync] Convex data changed, updating local storage', {
        syncId,
        favoritesCount: convexFavorites.length,
        favorites: convexFavorites.map(f => f.filmKey)
      });
      
      // Update local storage with Convex data
      replaceWatchlistItems(convexFavorites);
      lastSyncedRef.current = convexString;
    }
  }, [convexFavorites, syncId]);
  
  // Reset when syncId changes
  useEffect(() => {
    hasInitializedRef.current = false;
    lastSyncedRef.current = '';
    skipNextUpdateRef.current = false;
  }, [syncId]);
  
  // Listen for local changes that we synced to Convex, so we can skip the next Convex update
  useEffect(() => {
    if (!syncId) return;
    
    const handleWatchlistChange = (e: Event) => {
      const customEvent = e as CustomEvent;
      // If this is a convex-load, don't skip (it's from Convex)
      // If it's a local change, skip the next Convex update (we just synced it)
      if (customEvent.detail?.source !== 'convex-load') {
        skipNextUpdateRef.current = true;
      }
    };
    
    window.addEventListener('watchlist-changed', handleWatchlistChange);
    return () => {
      window.removeEventListener('watchlist-changed', handleWatchlistChange);
    };
  }, [syncId]);
}

