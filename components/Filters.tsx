'use client';

import { useState, useEffect } from 'react';
import { FaTrophy } from 'react-icons/fa';
import type { FilterState } from '@/lib/types';

interface FiltersProps {
  filters: FilterState;
  onChange: (filters: FilterState) => void;
  availableYears: number[];
  availableFestivals: string[];
  availablePlatforms: string[];
  availableCountries: string[];
  availableGenres: string[];
}

export default function Filters({
  filters,
  onChange,
  availableYears,
  availableFestivals,
  availablePlatforms,
  availableCountries,
  availableGenres
}: FiltersProps) {
  
  // Map internal festival names to display names
  const festivalDisplayNames: Record<string, string> = {
    'arthaus': 'Arthaus',
    'bergen': 'BIFF',
    'berlin': 'Berlinale', 
    'cannes': 'Cannes',
    'haugesund': 'Haugesund',
    'venice': 'Venice'
  };
  
  const toggleYear = (year: number) => {
    const newYears = filters.years.includes(year)
      ? filters.years.filter(y => y !== year)
      : [...filters.years, year];
    onChange({ ...filters, years: newYears });
  };

  // New function to toggle year ranges
  const toggleYearRange = (range: string) => {
    let yearsToToggle: number[] = [];
    
    switch (range) {
      case 'pre-2000':
        yearsToToggle = availableYears.filter(y => y <= 1999);
        break;
      case '2000-2009':
        yearsToToggle = availableYears.filter(y => y >= 2000 && y <= 2009);
        break;
      case '2010-2019':
        yearsToToggle = availableYears.filter(y => y >= 2010 && y <= 2019);
        break;
    }
    
    // Check if all years in range are selected
    const allSelected = yearsToToggle.every(year => filters.years.includes(year));
    
    if (allSelected) {
      // Remove all years in this range
      const newYears = filters.years.filter(year => !yearsToToggle.includes(year));
      onChange({ ...filters, years: newYears });
    } else {
      // Add all years in this range
      const newYears = [...new Set([...filters.years, ...yearsToToggle])];
      onChange({ ...filters, years: newYears });
    }
  };

  // Function to check if a year range is selected
  const isYearRangeSelected = (range: string): boolean => {
    let yearsInRange: number[] = [];
    
    switch (range) {
      case 'pre-2000':
        yearsInRange = availableYears.filter(y => y <= 1999);
        break;
      case '2000-2009':
        yearsInRange = availableYears.filter(y => y >= 2000 && y <= 2009);
        break;
      case '2010-2019':
        yearsInRange = availableYears.filter(y => y >= 2010 && y <= 2019);
        break;
    }
    
    return yearsInRange.length > 0 && yearsInRange.every(year => filters.years.includes(year));
  };

  // Function to check if any year in range is selected (for partial selection indicator)
  const isYearRangePartiallySelected = (range: string): boolean => {
    let yearsInRange: number[] = [];
    
    switch (range) {
      case 'pre-2000':
        yearsInRange = availableYears.filter(y => y <= 1999);
        break;
      case '2000-2009':
        yearsInRange = availableYears.filter(y => y >= 2000 && y <= 2009);
        break;
      case '2010-2019':
        yearsInRange = availableYears.filter(y => y >= 2010 && y <= 2019);
        break;
    }
    
    return yearsInRange.some(year => filters.years.includes(year)) && !isYearRangeSelected(range);
  };
  
  const toggleFestival = (festival: string) => {
    const newFestivals = filters.festivals.includes(festival)
      ? filters.festivals.filter(f => f !== festival)
      : [...filters.festivals, festival];
    onChange({ ...filters, festivals: newFestivals });
  };
  
  const toggleCountry = (country: string) => {
    const newCountries = filters.countries.includes(country)
      ? filters.countries.filter(c => c !== country)
      : [...filters.countries, country];
    onChange({ ...filters, countries: newCountries });
  };
  
  const togglePlatform = (platform: string) => {
    const newPlatforms = filters.selectedPlatforms.includes(platform)
      ? filters.selectedPlatforms.filter(p => p !== platform)
      : [...filters.selectedPlatforms, platform];
    onChange({ ...filters, selectedPlatforms: newPlatforms });
  };
  
  const toggleGenre = (genre: string) => {
    const newGenres = filters.genres.includes(genre)
      ? filters.genres.filter(g => g !== genre)
      : [...filters.genres, genre];
    onChange({ ...filters, genres: newGenres });
  };
  
  const clearGenres = () => {
    onChange({ ...filters, genres: [] });
  };
  
  const clearPlatforms = () => {
    onChange({ ...filters, selectedPlatforms: [] });
  };
  
  const clearAllFilters = () => {
    onChange({
      festivals: [],
      years: [],
      countries: [],
      genres: [],
      awardedOnly: false,
      watchlistOnly: false,
      showStreaming: false,
      showRentBuy: false,
      selectedPlatforms: [],
      searchQuery: ''
    });
  };
  
  const hasActiveFilters = 
    filters.festivals.length > 0 ||
    filters.years.length > 0 ||
    filters.countries.length > 0 ||
    filters.genres.length > 0 ||
    filters.awardedOnly ||
    filters.watchlistOnly ||
    filters.showStreaming ||
    filters.showRentBuy ||
    filters.selectedPlatforms.length > 0 ||
    filters.searchQuery.trim().length > 0;
  
  // Collapsible section state
  const [expandedSections, setExpandedSections] = useState({
    festival: false,
    year: false,
    country: false,
    platforms: false,
    genres: false,
    availability: false,
    special: false
  });
  
  // Search states for filterable sections
  const [countrySearch, setCountrySearch] = useState('');
  const [platformSearch, setPlatformSearch] = useState('');
  
  // Platform merging function to combine duplicate platforms
  const mergePlatforms = (platforms: string[]): string[] => {
    const platformMap = new Map<string, string>();
    
    platforms.forEach(platform => {
      // Normalize platform names by removing variations
      let baseName = platform;
      
      // Netflix variations
      if (platform.toLowerCase().includes('netflix')) {
        baseName = 'Netflix';
      }
      // Amazon variations
      else if (platform.toLowerCase().includes('amazon')) {
        baseName = 'Amazon Prime Video';
      }
      // Apple variations
      else if (platform.toLowerCase().includes('apple')) {
        baseName = 'Apple TV';
      }
      
      // Store the base name
      platformMap.set(baseName, baseName);
    });
    
    return Array.from(platformMap.values()).sort();
  };
  
  // Function to get display name for platforms
  const getPlatformDisplayName = (platform: string): string => {
    if (platform === 'Cineasterna') {
      return 'Cineast';
    }
    return platform;
  };
  
  // Get merged platforms
  const mergedPlatforms = mergePlatforms(availablePlatforms);
  
  const toggleSection = (section: 'festival' | 'year' | 'country' | 'platforms' | 'genres' | 'availability' | 'special') => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };
  
  const scrollToFilms = () => {
    // Find the film grid container and scroll to it
    const filmGrid = document.querySelector('[data-film-grid]');
    if (filmGrid) {
      filmGrid.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const scrollToFilters = () => {
    // Scroll to top of page where filters are
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Track scroll position to determine which button to show
  const [showFilmsButton, setShowFilmsButton] = useState(true);

  useEffect(() => {
    const handleScroll = () => {
      const filmGrid = document.querySelector('[data-film-grid]');
      if (filmGrid) {
        const rect = filmGrid.getBoundingClientRect();
        // If film grid is visible (top of grid is above bottom of viewport)
        setShowFilmsButton(rect.top > window.innerHeight * 0.5);
      }
    };

    window.addEventListener('scroll', handleScroll);
    handleScroll(); // Check initial position

    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <>
      {/* Floating Action Button - Mobile Only */}
      <div className="lg:hidden fixed bottom-6 right-6 z-50">
        <button
          onClick={showFilmsButton ? scrollToFilms : scrollToFilters}
          className="bg-[#FFB800] hover:bg-[#E6A600] text-[#1A1A2E] font-semibold py-3 px-4 rounded-full shadow-2xl hover:shadow-3xl transition-all duration-200 flex items-center gap-2 cursor-pointer"
          style={{ boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.3), 0 10px 10px -5px rgba(0, 0, 0, 0.04)' }}
        >
          <span className="text-sm">
            {showFilmsButton ? 'Films' : 'Filters'}
          </span>
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path 
              strokeLinecap="round" 
              strokeLinejoin="round" 
              strokeWidth={2} 
              d={showFilmsButton ? "M19 14l-7 7m0 0l-7-7m7 7V3" : "M5 10l7-7m0 0l7 7m-7-7v18"} 
            />
          </svg>
        </button>
      </div>
      
      {/* Filters Box */}
      <div className="bg-white rounded-lg shadow-lg overflow-hidden sticky top-4 max-h-[calc(100vh-2rem)] flex flex-col border border-gray-200">
        {/* Enhanced Filters Header */}
        <div className="bg-gradient-to-r from-gray-100 to-gray-200 px-6 py-4 flex items-center justify-between border-b border-gray-300">
          <h2 className="text-xl font-bold text-gray-800">Filters</h2>
        </div>
      
      {/* Search Field */}
      <div className="p-6 border-b border-gray-200 bg-white">
        <div className="relative">
          <input
            type="text"
            placeholder="Search films, directors, genres, cast..."
            value={filters.searchQuery}
            onChange={(e) => onChange({ ...filters, searchQuery: e.target.value })}
            className="w-full px-4 py-3 pl-10 pr-4 text-sm text-gray-900 border border-gray-300 rounded-lg focus:ring-2 focus:ring-slate-400 focus:border-transparent transition-all placeholder:text-gray-400"
          />
          <svg 
            className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400"
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          {filters.searchQuery && (
            <button
              onClick={() => onChange({ ...filters, searchQuery: '' })}
              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>
      </div>
      
      {/* Active Filters Summary */}
      {hasActiveFilters && (
        <div className="mx-6 mt-4">
          <div className="border border-slate-200 rounded-lg overflow-hidden bg-slate-50/50">
            <div className="px-4 py-3 bg-gradient-to-r from-slate-50 to-slate-100 border-b border-slate-200">
              <div className="w-full flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-slate-700">Active Filters</span>
                  <span className="bg-slate-600 text-white text-xs px-2 py-1 rounded-full font-medium">
                    {[
                      filters.searchQuery.trim() ? 1 : 0,
                      filters.genres.length,
                      filters.countries.length,
                      filters.festivals.length,
                      filters.years.length,
                      filters.showStreaming ? 1 : 0,
                      filters.showRentBuy ? 1 : 0,
                      filters.watchlistOnly ? 1 : 0,
                      filters.awardedOnly ? 1 : 0,
                      filters.selectedPlatforms.length
                    ].reduce((sum, count) => sum + count, 0)}
                  </span>
                </div>
                <button 
                  onClick={clearAllFilters}
                  className="text-xs text-slate-600 hover:text-slate-700 hover:underline transition-colors font-medium"
                >
                  Clear all
                </button>
              </div>
            </div>
            
            <div className="px-4 py-4 bg-white">
              <div className="flex flex-wrap gap-2">
              {filters.searchQuery && (
                  <span className="inline-flex items-center bg-slate-600 text-white text-xs px-3 py-1.5 rounded-full shadow-sm font-medium">
                    Search: "{filters.searchQuery}"
                    <button
                      onClick={() => onChange({ ...filters, searchQuery: '' })}
                      className="ml-2 text-slate-300 hover:text-white transition-colors"
                    >
                      ×
                    </button>
                  </span>
                )}
                {filters.genres.map(genre => (
                  <span key={`active-genre-${genre}`} className="inline-flex items-center bg-slate-600 text-white text-xs px-3 py-1.5 rounded-full shadow-sm font-medium">
                    {genre}
                    <button
                      onClick={() => onChange({ ...filters, genres: filters.genres.filter(g => g !== genre) })}
                      className="ml-2 text-slate-300 hover:text-white transition-colors"
                    >
                      ×
                    </button>
                  </span>
                ))}
                                {filters.countries.map(country => (
                  <span key={`active-country-${country}`} className="inline-flex items-center bg-slate-600 text-white text-xs px-3 py-1.5 rounded-full shadow-sm font-medium">
                    {country}
                    <button
                      onClick={() => onChange({ ...filters, countries: filters.countries.filter(c => c !== country) })}
                      className="ml-2 text-slate-300 hover:text-white transition-colors"
                    >
                      <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                      </svg>
                    </button>
                  </span>
                ))}
                {filters.festivals.map(festival => (
                  <span key={`active-festival-${festival}`} className="inline-flex items-center bg-slate-600 text-white text-xs px-3 py-1.5 rounded-full shadow-sm font-medium">
                    {festival}
                    <button
                      onClick={() => onChange({ ...filters, festivals: filters.festivals.filter(f => f !== festival) })}
                      className="ml-2 text-slate-300 hover:text-white transition-colors"
                    >
                      <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                      </svg>
                    </button>
                  </span>
                ))}
                {filters.years.map(year => (
                  <span key={`active-year-${year}`} className="inline-flex items-center bg-slate-600 text-white text-xs px-3 py-1.5 rounded-full shadow-sm font-medium">
                    {year}
                    <button 
                      onClick={() => toggleYear(year)}
                      className="ml-2 text-slate-300 hover:text-white transition-colors"
                    >
                      ×
                    </button>
                  </span>
                ))}
                {filters.showStreaming && (
                  <span className="inline-flex items-center bg-slate-600 text-white text-xs px-3 py-1.5 rounded-full shadow-sm font-medium">
                    Streaming
                    <button
                      onClick={() => onChange({ ...filters, showStreaming: false })}
                      className="ml-2 text-slate-300 hover:text-white transition-colors"
                    >
                      ×
                    </button>
                  </span>
                )}
                {filters.showRentBuy && (
                  <span className="inline-flex items-center bg-slate-600 text-white text-xs px-3 py-1.5 rounded-full shadow-sm font-medium">
                    Rent/Buy
                    <button
                      onClick={() => onChange({ ...filters, showRentBuy: false })}
                      className="ml-2 text-slate-300 hover:text-white transition-colors"
                    >
                      ×
                    </button>
                  </span>
                )}
                {filters.watchlistOnly && (
                  <span className="inline-flex items-center bg-slate-600 text-white text-xs px-3 py-1.5 rounded-full shadow-sm font-medium">
                    My Watchlist
                    <button
                      onClick={() => onChange({ ...filters, watchlistOnly: false })}
                      className="ml-2 text-slate-300 hover:text-white transition-colors"
                    >
                      ×
                    </button>
                  </span>
                )}
                {filters.awardedOnly && (
                  <span className="inline-flex items-center bg-slate-600 text-white text-xs px-3 py-1.5 rounded-full shadow-sm font-medium">
                    Awarded Films
                    <button
                      onClick={() => onChange({ ...filters, awardedOnly: false })}
                      className="ml-2 text-slate-300 hover:text-white transition-colors"
                    >
                      ×
                    </button>
                  </span>
                )}
                {filters.selectedPlatforms.map(platform => (
                  <span key={`active-platform-${platform}`} className="inline-flex items-center bg-slate-600 text-white text-xs px-3 py-1.5 rounded-full shadow-sm font-medium">
                    {getPlatformDisplayName(platform)}
                    <button
                      onClick={() => onChange({ ...filters, selectedPlatforms: filters.selectedPlatforms.filter(p => p !== platform) })}
                      className="ml-2 text-slate-300 hover:text-white transition-colors"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Filter content - scrollable */}
      <div className="p-6 overflow-y-auto space-y-6">
      
      {/* Availability Filter - Pill Layout */}
      <div className="mb-4">
        <div className="border border-gray-200 rounded-lg overflow-hidden">
          <div className="px-4 py-3 bg-gradient-to-r from-gray-50 to-gray-100 border-b border-gray-200">
            <div className="w-full flex items-center justify-between">
              <button
                className="flex items-center gap-2 text-left flex-grow"
                onClick={() => toggleSection('availability')}
              >
                <span className="font-medium text-gray-700">Availability</span>
                {(filters.showStreaming || filters.showRentBuy) && (
                  <span className="bg-slate-600 text-white text-xs px-2 py-1 rounded-full font-medium">
                    {(filters.showStreaming ? 1 : 0) + (filters.showRentBuy ? 1 : 0)}
                  </span>
                )}
              </button>
              <div className="flex items-center gap-2">
                {(filters.showStreaming || filters.showRentBuy) && (
                  <button
                    onClick={() => onChange({ ...filters, showStreaming: false, showRentBuy: false })}
                    className="text-xs text-red-600 hover:text-red-700 hover:underline transition-colors"
                  >
                    Clear
                  </button>
                )}
                <button
                  onClick={() => toggleSection('availability')}
                  className="p-1"
                >
                  <svg className={`w-5 h-5 transition-transform duration-200 text-gray-600 ${expandedSections.availability ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
          
          {expandedSections.availability && (
            <div className="px-4 py-4 bg-white">
              <div className="space-y-3">
                {/* All Films Button */}
                <button
                  onClick={() => onChange({ ...filters, showStreaming: false, showRentBuy: false })}
                  className={`w-full px-4 py-2 rounded-full border-2 text-sm font-medium transition-all duration-200 hover:scale-105 flex items-center justify-center gap-2 ${
                    (!filters.showStreaming && !filters.showRentBuy)
                      ? 'bg-slate-600 border-slate-600 text-white shadow-md'
                      : 'bg-white border-gray-300 text-gray-700 hover:border-slate-400 hover:text-slate-600'
                  }`}
                >
                  {!filters.showStreaming && !filters.showRentBuy && (
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                  )}
                  All Films
                </button>
                
                {/* Streaming Toggle */}
                <div className="flex items-center justify-between py-1 px-2 rounded hover:bg-gray-50 transition-colors">
                  <span className="text-sm font-medium text-gray-900">Streaming</span>
                  <button
                    onClick={() => onChange({ ...filters, showStreaming: !filters.showStreaming })}
                    className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-slate-400 focus:ring-offset-1 ${
                      filters.showStreaming ? 'bg-slate-600' : 'bg-gray-200'
                    }`}
                  >
                    <span
                      className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform ${
                        filters.showStreaming ? 'translate-x-5' : 'translate-x-1'
                      }`}
                    />
                  </button>
                </div>
                
                {/* Rent/Buy Toggle */}
                <div className="flex items-center justify-between py-1 px-2 rounded hover:bg-gray-50 transition-colors">
                  <span className="text-sm font-medium text-gray-900">Rent/Buy</span>
                  <button
                    onClick={() => onChange({ ...filters, showRentBuy: !filters.showRentBuy })}
                    className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-slate-400 focus:ring-offset-1 ${
                      filters.showRentBuy ? 'bg-slate-600' : 'bg-gray-200'
                    }`}
                  >
                    <span
                      className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform ${
                        filters.showRentBuy ? 'translate-x-5' : 'translate-x-1'
                      }`}
                    />
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
      
      {/* Special Filter - Pill Layout */}
      <div className="mb-4">
        <div className="border border-gray-200 rounded-lg overflow-hidden">
          <div className="px-4 py-3 bg-gradient-to-r from-gray-50 to-gray-100 border-b border-gray-200">
            <div className="w-full flex items-center justify-between">
              <button
                className="flex items-center gap-2 text-left flex-grow"
                onClick={() => toggleSection('special')}
              >
                <span className="font-medium text-gray-700">Special</span>
                {(filters.watchlistOnly || filters.awardedOnly) && (
                  <span className="bg-slate-600 text-white text-xs px-2 py-1 rounded-full font-medium">
                    {(filters.watchlistOnly ? 1 : 0) + (filters.awardedOnly ? 1 : 0)}
                  </span>
                )}
              </button>
              <div className="flex items-center gap-2">
                {(filters.watchlistOnly || filters.awardedOnly) && (
                  <button
                    onClick={() => onChange({ ...filters, watchlistOnly: false, awardedOnly: false })}
                    className="text-xs text-red-600 hover:text-red-700 hover:underline transition-colors"
                  >
                    Clear
                  </button>
                )}
                <button
                  onClick={() => toggleSection('special')}
                  className="p-1"
                >
                  <svg className={`w-5 h-5 transition-transform duration-200 text-gray-600 ${expandedSections.special ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
          
          {expandedSections.special && (
            <div className="px-4 py-4 bg-white">
              <div className="flex flex-wrap gap-2">
                {/* My Watchlist Pill */}
                <button
                  onClick={() => onChange({ ...filters, watchlistOnly: !filters.watchlistOnly })}
                  className={`px-4 py-2 rounded-full border-2 text-sm font-medium transition-all duration-200 hover:scale-105 flex items-center gap-2 ${
                    filters.watchlistOnly
                      ? 'bg-red-500 border-red-500 text-white shadow-md'
                      : 'bg-white border-gray-300 text-gray-700 hover:border-red-400 hover:text-red-600'
                  }`}
                >
                  <svg 
                    className={`w-4 h-4 transition-all duration-200 ${
                      filters.watchlistOnly 
                        ? 'fill-white' 
                        : 'fill-none stroke-current'
                    }`} 
                    stroke="currentColor" 
                    strokeWidth="2" 
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                  </svg>
                  My Watchlist
                </button>
                
                {/* Awarded Films Pill */}
                <button
                  onClick={() => onChange({ ...filters, awardedOnly: !filters.awardedOnly })}
                  className={`px-4 py-2 rounded-full border-2 text-sm font-medium transition-all duration-200 hover:scale-105 flex items-center gap-2 ${
                    filters.awardedOnly
                      ? 'bg-yellow-500 border-yellow-500 text-white shadow-md'
                      : 'bg-white border-gray-300 text-gray-700 hover:border-yellow-400 hover:text-yellow-600'
                  }`}
                >
                  <FaTrophy 
                    className={`w-4 h-4 transition-all duration-200 ${
                      filters.awardedOnly 
                        ? 'text-white' 
                        : 'text-current'
                    }`} 
                  />
                  Awarded Films
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
      
      {/* Festival Filter - Pill Layout */}
      <div className="mb-4">
        <div className="border border-gray-200 rounded-lg overflow-hidden">
          <div className="px-4 py-3 bg-gradient-to-r from-gray-50 to-gray-100 border-b border-gray-200">
            <div className="w-full flex items-center justify-between">
              <button
                className="flex items-center gap-2 text-left flex-grow"
                onClick={() => toggleSection('festival')}
              >
                <span className="font-medium text-gray-700">Festival</span>
                {filters.festivals.length > 0 && (
                  <span className="bg-slate-600 text-white text-xs px-2 py-1 rounded-full font-medium">
                    {filters.festivals.length}
                  </span>
                )}
              </button>
              <div className="flex items-center gap-2">
                {filters.festivals.length > 0 && (
                  <button
                    onClick={() => onChange({ ...filters, festivals: [] })}
                    className="text-xs text-red-600 hover:text-red-700 hover:underline transition-colors"
                  >
                    Clear
                  </button>
                )}
                <button
                  onClick={() => toggleSection('festival')}
                  className="p-1"
                >
                  <svg className={`w-5 h-5 transition-transform duration-200 text-gray-600 ${expandedSections.festival ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
          
          {expandedSections.festival && (
            <div className="px-4 py-4 bg-white">
              <div className="flex flex-wrap gap-2">
                {availableFestivals.map(festival => (
                  <button
                    key={festival}
                    onClick={() => toggleFestival(festival)}
                      className={`px-4 py-2 rounded-full border-2 text-sm font-medium transition-all duration-200 hover:scale-105 ${
                        filters.festivals.includes(festival)
                        ? 'bg-slate-600 border-slate-600 text-white shadow-md'
                        : 'bg-white border-gray-300 text-gray-700 hover:border-slate-400 hover:text-slate-600'
                      }`}
                  >
                    {festivalDisplayNames[festival] || festival}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
      
      {/* Year Filter - Pill Layout */}
      <div className="mb-4">
        <div className="border border-gray-200 rounded-lg overflow-hidden">
          <div className="px-4 py-3 bg-gradient-to-r from-gray-50 to-gray-100 border-b border-gray-200">
            <div className="w-full flex items-center justify-between">
              <button
                className="flex items-center gap-2 text-left flex-grow"
                onClick={() => toggleSection('year')}
              >
                <span className="font-medium text-gray-700">Year</span>
                {filters.years.length > 0 && (
                  <span className="bg-slate-600 text-white text-xs px-2 py-1 rounded-full font-medium">
                    {filters.years.length}
                  </span>
                )}
              </button>
              <div className="flex items-center gap-2">
                {filters.years.length > 0 && (
                  <button
                    onClick={() => onChange({ ...filters, years: [] })}
                    className="text-xs text-red-600 hover:text-red-700 hover:underline transition-colors"
                  >
                    Clear
                  </button>
                )}
                <button
                  onClick={() => toggleSection('year')}
                  className="p-1"
                >
                  <svg className={`w-5 h-5 transition-transform duration-200 text-gray-600 ${expandedSections.year ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
          
          {expandedSections.year && (
            <div className="px-4 py-4 bg-white">
              <div className="flex flex-wrap gap-2">
                {/* Individual year buttons for 2020+ (newest first) */}
                {availableYears
                  .filter(year => year >= 2020)
                  .sort((a, b) => b - a) // Most recent first
                  .map(year => (
                    <button
                      key={year}
                      onClick={() => toggleYear(year)}
                      className={`px-4 py-2 rounded-full border-2 text-sm font-medium transition-all duration-200 hover:scale-105 ${
                        filters.years.includes(year)
                          ? 'bg-slate-600 border-slate-600 text-white shadow-md'
                          : 'bg-white border-gray-300 text-gray-700 hover:border-slate-400 hover:text-slate-600'
                      }`}
                    >
                      {year}
                    </button>
                  ))
                }
                
                {/* Year range buttons for older films (descending order) */}
                {['2010-2019', '2000-2009', 'pre-2000'].map(range => {
                  const isSelected = isYearRangeSelected(range);
                  const isPartial = isYearRangePartiallySelected(range);
                  const yearsInRange = availableYears.filter(y => {
                    if (range === 'pre-2000') return y <= 1999;
                    if (range === '2000-2009') return y >= 2000 && y <= 2009;
                    if (range === '2010-2019') return y >= 2010 && y <= 2019;
                    return false;
                  });
                  
                  if (yearsInRange.length === 0) return null;
                  
                  return (
                    <button
                      key={range}
                      onClick={() => toggleYearRange(range)}
                      className={`px-4 py-2 rounded-full border-2 text-sm font-medium transition-all duration-200 hover:scale-105 ${
                        isSelected
                          ? 'bg-slate-600 border-slate-600 text-white shadow-md'
                          : isPartial
                          ? 'bg-slate-100 border-slate-400 text-slate-700 shadow-sm'
                          : 'bg-white border-gray-300 text-gray-700 hover:border-slate-400 hover:text-slate-600'
                      }`}
                    >
                      {range === 'pre-2000' ? 'Pre-2000' : range}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
      
      {/* Country Filter - Enhanced Collapsible */}
      {availableCountries.length > 0 && (
        <div className="mb-4">
          <div className="border border-gray-200 rounded-lg overflow-hidden">
            <button 
              onClick={() => toggleSection('country')}
              className="w-full px-4 py-3 text-left bg-gradient-to-r from-gray-50 to-gray-100 hover:from-gray-100 hover:to-gray-200 transition-all border-b border-gray-200 flex items-center justify-between"
            >
              <div className="flex items-center">
                <span className="font-medium text-gray-700">Country</span>
                {filters.countries.length > 0 && (
                  <span className="ml-2 bg-slate-600 text-white text-xs px-2 py-1 rounded-full font-medium">
                    {filters.countries.length}
                  </span>
                )}
              </div>
              <svg className={`w-5 h-5 transition-transform duration-200 text-gray-600 ${expandedSections.country ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            
            {expandedSections.country && (
              <div className="bg-white">
                {/* Country Search */}
                <div className="px-4 pt-3 pb-2 border-b border-gray-100">
                  <div className="relative">
                    <input
                      type="text"
                      placeholder="Search countries..."
                      value={countrySearch}
                      onChange={(e) => setCountrySearch(e.target.value)}
                      className="w-full px-3 py-2 pl-8 pr-8 text-sm text-gray-900 border border-gray-300 rounded-md focus:ring-2 focus:ring-slate-400 focus:border-transparent transition-all placeholder:text-gray-400"
                    />
                    <svg 
                      className="absolute left-2 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400"
                      fill="none" 
                      stroke="currentColor" 
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                    {countrySearch && (
                      <button
                        onClick={() => setCountrySearch('')}
                        className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    )}
                  </div>
                </div>
                
                {/* Country List */}
                <div className="px-4 py-3 max-h-48 overflow-y-auto">
                  <div className="space-y-1">
                    {availableCountries
                      .filter(country => 
                        country.toLowerCase().includes(countrySearch.toLowerCase())
                      )
                      .map(country => (
                        <label key={country} className="flex items-center py-1 px-2 rounded hover:bg-gray-50 cursor-pointer group">
                          <div className="relative">
                            <input
                              type="checkbox"
                              className="sr-only"
                              checked={filters.countries.includes(country)}
                              onChange={() => toggleCountry(country)}
                            />
                            <div className={`w-4 h-4 rounded border-2 transition-all ${
                              filters.countries.includes(country)
                                ? 'bg-slate-600 border-slate-600'
                                : 'border-gray-300 group-hover:border-slate-400'
                            }`}>
                              {filters.countries.includes(country) && (
                                <svg className="w-3 h-3 text-white absolute top-0.5 left-0.5" fill="currentColor" viewBox="0 0 20 20">
                                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                </svg>
                              )}
                            </div>
                          </div>
                          <span className="ml-3 text-sm text-gray-900">{country}</span>
                        </label>
                      ))}
                    {countrySearch && availableCountries.filter(country => 
                      country.toLowerCase().includes(countrySearch.toLowerCase())
                    ).length === 0 && (
                      <div className="text-center py-4 text-gray-500 text-sm">
                        No countries found matching "{countrySearch}"
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
      
      {/* Genre Filter - Pill Layout */}
      {availableGenres.length > 0 && (
        <div className="mb-4">
          <div className="border border-gray-200 rounded-lg overflow-hidden">
            <div className="w-full px-4 py-3 text-left bg-gradient-to-r from-gray-50 to-gray-100 hover:from-gray-100 hover:to-gray-200 transition-all border-b border-gray-200 flex items-center justify-between">
              <button 
                onClick={() => toggleSection('genres')}
                className="flex items-center gap-2 flex-grow"
              >
                <span className="font-medium text-gray-700">Genre</span>
                {filters.genres.length > 0 && (
                  <span className="bg-slate-600 text-white text-xs px-2 py-1 rounded-full font-medium">
                    {filters.genres.length}
                  </span>
                )}
              </button>
              <div className="flex items-center gap-2">
                {filters.genres.length > 0 && (
                  <button
                    onClick={clearGenres}
                    className="text-xs text-red-600 hover:text-red-700 hover:underline transition-colors"
                  >
                    Clear
                  </button>
                )}
                <button
                  onClick={() => toggleSection('genres')}
                  className="p-1"
                >
                  <svg className={`w-5 h-5 transition-transform duration-200 text-gray-600 ${expandedSections.genres ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
              </div>
            </div>
            
            {expandedSections.genres && (
              <div className="px-4 py-4 bg-white">
                <div className="flex flex-wrap gap-2">
                  {availableGenres.map(genre => (
                    <button
                      key={genre}
                      onClick={() => toggleGenre(genre)}
                      className={`px-4 py-2 rounded-full border-2 text-sm font-medium transition-all duration-200 hover:scale-105 ${
                        filters.genres.includes(genre)
                        ? 'bg-slate-600 border-slate-600 text-white shadow-md'
                        : 'bg-white border-gray-300 text-gray-700 hover:border-slate-400 hover:text-slate-600'
                      }`}
                    >
                      {genre}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
      
      {/* Platform Filter - Enhanced Collapsible */}
      {mergedPlatforms.length > 0 && (
        <div className="mb-4">
          <div className="border border-gray-200 rounded-lg overflow-hidden">
            <div className="w-full px-4 py-3 text-left bg-gradient-to-r from-gray-50 to-gray-100 hover:from-gray-100 hover:to-gray-200 transition-all border-b border-gray-200 flex items-center justify-between">
              <button 
                onClick={() => toggleSection('platforms')}
                className="flex items-center gap-2 flex-grow"
              >
                <span className="font-medium text-gray-700">Platforms</span>
                {filters.selectedPlatforms.length > 0 && (
                  <span className="bg-slate-600 text-white text-xs px-2 py-1 rounded-full font-medium">
                    {filters.selectedPlatforms.length}
                  </span>
                )}
              </button>
              <div className="flex items-center gap-2">
                {filters.selectedPlatforms.length > 0 && (
                  <button
                    onClick={clearPlatforms}
                    className="text-xs text-red-600 hover:text-red-700 hover:underline transition-colors"
                  >
                    Clear
                  </button>
                )}
                <button
                  onClick={() => toggleSection('platforms')}
                  className="p-1"
                >
                  <svg className={`w-5 h-5 transition-transform duration-200 text-gray-600 ${expandedSections.platforms ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
              </div>
            </div>
            
            {expandedSections.platforms && (
              <div className="bg-white">
                {/* Platform Search */}
                <div className="px-4 pt-3 pb-2 border-b border-gray-100">
                  <div className="relative">
                    <input
                      type="text"
                      placeholder="Search platforms..."
                      value={platformSearch}
                      onChange={(e) => setPlatformSearch(e.target.value)}
                      className="w-full px-3 py-2 pl-8 pr-8 text-sm text-gray-900 border border-gray-300 rounded-md focus:ring-2 focus:ring-slate-400 focus:border-transparent transition-all placeholder:text-gray-400"
                    />
                    <svg 
                      className="absolute left-2 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400"
                      fill="none" 
                      stroke="currentColor" 
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                    {platformSearch && (
                      <button
                        onClick={() => setPlatformSearch('')}
                        className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    )}
                  </div>
                </div>
                
                {/* Platform List */}
                <div className="px-4 py-3 max-h-48 overflow-y-auto">
                  <div className="space-y-1">
                    {mergedPlatforms
                      .filter(platform => 
                        platform.toLowerCase().includes(platformSearch.toLowerCase()) ||
                        getPlatformDisplayName(platform).toLowerCase().includes(platformSearch.toLowerCase())
                      )
                      .map(platform => (
                        <label key={platform} className="flex items-center py-1.5 px-2 rounded hover:bg-gray-50 cursor-pointer group">
                          <div className="relative">
                            <input
                              type="checkbox"
                              className="sr-only"
                              checked={filters.selectedPlatforms.includes(platform)}
                              onChange={() => togglePlatform(platform)}
                            />
                            <div className={`w-4 h-4 rounded border-2 transition-all ${
                              filters.selectedPlatforms.includes(platform)
                                ? 'bg-slate-600 border-slate-600'
                                : 'border-gray-300 group-hover:border-slate-400'
                            }`}>
                              {filters.selectedPlatforms.includes(platform) && (
                                <svg className="w-3 h-3 text-white absolute top-0.5 left-0.5" fill="currentColor" viewBox="0 0 20 20">
                                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                </svg>
                              )}
                            </div>
                          </div>
                          <span className="ml-3 text-sm text-gray-900">{getPlatformDisplayName(platform)}</span>
                        </label>
                      ))}
                    {platformSearch && mergedPlatforms.filter(platform => 
                      platform.toLowerCase().includes(platformSearch.toLowerCase()) ||
                      getPlatformDisplayName(platform).toLowerCase().includes(platformSearch.toLowerCase())
                    ).length === 0 && (
                      <div className="text-center py-4 text-gray-500 text-sm">
                        No platforms found matching "{platformSearch}"
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
      </div>
      </div>
    </>
  );
}

