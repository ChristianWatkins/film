'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ArrowLeftIcon } from '@heroicons/react/24/outline';
import JustWatchSearchForm from '@/components/JustWatchSearchForm';
import MovieDiscoveryResults from '@/components/MovieDiscoveryResults';
import MovieDetailView from '@/components/MovieDetailView';
import type { CountryMovieData, JustWatchMovieDetails } from '@/lib/types';

interface SearchResponse {
  query: string;
  totalCountries: number;
  foundInCountries: number;
  results: CountryMovieData[];
}

export default function JustWatchSearchPage() {
  const [searchResults, setSearchResults] = useState<SearchResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedMovie, setSelectedMovie] = useState<{
    movie: JustWatchMovieDetails;
    countries: CountryMovieData[];
  } | null>(null);

  const handleSearch = async (query: string, countries: string[]) => {
    setIsLoading(true);
    setError(null);
    setSearchResults(null);
    setSelectedMovie(null); // Clear any selected movie

    try {
      const params = new URLSearchParams({
        q: query,
        countries: countries.join(',')
      });

      const response = await fetch(`/api/justwatch-search?${params}`);
      
      if (!response.ok) {
        throw new Error(`Search failed: ${response.statusText}`);
      }

      const data: SearchResponse = await response.json();
      setSearchResults(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Search failed');
    } finally {
      setIsLoading(false);
    }
  };

  const handleMovieClick = (movie: JustWatchMovieDetails, allCountryData: CountryMovieData[]) => {
    setSelectedMovie({ movie, countries: allCountryData });
  };

  const handleBackToSearch = () => {
    setSelectedMovie(null);
  };

  // If a movie is selected, show the detailed view
  if (selectedMovie) {
    return (
      <MovieDetailView
        movie={selectedMovie.movie}
        allCountryData={selectedMovie.countries}
        onBack={handleBackToSearch}
      />
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-[#1A1A2E] shadow-lg border-b-4 border-[#FFB800]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-bold text-[#FFB800] mb-2 flex items-center gap-3">
                <span className="text-5xl">🔍</span>
                <span>Movie Discovery</span>
              </h1>
              <p className="text-white/90 text-lg font-medium">
                Search for movies globally and discover streaming availability across countries
              </p>
            </div>
            <div>
              <Link
                href="/"
                className="inline-flex items-center px-4 py-2 border border-[#FFB800] text-[#FFB800] rounded-lg hover:bg-[#FFB800] hover:text-[#1A1A2E] transition-colors font-medium"
              >
                <ArrowLeftIcon className="h-5 w-5 mr-2" />
                Back to Festival Films
              </Link>
            </div>
          </div>
        </div>
      </header>      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Search Form */}
        <JustWatchSearchForm onSearch={handleSearch} isLoading={isLoading} />

        {/* Error Message */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-md p-4 mb-6">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-red-800">
                  Search Error
                </h3>
                <div className="mt-2 text-sm text-red-700">
                  {error}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Search Results */}
        {searchResults && (
          <MovieDiscoveryResults
            results={searchResults.results}
            query={searchResults.query}
            totalCountries={searchResults.totalCountries}
            foundInCountries={searchResults.foundInCountries}
            onMovieClick={handleMovieClick}
          />
        )}

        {/* Initial Help Text */}
        {!searchResults && !isLoading && !error && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 text-center">
            <div className="max-w-md mx-auto">
              <h2 className="text-lg font-medium text-gray-900 mb-2">
                Discover Movies Globally
              </h2>
              <p className="text-gray-600 mb-4">
                Search for any movie to discover where it's available across different countries. 
                Click on any result to see detailed streaming information.
              </p>
              <div className="text-sm text-gray-500">
                <p className="mb-2">🇳🇴🇸🇪🇩🇰🇬🇧 Nordic countries + UK are selected by default</p>
                <p>Results show availability across all selected countries</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}