'use client';

import { useState, useEffect } from 'react';
import { getSyncId } from '@/lib/watchlist';
import SyncPanel from './SyncPanel';

type SyncStatus = 'not_synced' | 'synced' | 'offline';

export default function SyncIcon() {
  const [showPanel, setShowPanel] = useState(false);
  const [status, setStatus] = useState<SyncStatus>('not_synced');

  useEffect(() => {
    const checkSyncStatus = () => {
      const syncId = getSyncId();
      if (syncId) {
        // Check if online
        if (navigator.onLine) {
          setStatus('synced');
        } else {
          setStatus('offline');
        }
      } else {
        setStatus('not_synced');
      }
    };

    checkSyncStatus();
    
    // Listen for online/offline events
    window.addEventListener('online', checkSyncStatus);
    window.addEventListener('offline', checkSyncStatus);
    
    // Listen for sync status changes
    window.addEventListener('sync-status-changed', checkSyncStatus);

    return () => {
      window.removeEventListener('online', checkSyncStatus);
      window.removeEventListener('offline', checkSyncStatus);
      window.removeEventListener('sync-status-changed', checkSyncStatus);
    };
  }, []);

  const getIconColor = () => {
    switch (status) {
      case 'synced':
        return 'text-green-400';
      case 'offline':
        return 'text-red-400';
      default:
        return 'text-gray-400';
    }
  };

  const getTitle = () => {
    switch (status) {
      case 'synced':
        return 'Synced - Click to manage sync';
      case 'offline':
        return 'Offline - Click to manage sync';
      default:
        return 'Not synced - Click to sync favorites';
    }
  };

  return (
    <>
      <button
        onClick={() => setShowPanel(true)}
        className={`p-1.5 md:p-3.5 rounded-full transition-all duration-200 cursor-pointer bg-gray-700/80 hover:bg-gray-600 ${getIconColor()}`}
        title={getTitle()}
      >
        <svg 
          className="w-5 h-5 md:w-6 md:h-6" 
          fill="none"
          stroke="currentColor" 
          strokeWidth="2" 
          viewBox="0 0 24 24"
        >
          {status === 'synced' ? (
            // Cloud with checkmark
            <path 
              strokeLinecap="round" 
              strokeLinejoin="round" 
              d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
            />
          ) : status === 'offline' ? (
            // Cloud with X
            <path 
              strokeLinecap="round" 
              strokeLinejoin="round" 
              d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016zM6 18L18 6M6 6l12 12"
            />
          ) : (
            // Cloud upload
            <path 
              strokeLinecap="round" 
              strokeLinejoin="round" 
              d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
            />
          )}
        </svg>
      </button>

      {showPanel && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <SyncPanel onClose={() => setShowPanel(false)} />
        </div>
      )}
    </>
  );
}

