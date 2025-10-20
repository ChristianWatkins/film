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
    country: false,
    platforms: false,
    genres: false
  });
  
  const toggleSection = (section: 'country' | 'platforms' | 'genres') => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };
  
  return (
    <div className="bg-white rounded-lg shadow-md overflow-hidden sticky top-6 max-h-[calc(100vh-3rem)] flex flex-col">
      {/* Filters Header with JustWatch colors */}
      <div className="bg-[#1A1A2E] px-6 py-4 flex items-center justify-between border-b-2 border-[#FFB800]">
        <h2 className="text-xl font-bold text-[#FFB800]">Filters</h2>
        {hasActiveFilters && (
          <button
            onClick={clearAllFilters}
            className="text-sm text-[#FFB800] hover:text-white font-medium transition-colors"
          >
            Clear all
          </button>
        )}
      </div>
      
      {/* Filter content - scrollable */}
      <div className="p-6 overflow-y-auto">
      
      {/* Streaming Availability Filter - MOVED TO TOP - Now with checkboxes */}
      <div className="mb-6">
        <h3 className="font-semibold mb-2 text-sm text-gray-900">Availability</h3>
        <div className="space-y-2">
          <label className="flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={!filters.showStreaming && !filters.showRentBuy}
              onChange={() => onChange({ ...filters, showStreaming: false, showRentBuy: false })}
              className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
            />
            <span className="ml-2 text-sm text-gray-900">All films</span>
          </label>
          
          <label className="flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={filters.showStreaming}
              onChange={(e) => {
                // If checking this, make sure "all" is false
                onChange({ ...filters, showStreaming: e.target.checked });
              }}
              className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
            />
            <span className="ml-2 text-sm text-gray-900">Streaming</span>
          </label>
          
          <label className="flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={filters.showRentBuy}
              onChange={(e) => {
                // If checking this, make sure "all" is false
                onChange({ ...filters, showRentBuy: e.target.checked });
              }}
              className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
            />
            <span className="ml-2 text-sm text-gray-900">Rent/Buy</span>
          </label>
        </div>
      </div>
      
      {/* Award Filter - MOVED HERE */}
      <div className="mb-6">
        <h3 className="font-semibold mb-2 text-sm text-gray-900">Special</h3>
        <div className="space-y-2">
          <label className="flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={filters.watchlistOnly}
              onChange={(e) => onChange({ ...filters, watchlistOnly: e.target.checked })}
              className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
            />
            <span className="ml-2 text-sm text-gray-900 flex items-center gap-1.5">
              <svg 
                className={`w-4 h-4 transition-all duration-200 ${
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
              <span>My Watchlist</span>
            </span>
          </label>
          
          <label className="flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={filters.awardedOnly}
              onChange={(e) => onChange({ ...filters, awardedOnly: e.target.checked })}
              className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
            />
            <span className="ml-2 text-sm text-gray-900 flex items-center gap-1.5">
              <svg 
                className={`w-4 h-4 transition-all duration-200 ${
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
              <span>Awarded films</span>
            </span>
          </label>
        </div>
      </div>
      
      {/* Festival Filter */}
      <div className="mb-6">
        <h3 className="font-semibold mb-2 text-sm text-gray-900">Festival</h3>
        <div className="space-y-2">
          {availableFestivals.map(festival => (
            <label key={festival} className="flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={filters.festivals.includes(festival)}
                onChange={() => toggleFestival(festival)}
                className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
              />
              <span className="ml-2 text-sm text-gray-900">
                {festivalDisplayNames[festival] || festival}
              </span>
            </label>
          ))}
        </div>
      </div>
      
      {/* Year Filter */}
      <div className="mb-6">
        <h3 className="font-semibold mb-2 text-sm text-gray-900">Year</h3>
        <div className="grid grid-cols-2 gap-2">
          {availableYears.map(year => (
            <label key={year} className="flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={filters.years.includes(year)}
                onChange={() => toggleYear(year)}
                className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
              />
              <span className="ml-2 text-sm text-gray-900">{year}</span>
            </label>
          ))}
        </div>
      </div>
      
      {/* Country Filter - Collapsible */}
      {availableCountries.length > 0 && (
        <div className="mb-6">
          <button
            onClick={() => toggleSection('country')}
            className="w-full flex items-center justify-between font-semibold mb-2 text-sm text-gray-900 hover:text-blue-600 transition-colors"
          >
            <span>Country {filters.countries.length > 0 && `(${filters.countries.length})`}</span>
            <span className="text-xs">{expandedSections.country ? '▲' : '▼'}</span>
          </button>
          {expandedSections.country && (
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {availableCountries.map(country => (
                <label key={country} className="flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={filters.countries.includes(country)}
                    onChange={() => toggleCountry(country)}
                    className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                  />
                  <span className="ml-2 text-sm text-gray-900">{country}</span>
                </label>
              ))}
            </div>
          )}
        </div>
      )}
      
      {/* Genre Filter - Collapsible */}
      {availableGenres.length > 0 && (
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <button
                onClick={() => toggleSection('genres')}
                className="font-semibold text-sm text-gray-900 hover:text-blue-600 transition-colors"
              >
                Genre {filters.genres.length > 0 && `(${filters.genres.length})`}
              </button>
              {filters.genres.length > 0 && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    clearGenres();
                  }}
                  className="text-xs text-red-600 hover:text-red-700 hover:underline transition-colors"
                >
                  Clear
                </button>
              )}
            </div>
            <button
              onClick={() => toggleSection('genres')}
              className="text-xs text-gray-900 hover:text-blue-600 transition-colors"
            >
              {expandedSections.genres ? '▲' : '▼'}
            </button>
          </div>
          {expandedSections.genres && (
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {availableGenres.map(genre => (
                <label key={genre} className="flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={filters.genres.includes(genre)}
                    onChange={() => toggleGenre(genre)}
                    className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                  />
                  <span className="ml-2 text-sm text-gray-900">{genre}</span>
                </label>
              ))}
            </div>
          )}
        </div>
      )}
      
      {/* Platform Filter - Collapsible */}
      {availablePlatforms.length > 0 && (
        <div>
          <button
            onClick={() => toggleSection('platforms')}
            className="w-full flex items-center justify-between font-semibold mb-2 text-sm text-gray-900 hover:text-blue-600 transition-colors"
          >
            <span>Platforms {filters.selectedPlatforms.length > 0 && `(${filters.selectedPlatforms.length})`}</span>
            <span className="text-xs">{expandedSections.platforms ? '▲' : '▼'}</span>
          </button>
          {expandedSections.platforms && (
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {availablePlatforms.map(platform => (
                <label key={platform} className="flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={filters.selectedPlatforms.includes(platform)}
                    onChange={() => togglePlatform(platform)}
                    className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                  />
                  <span className="ml-2 text-sm text-gray-900">{platform}</span>
                </label>
              ))}
            </div>
          )}
        </div>
      )}
      </div>
    </div>
  );
}

