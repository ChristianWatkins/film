'use client';

import { useState, useEffect } from 'react';
import { useQuery, useMutation } from 'convex/react';
import { api } from '@/convex/_generated/api';
import { getWatchlistItems, getSyncId, setSyncId, clearSyncId, replaceWatchlistItems } from '@/lib/watchlist';

interface SyncPanelProps {
  onClose?: () => void;
}

type SyncStatus = 'not_synced' | 'synced' | 'offline' | 'connecting' | 'unavailable';

export default function SyncPanel({ onClose }: SyncPanelProps) {
  const [syncIdInput, setSyncIdInput] = useState('');
  const [currentSyncId, setCurrentSyncId] = useState<string | null>(null);
  const [status, setStatus] = useState<SyncStatus>('not_synced');
  const [error, setError] = useState('');
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [pendingSyncId, setPendingSyncId] = useState<string | null>(null);
  const [localFavoritesCount, setLocalFavoritesCount] = useState(0);

  // Check if Convex is available
  const convexUrl = typeof window !== 'undefined' ? process.env.NEXT_PUBLIC_CONVEX_URL : null;
  const isConvexAvailable = convexUrl && !convexUrl.includes('placeholder');

  // Check if syncId exists and has favorites
  const syncIdCheck = useQuery(
    api.favorites.checkSyncIdExists,
    (pendingSyncId && isConvexAvailable) ? { syncId: pendingSyncId } : 'skip'
  );

  // Get favorites from Convex when synced
  const convexFavorites = useQuery(
    api.favorites.getFavorites,
    (currentSyncId && isConvexAvailable) ? { syncId: currentSyncId } : 'skip'
  );

  // Mutations
  const setFavoritesMutation = useMutation(api.favorites.setFavorites);

  // Load current syncId on mount
  useEffect(() => {
    if (!isConvexAvailable) {
      setStatus('unavailable');
      return;
    }
    
    const storedSyncId = getSyncId();
    if (storedSyncId) {
      setCurrentSyncId(storedSyncId);
      setSyncIdInput(storedSyncId);
      setStatus('synced');
    } else {
      setStatus('not_synced');
    }
    
    // Get local favorites count
    const localItems = getWatchlistItems();
    setLocalFavoritesCount(localItems.length);
  }, [isConvexAvailable]);

  // Handle Convex favorites updates - load from Convex when connecting
  useEffect(() => {
    if (currentSyncId && convexFavorites !== undefined) {
      // If we're connecting to a syncId (pendingSyncId is set), always load from Convex
      // This handles the case where user confirms overwriting existing favorites
      const isConnecting = pendingSyncId === currentSyncId;
      
      console.log('[SyncPanel] Loading favorites from Convex:', {
        currentSyncId,
        pendingSyncId,
        isConnecting,
        favoritesCount: convexFavorites.length,
        favorites: convexFavorites
      });
      
      // Always load when connecting (even if empty), or if we have favorites
      if (isConnecting || convexFavorites.length > 0) {
        // Update local storage with Convex data
        console.log('[SyncPanel] Replacing local favorites with Convex data', {
          replacingWith: convexFavorites.length,
          currentLocal: getWatchlistItems().length,
          convexFavorites: convexFavorites
        });
        
        // Replace local storage
        replaceWatchlistItems(convexFavorites);
        
        // Verify the replacement worked immediately
        const afterReplace = getWatchlistItems();
        console.log('[SyncPanel] After replacement:', {
          count: afterReplace.length,
          items: afterReplace.map(f => f.filmKey),
          expectedCount: convexFavorites.length
        });
        
        // Verify we got the right data
        if (afterReplace.length !== convexFavorites.length) {
          console.error('[SyncPanel] MISMATCH: Expected', convexFavorites.length, 'but got', afterReplace.length);
        }
        
        setStatus('synced');
        
        // Now set the syncId in localStorage AFTER loading from Convex
        // Use a small delay to ensure useWatchlistSync sees the updated data
        // This prevents useWatchlistSync from syncing old local favorites
        setTimeout(() => {
          if (isConnecting) {
            console.log('[SyncPanel] Setting syncId in localStorage after loading');
            setSyncId(currentSyncId);
            setPendingSyncId(null); // Clear the pending flag after loading
            
            // Refresh the page to ensure UI updates with new favorites
            window.location.reload();
          } else if (!getSyncId()) {
            // If we already have a syncId, don't overwrite it
            setSyncId(currentSyncId);
          }
        }, 100); // Small delay to ensure replacement event is processed
      }
    }
  }, [convexFavorites, currentSyncId, pendingSyncId]);

  // Check syncId when user wants to connect
  useEffect(() => {
    if (pendingSyncId && syncIdCheck !== undefined) {
      if (syncIdCheck.exists && syncIdCheck.hasFavorites) {
        // Show confirmation dialog
        setShowConfirmDialog(true);
      } else {
        // New or empty syncId, proceed directly
        handleConnectDirectly(pendingSyncId);
        setPendingSyncId(null);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [syncIdCheck, pendingSyncId]);

  const generateNewId = () => {
    // Generate a cryptographically secure random ID
    // Use crypto.randomUUID() if available (browser), otherwise fallback to crypto.getRandomValues()
    let newId: string;
    
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
      // Use UUID v4 (most secure, standard format)
      newId = crypto.randomUUID();
    } else if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
      // Fallback: Generate 32 bytes of random data and convert to base64url
      const array = new Uint8Array(24); // 24 bytes = 32 base64url characters
      crypto.getRandomValues(array);
      // Convert to base64url (URL-safe, no padding)
      newId = btoa(String.fromCharCode(...array))
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=/g, '');
    } else {
      // Last resort fallback (shouldn't happen in modern browsers)
      // Still better than Math.random() - uses Date + performance timing
      const timestamp = Date.now().toString(36);
      const randomPart = performance.now().toString(36).replace('.', '');
      newId = `${timestamp}-${randomPart}-${Math.random().toString(36).substring(2, 15)}`;
    }
    
    setSyncIdInput(newId);
  };

  const handleConnectDirectly = async (syncId: string) => {
    const trimmedSyncId = syncId.trim();
    
    if (!trimmedSyncId) {
      setError('Please enter a sync ID');
      return;
    }
    
    // Validate syncId format (client-side check before sending to server)
    if (trimmedSyncId.length < 3) {
      setError('Sync ID must be at least 3 characters long');
      return;
    }
    
    if (trimmedSyncId.length > 200) {
      setError('Sync ID must be at most 200 characters long');
      return;
    }
    
    if (!/^[a-zA-Z0-9_-]+$/.test(trimmedSyncId)) {
      setError('Sync ID contains invalid characters. Only letters, numbers, hyphens, and underscores are allowed.');
      return;
    }

    try {
      setStatus('connecting');
      setError('');

      // Get current local favorites
      const localItems = getWatchlistItems();

      // Upload local favorites to Convex (for new syncId)
      await setFavoritesMutation({
        syncId: trimmedSyncId,
        favorites: localItems,
      });
      
      setSyncId(trimmedSyncId);
      setCurrentSyncId(syncId.trim());
      setStatus('synced');

      setShowConfirmDialog(false);
      setPendingSyncId(null);
    } catch (e) {
      console.error('Error connecting to sync:', e);
      setError('Failed to connect. Please try again.');
      setStatus('not_synced');
    }
  };

  const handleConnect = async (syncId: string) => {
    const trimmedSyncId = syncId.trim();
    
    if (!trimmedSyncId) {
      setError('Please enter a sync ID');
      return;
    }
    
    // Validate syncId format (client-side check before sending to server)
    if (trimmedSyncId.length < 3) {
      setError('Sync ID must be at least 3 characters long');
      return;
    }
    
    if (trimmedSyncId.length > 200) {
      setError('Sync ID must be at most 200 characters long');
      return;
    }
    
    if (!/^[a-zA-Z0-9_-]+$/.test(trimmedSyncId)) {
      setError('Sync ID contains invalid characters. Only letters, numbers, hyphens, and underscores are allowed.');
      return;
    }

    if (!isConvexAvailable) {
      setError('Sync is not available. Convex backend is not configured.');
      return;
    }

    try {
      setStatus('connecting');
      setError('');

      // Set currentSyncId first to trigger the useQuery to load from Convex
      // Don't set syncId in localStorage yet - wait for data to load
      // This prevents useWatchlistSync from syncing local favorites first
      setCurrentSyncId(trimmedSyncId);
      setPendingSyncId(trimmedSyncId); // Mark that we're loading from this syncId
      
      // The useEffect will handle loading when convexFavorites updates
      // and will set the syncId in localStorage after loading

      setShowConfirmDialog(false);
    } catch (e) {
      console.error('Error connecting to sync:', e);
      setError('Failed to connect. Please try again.');
      setStatus('not_synced');
      setPendingSyncId(null);
    }
  };

  const handleConnectClick = () => {
    const syncId = syncIdInput.trim();
    if (!syncId) {
      setError('Please enter a sync ID');
      return;
    }

    // Validate syncId format before checking if it exists
    if (syncId.length < 3) {
      setError('Sync ID must be at least 3 characters long');
      return;
    }
    
    if (syncId.length > 200) {
      setError('Sync ID must be at most 200 characters long');
      return;
    }
    
    if (!/^[a-zA-Z0-9_-]+$/.test(syncId)) {
      setError('Sync ID contains invalid characters. Only letters, numbers, hyphens, and underscores are allowed.');
      return;
    }

    // Clear any previous errors
    setError('');

    // Check if syncId exists first
    setPendingSyncId(syncId);
  };

  const handleConfirmOverwrite = () => {
    if (pendingSyncId) {
      handleConnect(pendingSyncId);
    }
  };

  const handleDisconnect = () => {
    clearSyncId();
    setCurrentSyncId(null);
    setSyncIdInput('');
    setStatus('not_synced');
    setError('');
  };

  const getStatusText = () => {
    switch (status) {
      case 'synced':
        return 'Synced';
      case 'connecting':
        return 'Connecting...';
      case 'offline':
        return 'Offline';
      default:
        return 'Not synced';
    }
  };

  const getStatusColor = () => {
    switch (status) {
      case 'synced':
        return 'text-green-500';
      case 'connecting':
        return 'text-yellow-500';
      case 'offline':
        return 'text-red-500';
      default:
        return 'text-gray-400';
    }
  };

  return (
    <>
      <div className="bg-white rounded-lg shadow-lg overflow-hidden w-full max-w-2xl">
        {/* Header */}
        <div className="bg-[#1A1A2E] border-b-4 border-[#FFB800] px-6 py-4 flex items-center justify-between">
          <h2 className="text-2xl font-bold text-white">Sync Favorites</h2>
          {onClose && (
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-white transition-colors cursor-pointer"
              aria-label="Close"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>

        <div className="p-6">
          <div className="space-y-4">
            {!isConvexAvailable ? (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <p className="text-yellow-800 text-sm">
                  <strong>Sync is not available.</strong> The Convex backend is not configured. 
                  Please set the <code className="bg-yellow-100 px-1 rounded">NEXT_PUBLIC_CONVEX_URL</code> environment variable in your hosting platform.
                </p>
              </div>
            ) : (
              <p className="text-gray-600">
                Sync your favorites across browsers and devices. Enter a sync ID to connect, or generate a new one.
              </p>
            )}

            {/* Status Indicator */}
            <div className="flex items-center gap-2 p-3 bg-gray-50 border border-gray-200 rounded-lg">
              <div className={`w-3 h-3 rounded-full ${status === 'synced' ? 'bg-green-500' : status === 'connecting' ? 'bg-yellow-500' : status === 'offline' ? 'bg-red-500' : 'bg-gray-400'}`}></div>
              <span className={`text-sm font-medium ${getStatusColor()}`}>
                {getStatusText()}
              </span>
              {currentSyncId && (
                <span className="text-xs text-gray-500 ml-auto">
                  ID: {currentSyncId}
                </span>
              )}
            </div>

            {/* Sync ID Input */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Sync ID
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={syncIdInput}
                  onChange={(e) => {
                    setSyncIdInput(e.target.value);
                    setError('');
                  }}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 cursor-text text-gray-900 placeholder:text-gray-500"
                  placeholder="Enter sync ID or generate new one"
                  disabled={status === 'connecting'}
                />
                <button
                  onClick={generateNewId}
                  className="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 font-medium rounded-lg transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                  disabled={status === 'connecting'}
                >
                  Generate
                </button>
              </div>
            </div>

            {/* Action Buttons */}
            {isConvexAvailable && (
              <>
                {!currentSyncId ? (
                  <button
                    onClick={handleConnectClick}
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-4 rounded-lg transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                    disabled={status === 'connecting' || !syncIdInput.trim()}
                  >
                    Connect
                  </button>
                ) : (
                  <button
                    onClick={handleDisconnect}
                    className="w-full bg-red-600 hover:bg-red-700 text-white font-medium py-3 px-4 rounded-lg transition-colors cursor-pointer"
                  >
                    Disconnect
                  </button>
                )}
              </>
            )}

            {/* Info */}
            {currentSyncId && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm text-blue-800">
                <p className="font-medium mb-1">💡 Syncing Active</p>
                <p>Your favorites are syncing in real-time. Changes made on any device will appear on all connected devices.</p>
              </div>
            )}

            {/* Error Message */}
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <div className="flex items-center gap-2 text-red-800">
                  <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span className="text-sm font-medium">{error}</span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Confirmation Dialog */}
      {showConfirmDialog && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Overwrite Local Favorites?
            </h3>
            <p className="text-gray-600 mb-2">
              This sync ID already has favorites ({syncIdCheck?.count || 0} items). Loading will replace your local favorites.
            </p>
            {localFavoritesCount > 0 && (
              <p className="text-sm text-gray-500 mb-4">
                You currently have {localFavoritesCount} favorites that will be replaced.
              </p>
            )}
            <p className="text-gray-700 font-medium mb-6">
              Are you OK with overwriting your existing favorites?
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => {
                  setShowConfirmDialog(false);
                  setPendingSyncId(null);
                }}
                className="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 font-medium rounded-lg transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmOverwrite}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-medium rounded-lg transition-colors cursor-pointer"
              >
                Yes, Overwrite
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

