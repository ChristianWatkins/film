'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { HeartIcon as HeartIconSolid } from '@heroicons/react/24/solid';
import { FaTrophy } from 'react-icons/fa';
import { shouldEnableCardAnimations } from '@/lib/streaming-config';
import type { Film } from '@/lib/types';
import FilmCard from './FilmCard';
import WatchlistExportImport from './WatchlistExportImport';

interface FilmGridProps {
  films: Film[];
  sortBy: string;
  onSortChange: (sort: string) => void;
  onGenreClick?: (genre: string) => void;
  onWatchlistChange?: () => void;
  watchlistOnly?: boolean;
  onWatchlistToggle?: () => void;
  awardedOnly?: boolean;
  onAwardedToggle?: () => void;
  onDirectorClick?: (director: string) => void;
}

export default function FilmGrid({ 
  films, 
  sortBy, 
  onSortChange, 
  onGenreClick, 
  onWatchlistChange, 
  watchlistOnly = false,
  onWatchlistToggle,
  awardedOnly = false,
  onAwardedToggle,
  onDirectorClick
}: FilmGridProps) {
  const [flippedCard, setFlippedCard] = useState<string | null>(null);
  const [showExportImportModal, setShowExportImportModal] = useState(false);
  const enableAnimations = shouldEnableCardAnimations();

  const handleCardFlip = (filmKey: string) => {
    // If the same card is clicked, close it. Otherwise, open the new one.
    setFlippedCard(flippedCard === filmKey ? null : filmKey);
  };

  const handleImportSuccess = () => {
    // Refresh the watchlist display
    onWatchlistChange?.();
  };

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
  
  return (
    <div data-film-grid>
      <div className="mb-4 flex items-center justify-between">
        <div className="text-sm text-gray-900">
          Showing <span className="font-semibold">{films.length}</span> film{films.length !== 1 ? 's' : ''}
        </div>
        
        <div className="flex items-center gap-3">
          {/* Awards Button */}
          {onAwardedToggle && (
            <button
              onClick={onAwardedToggle}
              className={`p-2 rounded-full transition-all duration-200 cursor-pointer hover:scale-110 hover:shadow-md transform ${
                awardedOnly 
                  ? 'bg-yellow-100 hover:bg-yellow-200 text-yellow-600' 
                  : 'bg-gray-100 hover:bg-gray-200 text-gray-400'
              }`}
              title={awardedOnly ? "Show all films" : "Show awarded films only"}
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

          {/* Favourites Button */}
          {onWatchlistToggle && (
            <button
              onClick={onWatchlistToggle}
              className={`p-2 rounded-full transition-all duration-200 cursor-pointer hover:scale-110 hover:shadow-md transform ${
                watchlistOnly 
                  ? 'bg-red-100 hover:bg-red-200 text-red-600' 
                  : 'bg-gray-100 hover:bg-gray-200 text-gray-400'
              }`}
              title={watchlistOnly ? "Show all films" : "Show favourites only"}
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
          
          {/* Sort dropdown */}
          <select
            value={sortBy}
            onChange={(e) => onSortChange(e.target.value)}
            className="px-3 py-1.5 border border-gray-300 rounded bg-white text-gray-900 text-sm font-medium focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="year-desc">Year ↓</option>
            <option value="year-asc">Year ↑</option>
            <option value="title-asc">A-Z</option>
            <option value="title-desc">Z-A</option>
          </select>
        </div>
      </div>
      
      {enableAnimations ? (
        <motion.div 
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6"
          layout
        >
          <AnimatePresence mode="sync">
            {films.map((film, index) => (
              <motion.div
                key={film.filmKey}
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
                  isFlipped={flippedCard === film.filmKey}
                  onFlip={() => handleCardFlip(film.filmKey)}
                  onGenreClick={onGenreClick}
                  onWatchlistChange={onWatchlistChange}
                  onDirectorClick={onDirectorClick}
                />
              </motion.div>
            ))}
          </AnimatePresence>
        </motion.div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {films.map(film => (
            <FilmCard 
              key={film.filmKey}
              film={film} 
              isFlipped={flippedCard === film.filmKey}
              onFlip={() => handleCardFlip(film.filmKey)}
              onGenreClick={onGenreClick}
              onWatchlistChange={onWatchlistChange}
              onDirectorClick={onDirectorClick}
            />
          ))}
        </div>
      )}

      {/* Export/Import Modal */}
      {showExportImportModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <WatchlistExportImport
            onImportSuccess={handleImportSuccess}
            onClose={() => setShowExportImportModal(false)}
          />
        </div>
      )}
    </div>
  );
}

