'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { MagnifyingGlassIcon, HeartIcon } from '@heroicons/react/24/outline';
import { HeartIcon as HeartIconSolid } from '@heroicons/react/24/solid';
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
    selectedPlatforms: [],
    searchQuery: ''
  });
  
  const [sortBy, setSortBy] = useState<SortOption>('year-desc');
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
    if (filters.searchQuery.trim()) {
      const query = filters.searchQuery.toLowerCase();
      result = result.filter(film =>
        film.title.toLowerCase().includes(query) ||
        film.director?.toLowerCase().includes(query) ||
        film.synopsis?.toLowerCase().includes(query) ||
        film.genres?.some(genre => genre.toLowerCase().includes(query)) ||
        film.cast?.some(actor => actor.toLowerCase().includes(query)) ||
        film.country?.toLowerCase().includes(query)
      );
    }
    
    return sortFilms(result, sortBy);
  }, [films, filters, sortBy, watchlistVersion]);
  
  // Count streaming films
  const streamingCount = useMemo(() => 
    films.filter(f => f.hasStreaming).length,
    [films]
  );
  
  // Create festival display names for header
  const festivalDisplayNames: Record<string, string> = {
    'bergen': 'Bergen',
    'berlin': 'Berlin',
    'cannes': 'Cannes',
    'venice': 'Venice'
  };
  
  const festivalNamesText = availableFestivals
    .map(festival => festivalDisplayNames[festival] || festival)
    .sort()
    .join(', ')
    .replace(/, ([^,]*)$/, ' & $1'); // Replace last comma with &
  
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-[#1A1A2E] shadow-lg border-b-4 border-[#FFB800]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-bold text-[#FFB800] mb-2 flex items-center gap-3">
                <span className="text-5xl">🎬</span>
                <span>Film Festival Browser</span>
              </h1>
              <p className="text-white/90 text-lg font-medium">
                {films.length} films from {festivalNamesText} • {streamingCount} available for streaming in Norway
              </p>
            </div>
            <div>
              <Link
                href="/search"
                className="inline-flex items-center px-4 py-2 border border-[#FFB800] text-[#FFB800] rounded-lg hover:bg-[#FFB800] hover:text-[#1A1A2E] transition-colors font-medium"
              >
                <MagnifyingGlassIcon className="h-5 w-5 mr-2" />
                Discover Movies
              </Link>
            </div>
          </div>
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
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 placeholder:text-gray-400"
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
              watchlistOnly={filters.watchlistOnly}
              onWatchlistToggle={() => {
                if (filters.watchlistOnly) {
                  // If already active, just turn it off
                  setFilters(prev => ({ ...prev, watchlistOnly: false }));
                } else {
                  // Clear all filters first, then set watchlist filter
                  setFilters({
                    festivals: [],
                    years: [],
                    countries: [],
                    genres: [],
                    awardedOnly: false,
                    watchlistOnly: true,
                    showStreaming: false,
                    showRentBuy: false,
                    selectedPlatforms: [],
                    searchQuery: ''
                  });
                }
              }}
              awardedOnly={filters.awardedOnly}
              onAwardedToggle={() => setFilters(prev => ({ ...prev, awardedOnly: !prev.awardedOnly }))}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

