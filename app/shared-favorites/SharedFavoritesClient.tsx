'use client';

import { useEffect, useState, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import { parseSharedFavorites, addToWatchlist, getWatchlist, generateShareableUrlFromFilmKeys, togglePriority, toggleWatchlist } from '@/lib/watchlist';
import type { Film } from '@/lib/types';
import FilmCard from '@/components/FilmCard';

interface SharedFavoritesClientProps {
  films: Film[];
}

export default function SharedFavoritesClient({ films }: SharedFavoritesClientProps) {
  const searchParams = useSearchParams();
  const [sharedFilms, setSharedFilms] = useState<Film[]>([]);
  const [listName, setListName] = useState<string>('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [userWatchlist, setUserWatchlist] = useState<Set<string>>(new Set());
  const [importSuccess, setImportSuccess] = useState(false);
  const [flippedCard, setFlippedCard] = useState<string | null>(null);
  const [allCardsFlipped, setAllCardsFlipped] = useState(false);
  const [showScrollTop, setShowScrollTop] = useState(false);
  const [removedFilms, setRemovedFilms] = useState<Set<string>>(new Set());
  const [showShareModal, setShowShareModal] = useState(false);
  const [shareListName, setShareListName] = useState('');
  const [shareUrl, setShareUrl] = useState('');
  const [shareCopied, setShareCopied] = useState(false);
  const [shareError, setShareError] = useState('');
  const [currentRowIndex, setCurrentRowIndex] = useState(0);
  const gridRef = useRef<HTMLDivElement>(null);
  const keyPressRef = useRef<Record<string, { count: number; lastTime: number }>>({});
  
  useEffect(() => {
    const loadSharedFavorites = async () => {
      try {
        // Get the favs parameter from URL
        const favsParam = searchParams.get('favs');
        const nameParam = searchParams.get('name');
        const removedParam = searchParams.get('removed');
        
        if (!favsParam) {
          setError('No favorites data found in URL');
          setLoading(false);
          return;
        }
        
        // Store list name if provided
        if (nameParam) {
          setListName(decodeURIComponent(nameParam));
        }
        
        // Parse removed films from URL
        const removed = removedParam 
          ? new Set(removedParam.split(',').filter(key => key.trim()))
          : new Set<string>();
        setRemovedFilms(removed);
        
        // Parse the shared favorites
        const result = await parseSharedFavorites(favsParam);
        
        if (!result.success || !result.filmKeys) {
          setError(result.error || 'Failed to load shared favorites');
          setLoading(false);
          return;
        }
        
        // Filter to only show shared favorites, excluding removed ones
        const shared = films.filter(film => 
          result.filmKeys?.includes(film.filmKey) && !removed.has(film.filmKey)
        );
        setSharedFilms(shared);
        
        // Apply priority from shared favorites if available
        if (result.priorities) {
          const { getWatchlistItems } = await import('@/lib/watchlist');
          for (const [filmKey, isPriority] of result.priorities.entries()) {
            if (isPriority && result.filmKeys?.includes(filmKey)) {
              // Film is in shared favorites and marked as priority
              // Add to watchlist first if not already there, then set priority
              const watchlist = getWatchlist();
              if (!watchlist.has(filmKey)) {
                const film = films.find(f => f.filmKey === filmKey);
                if (film) {
                  addToWatchlist(filmKey, film.title);
                }
              }
              // Set priority (will toggle if already set, so check first)
              const currentWatchlist = getWatchlist();
              if (currentWatchlist.has(filmKey)) {
                // Only set if not already priority
                const items = getWatchlistItems();
                const item = items.find(i => i.filmKey === filmKey);
                if (!item?.priority) {
                  togglePriority(filmKey);
                }
              }
            }
          }
        }
        
        // Load user's current watchlist
        setUserWatchlist(getWatchlist());
        
        setLoading(false);
      } catch (e) {
        console.error('Error loading shared favorites:', e);
        setError('Failed to load shared favorites');
        setLoading(false);
      }
    };
    
    loadSharedFavorites();
  }, [searchParams, films]);
  
  // Handle scroll for scroll-to-top button
  useEffect(() => {
    const handleScroll = () => {
      setShowScrollTop(window.scrollY > 400);
    };
    
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    if (loading || sharedFilms.length === 0) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger shortcuts if typing in an input or textarea
      if ((e.target as HTMLElement).matches('input, textarea')) {
        return;
      }

      // Spacebar toggles all visible cards flip
      if (e.key === ' ' && !showShareModal) {
        e.preventDefault();
        setAllCardsFlipped(prev => !prev);
        setFlippedCard(null);
      }

      // Shift+Number keys (Shift+1, Shift+2, Shift+3, Shift+4) add to watchlist
      if (e.shiftKey && ['Digit1', 'Digit2', 'Digit3', 'Digit4'].includes(e.code) && !showShareModal) {
        e.preventDefault();
        const digit = parseInt(e.code.replace('Digit', ''));
        const cardIndex = digit - 1;
        if (cardIndex < sharedFilms.length) {
          const targetFilm = sharedFilms[cardIndex];
          toggleWatchlist(targetFilm.filmKey, targetFilm.title);
          setUserWatchlist(getWatchlist());
        }
      }

      // Number keys (1, 2, 3, 4) flip individual cards
      // Double-click same number key to play trailer
      if (!e.shiftKey && ['1', '2', '3', '4'].includes(e.key) && !showShareModal) {
        e.preventDefault();
        const cardIndex = parseInt(e.key) - 1;
        if (cardIndex < sharedFilms.length) {
          const targetFilm = sharedFilms[cardIndex];
          const now = Date.now();
          const keyState = keyPressRef.current[e.key] || { count: 0, lastTime: 0 };
          
          // Check if this is a quick second press (within 300ms)
          if (keyState.count === 1 && now - keyState.lastTime < 300) {
            // Double-click detected - play trailer
            playTrailer(targetFilm);
            keyPressRef.current[e.key] = { count: 0, lastTime: now };
          } else {
            // First press or too slow (treat as new single press)
            keyPressRef.current[e.key] = { count: 1, lastTime: now };
            
            // Delay card flip to allow for double-click
            setTimeout(() => {
              const currentState = keyPressRef.current[e.key] || { count: 0, lastTime: 0 };
              // Only flip if still at count 1 (no double-click happened)
              if (currentState.count === 1 && currentState.lastTime === now) {
                handleCardFlip(targetFilm.filmKey);
              }
              // Always reset the count after the timeout
              keyPressRef.current[e.key] = { count: 0, lastTime: now };
            }, 300);
          }
        }
      }

      // T key plays trailer when exactly one card is flipped
      if ((e.key === 't' || e.key === 'T') && !showShareModal) {
        e.preventDefault();
        if (flippedCard !== null && !allCardsFlipped) {
          const flippedFilm = sharedFilms.find(film => film.filmKey === flippedCard);
          if (flippedFilm && flippedFilm.mubiLink) {
            playTrailer(flippedFilm);
          }
        }
      }

      // A key toggles watchlist when exactly one card is flipped
      if ((e.key === 'a' || e.key === 'A') && !showShareModal) {
        e.preventDefault();
        if (flippedCard !== null && !allCardsFlipped) {
          const flippedFilm = sharedFilms.find(film => film.filmKey === flippedCard);
          if (flippedFilm) {
            toggleWatchlist(flippedFilm.filmKey, flippedFilm.title);
            setUserWatchlist(getWatchlist());
          }
        }
      }

      // Arrow key navigation
      if (!showShareModal) {
        const cardsPerRow = getCardsPerRow();
        const totalRows = Math.ceil(sharedFilms.length / cardsPerRow);
        
        if (e.key === 'ArrowDown') {
          e.preventDefault();
          
          let newRowIndex: number;
          
          // Shift + Arrow Down: Jump to last row
          if (e.shiftKey) {
            newRowIndex = totalRows - 1;
          } 
          // Regular Arrow Down: Move one row down
          else if (currentRowIndex < totalRows - 1) {
            newRowIndex = currentRowIndex + 1;
          } else {
            return; // Already at last row
          }
          
          if (newRowIndex !== currentRowIndex) {
            setCurrentRowIndex(newRowIndex);
            
            // Reset card flip states when moving to new row
            setFlippedCard(null);
            setAllCardsFlipped(false);
            
            // Scroll to the new row
            const startIndex = newRowIndex * cardsPerRow;
            const targetCard = gridRef.current?.children[startIndex] as HTMLElement;
            if (targetCard) {
              targetCard.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
          }
        }
        
        if (e.key === 'ArrowUp') {
          e.preventDefault();
          
          let newRowIndex: number;
          
          // Shift + Arrow Up: Jump to first row
          if (e.shiftKey) {
            newRowIndex = 0;
          }
          // Regular Arrow Up: Move one row up
          else if (currentRowIndex > 0) {
            newRowIndex = currentRowIndex - 1;
          } else {
            return; // Already at first row
          }
          
          if (newRowIndex !== currentRowIndex) {
            setCurrentRowIndex(newRowIndex);
            
            // Reset card flip states when moving to new row
            setFlippedCard(null);
            setAllCardsFlipped(false);
            
            // Scroll to the new row
            const startIndex = newRowIndex * cardsPerRow;
            const targetCard = gridRef.current?.children[startIndex] as HTMLElement;
            if (targetCard) {
              targetCard.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
          }
        }
      }

      // ESC key closes share modal
      if (e.key === 'Escape') {
        e.preventDefault();
        if (showShareModal) {
          setShowShareModal(false);
          setShareUrl('');
          setShareListName('');
          setShareError('');
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [loading, sharedFilms, flippedCard, allCardsFlipped, showShareModal, currentRowIndex]);

  // Reset row index when films change
  useEffect(() => {
    const cardsPerRow = getCardsPerRow();
    const totalRows = Math.ceil(sharedFilms.length / cardsPerRow);
    if (currentRowIndex >= totalRows && totalRows > 0) {
      setCurrentRowIndex(totalRows - 1);
    }
  }, [sharedFilms.length, currentRowIndex]);
  
  const handleCardFlip = (filmKey: string) => {
    setFlippedCard(flippedCard === filmKey ? null : filmKey);
  };
  
  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Helper function to get cards per row based on viewport width
  const getCardsPerRow = (): number => {
    if (typeof window === 'undefined') return 4;
    const width = window.innerWidth;
    if (width >= 1280) return 4; // xl
    if (width >= 1024) return 3; // lg
    if (width >= 768) return 2;  // md
    return 1; // sm
  };

  // Play trailer function
  const playTrailer = (film: Film) => {
    if (film.mubiLink) {
      window.open(film.mubiLink, '_blank');
    }
  };
  
  const handleAddAllToFavorites = () => {
    let addedCount = 0;
    sharedFilms.forEach(film => {
      if (!userWatchlist.has(film.filmKey)) {
        addToWatchlist(film.filmKey, film.title);
        addedCount++;
      }
    });
    
    // Refresh watchlist
    setUserWatchlist(getWatchlist());
    setImportSuccess(true);
    
    setTimeout(() => setImportSuccess(false), 3000);
  };
  
  const handleAddToFavorites = (filmKey: string, title: string) => {
    addToWatchlist(filmKey, title);
    setUserWatchlist(getWatchlist());
  };

  const handleRemoveFilm = (filmKey: string) => {
    // Add to removed films set
    const newRemovedFilms = new Set(removedFilms);
    newRemovedFilms.add(filmKey);
    setRemovedFilms(newRemovedFilms);
    
    // Remove from displayed films
    setSharedFilms(sharedFilms.filter(film => film.filmKey !== filmKey));
    
    // Update URL with removed films
    const currentParams = new URLSearchParams(searchParams.toString());
    const removedArray = Array.from(newRemovedFilms);
    currentParams.set('removed', removedArray.join(','));
    
    // Update browser URL without page reload
    const newUrl = `${window.location.pathname}?${currentParams.toString()}`;
    window.history.pushState({}, '', newUrl);
  };

  // Generate share URL for edited list
  const handleGenerateShareUrl = async () => {
    try {
      if (sharedFilms.length === 0) {
        setShareError('No films to share');
        return;
      }
      
      const filmKeys = sharedFilms.map(film => film.filmKey);
      const url = await generateShareableUrlFromFilmKeys(filmKeys, shareListName || undefined);
      
      if (!url) {
        setShareError('Failed to generate share URL');
        return;
      }
      
      setShareUrl(url);
      setShareError('');
    } catch (e) {
      setShareError('Failed to generate share URL');
      console.error(e);
    }
  };

  // Copy share URL to clipboard
  const handleCopyShareUrl = async () => {
    if (!shareUrl) {
      await handleGenerateShareUrl();
      return;
    }
    
    try {
      await navigator.clipboard.writeText(shareUrl);
      setShareCopied(true);
      setTimeout(() => setShareCopied(false), 2000);
    } catch (e) {
      setShareError('Failed to copy to clipboard');
      console.error(e);
    }
  };
  
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-gray-600 text-lg">Loading shared favorites...</div>
        </div>
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-2xl mx-auto px-4 py-16">
          <div className="bg-white rounded-lg shadow-lg p-8 text-center">
            <div className="text-6xl mb-4">⚠️</div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Error Loading Favorites</h1>
            <p className="text-gray-600 mb-6">{error}</p>
            <a
              href="/"
              className="inline-block bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-6 rounded-lg transition-colors cursor-pointer"
            >
              Go to Homepage
            </a>
          </div>
        </div>
      </div>
    );
  }
  
  if (sharedFilms.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-2xl mx-auto px-4 py-16">
          <div className="bg-white rounded-lg shadow-lg p-8 text-center">
            <div className="text-6xl mb-4">🎬</div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">No Favorites Found</h1>
            <p className="text-gray-600 mb-6">This shared link doesn't contain any favorites.</p>
            <a
              href="/"
              className="inline-block bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-6 rounded-lg transition-colors cursor-pointer"
            >
              Go to Homepage
            </a>
          </div>
        </div>
      </div>
    );
  }
  
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-[#1A1A2E] shadow-lg border-b-4 border-[#FFB800]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-white mb-2">
                {listName || 'Shared Favorites'}
              </h1>
              <p className="text-gray-300">
                {listName 
                  ? 'Someone shared this list with you!' 
                  : 'Someone shared their favorite films with you!'}
              </p>
            </div>
            <a
              href="/"
              className="bg-white hover:bg-gray-100 text-gray-900 font-medium py-2 px-4 rounded-lg transition-colors cursor-pointer"
            >
              Browse All Films
            </a>
          </div>
        </div>
      </header>
      
      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Info Banner */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <div className="flex items-start gap-3">
            <svg className="w-6 h-6 text-blue-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div className="flex-1">
              <p className="text-blue-900 font-medium">You're viewing shared favorites</p>
              <p className="text-blue-700 text-sm mt-1">
                These films won't be added to your favorites automatically. Hearts show which films are already in your collection.
              </p>
            </div>
          </div>
        </div>
        
        {/* Action Bar */}
        <div className="bg-white rounded-lg shadow p-4 mb-6">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="text-gray-900">
              Showing <span className="font-semibold">{sharedFilms.length}</span> shared film{sharedFilms.length !== 1 ? 's' : ''}
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setShowShareModal(!showShareModal)}
                className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg transition-colors flex items-center gap-2 cursor-pointer"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                </svg>
                Share Edited List
              </button>
              <button
                onClick={handleAddAllToFavorites}
                className="bg-red-600 hover:bg-red-700 text-white font-medium py-2 px-4 rounded-lg transition-colors flex items-center gap-2 cursor-pointer"
              >
                <svg className="w-5 h-5" fill="currentColor" stroke="currentColor" strokeWidth="0" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                </svg>
                Add All to My Favorites
              </button>
            </div>
          </div>
        </div>

        {/* Share Modal */}
        {showShareModal && (
          <div className="bg-white rounded-lg shadow-lg p-6 mb-6 border border-gray-200">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Share Edited List</h3>
              <button
                onClick={() => {
                  setShowShareModal(false);
                  setShareUrl('');
                  setShareListName('');
                  setShareError('');
                }}
                className="text-gray-400 hover:text-gray-900 transition-colors cursor-pointer"
                aria-label="Close"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <div className="space-y-4">
              <p className="text-gray-600 text-sm">
                Generate a new share link for this edited list ({sharedFilms.length} film{sharedFilms.length !== 1 ? 's' : ''}).
              </p>

              {/* List Name Input */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  List Name (optional)
                </label>
                <input
                  type="text"
                  value={shareListName}
                  onChange={(e) => setShareListName(e.target.value)}
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
                    <p>Send this link to friends so they can view your edited list. The link works on any device and browser!</p>
                  </div>
                </>
              )}

              {/* Error Message */}
              {shareError && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <div className="flex items-center gap-2 text-red-800">
                    <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span className="text-sm font-medium">{shareError}</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
        
        {/* Success Message */}
        {importSuccess && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
            <div className="flex items-center gap-2 text-green-800">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              <span className="font-medium">Added to your favorites!</span>
            </div>
          </div>
        )}
        
        {/* Film Grid */}
        <div ref={gridRef} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {sharedFilms.map(film => (
            <FilmCard
              key={film.filmKey}
              film={film}
              isFlipped={flippedCard === film.filmKey || allCardsFlipped}
              onFlip={() => handleCardFlip(film.filmKey)}
              onWatchlistChange={() => setUserWatchlist(getWatchlist())}
              showRemoveButton={true}
              onRemove={handleRemoveFilm}
            />
          ))}
        </div>
      </div>
      
      {/* Scroll to Top Button */}
      {showScrollTop && (
        <button
          onClick={scrollToTop}
          className="fixed bottom-6 right-6 bg-[#FFB800] hover:bg-[#E6A600] text-[#1A1A2E] font-semibold py-3 px-4 rounded-full shadow-2xl hover:shadow-3xl transition-all duration-200 flex items-center gap-2 cursor-pointer z-50"
          style={{ boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.3), 0 10px 10px -5px rgba(0, 0, 0, 0.04)' }}
          aria-label="Scroll to top"
        >
          <span className="text-sm">Top</span>
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path 
              strokeLinecap="round" 
              strokeLinejoin="round" 
              strokeWidth={2} 
              d="M5 10l7-7m0 0l7 7m-7-7v18" 
            />
          </svg>
        </button>
      )}
    </div>
  );
}

