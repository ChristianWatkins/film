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
    excludedCountries: ['United States'],
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
  
  // Handle director click from cards
  const handleDirectorClick = (director: string) => {
    // Clear all filters and set only the search query to the director name
    setFilters({
      festivals: [],
      years: [],
      countries: [],
      excludedCountries: [],
      genres: [],
      awardedOnly: false,
      watchlistOnly: false,
      showStreaming: false,
      showRentBuy: false,
      selectedPlatforms: [],
      searchQuery: director
    });
  };
  
  // Helper function to normalize text for searching (removes accents/diacritics)
  const normalizeForSearch = (text: string): string => {
    return text.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  };
  
  // Apply filters and sorting
  const filteredAndSortedFilms = useMemo(() => {
    let result = applyFilters(films, filters);
    
    // Apply search and tag films with relevance scores
    let hasSearchQuery = false;
    if (filters.searchQuery.trim()) {
      hasSearchQuery = true;
      const query = normalizeForSearch(filters.searchQuery);
      
      // Filter and add relevance score to each film
      result = result
        .filter(film =>
          normalizeForSearch(film.title).includes(query) ||
          (film.director && normalizeForSearch(film.director).includes(query)) ||
          (film.synopsis && normalizeForSearch(film.synopsis).includes(query)) ||
          film.genres?.some(genre => normalizeForSearch(genre).includes(query)) ||
          film.cast?.some(actor => normalizeForSearch(actor).includes(query)) ||
          (film.country && normalizeForSearch(film.country).includes(query))
        )
        .map(film => {
          const normalizedTitle = normalizeForSearch(film.title);
          let relevanceScore = 0;
          
          // Higher score = higher priority
          if (normalizedTitle.startsWith(query)) {
            relevanceScore = 3; // Title starts with query (highest priority)
          } else if (normalizedTitle.includes(query)) {
            relevanceScore = 2; // Title contains query
          } else {
            relevanceScore = 1; // Match in other fields
          }
          
          return { ...film, _relevanceScore: relevanceScore };
        });
    }
    
    // Apply regular sorting
    const sorted = sortFilms(result, sortBy);
    
    // If there's a search query, re-sort by relevance first, then by the regular sort
    if (hasSearchQuery) {
      return sorted.sort((a: any, b: any) => {
        // First, sort by relevance score (descending)
        if (b._relevanceScore !== a._relevanceScore) {
          return b._relevanceScore - a._relevanceScore;
        }
        
        // If relevance is the same, maintain the order from sortFilms
        return 0;
      });
    }
    
    return sorted;
  }, [films, filters, sortBy, watchlistVersion]);
  
  // Count streaming films
  const streamingCount = useMemo(() => 
    films.filter(f => f.hasStreaming).length,
    [films]
  );
  
  // Create festival display names for header
  const festivalDisplayNames: Record<string, string> = {
    'arthaus': 'Arthaus',
    'bergen': 'BIFFa',
    'berlin': 'Berlinale',
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
              {/* Mobile version - shorter text */}
              <div className="md:hidden text-white/90 text-lg font-medium">
                <p>{films.length} festival films</p>
                <p>{streamingCount} available for streaming</p>
              </div>
              {/* Desktop version - full text */}
              <div className="hidden md:block text-white/90 text-lg font-medium">
                <p>{films.length} films from {festivalNamesText}</p>
                <p>{streamingCount} available for streaming in Norway</p>
              </div>
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
              onDirectorClick={handleDirectorClick}
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
                    excludedCountries: [],
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

