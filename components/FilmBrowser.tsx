'use client';

import { useState, useMemo } from 'react';
import type { Film, FilterState } from '@/lib/types';
import { applyFilters, sortFilms, type SortOption } from '@/lib/filters';
import Filters from './Filters';
import FilmGrid from './FilmGrid';

interface FilmBrowserProps {
  films: Film[];
  availableYears: number[];
  availableFestivals: string[];
  availablePlatforms: string[];
  availableCountries: string[];
  availableGenres: string[];
}

export default function FilmBrowser({
  films,
  availableYears,
  availableFestivals,
  availablePlatforms,
  availableCountries,
  availableGenres
}: FilmBrowserProps) {
  const [filters, setFilters] = useState<FilterState>({
    festivals: [],
    years: [],
    countries: [],
    genres: [],
    awardedOnly: false,
    watchlistOnly: false,
    showStreaming: true,  // Default: show streaming films
    showRentBuy: true,    // Default: show rent/buy films
    selectedPlatforms: []
  });
  
  const [sortBy, setSortBy] = useState<SortOption>('year-desc');
  const [searchQuery, setSearchQuery] = useState('');
  const [watchlistVersion, setWatchlistVersion] = useState(0);
  
  // Handle genre click from cards
  const handleGenreClick = (genre: string) => {
    const newGenres = filters.genres.includes(genre)
      ? filters.genres.filter(g => g !== genre) // Remove if already selected
      : [...filters.genres, genre]; // Add if not selected
    
    setFilters({ ...filters, genres: newGenres });
  };
  
  // Apply filters and sorting
  const filteredAndSortedFilms = useMemo(() => {
    let result = applyFilters(films, filters);
    
    // Apply search
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter(film =>
        film.title.toLowerCase().includes(query) ||
        film.director?.toLowerCase().includes(query)
      );
    }
    
    return sortFilms(result, sortBy);
  }, [films, filters, sortBy, searchQuery, watchlistVersion]);
  
  // Count streaming films
  const streamingCount = useMemo(() => 
    films.filter(f => f.hasStreaming).length,
    [films]
  );
  
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-[#1A1A2E] shadow-lg border-b-4 border-[#FFB800]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <h1 className="text-4xl font-bold text-[#FFB800] mb-2 flex items-center gap-3">
            <span className="text-5xl">🎬</span>
            <span>Film Festival Browser</span>
          </h1>
          <p className="text-white/90 text-lg font-medium">
            {films.length} films from Cannes, Bergen & Venice • {streamingCount} available for streaming in Norway
          </p>
        </div>
      </header>
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Search and Sort Bar */}
        {/* <div className="mb-6 flex gap-4 items-center">
          <div className="flex-1">
            <input
              type="search"
              placeholder="Search by title or director..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 placeholder:text-gray-500"
            />
          </div>
        </div> */}
        
        {/* Main Content: Filters + Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Filters Sidebar */}
          <div className="lg:col-span-1">
            <Filters
              filters={filters}
              onChange={setFilters}
              availableYears={availableYears}
              availableFestivals={availableFestivals}
              availablePlatforms={availablePlatforms}
              availableCountries={availableCountries}
              availableGenres={availableGenres}
            />
          </div>
          
          {/* Film Grid */}
          <div className="lg:col-span-3">
            <FilmGrid 
              films={filteredAndSortedFilms} 
              sortBy={sortBy}
              onSortChange={(sort) => setSortBy(sort as SortOption)}
              onGenreClick={handleGenreClick}
              onWatchlistChange={() => setWatchlistVersion(prev => prev + 1)}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

