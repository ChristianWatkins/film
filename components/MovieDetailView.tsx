'use client';

import Image from 'next/image';
import { ArrowLeftIcon, ArrowTopRightOnSquareIcon, ClockIcon, StarIcon } from '@heroicons/react/24/outline';
import type { CountryMovieData, JustWatchMovieDetails } from '@/lib/types';

interface MovieDetailViewProps {
  movie: JustWatchMovieDetails;
  allCountryData: CountryMovieData[];
  onBack: () => void;
}

export default function MovieDetailView({ movie, allCountryData, onBack }: MovieDetailViewProps) {
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

        {/* Country-by-Country Availability */}
        <div className="mb-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">
            Availability by Country
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {sortedCountries.map(renderCountryCard)}
          </div>
        </div>
      </div>
    </div>
  );
}