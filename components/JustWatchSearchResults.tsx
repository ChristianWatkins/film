'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { ArrowTopRightOnSquareIcon, ClockIcon, CheckCircleIcon, PlusCircleIcon, ArrowDownTrayIcon } from '@heroicons/react/24/outline';
import type { CountryMovieData, JustWatchMovieDetails, Film } from '@/lib/types';
import { isMovieInDatabase, exportDiscoveredMovies } from '@/lib/movie-discovery';

interface JustWatchSearchResultsProps {
  results: CountryMovieData[];
  query: string;
  totalCountries: number;
  foundInCountries: number;
}

export default function JustWatchSearchResults({ 
  results, 
  query, 
  totalCountries, 
  foundInCountries 
}: JustWatchSearchResultsProps) {
  const [showOnlyFound, setShowOnlyFound] = useState(false);
  const [showOnlyNew, setShowOnlyNew] = useState(true); // Default to showing only new movies
  const [sortBy, setSortBy] = useState<'country' | 'availability'>('country');
  const [films, setFilms] = useState<Film[]>([]);
  const [savedMovies, setSavedMovies] = useState<Set<string>>(new Set());

  // Load existing films for comparison
  useEffect(() => {
    // In a real implementation, you might want to fetch this from an API
    // For now, we'll assume no movies are in the database
    setFilms([]);
  }, []);

  const filteredResults = results.filter(r => {
    if (!showOnlyFound || r.found) {
      if (showOnlyNew && r.found && r.details) {
        return !isMovieInDatabase(r.details, films);
      }
      return showOnlyFound ? r.found : true;
    }
    return false;
  });
  
  const sortedResults = [...filteredResults].sort((a, b) => {
    if (sortBy === 'country') {
      // Norway first, then alphabetical
      if (a.country.code === 'NO') return -1;
      if (b.country.code === 'NO') return 1;
      return a.country.name.localeCompare(b.country.name);
    } else {
      // Sort by availability: streaming > rent > buy > none
      const getAvailabilityScore = (result: CountryMovieData) => {
        if (!result.found || !result.details) return 0;
        const { streamingProviders = [], rentProviders = [], buyProviders = [] } = result.details;
        if (streamingProviders.length > 0) return 3;
        if (rentProviders.length > 0) return 2;
        if (buyProviders.length > 0) return 1;
        return 0;
      };
      return getAvailabilityScore(b) - getAvailabilityScore(a);
    }
  });

  const toggleSaveMovie = (movieId: string) => {
    setSavedMovies(prev => {
      const newSet = new Set(prev);
      if (newSet.has(movieId)) {
        newSet.delete(movieId);
      } else {
        newSet.add(movieId);
      }
      return newSet;
    });
  };

  const exportSavedMovies = () => {
    const savedMovieDetails = results
      .filter(r => r.found && r.details && savedMovies.has(r.details.id))
      .map(r => r.details!)
      .filter(Boolean);
    
    if (savedMovieDetails.length > 0) {
      exportDiscoveredMovies(savedMovieDetails);
    }
  };

  const exportAllNewMovies = () => {
    const newMovieDetails = results
      .filter(r => r.found && r.details && !isMovieInDatabase(r.details, films))
      .map(r => r.details!)
      .filter(Boolean);
    
    if (newMovieDetails.length > 0) {
      exportDiscoveredMovies(newMovieDetails);
    }
  };

  if (results.length === 0) {
    return null;
  }

  const renderProviders = (providers: any[], type: 'streaming' | 'rent' | 'buy') => {
    if (!providers || providers.length === 0) return null;

    const colors = {
      streaming: 'bg-green-100 text-green-800',
      rent: 'bg-yellow-100 text-yellow-800',
      buy: 'bg-blue-100 text-blue-800'
    };

    const typeLabels = {
      streaming: 'Stream',
      rent: 'Rent',
      buy: 'Buy'
    };

    return (
      <div className="mb-2">
        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${colors[type]} mr-2`}>
          {typeLabels[type]}
        </span>
        <div className="inline-flex flex-wrap gap-1">
          {providers.slice(0, 3).map((provider, idx) => (
            <span key={idx} className="text-xs text-gray-600">
              {provider.provider || provider.name}
              {provider.price && ` (${provider.price})`}
              {idx < Math.min(providers.length - 1, 2) && ', '}
            </span>
          ))}
          {providers.length > 3 && (
            <span className="text-xs text-gray-500">+{providers.length - 3} more</span>
          )}
        </div>
      </div>
    );
  };

  const renderMovieCard = (result: CountryMovieData) => {
    const { country, found, details, error } = result;
    const isInDatabase = found && details ? isMovieInDatabase(details, films) : false;
    const isSaved = found && details ? savedMovies.has(details.id) : false;

    return (
      <div key={country.code} className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
        {/* Country Header */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center space-x-2">
            <span className="text-2xl">{country.flag}</span>
            <h3 className="font-semibold text-gray-900">{country.name}</h3>
          </div>
          <div className="flex items-center gap-2">
            {found ? (
              <>
                {isInDatabase ? (
                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                    <CheckCircleIcon className="h-3 w-3 mr-1" />
                    In Database
                  </span>
                ) : (
                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                    <PlusCircleIcon className="h-3 w-3 mr-1" />
                    New Discovery
                  </span>
                )}
              </>
            ) : (
              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
                Not Found
              </span>
            )}
          </div>
        </div>

        {/* Movie Details */}
        {found && details ? (
          <div className="space-y-3">
            {/* Movie Info */}
            <div className="flex space-x-3">
              {details.posterUrl && (
                <div className="flex-shrink-0">
                  <Image
                    src={details.posterUrl}
                    alt={details.title}
                    width={80}
                    height={120}
                    className="rounded-md object-cover"
                    unoptimized
                  />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <h4 className="font-medium text-gray-900 truncate">{details.title}</h4>
                {details.originalTitle && details.originalTitle !== details.title && (
                  <p className="text-sm text-gray-600 truncate">({details.originalTitle})</p>
                )}
                {details.originalReleaseYear && (
                  <p className="text-sm text-gray-500">{details.originalReleaseYear}</p>
                )}
                {details.runtime && (
                  <div className="flex items-center text-sm text-gray-500 mt-1">
                    <ClockIcon className="h-4 w-4 mr-1" />
                    {details.runtime} min
                  </div>
                )}
                {details.genres && details.genres.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {details.genres.slice(0, 3).map((genre, idx) => (
                      <span key={idx} className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                        {typeof genre === 'string' ? genre : genre.name}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Synopsis */}
            {details.synopsis && (
              <p className="text-sm text-gray-600 line-clamp-2">{details.synopsis}</p>
            )}

            {/* Availability */}
            <div className="space-y-1">
              {renderProviders(details.streamingProviders || [], 'streaming')}
              {renderProviders(details.rentProviders || [], 'rent')}
              {renderProviders(details.buyProviders || [], 'buy')}
              
              {(!details.streamingProviders?.length && !details.rentProviders?.length && !details.buyProviders?.length) && (
                <span className="text-sm text-gray-500 italic">No streaming availability</span>
              )}
            </div>

            {/* External Links */}
            {details.justwatchUrl && (
              <div className="pt-2 border-t border-gray-100 flex items-center justify-between">
                <a
                  href={details.justwatchUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center text-sm text-blue-600 hover:text-blue-800"
                >
                  <ArrowTopRightOnSquareIcon className="h-4 w-4 mr-1" />
                  View on JustWatch
                </a>
                
                {!isInDatabase && (
                  <button
                    onClick={() => toggleSaveMovie(details.id)}
                    className={`inline-flex items-center px-2 py-1 text-xs rounded-md transition-colors ${
                      isSaved 
                        ? 'bg-green-100 text-green-800 hover:bg-green-200' 
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {isSaved ? 'Saved' : 'Save'}
                  </button>
                )}
              </div>
            )}
          </div>
        ) : (
          <div className="text-sm text-gray-500">
            {error || 'Movie not found in this country'}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Results Summary */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">
            Discovery Results for "{query}"
          </h2>
          <div className="flex items-center gap-4">
            <div className="text-sm text-gray-600">
              Found in {foundInCountries} of {totalCountries} countries
            </div>
            {savedMovies.size > 0 && (
              <button
                onClick={exportSavedMovies}
                className="inline-flex items-center px-3 py-1 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700"
              >
                <ArrowDownTrayIcon className="h-4 w-4 mr-1" />
                Export Saved ({savedMovies.size})
              </button>
            )}
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-4 items-center">
          <label className="flex items-center space-x-2">
            <input
              type="checkbox"
              checked={showOnlyFound}
              onChange={(e) => setShowOnlyFound(e.target.checked)}
              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <span className="text-sm text-gray-700">Show only found movies</span>
          </label>

          <label className="flex items-center space-x-2">
            <input
              type="checkbox"
              checked={showOnlyNew}
              onChange={(e) => setShowOnlyNew(e.target.checked)}
              className="rounded border-gray-300 text-green-600 focus:ring-green-500"
            />
            <span className="text-sm text-gray-700">Show only new movies (not in database)</span>
          </label>

          <div className="flex items-center space-x-2">
            <label className="text-sm text-gray-700">Sort by:</label>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as 'country' | 'availability')}
              className="text-sm border border-gray-300 rounded-md px-2 py-1 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="country">Country</option>
              <option value="availability">Availability</option>
            </select>
          </div>

          {filteredResults.some(r => r.found && r.details) && (
            <button
              onClick={exportAllNewMovies}
              className="text-sm px-3 py-1 bg-green-100 text-green-800 rounded hover:bg-green-200"
            >
              Export All New Movies
            </button>
          )}
        </div>
      </div>

      {/* Results Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {sortedResults.map(renderMovieCard)}
      </div>

      {filteredResults.length === 0 && (showOnlyFound || showOnlyNew) && (
        <div className="text-center py-8 text-gray-500">
          {showOnlyNew ? 
            "No new movies found. All discovered movies are already in your database." :
            "No countries found with this movie. Try adjusting your filters."
          }
        </div>
      )}
    </div>
  );
}