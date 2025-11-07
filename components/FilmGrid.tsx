'use client';

import { useState, useRef, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { HeartIcon as HeartIconSolid } from '@heroicons/react/24/solid';
import { EyeIcon, EyeSlashIcon } from '@heroicons/react/24/outline';
import { FaTrophy } from 'react-icons/fa';
import { shouldEnableCardAnimations } from '@/lib/streaming-config';
import type { Film, FilterState } from '@/lib/types';
import FilmCard from './FilmCard';
import WatchlistExportImport from './WatchlistExportImport';
import PresentationFilters from './PresentationFilters';

interface FilmGridProps {
  films: Film[];
  onGenreClick?: (genre: string) => void;
  onWatchlistChange?: () => void;
  watchlistOnly?: boolean;
  onWatchlistToggle?: () => void;
  awardedOnly?: boolean;
  onAwardedToggle?: () => void;
  onDirectorClick?: (director: string) => void;
  watchedOnly?: boolean;
  onWatchedToggle?: () => void;
  isInFavoritesView?: boolean;
  watchedMovies?: Set<string>;
  onWatchedChange?: (filmKey: string) => void;
  // Filter props for presentation mode
  filters?: FilterState;
  onFiltersChange?: (filters: FilterState) => void;
  availableYears?: number[];
  availableFestivals?: string[];
  availablePlatforms?: string[];
  availableCountries?: string[];
  availableGenres?: string[];
  onSaveDefaults?: () => void;
  onResetDefaults?: () => void;
}

export default function FilmGrid({ 
  films, 
  onGenreClick, 
  onWatchlistChange, 
  watchlistOnly = false,
  onWatchlistToggle,
  awardedOnly = false,
  onAwardedToggle,
  onDirectorClick,
  watchedOnly = false,
  onWatchedToggle,
  isInFavoritesView = false,
  watchedMovies = new Set(),
  onWatchedChange,
  // Filter props
  filters,
  onFiltersChange,
  availableYears = [],
  availableFestivals = [],
  availablePlatforms = [],
  availableCountries = [],
  availableGenres = [],
  onSaveDefaults,
  onResetDefaults
}: FilmGridProps) {
  const [flippedCard, setFlippedCard] = useState<string | null>(null);
  const [showExportImportModal, setShowExportImportModal] = useState(false);
  const [rowJumpEnabled, setRowJumpEnabled] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [showHelpOverlay, setShowHelpOverlay] = useState(false);
  const [allCardsFlipped, setAllCardsFlipped] = useState(false);
  const [currentRowIndex, setCurrentRowIndex] = useState(0);
  const gridRef = useRef<HTMLDivElement>(null);
  const enableAnimations = shouldEnableCardAnimations();

  const handleCardFlip = (filmKey: string) => {
    // If the same card is clicked, close it. Otherwise, open the new one.
    setFlippedCard(flippedCard === filmKey ? null : filmKey);
  };

  // Row jump functionality - full screen presentation mode
  useEffect(() => {
    if (!rowJumpEnabled) return;

    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      e.stopPropagation();
      
      // Determine scroll direction (use a threshold to avoid micro-scrolls)
      if (Math.abs(e.deltaY) < 5) return;
      const scrollingDown = e.deltaY > 0;
      
      // Calculate how many cards per row based on viewport
      // Must match the grid-cols CSS classes below
      const cardsPerRow = window.innerWidth >= 768 ? 4 : 2;
      
      const totalRows = Math.ceil(films.length / cardsPerRow);
      
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
  }, [rowJumpEnabled, currentRowIndex, films.length]);

  // Unified keyboard shortcuts - P to toggle, ESC to exit, L for filters, arrows for navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't trigger if typing in an input
      if ((e.target as HTMLElement).matches('input, textarea')) return;
      
      // P key toggles presentation mode
      if (e.key === 'p' || e.key === 'P') {
        e.preventDefault();
        setRowJumpEnabled(prev => !prev);
      }
      
      // H key toggles help overlay (only in presentation mode)
      if ((e.key === 'h' || e.key === 'H') && rowJumpEnabled) {
        e.preventDefault();
        setShowHelpOverlay(prev => !prev);
      }
      
      // Spacebar toggles all visible cards flip (only in presentation mode)
      if (e.key === ' ' && rowJumpEnabled && !showFilters && !showHelpOverlay) {
        e.preventDefault();
        setAllCardsFlipped(prev => !prev);
      }
      
      // Number keys (1, 2, 3, 4) flip individual cards (only in presentation mode)
      if (['1', '2', '3', '4'].includes(e.key) && rowJumpEnabled && !showFilters && !showHelpOverlay) {
        e.preventDefault();
        const cardIndex = parseInt(e.key) - 1; // Convert to 0-based index
        if (cardIndex < visibleFilms.length) {
          const targetFilm = visibleFilms[cardIndex];
          handleCardFlip(targetFilm.filmKey);
        }
      }
      
      // Tab key toggles filters (only in presentation mode)
      if (e.key === 'Tab' && rowJumpEnabled) {
        e.preventDefault();
        setShowFilters(prev => !prev);
      }
      
      // Arrow key navigation (only in presentation mode)
      if (rowJumpEnabled && !showFilters) {
        const cardsPerRow = window.innerWidth >= 768 ? 4 : 2;
        const totalRows = Math.ceil(films.length / cardsPerRow);
        
        if (e.key === 'ArrowDown') {
          e.preventDefault();
          if (currentRowIndex < totalRows - 1) {
            const newRowIndex = currentRowIndex + 1;
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
          if (currentRowIndex > 0) {
            const newRowIndex = currentRowIndex - 1;
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
      
      // ESC key exits presentation mode or closes overlays
      if (e.key === 'Escape') {
        e.preventDefault();
        if (showHelpOverlay) {
          setShowHelpOverlay(false);
        } else if (showFilters) {
          setShowFilters(false);
        } else if (rowJumpEnabled) {
          setRowJumpEnabled(false);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [rowJumpEnabled, showFilters, showHelpOverlay, currentRowIndex, films.length]);

  // Reset row index and card flips when row jump is disabled, films change, or filters change
  useEffect(() => {
    if (!rowJumpEnabled) {
      setCurrentRowIndex(0);
      setAllCardsFlipped(false);
    } else {
      // Check if current row index is beyond available rows after filtering
      const cardsPerRow = window.innerWidth >= 768 ? 4 : 2;
      const totalRows = Math.ceil(films.length / cardsPerRow);
      if (currentRowIndex >= totalRows && totalRows > 0) {
        setCurrentRowIndex(0); // Reset to first row
      }
    }
  }, [rowJumpEnabled, films.length, JSON.stringify(filters), currentRowIndex]);

  if (films.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <div className="text-6xl mb-4">🎬</div>
        <h3 className="text-xl font-semibold text-gray-900 mb-2">
          No films found
        </h3>
        <p className="text-gray-700">
          Try adjusting your filters to see more results
        </p>
      </div>
    );
  }
  
  // Calculate which films to show in current row
  const visibleFilms = useMemo(() => {
    if (!rowJumpEnabled) return films;
    
    // Must match the grid-cols CSS classes and wheel handler
    const cardsPerRow = window.innerWidth >= 768 ? 4 : 2;
    
    const startIndex = currentRowIndex * cardsPerRow;
    const endIndex = startIndex + cardsPerRow;
    return films.slice(startIndex, endIndex);
  }, [rowJumpEnabled, currentRowIndex, films]);
  const totalRows = rowJumpEnabled ? Math.ceil(films.length / (window.innerWidth >= 768 ? 4 : 2)) : 0;

  return (
    <div data-film-grid className={rowJumpEnabled ? 'fixed inset-0 bg-gray-50 z-50 flex flex-col' : ''}>
      {/* Row indicator when in presentation mode */}
      {rowJumpEnabled && (
        <div className="bg-[#1A1A2E] text-white py-4 px-8 flex items-center justify-between shadow-lg">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setRowJumpEnabled(false)}
              className="p-2 rounded-full bg-[#FFB800] hover:bg-[#E6A600] text-[#1A1A2E] transition-colors cursor-pointer"
              title="Exit presentation mode (or press ESC)"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
            {filters && onFiltersChange && (
              <button
                onClick={() => setShowFilters(!showFilters)}
                className={`px-4 py-2 rounded-full transition-all cursor-pointer border ${
                  showFilters
                    ? 'bg-[#FFB800] hover:bg-[#E6A600] text-[#1A1A2E] border-[#FFB800]'
                    : 'bg-white/10 hover:bg-white/20 text-white border-white/20 hover:border-white/40'
                }`}
                title="Toggle filters (or press Tab)"
              >
                <svg className="w-4 h-4 inline mr-2" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 3c2.755 0 5.455.232 8.083.678.533.09.917.556.917 1.096v1.044a2.25 2.25 0 01-.659 1.591l-5.432 5.432a2.25 2.25 0 00-.659 1.591v2.927a2.25 2.25 0 01-1.244 2.013L9.75 21v-6.568a2.25 2.25 0 00-.659-1.591L3.659 7.409A2.25 2.25 0 013 5.818V4.774c0-.54.384-1.006.917-1.096A48.32 48.32 0 0112 3z" />
                </svg>
                Filters
              </button>
            )}
            <div className="text-lg font-medium">
              Presentation Mode
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="text-sm text-white/70">
              Row {currentRowIndex + 1} of {totalRows}
            </div>
            <button
              onClick={() => setShowHelpOverlay(true)}
              className="p-2 rounded-full hover:bg-white/10 text-white/70 hover:text-white transition-colors"
              title="Show keyboard shortcuts (or press H)"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </button>
          </div>

        </div>
      )}

      {!rowJumpEnabled && (
        <>
          <div className="mb-4 flex items-center justify-between">
            <div className="text-sm text-gray-900">
              Showing <span className="font-semibold">{films.length}</span> film{films.length !== 1 ? 's' : ''}
            </div>
            
            <div className="flex items-center gap-3">
            {/* Row Jump Button */}
            <button
              onClick={() => setRowJumpEnabled(!rowJumpEnabled)}
              className={`p-2 rounded-full transition-all duration-200 cursor-pointer hover:scale-110 hover:shadow-md transform ${
                rowJumpEnabled 
                  ? 'bg-purple-100 hover:bg-purple-200 text-purple-600' 
                  : 'bg-gray-100 hover:bg-gray-200 text-gray-400'
              }`}
              title={rowJumpEnabled ? "Exit presentation mode" : "Enter presentation mode (or press P)"}
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
                  d="M3 7V5a2 2 0 012-2h2M21 7V5a2 2 0 00-2-2h-2M3 17v2a2 2 0 002 2h2M21 17v2a2 2 0 01-2 2h-2" 
                />
              </svg>
            </button>

            {/* Awards Button */}
            {onAwardedToggle && (
              <button
                onClick={onAwardedToggle}
              className={`p-2 rounded-full transition-all duration-200 cursor-pointer hover:scale-110 hover:shadow-md transform ${
                awardedOnly 
                  ? 'bg-yellow-100 hover:bg-yellow-200 text-yellow-600' 
                  : 'bg-gray-100 hover:bg-gray-200 text-gray-400'
              }`}
              title={awardedOnly ? "Show all films" : "Show awarded films only (or press A)"}
            >
                <FaTrophy 
                  className={`w-5 h-5 transition-colors ${
                    awardedOnly 
                      ? 'text-current' 
                      : 'text-current'
                  }`} 
                />
              </button>
            )}

            {/* Watched Movies Button - only show when in favorites view */}
            {onWatchedToggle && isInFavoritesView && (
              <button
                onClick={onWatchedToggle}
                className={`p-2 rounded-full transition-all duration-200 cursor-pointer hover:scale-110 hover:shadow-md transform ${
                  watchedOnly 
                    ? 'bg-blue-100 hover:bg-blue-200 text-blue-600' 
                    : 'bg-gray-100 hover:bg-gray-200 text-gray-400'
                }`}
                title={watchedOnly ? "Show favourites" : "Show watched movies"}
              >
                {watchedOnly ? (
                  <EyeSlashIcon className="w-5 h-5" />
                ) : (
                  <EyeIcon className="w-5 h-5" />
                )}
              </button>
            )}

            {/* Favourites Button */}
            {onWatchlistToggle && (
              <button
                onClick={onWatchlistToggle}
              className={`p-2 rounded-full transition-all duration-200 cursor-pointer hover:scale-110 hover:shadow-md transform ${
                watchlistOnly 
                  ? 'bg-red-100 hover:bg-red-200 text-red-600' 
                  : 'bg-gray-100 hover:bg-gray-200 text-gray-400'
              }`}
              title={watchlistOnly ? "Show all films" : "Show favourites only (or press F)"}
            >
                <svg 
                  className="w-5 h-5" 
                  fill={watchlistOnly ? 'currentColor' : 'none'}
                  stroke="currentColor" 
                  strokeWidth="2" 
                  viewBox="0 0 24 24"
                >
                  <path 
                    strokeLinecap="round" 
                    strokeLinejoin="round" 
                    d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
                  />
                </svg>
              </button>
            )}
            
            {/* Export/Import Button */}
            {onWatchlistToggle && watchlistOnly && (
              <button
                onClick={() => setShowExportImportModal(true)}
                className="p-2 rounded-full transition-all duration-200 cursor-pointer hover:scale-110 hover:shadow-md transform bg-gray-100 hover:bg-gray-200 text-gray-400"
                title="Share your favorites"
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
                    d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z"
                  />
                </svg>
              </button>
            )}
          </div>
        </div>
        </>
      )}
      
      {/* Row Navigation Indicator - Presentation Mode */}
      {rowJumpEnabled && (
        <div className="fixed top-1/2 right-6 transform -translate-y-1/2 z-40">
          <div className="flex flex-col items-center text-gray-400 drop-shadow-lg px-4">
            {/* Up caret */}
            <div className="text-lg font-medium" style={{ transform: 'scaleX(2)' }}>
              ^
            </div>
            {/* Row indicator */}
            <div className="text-sm font-mono tabular-nums font-bold tracking-wider">
              {currentRowIndex + 1}/{Math.ceil(films.length / (window.innerWidth >= 768 ? 4 : 2))}
            </div>
            {/* Down caret */}
            <div className="text-lg font-medium" style={{ transform: 'rotate(180deg) scaleX(2)' }}>
              ^
            </div>
          </div>
        </div>
      )}
      
      <div 
        ref={gridRef}
        className={rowJumpEnabled ? 'flex-1 flex items-center justify-center px-32 py-8 overflow-hidden outline-none' : ''}
        tabIndex={rowJumpEnabled ? 0 : undefined}
      >
        {enableAnimations && !rowJumpEnabled ? (
          <motion.div 
            className={rowJumpEnabled 
              ? 'grid grid-cols-2 md:grid-cols-4 gap-8 w-full [&>*]:max-w-none'
              : 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6'
            }
            layout
          >
            <AnimatePresence mode="sync">
              {visibleFilms.map((film, index) => (
                <motion.div
                  key={film.filmKey}
                  data-film-card
                  layout
                  initial={{ opacity: 0, scale: 0.9, y: 20 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.9, y: -20 }}
                  transition={{ 
                    duration: 0.3,
                    delay: Math.min(index * 0.02, 0.15),
                    ease: [0.22, 1, 0.36, 1],
                    layout: { 
                      type: "spring",
                      stiffness: 300,
                      damping: 30
                    }
                  }}
                >
                  <FilmCard 
                    film={film} 
                    isFlipped={flippedCard === film.filmKey || (rowJumpEnabled && allCardsFlipped)}
                    onFlip={() => handleCardFlip(film.filmKey)}
                    onGenreClick={onGenreClick}
                    onWatchlistChange={onWatchlistChange}
                    onDirectorClick={onDirectorClick}
                    showWatchedToggle={isInFavoritesView}
                    isWatched={watchedMovies.has(film.filmKey)}
                    onWatchedToggle={onWatchedChange}
                    isPresentationMode={rowJumpEnabled}
                  />
                </motion.div>
              ))}
            </AnimatePresence>
          </motion.div>
        ) : rowJumpEnabled ? (
          <AnimatePresence mode="wait">
            <motion.div 
              className="grid grid-cols-2 md:grid-cols-4 gap-8 w-full [&>*]:max-w-none"
              key={currentRowIndex}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ 
                duration: 0.2,
                ease: "easeOut"
              }}
            >
              {visibleFilms.map(film => (
                <div key={film.filmKey} data-film-card>
                  <FilmCard 
                    film={film} 
                    isFlipped={flippedCard === film.filmKey || (rowJumpEnabled && allCardsFlipped)}
                    onFlip={() => handleCardFlip(film.filmKey)}
                    onGenreClick={onGenreClick}
                    onWatchlistChange={onWatchlistChange}
                    onDirectorClick={onDirectorClick}
                    showWatchedToggle={isInFavoritesView}
                    isWatched={watchedMovies.has(film.filmKey)}
                    onWatchedToggle={onWatchedChange}
                    isPresentationMode={rowJumpEnabled}
                  />
                </div>
              ))}
            </motion.div>
          </AnimatePresence>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {visibleFilms.map(film => (
              <div key={film.filmKey} data-film-card>
                <FilmCard 
                  film={film} 
                  isFlipped={flippedCard === film.filmKey || (rowJumpEnabled && allCardsFlipped)}
                  onFlip={() => handleCardFlip(film.filmKey)}
                  onGenreClick={onGenreClick}
                  onWatchlistChange={onWatchlistChange}
                  onDirectorClick={onDirectorClick}
                  showWatchedToggle={isInFavoritesView}
                  isWatched={watchedMovies.has(film.filmKey)}
                  onWatchedToggle={onWatchedChange}
                  isPresentationMode={rowJumpEnabled}
                />
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Share Modal */}
      {showExportImportModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <WatchlistExportImport
            onClose={() => setShowExportImportModal(false)}
          />
        </div>
      )}

      {/* Presentation Filters */}
      {showFilters && rowJumpEnabled && filters && onFiltersChange && (
        <PresentationFilters
          filters={filters}
          onFiltersChange={onFiltersChange}
          availableYears={availableYears}
          availableFestivals={availableFestivals}
          availablePlatforms={availablePlatforms}
          availableCountries={availableCountries}
          availableGenres={availableGenres}
          onClose={() => setShowFilters(false)}
          onSaveDefaults={onSaveDefaults}
          onResetDefaults={onResetDefaults}
        />
      )}

      {/* Help Overlay */}
      {showHelpOverlay && rowJumpEnabled && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-2xl max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-gray-900">Keyboard Shortcuts</h3>
              <button
                onClick={() => setShowHelpOverlay(false)}
                className="p-2 rounded-full hover:bg-gray-100 text-gray-500 hover:text-gray-700 transition-colors"
                title="Close help"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <div className="space-y-4">
              <div className="grid gap-3">
                <div className="flex items-center justify-between">
                  <span className="text-gray-700">Toggle presentation mode</span>
                  <kbd className="px-2 py-1 text-sm bg-gray-100 rounded border font-mono">P</kbd>
                </div>
                
                <div className="flex items-center justify-between">
                  <span className="text-gray-700">Navigate up/down</span>
                  <div className="flex gap-1">
                    <kbd className="px-2 py-1 text-sm bg-gray-100 rounded border font-mono">↑</kbd>
                    <kbd className="px-2 py-1 text-sm bg-gray-100 rounded border font-mono">↓</kbd>
                  </div>
                </div>
                
                <div className="flex items-center justify-between">
                  <span className="text-gray-700">Toggle filters</span>
                  <kbd className="px-2 py-1 text-sm bg-gray-100 rounded border font-mono">Tab</kbd>
                </div>
                
                <div className="flex items-center justify-between">
                  <span className="text-gray-700">Show/hide help</span>
                  <kbd className="px-2 py-1 text-sm bg-gray-100 rounded border font-mono">H</kbd>
                </div>
                
                <div className="flex items-center justify-between">
                  <span className="text-gray-700">Toggle all card flips</span>
                  <kbd className="px-2 py-1 text-sm bg-gray-100 rounded border font-mono">Space</kbd>
                </div>
                
                <div className="flex items-center justify-between">
                  <span className="text-gray-700">Flip individual cards</span>
                  <div className="flex gap-1">
                    <kbd className="px-2 py-1 text-sm bg-gray-100 rounded border font-mono">1</kbd>
                    <kbd className="px-2 py-1 text-sm bg-gray-100 rounded border font-mono">2</kbd>
                    <kbd className="px-2 py-1 text-sm bg-gray-100 rounded border font-mono">3</kbd>
                    <kbd className="px-2 py-1 text-sm bg-gray-100 rounded border font-mono">4</kbd>
                  </div>
                </div>
                
                <div className="flex items-center justify-between">
                  <span className="text-gray-700">Exit/close</span>
                  <kbd className="px-2 py-1 text-sm bg-gray-100 rounded border font-mono">Esc</kbd>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

