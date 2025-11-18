'use client';

import { useEffect, useRef, useState } from 'react';
import { useMutation } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { getSyncId, getWatchlistItems } from './watchlist';

// Hook to automatically sync watchlist changes to Convex
export function useWatchlistSync() {
  const [syncId, setSyncIdState] = useState<string | null>(null);
  const addFavoriteMutation = useMutation(api.favorites.addFavorite);
  const removeFavoriteMutation = useMutation(api.favorites.removeFavorite);
  const togglePriorityMutation = useMutation(api.favorites.togglePriority);
  const setFavoritesMutation = useMutation(api.favorites.setFavorites);
  
  const lastSyncedItemsRef = useRef<string>('');

  // Initialize syncId and listen for changes
  useEffect(() => {
    // Get initial syncId
    setSyncIdState(getSyncId());

    // Listen for sync status changes
    const handleSyncStatusChange = () => {
      setSyncIdState(getSyncId());
    };

    window.addEventListener('sync-status-changed', handleSyncStatusChange);

    return () => {
      window.removeEventListener('sync-status-changed', handleSyncStatusChange);
    };
  }, []);

  // Sync all favorites when syncId changes or watchlist changes
  useEffect(() => {
    if (!syncId) return;

    const syncToConvex = async () => {
      try {
        const items = getWatchlistItems();
        const itemsString = JSON.stringify(items);
        
        // Only sync if items have changed
        if (itemsString !== lastSyncedItemsRef.current) {
          await setFavoritesMutation({
            syncId,
            favorites: items,
          });
          lastSyncedItemsRef.current = itemsString;
        }
      } catch (e) {
        console.error('Error syncing to Convex:', e);
      }
    };

    // Sync immediately when syncId is set
    syncToConvex();

    // Listen for watchlist changes
    const handleWatchlistChange = (e: Event) => {
      // Don't sync if this change came from loading from Convex (to avoid sync loops)
      const customEvent = e as CustomEvent;
      if (customEvent.detail?.source === 'convex-load') {
        // Update lastSyncedItemsRef to match what we just loaded
        const items = getWatchlistItems();
        lastSyncedItemsRef.current = JSON.stringify(items);
        return;
      }
      syncToConvex();
    };

    window.addEventListener('watchlist-changed', handleWatchlistChange);

    return () => {
      window.removeEventListener('watchlist-changed', handleWatchlistChange);
    };
  }, [syncId, setFavoritesMutation]);
}

