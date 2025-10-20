'use client';

import { useState } from 'react';
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
    'bergen': 'BIFF',
    'berlin': 'Berlinale',
    'cannes': 'Cannes',
    'venice': 'Venice'
  };
  
  const toggleYear = (year: number) => {
    const newYears = filters.years.includes(year)
      ? filters.years.filter(y => y !== year)
      : [...filters.years, year];
    onChange({ ...filters, years: newYears });
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
      selectedPlatforms: []
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
    filters.selectedPlatforms.length > 0;
  
  // Collapsible section state
  const [expandedSections, setExpandedSections] = useState({
    festival: false,
    year: false,
    country: false,
    platforms: false,
    genres: false
  });
  
  const toggleSection = (section: 'festival' | 'year' | 'country' | 'platforms' | 'genres') => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };
  
  return (
    <div className="bg-white rounded-lg shadow-lg overflow-hidden sticky top-4 max-h-[calc(100vh-2rem)] flex flex-col border border-gray-200">
      {/* Enhanced Filters Header */}
      <div className="bg-gradient-to-r from-gray-800 to-slate-800 px-6 py-4 flex items-center justify-between border-b border-gray-700">
        <h2 className="text-xl font-bold text-white">Filters</h2>
      </div>
      
      {/* Active Filters Summary */}
      {hasActiveFilters && (
        <div className="mx-6 mt-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-blue-800">
              Active Filters
            </span>
            <button 
              onClick={clearAllFilters}
              className="text-xs text-blue-600 hover:text-blue-700 font-medium transition-colors"
            >
              Clear all
            </button>
          </div>
          <div className="flex flex-wrap gap-1">
            {filters.genres.map(genre => (
              <span key={`active-genre-${genre}`} className="inline-flex items-center bg-blue-100 text-blue-800 text-xs px-3 py-1.5 rounded-full border border-blue-200 font-medium">
                {genre}
                <button 
                  onClick={() => toggleGenre(genre)}
                  className="ml-2 text-blue-600 hover:text-blue-800 transition-colors"
                >
                  ×
                </button>
              </span>
            ))}
            {filters.countries.map(country => (
              <span key={`active-country-${country}`} className="inline-flex items-center bg-blue-100 text-blue-800 text-xs px-3 py-1.5 rounded-full border border-blue-200 font-medium">
                {country}
                <button 
                  onClick={() => toggleCountry(country)}
                  className="ml-2 text-blue-600 hover:text-blue-800 transition-colors"
                >
                  ×
                </button>
              </span>
            ))}
            {filters.festivals.map(festival => (
              <span key={`active-festival-${festival}`} className="inline-flex items-center bg-blue-100 text-blue-800 text-xs px-3 py-1.5 rounded-full border border-blue-200 font-medium">
                {festivalDisplayNames[festival] || festival}
                <button 
                  onClick={() => toggleFestival(festival)}
                  className="ml-2 text-blue-600 hover:text-blue-800 transition-colors"
                >
                  ×
                </button>
              </span>
            ))}
            {filters.years.map(year => (
              <span key={`active-year-${year}`} className="inline-flex items-center bg-blue-100 text-blue-800 text-xs px-3 py-1.5 rounded-full border border-blue-200 font-medium">
                {year}
                <button 
                  onClick={() => toggleYear(year)}
                  className="ml-2 text-blue-600 hover:text-blue-800 transition-colors"
                >
                  ×
                </button>
              </span>
            ))}
            {filters.showStreaming && (
              <span className="inline-flex items-center bg-blue-100 text-blue-800 text-xs px-3 py-1.5 rounded-full border border-blue-200 font-medium">
                Streaming
                <button 
                  onClick={() => onChange({ ...filters, showStreaming: false })}
                  className="ml-2 text-blue-600 hover:text-blue-800 transition-colors"
                >
                  ×
                </button>
              </span>
            )}
            {filters.showRentBuy && (
              <span className="inline-flex items-center bg-blue-100 text-blue-800 text-xs px-3 py-1.5 rounded-full border border-blue-200 font-medium">
                Rent/Buy
                <button 
                  onClick={() => onChange({ ...filters, showRentBuy: false })}
                  className="ml-2 text-blue-600 hover:text-blue-800 transition-colors"
                >
                  ×
                </button>
              </span>
            )}
            {filters.watchlistOnly && (
              <span className="inline-flex items-center bg-blue-100 text-blue-800 text-xs px-3 py-1.5 rounded-full border border-blue-200 font-medium">
                My Watchlist
                <button 
                  onClick={() => onChange({ ...filters, watchlistOnly: false })}
                  className="ml-2 text-blue-600 hover:text-blue-800 transition-colors"
                >
                  ×
                </button>
              </span>
            )}
            {filters.awardedOnly && (
              <span className="inline-flex items-center bg-blue-100 text-blue-800 text-xs px-3 py-1.5 rounded-full border border-blue-200 font-medium">
                Awarded Films
                <button 
                  onClick={() => onChange({ ...filters, awardedOnly: false })}
                  className="ml-2 text-blue-600 hover:text-blue-800 transition-colors"
                >
                  ×
                </button>
              </span>
            )}
            {filters.selectedPlatforms.map(platform => (
              <span key={`active-platform-${platform}`} className="inline-flex items-center bg-blue-100 text-blue-800 text-xs px-3 py-1.5 rounded-full border border-blue-200 font-medium">
                {platform}
                <button 
                  onClick={() => togglePlatform(platform)}
                  className="ml-2 text-blue-600 hover:text-blue-800 transition-colors"
                >
                  ×
                </button>
              </span>
            ))}
          </div>
        </div>
      )}
      
      {/* Filter content - scrollable */}
      <div className="p-6 overflow-y-auto space-y-6">
      
      {/* Availability Filter - Enhanced */}
      <div className="mb-4">
        <div className="border border-gray-200 rounded-lg overflow-hidden">
          <div className="px-4 py-3 bg-gradient-to-r from-gray-800 to-slate-800 border-b border-gray-700">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="font-medium text-white">Availability</span>
                {(filters.showStreaming || filters.showRentBuy) && (
                  <>
                    <span className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full font-medium">
                      {(filters.showStreaming ? 1 : 0) + (filters.showRentBuy ? 1 : 0)}
                    </span>
                    <button
                      onClick={() => onChange({ ...filters, showStreaming: false, showRentBuy: false })}
                      className="text-xs text-red-600 hover:text-red-700 hover:underline transition-colors ml-1"
                    >
                      Clear
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
          
          <div className="px-4 py-3 bg-white">
            <div className="space-y-1">
              <label className="flex items-center py-1 px-2 rounded hover:bg-gray-50 cursor-pointer group">
                <div className="relative">
                  <input
                    type="checkbox"
                    className="sr-only"
                    checked={!filters.showStreaming && !filters.showRentBuy}
                    onChange={() => onChange({ ...filters, showStreaming: false, showRentBuy: false })}
                  />
                  <div className={`w-4 h-4 rounded border-2 transition-all ${
                    !filters.showStreaming && !filters.showRentBuy
                      ? 'bg-blue-500 border-blue-500'
                      : 'border-gray-300 group-hover:border-blue-400'
                  }`}>
                    {!filters.showStreaming && !filters.showRentBuy && (
                      <svg className="w-3 h-3 text-white absolute top-0.5 left-0.5" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    )}
                  </div>
                </div>
                <span className="ml-3 text-sm text-gray-900">All films</span>
              </label>
              
              <label className="flex items-center py-1 px-2 rounded hover:bg-gray-50 cursor-pointer group">
                <div className="relative">
                  <input
                    type="checkbox"
                    className="sr-only"
                    checked={filters.showStreaming}
                    onChange={(e) => {
                      onChange({ ...filters, showStreaming: e.target.checked });
                    }}
                  />
                  <div className={`w-4 h-4 rounded border-2 transition-all ${
                    filters.showStreaming
                      ? 'bg-blue-500 border-blue-500'
                      : 'border-gray-300 group-hover:border-blue-400'
                  }`}>
                    {filters.showStreaming && (
                      <svg className="w-3 h-3 text-white absolute top-0.5 left-0.5" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    )}
                  </div>
                </div>
                <span className="ml-3 text-sm text-gray-900">Streaming</span>
              </label>
              
              <label className="flex items-center py-1 px-2 rounded hover:bg-gray-50 cursor-pointer group">
                <div className="relative">
                  <input
                    type="checkbox"
                    className="sr-only"
                    checked={filters.showRentBuy}
                    onChange={(e) => {
                      onChange({ ...filters, showRentBuy: e.target.checked });
                    }}
                  />
                  <div className={`w-4 h-4 rounded border-2 transition-all ${
                    filters.showRentBuy
                      ? 'bg-blue-500 border-blue-500'
                      : 'border-gray-300 group-hover:border-blue-400'
                  }`}>
                    {filters.showRentBuy && (
                      <svg className="w-3 h-3 text-white absolute top-0.5 left-0.5" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    )}
                  </div>
                </div>
                <span className="ml-3 text-sm text-gray-900">Rent/Buy</span>
              </label>
            </div>
          </div>
        </div>
      </div>
      
      {/* Special Filter - Enhanced */}
      <div className="mb-4">
        <div className="border border-gray-200 rounded-lg overflow-hidden">
          <div className="px-4 py-3 bg-gradient-to-r from-gray-800 to-slate-800 border-b border-gray-700">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="font-medium text-white">Special</span>
                {(filters.watchlistOnly || filters.awardedOnly) && (
                  <>
                    <span className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full font-medium">
                      {(filters.watchlistOnly ? 1 : 0) + (filters.awardedOnly ? 1 : 0)}
                    </span>
                    <button
                      onClick={() => onChange({ ...filters, watchlistOnly: false, awardedOnly: false })}
                      className="text-xs text-red-600 hover:text-red-700 hover:underline transition-colors ml-1"
                    >
                      Clear
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
          
          <div className="px-4 py-3 bg-white">
            <div className="space-y-1">
              {/* Watchlist Toggle */}
              <div className="flex items-center justify-between py-1 px-2 rounded hover:bg-gray-50 transition-colors">
                <div className="flex items-center">
                  <span className="text-sm font-medium text-gray-900">My Watchlist</span>
                  <svg 
                    className={`w-4 h-4 ml-3 transition-all duration-200 ${
                      filters.watchlistOnly 
                        ? 'text-red-500 fill-red-500' 
                        : 'text-gray-600 fill-none'
                    }`} 
                    stroke="currentColor" 
                    strokeWidth="2" 
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                  </svg>
                </div>
                <button
                  onClick={() => onChange({ ...filters, watchlistOnly: !filters.watchlistOnly })}
                  className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-1 ${
                    filters.watchlistOnly ? 'bg-red-500' : 'bg-gray-200'
                  }`}
                >
                  <span
                    className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform ${
                      filters.watchlistOnly ? 'translate-x-5' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>
              
              {/* Awarded Films Toggle */}
              <div className="flex items-center justify-between py-1 px-2 rounded hover:bg-gray-50 transition-colors">
                <div className="flex items-center">
                  <span className="text-sm font-medium text-gray-900">Awarded films</span>
                  <svg 
                    className={`w-4 h-4 ml-3 transition-all duration-200 ${
                      filters.awardedOnly 
                        ? 'text-yellow-500 fill-yellow-500' 
                        : 'text-gray-600 fill-none'
                    }`} 
                    stroke="currentColor" 
                    strokeWidth="2" 
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z" />
                  </svg>
                </div>
                <button
                  onClick={() => onChange({ ...filters, awardedOnly: !filters.awardedOnly })}
                  className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:ring-offset-1 ${
                    filters.awardedOnly ? 'bg-yellow-500' : 'bg-gray-200'
                  }`}
                >
                  <span
                    className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform ${
                      filters.awardedOnly ? 'translate-x-5' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Festival Filter - Enhanced */}
      <div className="mb-4">
        <div className="border border-gray-200 rounded-lg overflow-hidden">
          <div className="px-4 py-3 bg-gradient-to-r from-gray-800 to-slate-800 border-b border-gray-700">
            <button
              className="w-full flex items-center justify-between text-left"
              onClick={() => toggleSection('festival')}
            >
              <div className="flex items-center gap-2">
                <span className="font-medium text-white">Festival</span>
                {filters.festivals.length > 0 && (
                  <>
                    <span className="bg-blue-100 dark:bg-blue-900/50 text-blue-800  text-xs px-2 py-1 rounded-full font-medium">
                      {filters.festivals.length}
                    </span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onChange({ ...filters, festivals: [] });
                      }}
                      className="text-xs text-red-600 hover:text-red-700 hover:underline transition-colors ml-1"
                    >
                      Clear
                    </button>
                  </>
                )}
              </div>
              <svg className={`w-4 h-4 transition-transform duration-200 ${expandedSections.festival ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
          </div>
          
          {expandedSections.festival && (
          <div className="px-4 py-3 bg-white">
            <div className="space-y-1">
              {availableFestivals.map(festival => (
                <label key={festival} className="flex items-center py-1 px-2 rounded hover:bg-gray-50 cursor-pointer group">
                  <div className="relative">
                    <input
                      type="checkbox"
                      className="sr-only"
                      checked={filters.festivals.includes(festival)}
                      onChange={() => toggleFestival(festival)}
                    />
                    <div className={`w-4 h-4 rounded border-2 transition-all ${
                      filters.festivals.includes(festival)
                        ? 'bg-blue-500 border-blue-500'
                        : 'border-gray-300 group-hover:border-blue-400'
                    }`}>
                      {filters.festivals.includes(festival) && (
                        <svg className="w-3 h-3 text-white absolute top-0.5 left-0.5" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      )}
                    </div>
                  </div>
                  <span className="ml-3 text-sm text-gray-900">
                    {festivalDisplayNames[festival] || festival}
                  </span>
                </label>
              ))}
            </div>
          </div>
          )}
        </div>
      </div>
      
      {/* Year Filter - Enhanced */}
      <div className="mb-4">
        <div className="border border-gray-200 rounded-lg overflow-hidden">
          <div className="px-4 py-3 bg-gradient-to-r from-gray-800 to-slate-800 border-b border-gray-700">
            <button
              className="w-full flex items-center justify-between text-left"
              onClick={() => toggleSection('year')}
            >
              <div className="flex items-center gap-2">
                <span className="font-medium text-white">Year</span>
                {filters.years.length > 0 && (
                  <>
                    <span className="bg-blue-100 dark:bg-blue-900/50 text-blue-800  text-xs px-2 py-1 rounded-full font-medium">
                      {filters.years.length}
                    </span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onChange({ ...filters, years: [] });
                      }}
                      className="text-xs text-red-600 hover:text-red-700 hover:underline transition-colors ml-1"
                    >
                      Clear
                    </button>
                  </>
                )}
              </div>
              <svg className={`w-4 h-4 transition-transform duration-200 ${expandedSections.year ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
          </div>
          
          {expandedSections.year && (
          <div className="px-4 py-3 bg-white">
            <div className="grid grid-cols-2 gap-1">
              {availableYears.map(year => (
                <label key={year} className="flex items-center py-1 px-2 rounded hover:bg-gray-50 cursor-pointer group">
                  <div className="relative">
                    <input
                      type="checkbox"
                      className="sr-only"
                      checked={filters.years.includes(year)}
                      onChange={() => toggleYear(year)}
                    />
                    <div className={`w-4 h-4 rounded border-2 transition-all ${
                      filters.years.includes(year)
                        ? 'bg-blue-500 border-blue-500'
                        : 'border-gray-300 group-hover:border-blue-400'
                    }`}>
                      {filters.years.includes(year) && (
                        <svg className="w-3 h-3 text-white absolute top-0.5 left-0.5" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      )}
                    </div>
                  </div>
                  <span className="ml-3 text-sm text-gray-900">{year}</span>
                </label>
              ))}
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
              className="w-full px-4 py-3 text-left bg-gradient-to-r from-gray-800 to-slate-800 hover:from-gray-700 hover:to-slate-700 transition-all border-b border-gray-700 flex items-center justify-between"
            >
              <div className="flex items-center">
                <span className="font-medium text-white">Country</span>
                {filters.countries.length > 0 && (
                  <span className="ml-2 bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full font-medium">
                    {filters.countries.length}
                  </span>
                )}
              </div>
              <svg className={`w-4 h-4 transition-transform duration-200 ${expandedSections.country ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            
            {expandedSections.country && (
              <div className="px-4 py-3 bg-white max-h-48 overflow-y-auto">
                <div className="space-y-1">
                  {availableCountries.map(country => (
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
                            ? 'bg-blue-500 border-blue-500'
                            : '  group-hover:border-blue-400'
                        }`}>
                          {filters.countries.includes(country) && (
                            <svg className="w-3 h-3 text-white absolute top-0.5 left-0.5" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                            </svg>
                          )}
                        </div>
                      </div>
                      <span className="ml-3 text-sm text-gray-900 ">{country}</span>
                    </label>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
      
      {/* Genre Filter - Enhanced Collapsible */}
      {availableGenres.length > 0 && (
        <div className="mb-4">
          <div className="border border-gray-200  rounded-lg overflow-hidden">
            <button 
              onClick={() => toggleSection('genres')}
              className="w-full px-4 py-3 text-left bg-gradient-to-r from-gray-800 to-slate-800 hover:from-gray-700 hover:to-slate-700 transition-all border-b border-gray-700 flex items-center justify-between"
            >
              <div className="flex items-center gap-2">
                <span className="font-medium text-white">Genre</span>
                {filters.genres.length > 0 && (
                  <>
                    <span className="bg-blue-100 dark:bg-blue-900/50 text-blue-800  text-xs px-2 py-1 rounded-full font-medium">
                      {filters.genres.length}
                    </span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        clearGenres();
                      }}
                      className="text-xs text-red-600 hover:text-red-700 hover:underline transition-colors ml-1"
                    >
                      Clear
                    </button>
                  </>
                )}
              </div>
              <svg className={`w-4 h-4 transition-transform duration-200 ${expandedSections.genres ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            
            {expandedSections.genres && (
              <div className="px-4 py-3 bg-white  max-h-48 overflow-y-auto">
                <div className="space-y-1">
                  {availableGenres.map(genre => (
                    <label key={genre} className="flex items-center py-1.5 px-2 rounded hover:  cursor-pointer group">
                      <div className="relative">
                        <input
                          type="checkbox"
                          className="sr-only"
                          checked={filters.genres.includes(genre)}
                          onChange={() => toggleGenre(genre)}
                        />
                        <div className={`w-4 h-4 rounded border-2 transition-all ${
                          filters.genres.includes(genre)
                            ? 'bg-blue-500 border-blue-500'
                            : '  group-hover:border-blue-400'
                        }`}>
                          {filters.genres.includes(genre) && (
                            <svg className="w-3 h-3 text-white absolute top-0.5 left-0.5" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                            </svg>
                          )}
                        </div>
                      </div>
                      <span className="ml-3 text-sm text-gray-900 ">{genre}</span>
                    </label>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
      
      {/* Platform Filter - Enhanced Collapsible */}
      {availablePlatforms.length > 0 && (
        <div className="mb-4">
          <div className="border border-gray-200  rounded-lg overflow-hidden">
            <button 
              onClick={() => toggleSection('platforms')}
              className="w-full px-4 py-3 text-left bg-gradient-to-r from-gray-800 to-slate-800 hover:from-gray-700 hover:to-slate-700 transition-all border-b border-gray-700 flex items-center justify-between"
            >
              <div className="flex items-center gap-2">
                <span className="font-medium text-white">Platforms</span>
                {filters.selectedPlatforms.length > 0 && (
                  <>
                    <span className="bg-blue-100 dark:bg-blue-900/50 text-blue-800  text-xs px-2 py-1 rounded-full font-medium">
                      {filters.selectedPlatforms.length}
                    </span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        clearPlatforms();
                      }}
                      className="text-xs text-red-600 hover:text-red-700 hover:underline transition-colors ml-1"
                    >
                      Clear
                    </button>
                  </>
                )}
              </div>
              <svg className={`w-4 h-4 transition-transform duration-200 ${expandedSections.platforms ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            
            {expandedSections.platforms && (
              <div className="px-4 py-3 bg-white  max-h-48 overflow-y-auto">
                <div className="space-y-1">
                  {availablePlatforms.map(platform => (
                    <label key={platform} className="flex items-center py-1.5 px-2 rounded hover:  cursor-pointer group">
                      <div className="relative">
                        <input
                          type="checkbox"
                          className="sr-only"
                          checked={filters.selectedPlatforms.includes(platform)}
                          onChange={() => togglePlatform(platform)}
                        />
                        <div className={`w-4 h-4 rounded border-2 transition-all ${
                          filters.selectedPlatforms.includes(platform)
                            ? 'bg-blue-500 border-blue-500'
                            : '  group-hover:border-blue-400'
                        }`}>
                          {filters.selectedPlatforms.includes(platform) && (
                            <svg className="w-3 h-3 text-white absolute top-0.5 left-0.5" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                            </svg>
                          )}
                        </div>
                      </div>
                      <span className="ml-3 text-sm text-gray-900 ">{platform}</span>
                    </label>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
      </div>
    </div>
  );
}

