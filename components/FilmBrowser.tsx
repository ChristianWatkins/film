'use client';

import { useState, useMemo, useEffect } from 'react';
import type { Film, FilterState } from '@/lib/types';
import { applyFilters, sortFilms, type SortOption } from '@/lib/filters';
import { useAuth } from '@/lib/auth-context';
import Filters from './Filters';
import FilmGrid from './FilmGrid';
import UserMenu from './UserMenu';
import AuthModal from './AuthModal';

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
  const [userWatchlistFilmKeys, setUserWatchlistFilmKeys] = useState<string[]>([]);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const { user } = useAuth();

  // Load user watchlist when user changes
  useEffect(() => {
    if (user) {
      loadUserWatchlist();
    } else {
      setUserWatchlistFilmKeys([]);
    }
  }, [user, watchlistVersion]);

  const loadUserWatchlist = async () => {
    if (!user) return;
    
    try {
      const res = await fetch('/api/watchlist');
      if (res.ok) {
        const data = await res.json();
        if (data.success && data.watchlist) {
          const filmKeys = data.watchlist.map((item: any) => item.filmKey);
          setUserWatchlistFilmKeys(filmKeys);
        }
      }
    } catch (error) {
      console.error('Error loading watchlist:', error);
    }
  };
  
  // Handle auth required from filters or film cards
  const handleAuthRequired = () => {
    setShowAuthModal(true);
  };

  const handleAuthSuccess = () => {
    // Refresh watchlist when user logs in
    setWatchlistVersion(v => v + 1);
  };

  // Handle genre click from cards
  const handleGenreClick = (genre: string) => {
    const newGenres = filters.genres.includes(genre)
      ? filters.genres.filter(g => g !== genre) // Remove if already selected
      : [...filters.genres, genre]; // Add if not selected
    
    setFilters({ ...filters, genres: newGenres });
  };
  
  // Apply filters and sorting
  const filteredAndSortedFilms = useMemo(() => {
    let result = applyFilters(films, filters, userWatchlistFilmKeys);
    
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
  }, [films, filters, sortBy, userWatchlistFilmKeys]);
  
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
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-4xl font-bold text-[#FFB800] mb-2 flex items-center gap-3">
                <span className="text-5xl">🎬</span>
                <span>Film Festival Browser</span>
              </h1>
              <p className="text-white/90 text-lg font-medium">
                {films.length} films from {festivalNamesText} • {streamingCount} available for streaming in Norway
              </p>
            </div>
            <UserMenu />
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
              onAuthRequired={handleAuthRequired}
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
              onAuthRequired={handleAuthRequired}
            />
          </div>
        </div>
      </div>

      {/* Auth Modal */}
      <AuthModal 
        isOpen={showAuthModal}
        onClose={() => setShowAuthModal(false)}
        onSuccess={handleAuthSuccess}
      />
    </div>
  );
}

