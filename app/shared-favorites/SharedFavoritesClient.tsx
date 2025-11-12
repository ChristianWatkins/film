'use client';

import { useEffect, useState, useRef, useMemo } from 'react';
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
  const [priorityFilms, setPriorityFilms] = useState<Set<string>>(new Set());
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
          console.error('Failed to parse shared favorites:', result.error);
          console.error('URL param length:', favsParam?.length);
          console.error('URL param preview:', favsParam?.substring(0, 100));
          setError(result.error || 'Failed to load shared favorites');
          setLoading(false);
          return;
        }
        
        // Filter to only show shared favorites, excluding removed ones
        const shared = films.filter(film => 
          result.filmKeys?.includes(film.filmKey) && !removed.has(film.filmKey)
        );
        
        // Track priority films from shared favorites for display
        const sharedPriorities = new Set<string>();
        if (result.priorities) {
          console.log('[SharedFavorites] Parsed priorities:', result.priorities);
          console.log('[SharedFavorites] Priority entries:', Array.from(result.priorities.entries()));
          for (const [filmKey, isPriority] of result.priorities.entries()) {
            if (isPriority && result.filmKeys?.includes(filmKey) && !removed.has(filmKey)) {
              sharedPriorities.add(filmKey);
              console.log('[SharedFavorites] Added priority film:', filmKey);
            }
          }
        } else {
          console.log('[SharedFavorites] No priorities found in result');
        }
        console.log('[SharedFavorites] Final priorityFilms set:', Array.from(sharedPriorities));
        setPriorityFilms(sharedPriorities);
        
        // Sort shared films to put priority films first
        const sortedShared = [...shared].sort((a, b) => {
          const aIsPriority = sharedPriorities.has(a.filmKey);
          const bIsPriority = sharedPriorities.has(b.filmKey);
          if (aIsPriority && !bIsPriority) return -1;
          if (!aIsPriority && bIsPriority) return 1;
          return 0; // Keep original order for films with same priority status
        });
        setSharedFilms(sortedShared);
        
        // Apply priority from shared favorites to user's watchlist if available
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

  // Helper function to get cards per row based on viewport width
  const getCardsPerRow = (): number => {
    if (typeof window === 'undefined') return 4;
    const width = window.innerWidth;
    if (width >= 1024) return 4; // lg: 4 cards
    if (width >= 768) return 2;  // md: 2 cards
    return 1; // sm: 1 card
  };

  // Calculate visible films for current row
  const visibleFilms = useMemo(() => {
    const cardsPerRow = getCardsPerRow();
    const startIndex = currentRowIndex * cardsPerRow;
    const endIndex = startIndex + cardsPerRow;
    return sharedFilms.slice(startIndex, endIndex);
  }, [currentRowIndex, sharedFilms]);

  // Row jump functionality - show one row at a time with wheel navigation
  useEffect(() => {
    if (loading || sharedFilms.length === 0) return;

    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      e.stopPropagation();
      
      // Determine scroll direction (use a threshold to avoid micro-scrolls)
      if (Math.abs(e.deltaY) < 5) return;
      const scrollingDown = e.deltaY > 0;
      
      const cardsPerRow = getCardsPerRow();
      const totalRows = Math.ceil(sharedFilms.length / cardsPerRow);
      
      let newRowIndex = currentRowIndex;
      if (scrollingDown && currentRowIndex < totalRows - 1) {
        newRowIndex = currentRowIndex + 1;
      } else if (!scrollingDown && currentRowIndex > 0) {
        newRowIndex = currentRowIndex - 1;
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
    };

    window.addEventListener('wheel', handleWheel, { passive: false });

    return () => {
      window.removeEventListener('wheel', handleWheel);
    };
  }, [currentRowIndex, sharedFilms.length, loading]);

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
        if (cardIndex < visibleFilms.length) {
          const targetFilm = visibleFilms[cardIndex];
          toggleWatchlist(targetFilm.filmKey, targetFilm.title);
          setUserWatchlist(getWatchlist());
        }
      }

      // Number keys (1, 2, 3, 4) flip individual cards
      // Double-click same number key to play trailer
      if (!e.shiftKey && ['1', '2', '3', '4'].includes(e.key) && !showShareModal) {
        e.preventDefault();
        const cardIndex = parseInt(e.key) - 1;
        if (cardIndex < visibleFilms.length) {
          const targetFilm = visibleFilms[cardIndex];
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
          const flippedFilm = visibleFilms.find(film => film.filmKey === flippedCard);
          if (flippedFilm && flippedFilm.mubiLink) {
            playTrailer(flippedFilm);
          }
        }
      }

      // A key toggles watchlist when exactly one card is flipped
      if ((e.key === 'a' || e.key === 'A') && !showShareModal) {
        e.preventDefault();
        if (flippedCard !== null && !allCardsFlipped) {
          const flippedFilm = visibleFilms.find(film => film.filmKey === flippedCard);
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
  }, [loading, sharedFilms, visibleFilms, flippedCard, allCardsFlipped, showShareModal, currentRowIndex]);

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
    
    // Remove from priority films if it was prioritized
    setPriorityFilms(prev => {
      const updated = new Set(prev);
      updated.delete(filmKey);
      return updated;
    });
    
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
      <div className="min-h-screen bg-gray-50 dark:bg-[var(--background)] transition-colors">
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-gray-600 dark:text-gray-300 text-lg">Loading shared favorites...</div>
        </div>
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-[var(--background)] transition-colors">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8 text-center transition-colors">
            <div className="text-6xl mb-4">⚠️</div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Error Loading Favorites</h1>
            <p className="text-gray-600 dark:text-gray-300 mb-6">{error}</p>
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
      <div className="min-h-screen bg-gray-50 dark:bg-[var(--background)] transition-colors">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8 text-center transition-colors">
            <div className="text-6xl mb-4">🎬</div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">No Favorites Found</h1>
            <p className="text-gray-600 dark:text-gray-300 mb-6">This shared link doesn't contain any favorites.</p>
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
    <div className="min-h-screen bg-gray-50 dark:bg-[var(--background)] transition-colors">
      {/* Combined Header - Single line layout matching main page */}
      <header className="bg-[#1A1A2E] shadow-lg py-4">
        <div className="px-4 sm:px-4 md:px-32 flex items-center justify-between gap-4 md:gap-0">
          {/* Left side: Title and film count */}
          <div className="flex items-center gap-2 md:gap-6 flex-shrink min-w-0">
            {listName && (
              <div className="text-xs md:text-base font-medium text-white/70 whitespace-nowrap truncate">
                {listName}
              </div>
            )}
            <div className="hidden sm:block text-sm md:text-lg font-medium text-white whitespace-nowrap">
              {sharedFilms.length} film{sharedFilms.length !== 1 ? 's' : ''}
            </div>
          </div>
          
          {/* Right side: Action buttons */}
          <div className="flex items-center gap-2 md:gap-4 flex-shrink-0">
            <button
              onClick={() => setShowShareModal(!showShareModal)}
              className="p-1.5 md:p-3.5 rounded-full bg-gray-700/80 hover:bg-gray-600 text-white transition-all duration-200 cursor-pointer"
              title="Share Edited List"
            >
              <svg className="w-5 h-5 md:w-6 md:h-6" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
              </svg>
            </button>
            <button
              onClick={handleAddAllToFavorites}
              className="p-1.5 md:p-3.5 rounded-full bg-gray-700/80 hover:bg-gray-600 text-white transition-all duration-200 cursor-pointer"
              title="Add All to My Favorites"
            >
              <svg className="w-5 h-5 md:w-6 md:h-6" fill="currentColor" viewBox="0 0 24 24">
                <path d="M11.645 20.91l-.007-.003-.022-.012a15.247 15.247 0 01-.383-.218 25.18 25.18 0 01-4.244-3.17C4.688 15.36 2.25 12.174 2.25 8.25 2.25 5.322 4.714 3 7.688 3A5.5 5.5 0 0112 5.052 5.5 5.5 0 0116.313 3c2.973 0 5.437 2.322 5.437 5.25 0 3.925-2.438 7.111-4.739 9.256a25.175 25.175 0 01-4.244 3.17 15.247 15.247 0 01-.383.219l-.022.012-.007.004-.003.001a.752.752 0 01-.704 0l-.003-.001z" />
              </svg>
            </button>
            <a
              href="/"
              className="p-1.5 md:p-3.5 rounded-full bg-gray-700/80 hover:bg-gray-600 text-white transition-all duration-200 cursor-pointer"
              title="Browse All Films"
            >
              <svg className="w-5 h-5 md:w-6 md:h-6" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12l8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" />
              </svg>
            </a>
          </div>
        </div>
      </header>
      
      {/* Main Content */}
      <div className="pb-8">

        {/* Share Modal */}
        {showShareModal && (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 mb-6 border border-gray-200 dark:border-gray-700 transition-colors">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Share Edited List</h3>
              <button
                onClick={() => {
                  setShowShareModal(false);
                  setShareUrl('');
                  setShareListName('');
                  setShareError('');
                }}
                className="text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 transition-colors cursor-pointer"
                aria-label="Close"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <div className="space-y-4">
              <p className="text-gray-600 dark:text-gray-300 text-sm">
                Generate a new share link for this edited list ({sharedFilms.length} film{sharedFilms.length !== 1 ? 's' : ''}).
              </p>

              {/* List Name Input */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  List Name (optional)
                </label>
                <input
                  type="text"
                  value={shareListName}
                  onChange={(e) => setShareListName(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 cursor-text text-gray-900 dark:text-white dark:bg-gray-700 placeholder:text-gray-500 dark:placeholder:text-gray-400 transition-colors"
                  placeholder="e.g., My Favorite Films"
                  maxLength={50}
                />
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
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
                  <div className="bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-lg p-4 transition-colors">
                    <div className="font-mono text-xs text-gray-800 dark:text-gray-200 break-all max-h-40 overflow-y-auto">
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

                  <div className="bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800 rounded-lg p-4 text-sm text-blue-800 dark:text-blue-200 transition-colors">
                    <p className="font-medium mb-1">💡 Tip</p>
                    <p>Send this link to friends so they can view your edited list. The link works on any device and browser!</p>
                  </div>
                </>
              )}

              {/* Error Message */}
              {shareError && (
                <div className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-lg p-4 transition-colors">
                  <div className="flex items-center gap-2 text-red-800 dark:text-red-200">
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
          <div className="bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-800 rounded-lg p-4 mb-6 transition-colors">
            <div className="flex items-center gap-2 text-green-800 dark:text-green-200">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              <span className="font-medium">Added to your favorites!</span>
            </div>
          </div>
        )}
        
        {/* Row Navigation Indicator - Fixed on right side like main site */}
        <div className="fixed top-1/2 right-6 transform -translate-y-1/2 z-40">
          <div className="flex flex-col items-center text-gray-400 dark:text-gray-500 drop-shadow-lg px-4">
            {/* Up caret */}
            <button 
              onClick={() => {
                if (currentRowIndex > 0) {
                  const newRowIndex = currentRowIndex - 1;
                  setCurrentRowIndex(newRowIndex);
                  setFlippedCard(null);
                  setAllCardsFlipped(false);
                  const cardsPerRow = getCardsPerRow();
                  const startIndex = newRowIndex * cardsPerRow;
                  const targetCard = gridRef.current?.children[startIndex] as HTMLElement;
                  if (targetCard) {
                    targetCard.scrollIntoView({ behavior: 'smooth', block: 'center' });
                  }
                }
              }}
              disabled={currentRowIndex === 0}
              className={`text-lg font-medium cursor-pointer hover:text-gray-600 dark:hover:text-gray-300 transition-colors ${
                currentRowIndex === 0 ? 'opacity-50 cursor-not-allowed' : ''
              }`}
              style={{ transform: 'scaleX(2)' }}
              title="Previous row (or press ↑)"
            >
              ^
            </button>
            {/* Row indicator */}
            <div className="text-sm font-mono tabular-nums font-bold tracking-wider">
              {currentRowIndex + 1}/{Math.ceil(sharedFilms.length / getCardsPerRow())}
            </div>
            {/* Down caret */}
            <button 
              onClick={() => {
                const cardsPerRow = getCardsPerRow();
                const totalRows = Math.ceil(sharedFilms.length / cardsPerRow);
                if (currentRowIndex < totalRows - 1) {
                  const newRowIndex = currentRowIndex + 1;
                  setCurrentRowIndex(newRowIndex);
                  setFlippedCard(null);
                  setAllCardsFlipped(false);
                  const startIndex = newRowIndex * cardsPerRow;
                  const targetCard = gridRef.current?.children[startIndex] as HTMLElement;
                  if (targetCard) {
                    targetCard.scrollIntoView({ behavior: 'smooth', block: 'center' });
                  }
                }
              }}
              disabled={currentRowIndex >= Math.ceil(sharedFilms.length / getCardsPerRow()) - 1}
              className={`text-lg font-medium cursor-pointer hover:text-gray-600 dark:hover:text-gray-300 transition-colors ${
                currentRowIndex >= Math.ceil(sharedFilms.length / getCardsPerRow()) - 1 ? 'opacity-50 cursor-not-allowed' : ''
              }`}
              style={{ transform: 'rotate(180deg) scaleX(2)' }}
              title="Next row (or press ↓)"
            >
              ^
            </button>
          </div>
        </div>

        {/* Film Grid - One row at a time */}
        <div className="relative flex items-start md:items-center justify-center px-4 md:px-32 pt-8 md:pt-16">
          {/* Film Grid - Only show current row */}
          <div ref={gridRef} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 w-full place-items-center md:place-items-stretch">
            {visibleFilms.map(film => {
              const isPriorityFilm = priorityFilms.has(film.filmKey);
              if (isPriorityFilm) {
                console.log('[SharedFavorites] Rendering priority film:', film.filmKey, film.title);
              }
              return (
                <FilmCard
                  key={film.filmKey}
                  film={film}
                  isFlipped={flippedCard === film.filmKey || allCardsFlipped}
                  onFlip={() => handleCardFlip(film.filmKey)}
                  onWatchlistChange={() => setUserWatchlist(getWatchlist())}
                  showRemoveButton={true}
                  onRemove={handleRemoveFilm}
                  isPriority={isPriorityFilm}
                />
              );
            })}
          </div>
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

