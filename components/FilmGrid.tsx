'use client';

import { useState } from 'react';
import type { Film } from '@/lib/types';
import FilmCard from './FilmCard';

interface FilmGridProps {
  films: Film[];
  sortBy: string;
  onSortChange: (sort: string) => void;
  onGenreClick?: (genre: string) => void;
}

export default function FilmGrid({ films, sortBy, onSortChange, onGenreClick }: FilmGridProps) {
  const [flippedCard, setFlippedCard] = useState<string | null>(null);

  const handleCardFlip = (filmKey: string) => {
    // If the same card is clicked, close it. Otherwise, open the new one.
    setFlippedCard(flippedCard === filmKey ? null : filmKey);
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
    <div>
      <div className="mb-4 flex items-center justify-between">
        <div className="text-sm text-gray-900">
          Showing <span className="font-semibold">{films.length}</span> film{films.length !== 1 ? 's' : ''}
        </div>
        
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
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {films.map(film => (
          <FilmCard 
            key={film.filmKey} 
            film={film} 
            isFlipped={flippedCard === film.filmKey}
            onFlip={() => handleCardFlip(film.filmKey)}
            onGenreClick={onGenreClick}
          />
        ))}
      </div>
    </div>
  );
}

