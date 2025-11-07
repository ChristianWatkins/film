'use client';

import { useState, useEffect } from 'react';
import { RotateCw, Save } from 'lucide-react';
import type { FilterState } from '@/lib/types';

interface PresentationFiltersProps {
  filters: FilterState;
  onFiltersChange: (filters: FilterState) => void;
  availableYears: number[];
  availableFestivals: string[];
  availablePlatforms: string[];
  availableCountries: string[];
  availableGenres: string[];
  onClose: () => void;
  onSaveDefaults?: () => void;
  onResetDefaults?: () => void;
}

export default function PresentationFilters({
  filters,
  onFiltersChange,
  availableYears,
  availableFestivals,
  availablePlatforms,
  availableCountries,
  availableGenres,
  onClose,
  onSaveDefaults,
  onResetDefaults
}: PresentationFiltersProps) {
  const [searchQuery, setSearchQuery] = useState(filters.searchQuery);

  // Map internal festival names to display names
  const festivalDisplayNames: Record<string, string> = {
    'arthaus': 'Arthaus',
    'bergen': 'BIFF',
    'berlin': 'Berlinale', 
    'cannes': 'Cannes',
    'haugesund': 'Haugesund',
    'venice': 'Venice'
  };
  
  // Function to get display name for festivals with proper capitalization
  const getFestivalDisplayName = (festival: string): string => {
    // First check if we have a specific display name mapping
    if (festivalDisplayNames[festival]) {
      return festivalDisplayNames[festival];
    }
    // Otherwise, capitalize the first letter and return
    return festival.charAt(0).toUpperCase() + festival.slice(1);
  };
  
  // Function to get display name for countries with flags and full names
  const getCountryDisplayName = (country: string): string => {
    const countryMap: Record<string, string> = {
      'United States': '🇺🇸 USA',
      'Norway': '🇳🇴 Norway', 
      'France': '🇫🇷 France',
      'Germany': '🇩🇪 Germany',
      'United Kingdom': '🇬🇧 UK',
      'Italy': '🇮🇹 Italy',
      'Spain': '🇪🇸 Spain',
      'Sweden': '🇸🇪 Sweden',
      'Denmark': '🇩🇰 Denmark',
      'Netherlands': '🇳🇱 Netherlands',
      'Belgium': '🇧🇪 Belgium',
      'Austria': '🇦🇹 Austria',
      'Switzerland': '🇨🇭 Switzerland',
      'Finland': '🇫🇮 Finland',
      'Poland': '🇵🇱 Poland',
      'Czech Republic': '🇨🇿 Czech Republic',
      'Hungary': '🇭🇺 Hungary',
      'Russia': '🇷🇺 Russia',
      'Ukraine': '🇺🇦 Ukraine',
      'Romania': '🇷🇴 Romania',
      'Bulgaria': '🇧🇬 Bulgaria',
      'Greece': '🇬🇷 Greece',
      'Turkey': '🇹🇷 Turkey',
      'Portugal': '🇵🇹 Portugal',
      'Ireland': '🇮🇪 Ireland',
      'Iceland': '🇮🇸 Iceland',
      'Luxembourg': '🇱🇺 Luxembourg',
      'Slovenia': '🇸🇮 Slovenia',
      'Croatia': '🇭🇷 Croatia',
      'Serbia': '🇷🇸 Serbia',
      'Bosnia and Herzegovina': '🇧🇦 Bosnia and Herzegovina',
      'Montenegro': '🇲🇪 Montenegro',
      'North Macedonia': '🇲🇰 North Macedonia',
      'Albania': '🇦🇱 Albania',
      'Estonia': '🇪🇪 Estonia',
      'Latvia': '🇱🇻 Latvia',
      'Lithuania': '🇱🇹 Lithuania',
      'Slovakia': '🇸🇰 Slovakia',
      'Canada': '🇨🇦 Canada',
      'Mexico': '🇲🇽 Mexico',
      'Brazil': '🇧🇷 Brazil',
      'Argentina': '🇦🇷 Argentina',
      'Chile': '🇨🇱 Chile',
      'Colombia': '🇨🇴 Colombia',
      'Peru': '🇵🇪 Peru',
      'Japan': '🇯🇵 Japan',
      'South Korea': '🇰🇷 South Korea',
      'China': '🇨🇳 China',
      'India': '🇮🇳 India',
      'Australia': '🇦🇺 Australia',
      'New Zealand': '🇳🇿 New Zealand',
      'South Africa': '🇿🇦 South Africa',
      'Israel': '🇮🇱 Israel',
      'Iran': '🇮🇷 Iran',
      'Egypt': '🇪🇬 Egypt',
      'Morocco': '🇲🇦 Morocco',
      'Tunisia': '🇹🇳 Tunisia',
      'Algeria': '🇩🇿 Algeria',
      'Lebanon': '🇱🇧 Lebanon',
      'Jordan': '🇯🇴 Jordan',
      'Saudi Arabia': '🇸🇦 Saudi Arabia',
      'Thailand': '🇹🇭 Thailand',
      'Vietnam': '🇻🇳 Vietnam',
      'Philippines': '🇵🇭 Philippines',
      'Indonesia': '🇮🇩 Indonesia',
      'Malaysia': '🇲🇾 Malaysia',
      'Singapore': '🇸🇬 Singapore'
    };
    
    return countryMap[country] || country;
  };

  const handleFilterChange = (key: keyof FilterState, value: any) => {
    onFiltersChange({
      ...filters,
      [key]: value
    });
  };

  const handleArrayToggle = (key: keyof FilterState, value: string | number) => {
    const currentArray = filters[key] as (string | number)[];
    const newArray = currentArray.includes(value)
      ? currentArray.filter(item => item !== value)
      : [...currentArray, value];
    
    handleFilterChange(key, newArray);
  };

  const handleSearchChange = (query: string) => {
    setSearchQuery(query);
    handleFilterChange('searchQuery', query);
  };

  // 3-state country toggle: Normal → Include → Exclude → Normal
  const handleCountryToggle = (country: string) => {
    const isIncluded = filters.countries.includes(country);
    const isExcluded = filters.excludedCountries.includes(country);
    
    if (!isIncluded && !isExcluded) {
      // State 1: Normal → Include
      onFiltersChange({
        ...filters,
        countries: [...filters.countries, country],
        excludedCountries: filters.excludedCountries.filter(c => c !== country)
      });
    } else if (isIncluded) {
      // State 2: Include → Exclude
      onFiltersChange({
        ...filters,
        countries: filters.countries.filter(c => c !== country),
        excludedCountries: [...filters.excludedCountries, country]
      });
    } else {
      // State 3: Exclude → Normal
      onFiltersChange({
        ...filters,
        countries: filters.countries.filter(c => c !== country),
        excludedCountries: filters.excludedCountries.filter(c => c !== country)
      });
    }
  };

  // Handle ESC key to close filters
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  return (
    <div className="fixed inset-0 bg-[#1A1A2E] z-50 flex flex-col">
      {/* Header */}
      <div className="bg-[#1A1A2E] text-white py-4 px-8 flex items-center justify-between shadow-lg border-b border-gray-700">
        <div className="flex items-center gap-4">
          <button
            onClick={onClose}
            className="p-2 rounded-full bg-[#FFB800] hover:bg-[#E6A600] text-[#1A1A2E] transition-colors cursor-pointer"
            title="Close filters (or press ESC)"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
          <h2 className="text-xl font-semibold">Filters</h2>
        </div>
      </div>

      {/* Filter Container */}
      <div className="flex-1 bg-[#1A1A2E] py-6 px-16 overflow-y-auto">
        {/* Search Section with Save/Reset Buttons */}
        <div className="max-w-6xl mx-auto mb-6">
          <div className="flex items-center gap-4">
            {/* Search Input */}
            <div className="flex-1">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => handleSearchChange(e.target.value)}
                placeholder="Search films, directors, cast, genres..."
                className="w-full py-4 px-6 text-lg border-2 border-[#FFB800] rounded-2xl bg-white outline-none focus:border-[#FFC533] focus:shadow-[0_0_0_3px_rgba(255,184,0,0.2)] transition-all"
              />
            </div>
            
            {/* Save/Reset Buttons */}
            {(onSaveDefaults || onResetDefaults) && (
              <div className="flex items-center gap-3">
                {onResetDefaults && (
                  <button
                    onClick={onResetDefaults}
                    className="flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 text-white border border-white/20 hover:border-white/40 rounded-lg transition-all duration-200 cursor-pointer"
                    title="Reset to default filters"
                  >
                  <RotateCw className="w-4 h-4" />
                  <span className="text-sm font-medium">Default</span>
                </button>
                )}
                {onSaveDefaults && (
                  <button
                    onClick={onSaveDefaults}
                    className="flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 text-white border border-white/20 hover:border-white/40 rounded-lg transition-all duration-200 cursor-pointer"
                    title="Save current filters as default"
                  >
                    <Save className="w-4 h-4" />
                    <span className="text-sm font-medium">Save</span>
                  </button>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Filter Grid */}
        <div className="grid grid-cols-2 gap-6 max-w-6xl mx-auto">
          {/* General */}
          <div className="bg-white/8 border border-white/15 rounded-2xl p-6 transition-all duration-200 hover:bg-white/12 hover:border-[#FFB800]/30 hover:-translate-y-1">
            <div className="text-[#FFB800] font-semibold mb-4 text-base">General</div>
            <div className="flex flex-wrap gap-2" style={{ rowGap: '0.75rem' }}>
              <button
                onClick={() => handleFilterChange('awardedOnly', !filters.awardedOnly)}
                className={`px-4 py-2 rounded-full text-sm transition-all duration-200 border cursor-pointer ${
                  filters.awardedOnly
                    ? 'bg-[#FFB800] text-[#1A1A2E] border-[#FFB800] font-semibold'
                    : 'bg-white/10 text-white border-white/20 hover:bg-white/15 hover:border-white/40'
                }`}
              >
                🏆 Awarded
              </button>
              <button
                onClick={() => handleFilterChange('watchlistOnly', !filters.watchlistOnly)}
                className={`px-4 py-2 rounded-full text-sm transition-all duration-200 border cursor-pointer ${
                  filters.watchlistOnly
                    ? 'bg-[#FFB800] text-[#1A1A2E] border-[#FFB800] font-semibold'
                    : 'bg-white/10 text-white border-white/20 hover:bg-white/15 hover:border-white/40'
                }`}
              >
                ❤️ Favorites
              </button>
              <button
                onClick={() => handleFilterChange('showStreaming', !filters.showStreaming)}
                className={`px-4 py-2 rounded-full text-sm transition-all duration-200 border cursor-pointer ${
                  filters.showStreaming
                    ? 'bg-[#FFB800] text-[#1A1A2E] border-[#FFB800] font-semibold'
                    : 'bg-white/10 text-white border-white/20 hover:bg-white/15 hover:border-white/40'
                }`}
              >
                Streaming
              </button>
              <button
                onClick={() => handleFilterChange('showRentBuy', !filters.showRentBuy)}
                className={`px-4 py-2 rounded-full text-sm transition-all duration-200 border cursor-pointer ${
                  filters.showRentBuy
                    ? 'bg-[#FFB800] text-[#1A1A2E] border-[#FFB800] font-semibold'
                    : 'bg-white/10 text-white border-white/20 hover:bg-white/15 hover:border-white/40'
                }`}
              >
                Rent/Buy
              </button>
            </div>
          </div>

          {/* Festivals */}
          <div className="bg-white/8 border border-white/15 rounded-2xl p-6 transition-all duration-200 hover:bg-white/12 hover:border-[#FFB800]/30 hover:-translate-y-1">
            <div className="text-[#FFB800] font-semibold mb-4 text-base">Festivals</div>
            <div className="flex flex-wrap gap-2" style={{ rowGap: '0.75rem' }}>
              {availableFestivals.map((festival) => (
                <button
                  key={festival}
                  onClick={() => handleArrayToggle('festivals', festival)}
                  className={`px-4 py-2 rounded-full text-sm transition-all duration-200 border cursor-pointer ${
                    filters.festivals.includes(festival)
                      ? 'bg-[#FFB800] text-[#1A1A2E] border-[#FFB800] font-semibold'
                      : 'bg-white/10 text-white border-white/20 hover:bg-white/15 hover:border-white/40'
                  }`}
                >
                  {getFestivalDisplayName(festival)}
                </button>
              ))}
            </div>
          </div>

          {/* Years */}
          <div className="bg-white/8 border border-white/15 rounded-2xl p-6 transition-all duration-200 hover:bg-white/12 hover:border-[#FFB800]/30 hover:-translate-y-1">
            <div className="text-[#FFB800] font-semibold mb-4 text-base">Years</div>
            <div className="flex flex-wrap gap-2" style={{ rowGap: '0.75rem' }}>
              {/* Show recent years and ranges */}
              {[2024, 2023, 2022, 2021, 2020].map((year) => (
                <button
                  key={year}
                  onClick={() => handleArrayToggle('years', year)}
                  className={`px-4 py-2 rounded-full text-sm transition-all duration-200 border cursor-pointer ${
                    filters.years.includes(year)
                      ? 'bg-[#FFB800] text-[#1A1A2E] border-[#FFB800] font-semibold'
                      : 'bg-white/10 text-white border-white/20 hover:bg-white/15 hover:border-white/40'
                  }`}
                >
                  {year}
                </button>
              ))}
              {/* Year ranges as text for display */}
              <button className="px-4 py-2 rounded-full text-sm bg-white/10 text-white border border-white/20 hover:bg-white/15 hover:border-white/40 cursor-pointer">
                2010-2019
              </button>
              <button className="px-4 py-2 rounded-full text-sm bg-white/10 text-white border border-white/20 hover:bg-white/15 hover:border-white/40 cursor-pointer">
                2000-2009
              </button>
              <button className="px-4 py-2 rounded-full text-sm bg-white/10 text-white border border-white/20 hover:bg-white/15 hover:border-white/40 cursor-pointer">
                Pre-2000
              </button>
            </div>
          </div>

          {/* Genres */}
          <div className="bg-white/8 border border-white/15 rounded-2xl p-6 transition-all duration-200 hover:bg-white/12 hover:border-[#FFB800]/30 hover:-translate-y-1">
            <div className="text-[#FFB800] font-semibold mb-4 text-base">Genres</div>
            <div className="flex flex-wrap gap-2" style={{ rowGap: '0.75rem' }}>
              {availableGenres.slice(0, 10).map((genre) => (
                <button
                  key={genre}
                  onClick={() => handleArrayToggle('genres', genre)}
                  className={`px-4 py-2 rounded-full text-sm transition-all duration-200 border cursor-pointer ${
                    filters.genres.includes(genre)
                      ? 'bg-[#FFB800] text-[#1A1A2E] border-[#FFB800] font-semibold'
                      : 'bg-white/10 text-white border-white/20 hover:bg-white/15 hover:border-white/40'
                  }`}
                >
                  {genre}
                </button>
              ))}
            </div>
          </div>

          {/* Countries */}
          <div className="bg-white/8 border border-white/15 rounded-2xl p-6 transition-all duration-200 hover:bg-white/12 hover:border-[#FFB800]/30 hover:-translate-y-1">
            <div className="text-[#FFB800] font-semibold mb-4 text-base">Countries</div>
            <div className="flex flex-wrap gap-2" style={{ rowGap: '0.75rem' }}>
              {(() => {
                const priorityCountries = [
                  'Norway', 'Sweden', 'Denmark', 'Finland', 'Iceland',
                  'United Kingdom', 'United States', 'France', 'Spain', 'Italy', 'South Korea'
                ];
                
                const availablePriorityCountries = priorityCountries.filter(country => 
                  availableCountries.includes(country)
                );
                
                const otherCountries = availableCountries.filter(country => 
                  !priorityCountries.includes(country)
                );
                
                const hasOthersSelected = otherCountries.some(country => 
                  filters.countries.includes(country)
                );
                
                return (
                  <>
                    {availablePriorityCountries.map((country) => {
                      const isIncluded = filters.countries.includes(country);
                      const isExcluded = filters.excludedCountries.includes(country);
                      
                      return (
                        <button
                          key={country}
                          onClick={() => handleCountryToggle(country)}
                          className={`px-4 py-2 rounded-full text-sm transition-all duration-200 border cursor-pointer ${
                            isIncluded
                              ? 'bg-green-500 text-white border-green-500 font-semibold'
                              : isExcluded
                              ? 'bg-red-500/80 text-white border-red-500 font-semibold'
                              : 'bg-white/10 text-white border-white/20 hover:bg-white/15 hover:border-white/40'
                          }`}
                          title={isIncluded ? 'Included - Click to exclude' : isExcluded ? 'Excluded - Click to default' : 'Click to include'}
                        >
                          {getCountryDisplayName(country)}
                        </button>
                      );
                    })}
                    {otherCountries.length > 0 && (
                      <button
                        onClick={() => {
                          // Toggle all other countries
                          const newCountries = hasOthersSelected 
                            ? filters.countries.filter(c => priorityCountries.includes(c))
                            : [...new Set([...filters.countries, ...otherCountries])];
                          handleFilterChange('countries', newCountries);
                        }}
                        className={`px-4 py-2 rounded-full text-sm transition-all duration-200 border cursor-pointer ${
                          hasOthersSelected
                            ? 'bg-[#FFB800] text-[#1A1A2E] border-[#FFB800] font-semibold'
                            : 'bg-white/10 text-white border-white/20 hover:bg-white/15 hover:border-white/40'
                        }`}
                      >
                        🌍 Others ({otherCountries.length})
                      </button>
                    )}
                  </>
                );
              })()}
            </div>
          </div>

          {/* Streaming Platforms */}
          <div className="bg-white/8 border border-white/15 rounded-2xl p-6 transition-all duration-200 hover:bg-white/12 hover:border-[#FFB800]/30 hover:-translate-y-1">
            <div className="text-[#FFB800] font-semibold mb-4 text-base">Streaming Platforms</div>
            <div className="flex flex-wrap gap-2" style={{ rowGap: '0.75rem' }}>
              {availablePlatforms.map((platform) => (
                <button
                  key={platform}
                  onClick={() => handleArrayToggle('selectedPlatforms', platform)}
                  className={`px-4 py-2 rounded-full text-sm transition-all duration-200 border cursor-pointer ${
                    filters.selectedPlatforms.includes(platform)
                      ? 'bg-[#FFB800] text-[#1A1A2E] border-[#FFB800] font-semibold'
                      : 'bg-white/10 text-white border-white/20 hover:bg-white/15 hover:border-white/40'
                  }`}
                >
                  {platform}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Show Films Button */}
        <div className="text-center mt-6">
          <button
            onClick={onClose}
            className="px-8 py-3 bg-[#FFB800] hover:bg-[#E6A600] text-[#1A1A2E] font-bold rounded-full text-lg transition-all duration-200 cursor-pointer shadow-lg hover:shadow-xl transform hover:-translate-y-1"
            title="Apply filters and show films"
          >
            Show Films
          </button>
        </div>

      </div>
    </div>
  );
}