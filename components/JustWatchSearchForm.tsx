'use client';

import { useState } from 'react';
import { MagnifyingGlassIcon } from '@heroicons/react/24/outline';
import type { JustWatchCountry } from '@/lib/types';

// Available countries for selection
const COUNTRIES: JustWatchCountry[] = [
  { code: 'NO', name: 'Norway', flag: '🇳🇴' },
  { code: 'SE', name: 'Sweden', flag: '🇸🇪' },
  { code: 'DK', name: 'Denmark', flag: '🇩🇰' },
  { code: 'GB', name: 'United Kingdom', flag: '🇬🇧' },
  { code: 'US', name: 'United States', flag: '🇺🇸' },
  { code: 'FI', name: 'Finland', flag: '🇫🇮' },
  { code: 'DE', name: 'Germany', flag: '🇩🇪' },
  { code: 'FR', name: 'France', flag: '🇫🇷' },
  { code: 'IT', name: 'Italy', flag: '🇮🇹' },
  { code: 'ES', name: 'Spain', flag: '🇪🇸' },
  { code: 'NL', name: 'Netherlands', flag: '🇳🇱' }
];

interface JustWatchSearchFormProps {
  onSearch: (query: string, countries: string[]) => void;
  isLoading: boolean;
}

export default function JustWatchSearchForm({ onSearch, isLoading }: JustWatchSearchFormProps) {
  const [query, setQuery] = useState('');
  const [selectedCountries, setSelectedCountries] = useState<string[]>(['NO', 'SE', 'DK', 'GB']); // Default to Norway, Sweden, Denmark, UK

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
            className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white text-gray-900 placeholder-gray-400 focus:outline-none focus:placeholder-gray-500 focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
            disabled={isLoading}
          />
        </div>

        {/* Country Selection with Pills */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium text-gray-700">
              Search Countries ({selectedCountries.length} selected)
            </label>
            
            {/* Quick action buttons */}
            <div className="flex gap-2">
              <button
                type="button"
                onClick={resetToNordic}
                className="text-xs px-2 py-1 bg-blue-100 text-blue-800 rounded hover:bg-blue-200 transition-colors"
              >
                Nordic + UK
              </button>
              <button
                type="button"
                onClick={selectAllCountries}
                className="text-xs px-2 py-1 bg-green-100 text-green-800 rounded hover:bg-green-200 transition-colors"
              >
                All
              </button>
              <button
                type="button"
                onClick={clearCountries}
                className="text-xs px-2 py-1 bg-red-100 text-red-800 rounded hover:bg-red-200 transition-colors"
              >
                Clear
              </button>
            </div>
          </div>
          
          {/* Country Pills */}
          <div className="flex flex-wrap gap-2">
            {COUNTRIES.map(country => {
              const isSelected = selectedCountries.includes(country.code);
              return (
                <button
                  key={country.code}
                  type="button"
                  onClick={() => toggleCountry(country.code)}
                  className={`
                    inline-flex items-center px-3 py-2 rounded-full text-sm font-medium transition-all duration-200 hover:scale-105
                    ${isSelected 
                      ? 'bg-blue-600 text-white shadow-md hover:bg-blue-700' 
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200 border border-gray-300'
                    }
                  `}
                  title={country.name} // Show full name on hover
                >
                  <span className="mr-1">{country.flag}</span>
                  {country.code}
                </button>
              );
            })}
          </div>
          
          {selectedCountries.length === 0 && (
            <p className="text-sm text-red-600">
              Please select at least one country to search.
            </p>
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