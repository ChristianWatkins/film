'use client';

import { useState } from 'react';
import { MagnifyingGlassIcon } from '@heroicons/react/24/outline';
import type { JustWatchCountry } from '@/lib/types';

// Available countries for selection
const COUNTRIES: JustWatchCountry[] = [
  { code: 'NO', name: 'Norway', flag: '🇳🇴' },
  { code: 'US', name: 'United States', flag: '🇺🇸' },
  { code: 'GB', name: 'United Kingdom', flag: '🇬🇧' },
  { code: 'DE', name: 'Germany', flag: '🇩🇪' },
  { code: 'FR', name: 'France', flag: '🇫🇷' },
  { code: 'SE', name: 'Sweden', flag: '🇸🇪' },
  { code: 'DK', name: 'Denmark', flag: '🇩🇰' },
  { code: 'FI', name: 'Finland', flag: '🇫🇮' },
  { code: 'IT', name: 'Italy', flag: '🇮🇹' },
  { code: 'ES', name: 'Spain', flag: '🇪🇸' },
  { code: 'NL', name: 'Netherlands', flag: '🇳🇱' },
  { code: 'CA', name: 'Canada', flag: '🇨🇦' },
  { code: 'AU', name: 'Australia', flag: '🇦🇺' },
  { code: 'JP', name: 'Japan', flag: '🇯🇵' },
];

interface JustWatchSearchFormProps {
  onSearch: (query: string, countries: string[]) => void;
  isLoading: boolean;
}

export default function JustWatchSearchForm({ onSearch, isLoading }: JustWatchSearchFormProps) {
  const [query, setQuery] = useState('');
  const [selectedCountries, setSelectedCountries] = useState<string[]>(['NO', 'SE', 'DK', 'GB']); // Default to Norway, Sweden, Denmark, UK
  const [showCountrySelector, setShowCountrySelector] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      onSearch(query.trim(), selectedCountries);
    }
  };

  const toggleCountry = (countryCode: string) => {
    setSelectedCountries(prev => 
      prev.includes(countryCode)
        ? prev.filter(code => code !== countryCode)
        : [...prev, countryCode]
    );
  };

  const selectAllCountries = () => {
    setSelectedCountries(COUNTRIES.map(c => c.code));
  };

  const clearCountries = () => {
    setSelectedCountries([]);
  };

  const resetToNordic = () => {
    setSelectedCountries(['NO', 'SE', 'DK', 'GB']);
  };

  return (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">
        Movie Discovery
      </h1>
      
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Search Input */}
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" />
          </div>
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Discover new movies..."
            className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
            disabled={isLoading}
          />
        </div>

        {/* Country Selection */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium text-gray-700">
              Search Countries ({selectedCountries.length} selected)
            </label>
            <button
              type="button"
              onClick={() => setShowCountrySelector(!showCountrySelector)}
              className="text-sm text-blue-600 hover:text-blue-800"
            >
              {showCountrySelector ? 'Hide' : 'Show'} Countries
            </button>
          </div>
          
          {/* Selected countries preview */}
          <div className="flex flex-wrap gap-1">
            {selectedCountries.map(code => {
              const country = COUNTRIES.find(c => c.code === code);
              return country ? (
                <span
                  key={code}
                  className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800"
                >
                  {country.flag} {country.code}
                </span>
              ) : null;
            })}
          </div>

          {showCountrySelector && (
            <div className="border border-gray-200 rounded-md p-3 bg-gray-50">
              {/* Quick actions */}
              <div className="flex gap-2 mb-3">
                <button
                  type="button"
                  onClick={selectAllCountries}
                  className="text-xs px-2 py-1 bg-green-100 text-green-800 rounded hover:bg-green-200"
                >
                  Select All
                </button>
                <button
                  type="button"
                  onClick={clearCountries}
                  className="text-xs px-2 py-1 bg-red-100 text-red-800 rounded hover:bg-red-200"
                >
                  Clear All
                </button>
                <button
                  type="button"
                  onClick={resetToNordic}
                  className="text-xs px-2 py-1 bg-blue-100 text-blue-800 rounded hover:bg-blue-200"
                >
                  Nordic + UK
                </button>
              </div>

              {/* Country grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
                {COUNTRIES.map(country => (
                  <label
                    key={country.code}
                    className="flex items-center space-x-2 p-2 rounded hover:bg-white cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={selectedCountries.includes(country.code)}
                      onChange={() => toggleCountry(country.code)}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-sm">
                      {country.flag} {country.name}
                    </span>
                  </label>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Search Button */}
        <button
          type="submit"
          disabled={isLoading || !query.trim() || selectedCountries.length === 0}
          className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:bg-gray-400 disabled:cursor-not-allowed"
        >
          {isLoading ? (
            <>
              <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Searching...
            </>
          ) : (
            'Discover on JustWatch'
          )}
        </button>
      </form>
    </div>
  );
}