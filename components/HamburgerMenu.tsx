'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Globe } from 'lucide-react';
import SyncPanel from './SyncPanel';
import { getSyncId } from '@/lib/watchlist';

interface HamburgerMenuProps {
  onHelpClick: () => void;
}

export default function HamburgerMenu({ onHelpClick }: HamburgerMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [showSyncPanel, setShowSyncPanel] = useState(false);
  const [syncId, setSyncId] = useState<string | null>(null);
  const [isOnline, setIsOnline] = useState(true);
  const menuRef = useRef<HTMLDivElement>(null);
  const pathname = usePathname();

  // Check sync status
  useEffect(() => {
    const checkSyncStatus = () => {
      const currentSyncId = getSyncId();
      setSyncId(currentSyncId);
      setIsOnline(navigator.onLine);
    };

    checkSyncStatus();

    // Listen for sync status changes
    window.addEventListener('sync-status-changed', checkSyncStatus);
    window.addEventListener('online', checkSyncStatus);
    window.addEventListener('offline', checkSyncStatus);

    return () => {
      window.removeEventListener('sync-status-changed', checkSyncStatus);
      window.removeEventListener('online', checkSyncStatus);
      window.removeEventListener('offline', checkSyncStatus);
    };
  }, []);

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  // Close menu on escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        setIsOpen(false);
      }
    };

    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [isOpen]);

  const handleMenuItemClick = () => {
    setIsOpen(false);
  };

  return (
    <div className="relative" ref={menuRef}>
      {/* Hamburger Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="p-1.5 md:p-3.5 rounded-full transition-all duration-200 cursor-pointer bg-gray-700/80 hover:bg-gray-600 text-white relative"
        title={syncId ? (isOnline ? 'Menu - Synced' : 'Menu - Offline') : 'Menu'}
        aria-label="Menu"
      >
        <svg
          className="w-5 h-5 md:w-6 md:h-6"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          viewBox="0 0 24 24"
        >
          {isOpen ? (
            // X icon when open
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M6 18L18 6M6 6l12 12"
            />
          ) : (
            // Hamburger icon when closed
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M4 6h16M4 12h16M4 18h16"
            />
          )}
        </svg>
        {/* Sync indicator dot */}
        {syncId && (
          <div
            className={`absolute top-1 right-1 w-2 h-2 rounded-full ${
              isOnline ? 'bg-green-400' : 'bg-red-400'
            } ring-2 ring-gray-700/80`}
            title={isOnline ? 'Synced and online' : 'Offline'}
          />
        )}
      </button>

      {/* Menu Dropdown */}
      {isOpen && (
        <div className="absolute right-0 top-full mt-2 w-56 bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 z-50 overflow-hidden">
          <div className="py-1">
            {/* Global Search */}
            <Link
              href="/search"
              onClick={handleMenuItemClick}
              className="flex items-center gap-3 px-4 py-3 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors cursor-pointer"
            >
              <Globe className="w-5 h-5" strokeWidth={1.5} />
              <span className="text-sm font-medium">Global Search</span>
            </Link>

            {/* Sync */}
            <button
              onClick={() => {
                handleMenuItemClick();
                setShowSyncPanel(true);
              }}
              className="w-full flex items-center gap-3 px-4 py-3 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors cursor-pointer text-left relative"
            >
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                />
              </svg>
              <span className="text-sm font-medium">Sync</span>
              {syncId && (
                <div className="ml-auto flex items-center gap-2">
                  <div
                    className={`w-2 h-2 rounded-full ${
                      isOnline ? 'bg-green-500' : 'bg-red-500'
                    }`}
                    title={isOnline ? 'Synced and online' : 'Offline'}
                  />
                  <span className="text-xs text-gray-500 dark:text-gray-400 font-mono">
                    {syncId.length > 12 ? `${syncId.substring(0, 8)}...` : syncId}
                  </span>
                </div>
              )}
            </button>

            {/* Help */}
            <button
              onClick={() => {
                handleMenuItemClick();
                onHelpClick();
              }}
              className="w-full flex items-center gap-3 px-4 py-3 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors cursor-pointer text-left"
            >
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <span className="text-sm font-medium">Help</span>
            </button>

            {/* Edit Films - only in development */}
            {process.env.NODE_ENV === 'development' && !pathname?.startsWith('/admin') && (
              <Link
                href="/admin/films"
                onClick={handleMenuItemClick}
                className="flex items-center gap-3 px-4 py-3 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors cursor-pointer border-t border-gray-200 dark:border-gray-700"
              >
                <svg
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10"
                  />
                </svg>
                <span className="text-sm font-medium">Edit Films</span>
                <span className="ml-auto text-xs text-gray-500 dark:text-gray-400">(Dev)</span>
              </Link>
            )}
          </div>
        </div>
      )}

      {/* Sync Panel Modal */}
      {showSyncPanel && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <SyncPanel onClose={() => setShowSyncPanel(false)} />
        </div>
      )}
    </div>
  );
}

