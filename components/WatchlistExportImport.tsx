'use client';

import { useState, useRef } from 'react';
import { exportWatchlistAsBase64, importWatchlistFromBase64, getWatchlistItems } from '@/lib/watchlist';

interface WatchlistExportImportProps {
  onImportSuccess?: () => void;
  onClose?: () => void;
}

export default function WatchlistExportImport({ onImportSuccess, onClose }: WatchlistExportImportProps) {
  const [activeTab, setActiveTab] = useState<'export' | 'import'>('export');
  const [exportString, setExportString] = useState('');
  const [importString, setImportString] = useState('');
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Generate export string
  const handleExport = () => {
    try {
      const base64String = exportWatchlistAsBase64();
      if (!base64String) {
        setError('No favorites to export');
        return;
      }
      setExportString(base64String);
      setError('');
    } catch (e) {
      setError('Failed to generate export string');
      console.error(e);
    }
  };

  // Copy to clipboard
  const handleCopy = async () => {
    if (!exportString) {
      handleExport();
      return;
    }
    
    try {
      await navigator.clipboard.writeText(exportString);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (e) {
      setError('Failed to copy to clipboard');
      console.error(e);
    }
  };

  // Download as .txt file
  const handleDownload = () => {
    if (!exportString) {
      handleExport();
      return;
    }

    try {
      const blob = new Blob([exportString], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'film-favorites.txt';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (e) {
      setError('Failed to download file');
      console.error(e);
    }
  };

  // Handle file upload
  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (file.type !== 'text/plain' && !file.name.endsWith('.txt')) {
      setError('Please upload a .txt file');
      return;
    }

    // Validate file size (max 100KB)
    if (file.size > 100000) {
      setError('File too large (max 100KB)');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      setImportString(content);
      setError('');
    };
    reader.onerror = () => {
      setError('Failed to read file');
    };
    reader.readAsText(file);
  };

  // Import favorites
  const handleImport = () => {
    if (!importString.trim()) {
      setError('Please paste or upload your favorites string');
      return;
    }

    // Check if user has existing favorites
    const existingItems = getWatchlistItems();
    if (existingItems.length > 0) {
      setShowConfirmDialog(true);
    } else {
      performImport();
    }
  };

  const performImport = () => {
    setShowConfirmDialog(false);
    
    const result = importWatchlistFromBase64(importString.trim());
    
    if (result.success) {
      setSuccess(`Successfully imported ${result.itemsImported} favorite${result.itemsImported !== 1 ? 's' : ''}!`);
      setError('');
      setImportString('');
      
      // Notify parent component
      onImportSuccess?.();
      
      // Close modal after 2 seconds
      setTimeout(() => {
        onClose?.();
      }, 2000);
    } else {
      setError(result.error || 'Import failed');
      setSuccess('');
    }
  };

  const cancelImport = () => {
    setShowConfirmDialog(false);
  };

  return (
    <div className="bg-white rounded-lg shadow-lg overflow-hidden w-full max-w-2xl">
      {/* Header */}
      <div className="bg-[#1A1A2E] border-b-4 border-[#FFB800] px-6 py-4 flex items-center justify-between">
        <h2 className="text-2xl font-bold text-white">Sync Favorites</h2>
        {onClose && (
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
            aria-label="Close"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>

      <div className="p-6">

      {/* Tabs */}
      <div className="flex border-b border-gray-200 mb-6">
        <button
          onClick={() => {
            setActiveTab('export');
            setError('');
            setSuccess('');
          }}
          className={`px-4 py-2 font-medium transition-colors ${
            activeTab === 'export'
              ? 'text-blue-600 border-b-2 border-blue-600'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          Export
        </button>
        <button
          onClick={() => {
            setActiveTab('import');
            setError('');
            setSuccess('');
          }}
          className={`px-4 py-2 font-medium transition-colors ${
            activeTab === 'import'
              ? 'text-blue-600 border-b-2 border-blue-600'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          Import
        </button>
      </div>

      {/* Export Tab */}
      {activeTab === 'export' && (
        <div className="space-y-4">
          <p className="text-gray-600">
            Export your favorites as a secure string. Save it to sync across browsers or as a backup.
          </p>

          {!exportString && (
            <button
              onClick={handleExport}
              className="w-full bg-slate-600 hover:bg-slate-700 text-white font-medium py-3 px-4 rounded-lg transition-colors"
            >
              Generate Export String
            </button>
          )}

          {exportString && (
            <>
              <div className="bg-gray-50 border border-gray-300 rounded-lg p-4">
                <div className="font-mono text-xs text-gray-800 break-all max-h-40 overflow-y-auto">
                  {exportString}
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={handleCopy}
                  className="flex-1 bg-green-600 hover:bg-green-700 text-white font-medium py-3 px-4 rounded-lg transition-colors flex items-center justify-center gap-2"
                >
                  {copied ? (
                    <>
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      Copied!
                    </>
                  ) : (
                    <>
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                      </svg>
                      Copy to Clipboard
                    </>
                  )}
                </button>

                <button
                  onClick={handleDownload}
                  className="flex-1 bg-slate-600 hover:bg-slate-700 text-white font-medium py-3 px-4 rounded-lg transition-colors flex items-center justify-center gap-2"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                  Download as .txt
                </button>
              </div>
            </>
          )}
        </div>
      )}

      {/* Import Tab */}
      {activeTab === 'import' && (
        <div className="space-y-4">
          <p className="text-gray-600">
            Import your favorites from a previously exported string or file.
          </p>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Paste your export string:
            </label>
            <textarea
              value={importString}
              onChange={(e) => {
                setImportString(e.target.value);
                setError('');
                setSuccess('');
              }}
              className="w-full h-32 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-mono text-xs placeholder-gray-500"
              placeholder="Paste your base64 export string here..."
            />
          </div>

          <div className="flex items-center gap-4">
            <div className="flex-1 h-px bg-gray-300"></div>
            <span className="text-gray-500 text-sm">OR</span>
            <div className="flex-1 h-px bg-gray-300"></div>
          </div>

          <div>
            <input
              ref={fileInputRef}
              type="file"
              accept=".txt"
              onChange={handleFileUpload}
              className="hidden"
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              className="w-full bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium py-3 px-4 rounded-lg transition-colors flex items-center justify-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
              Upload .txt file
            </button>
          </div>

          <button
            onClick={handleImport}
            disabled={!importString.trim()}
            className={`w-full font-medium py-3 px-4 rounded-lg transition-colors ${
              importString.trim()
                ? 'bg-slate-600 hover:bg-slate-700 text-white'
                : 'bg-gray-300 text-gray-500 cursor-not-allowed'
            }`}
          >
            Import Favorites
          </button>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="mt-4 bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center gap-2 text-red-800">
            <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span className="text-sm font-medium">{error}</span>
          </div>
        </div>
      )}

      {/* Success Message */}
      {success && (
        <div className="mt-4 bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="flex items-center gap-2 text-green-800">
            <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span className="text-sm font-medium">{success}</span>
          </div>
        </div>
      )}
      </div>

      {/* Confirmation Dialog */}
      {showConfirmDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl p-6 max-w-md mx-4">
            <h3 className="text-lg font-bold text-gray-900 mb-2">Replace Existing Favorites?</h3>
            <p className="text-gray-600 mb-6">
              You have existing favorites. Importing will replace all your current favorites. This action cannot be undone.
            </p>
            <div className="flex gap-3">
              <button
                onClick={cancelImport}
                className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-800 font-medium py-2 px-4 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={performImport}
                className="flex-1 bg-red-600 hover:bg-red-700 text-white font-medium py-2 px-4 rounded-lg transition-colors"
              >
                Replace
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

