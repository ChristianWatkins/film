'use client';

import { useState } from 'react';
import Image from 'next/image';
import { ArrowLeftIcon, ArrowTopRightOnSquareIcon, ClockIcon, StarIcon } from '@heroicons/react/24/outline';
import type { CountryMovieData, JustWatchMovieDetails } from '@/lib/types';

interface MovieDetailViewProps {
  movie: JustWatchMovieDetails;
  allCountryData: CountryMovieData[];
  onBack: () => void;
  isExpandedSearch?: boolean;
}

export default function MovieDetailView({ movie, allCountryData, onBack, isExpandedSearch }: MovieDetailViewProps) {
  const [showOnlyWithAvailability, setShowOnlyWithAvailability] = useState(true);
  
  // Create a comprehensive list of countries showing this specific movie's availability
  // We need to match countries that have this specific movie vs countries where it wasn't found
  const movieCountryData = allCountryData.map(countryResult => {
    if (countryResult.found && countryResult.details) {
      // Check if this country result is for the same movie
      const isSameMovie = 
        countryResult.details.title === movie.title &&
        countryResult.details.originalReleaseYear === movie.originalReleaseYear;
      
      if (isSameMovie) {
        return countryResult; // This country has this specific movie
      }
    }
    
    // Country either didn't have the movie or had a different movie
    return {
      country: countryResult.country,
      found: false,
      error: `"${movie.title}" not available in ${countryResult.country.name}`
    };
  });

  // Sort countries: Norway first, then by availability, then alphabetically
  const sortedCountries = [...movieCountryData].sort((a, b) => {
    // Norway first
    if (a.country.code === 'NO') return -1;
    if (b.country.code === 'NO') return 1;
    
    // Then by availability (found vs not found)
    if (a.found && !b.found) return -1;
    if (!a.found && b.found) return 1;
    
    // Then alphabetically
    return a.country.name.localeCompare(b.country.name);
  });

  // Filter countries based on toggle
  const filteredCountries = showOnlyWithAvailability 
    ? sortedCountries.filter(country => {
        if (!country.found || !country.details) return false;
        // Check if there are any streaming, rental, or purchase options
        const hasOptions = 
          (country.details.streamingProviders && country.details.streamingProviders.length > 0) ||
          (country.details.rentProviders && country.details.rentProviders.length > 0) ||
          (country.details.buyProviders && country.details.buyProviders.length > 0);
        return hasOptions;
      })
    : sortedCountries;

  const renderProviders = (providers: any[], type: 'streaming' | 'rent' | 'buy') => {
    if (!providers || providers.length === 0) return null;

    const colors = {
      streaming: 'bg-green-50 border-green-200 text-green-800',
      rent: 'bg-yellow-50 border-yellow-200 text-yellow-800',
      buy: 'bg-blue-50 border-blue-200 text-blue-800'
    };

    const typeLabels = {
      streaming: 'Stream',
      rent: 'Rent',
      buy: 'Buy'
    };

    return (
      <div className={`border rounded-lg p-3 ${colors[type]}`}>
        <h5 className="font-medium text-sm mb-2">{typeLabels[type]}</h5>
        <div className="space-y-1">
          {providers.map((provider, idx) => (
            <div key={idx} className="flex items-center justify-between text-sm">
              <span className="font-medium">{provider.provider || provider.name}</span>
              <div className="flex items-center space-x-2">
                {provider.price && (
                  <span className="text-xs bg-white px-2 py-1 rounded">{provider.price}</span>
                )}
                {provider.quality && (
                  <span className="text-xs bg-white px-2 py-1 rounded">{provider.quality}</span>
                )}
                {provider.url && (
                  <a
                    href={provider.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs hover:underline"
                  >
                    <ArrowTopRightOnSquareIcon className="h-3 w-3" />
                  </a>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const renderCountryCard = (countryData: CountryMovieData) => {
    const { country, found, details, error } = countryData;

    // Check if there are actually any viewing options available
    const hasViewingOptions = found && details && (
      (details.streamingProviders && details.streamingProviders.length > 0) ||
      (details.rentProviders && details.rentProviders.length > 0) ||
      (details.buyProviders && details.buyProviders.length > 0)
    );

    return (
      <div key={country.code} className="bg-white border border-gray-200 rounded-lg p-4">
        {/* Country Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-3">
            <span className="text-2xl">{country.flag}</span>
            <div>
              <h3 className="font-semibold text-gray-900">{country.name}</h3>
              <p className="text-sm text-gray-500">{country.code}</p>
            </div>
          </div>
          {hasViewingOptions ? (
            <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800">
              Available
            </span>
          ) : found ? (
            <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-yellow-100 text-yellow-800">
              In Catalog
            </span>
          ) : (
            <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-red-100 text-red-800">
              Not Found
            </span>
          )}
        </div>

        {found && details ? (
          <div className="space-y-3">
            {/* JustWatch Link */}
            {details.justwatchUrl && (
              <div className="pb-3 border-b border-gray-100">
                <a
                  href={details.justwatchUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center text-sm text-blue-600 hover:text-blue-800 font-medium"
                >
                  <ArrowTopRightOnSquareIcon className="h-4 w-4 mr-1" />
                  View on JustWatch {country.code}
                </a>
              </div>
            )}

            {/* Availability Options */}
            <div className="space-y-2">
              {renderProviders(details.streamingProviders || [], 'streaming')}
              {renderProviders(details.rentProviders || [], 'rent')}
              {renderProviders(details.buyProviders || [], 'buy')}
              
              {(!details.streamingProviders?.length && 
                !details.rentProviders?.length && 
                !details.buyProviders?.length) && (
                <div className="text-center py-4 text-gray-500 italic">
                  Movie is in JustWatch catalog but no streaming options are currently available in {country.name}
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="text-center py-4 text-gray-500">
            {error || `Movie not found in ${country.name}`}
          </div>
        )}
      </div>
    );
  };

  // Calculate availability stats
  const availabilityStats = {
    streaming: movieCountryData.filter(c => 
      c.details?.streamingProviders && c.details.streamingProviders.length > 0
    ).length,
    rent: movieCountryData.filter(c => 
      c.details?.rentProviders && c.details.rentProviders.length > 0
    ).length,
    buy: movieCountryData.filter(c => 
      c.details?.buyProviders && c.details.buyProviders.length > 0
    ).length,
    withOptions: movieCountryData.filter(c => {
      if (!c.details) return false;
      return (c.details.streamingProviders && c.details.streamingProviders.length > 0) ||
             (c.details.rentProviders && c.details.rentProviders.length > 0) ||
             (c.details.buyProviders && c.details.buyProviders.length > 0);
    }).length,
    inCatalog: movieCountryData.filter(c => c.found).length,
    total: movieCountryData.length
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-[#1A1A2E] shadow-lg border-b-4 border-[#FFB800]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-4xl font-bold text-[#FFB800] mb-2 flex items-center gap-3">
                <span className="text-5xl">🎬</span>
                <span>{movie.title}</span>
              </h1>
              <p className="text-white/90 text-lg font-medium">
                {movie.originalReleaseYear && `${movie.originalReleaseYear} • `}
                Global streaming availability across {availabilityStats.total} countries
              </p>
            </div>
            <div>
              <button
                onClick={onBack}
                className="inline-flex items-center px-4 py-2 border border-[#FFB800] text-[#FFB800] rounded-lg hover:bg-[#FFB800] hover:text-[#1A1A2E] transition-colors font-medium"
              >
                <ArrowLeftIcon className="h-5 w-5 mr-2" />
                Back to Search
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Movie Header */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
          <div className="flex space-x-6">
            {movie.posterUrl && (
              <div className="flex-shrink-0">
                <Image
                  src={movie.posterUrl}
                  alt={movie.title}
                  width={200}
                  height={300}
                  className="rounded-lg object-cover"
                  unoptimized
                />
              </div>
            )}
            <div className="flex-1">
              <h1 className="text-3xl font-bold text-gray-900 mb-2">{movie.title}</h1>
              {movie.originalTitle && movie.originalTitle !== movie.title && (
                <p className="text-xl text-gray-600 mb-3">({movie.originalTitle})</p>
              )}
              
              <div className="flex items-center space-x-4 mb-4 text-sm text-gray-600">
                {movie.originalReleaseYear && (
                  <span className="font-medium">{movie.originalReleaseYear}</span>
                )}
                {movie.runtime && (
                  <div className="flex items-center">
                    <ClockIcon className="h-4 w-4 mr-1" />
                    {movie.runtime} min
                  </div>
                )}
              </div>

              {movie.genres && movie.genres.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-4">
                  {movie.genres.map((genre, idx) => (
                    <span key={idx} className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-gray-100 text-gray-800">
                      {typeof genre === 'string' ? genre : genre.name}
                    </span>
                  ))}
                </div>
              )}

              {movie.synopsis && (
                <p className="text-gray-700 leading-relaxed mb-4">{movie.synopsis}</p>
              )}

              {/* Availability Summary */}
              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="font-medium text-gray-900 mb-2">Global Availability</h3>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-600">{availabilityStats.streaming}</div>
                    <div className="text-gray-600">Countries with Streaming</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-yellow-600">{availabilityStats.rent}</div>
                    <div className="text-gray-600">Countries with Rental</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-blue-600">{availabilityStats.buy}</div>
                    <div className="text-gray-600">Countries with Purchase</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-gray-600">{availabilityStats.inCatalog}</div>
                    <div className="text-gray-600">In Catalog (of {availabilityStats.total})</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Expanded Search Notice */}
        {isExpandedSearch && (
          <div className="bg-gradient-to-r from-amber-50 to-orange-50 border-l-4 border-amber-400 rounded-lg p-6 mb-6 shadow-sm">
            <div className="flex items-start space-x-4">
              <div className="flex-shrink-0">
                <div className="flex items-center justify-center w-10 h-10 bg-amber-100 rounded-full">
                  <svg className="w-6 h-6 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
              </div>
              <div className="flex-1">
                <div className="flex items-center space-x-2 mb-2">
                  <h3 className="text-lg font-semibold text-amber-800">
                    Search Expanded Globally
                  </h3>
                </div>
                <p className="text-amber-700 leading-relaxed">
                  <strong>"{movie.title}"</strong> wasn't available for streaming, rental, or purchase in your originally selected countries. 
                  Our smart search automatically expanded to <strong>all {availabilityStats.total} countries</strong> to find where this movie is available.
                </p>
                <div className="mt-3 flex items-center space-x-4 text-sm text-amber-600">
                  <div className="flex items-center space-x-1">
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    <span>Found {availabilityStats.withOptions} {availabilityStats.withOptions === 1 ? 'country' : 'countries'} with viewing options</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Country-by-Country Availability */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-gray-900">
              Availability by Country
            </h2>
            <div className="flex items-center space-x-3">
              <span className="text-sm text-gray-600">
                {showOnlyWithAvailability ? `${filteredCountries.length} with options` : `${filteredCountries.length} total`}
              </span>
              <button
                onClick={() => setShowOnlyWithAvailability(!showOnlyWithAvailability)}
                className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                  showOnlyWithAvailability
                    ? 'bg-green-100 text-green-800 hover:bg-green-200'
                    : 'bg-gray-100 text-gray-800 hover:bg-gray-200'
                }`}
              >
                {showOnlyWithAvailability ? 'Show All Countries' : 'Show Only Available'}
              </button>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredCountries.map(renderCountryCard)}
          </div>
        </div>
      </div>
    </div>
  );
}