'use client';

import { useState } from 'react';
import { generateShareableUrl, generateShareableUrlFromFilmKeys, getWatchlistItems } from '@/lib/watchlist';

interface WatchlistExportImportProps {
  onClose?: () => void;
}

export default function WatchlistExportImport({ onClose }: WatchlistExportImportProps) {
  const [listName, setListName] = useState('');
  const [shareUrl, setShareUrl] = useState('');
  const [shareCopied, setShareCopied] = useState(false);
  const [error, setError] = useState('');
  const [onlyPinned, setOnlyPinned] = useState(false);

  // Generate share URL
  const handleGenerateShareUrl = async () => {
    try {
      let url: string;
      
      if (onlyPinned) {
        // Get only pinned/prioritized items
        const items = getWatchlistItems();
        const pinnedFilmKeys = items
          .filter(item => item.priority === true)
          .map(item => item.filmKey);
        
        if (pinnedFilmKeys.length === 0) {
          setError('No pinned favorites to share');
          return;
        }
        
        url = await generateShareableUrlFromFilmKeys(pinnedFilmKeys, listName);
      } else {
        // Share all favorites
        url = await generateShareableUrl(listName);
      }
      
      if (!url) {
        setError('No favorites to share');
        return;
      }
      setShareUrl(url);
      setError('');
    } catch (e) {
      setError('Failed to generate share URL');
      console.error(e);
    }
  };

  // Copy share URL to clipboard
  const handleCopyShareUrl = async () => {
    if (!shareUrl) {
      handleGenerateShareUrl();
      return;
    }
    
    try {
      await navigator.clipboard.writeText(shareUrl);
      setShareCopied(true);
      setTimeout(() => setShareCopied(false), 2000);
    } catch (e) {
      setError('Failed to copy to clipboard');
      console.error(e);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-lg overflow-hidden w-full max-w-2xl">
      {/* Header */}
      <div className="bg-[#1A1A2E] border-b-4 border-[#FFB800] px-6 py-4 flex items-center justify-between">
        <h2 className="text-2xl font-bold text-white">Share Favorites</h2>
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
          <p className="text-gray-600">
            Share your favorites with friends. They can view your list without affecting their own favorites.
          </p>

          {/* Only Pinned Checkbox */}
          <div className="flex items-start space-x-3 p-3 bg-amber-50 border border-amber-200 rounded-lg">
            <input
              type="checkbox"
              id="onlyPinned"
              checked={onlyPinned}
              onChange={(e) => {
                setOnlyPinned(e.target.checked);
                setShareUrl(''); // Reset share URL when option changes
              }}
              className="mt-1 w-4 h-4 text-amber-600 bg-white border-amber-300 rounded focus:ring-amber-500 focus:ring-2 cursor-pointer"
            />
            <label htmlFor="onlyPinned" className="text-sm text-gray-700 cursor-pointer">
              <span className="font-medium">Only share pinned favorites</span>
              <p className="text-xs text-gray-600 mt-0.5">
                Share only the films you've marked with a ⭐ pin
              </p>
            </label>
          </div>

          {/* List Name Input */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              List Name (optional)
            </label>
            <input
              type="text"
              value={listName}
              onChange={(e) => {
                setListName(e.target.value);
                setShareUrl(''); // Reset share URL when list name changes
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 cursor-text text-gray-900 placeholder:text-gray-500"
              placeholder="e.g., My Favorite Films"
              maxLength={50}
            />
            <p className="text-xs text-gray-500 mt-1">
              This name will appear in the URL and on the shared page
            </p>
          </div>

          {!shareUrl && (
            <button
              onClick={handleGenerateShareUrl}
              className="w-full bg-slate-600 hover:bg-slate-700 text-white font-medium py-3 px-4 rounded-lg transition-colors cursor-pointer"
            >
              Generate Share Link
            </button>
          )}

          {shareUrl && (
            <>
              <div className="bg-gray-50 border border-gray-300 rounded-lg p-4">
                <div className="font-mono text-xs text-gray-800 break-all max-h-40 overflow-y-auto">
                  {shareUrl}
                </div>
              </div>

              <button
                onClick={handleCopyShareUrl}
                className="w-full bg-green-600 hover:bg-green-700 text-white font-medium py-3 px-4 rounded-lg transition-colors flex items-center justify-center gap-2 cursor-pointer"
              >
                {shareCopied ? (
                  <>
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    Link Copied!
                  </>
                ) : (
                  <>
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                    Copy Share Link
                  </>
                )}
              </button>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm text-blue-800">
                <p className="font-medium mb-1">💡 Tip</p>
                <p>Send this link to friends so they can view your favorite films. The link works on any device and browser!</p>
              </div>
            </>
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
  );
}

