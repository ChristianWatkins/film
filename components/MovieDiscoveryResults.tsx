'use client';

import { useState } from 'react';
import Image from 'next/image';
import { ArrowTopRightOnSquareIcon, ClockIcon, EyeIcon } from '@heroicons/react/24/outline';
import type { CountryMovieData, JustWatchMovieDetails } from '@/lib/types';

interface MovieDiscoveryResultsProps {
  results: CountryMovieData[];
  query: string;
  totalCountries: number;
  foundInCountries: number;
  onMovieClick: (movieDetails: JustWatchMovieDetails, allCountryData: CountryMovieData[]) => void;
}

export default function MovieDiscoveryResults({ 
  results, 
  query, 
  totalCountries, 
  foundInCountries,
  onMovieClick
}: MovieDiscoveryResultsProps) {
  const [showOnlyFound, setShowOnlyFound] = useState(false);
  const [sortBy, setSortBy] = useState<'country' | 'availability'>('country');

  // Clean the query to remove any technical suffixes
  const displayQuery = query.includes('(expanded to all countries') ? query.split(' (expanded to all countries')[0] : query;

  // Group results by movie (same title and year)
  const movieGroups = results.reduce((groups, result) => {
    if (!result.found || !result.details) return groups;
    
    const key = `${result.details.title}-${result.details.originalReleaseYear}`;
    if (!groups[key]) {
      groups[key] = {
        movie: result.details,
        countries: []
      };
    }
    groups[key].countries.push(result);
    return groups;
  }, {} as Record<string, { movie: JustWatchMovieDetails; countries: CountryMovieData[]; }>);

  const movieList = Object.values(movieGroups);

  if (results.length === 0) {
    return null;
  }

  const renderAvailabilityPreview = (countries: CountryMovieData[]) => {
    const streamingCount = countries.filter(c => 
      c.details?.streamingProviders && c.details.streamingProviders.length > 0
    ).length;
    const rentCount = countries.filter(c => 
      c.details?.rentProviders && c.details.rentProviders.length > 0
    ).length;
    const buyCount = countries.filter(c => 
      c.details?.buyProviders && c.details.buyProviders.length > 0
    ).length;

    return (
      <div className="flex gap-2 text-xs">
        {streamingCount > 0 && (
          <span className="inline-flex items-center px-2 py-1 rounded-full bg-green-100 text-green-800">
            Stream in {streamingCount} countries
          </span>
        )}
        {rentCount > 0 && (
          <span className="inline-flex items-center px-2 py-1 rounded-full bg-yellow-100 text-yellow-800">
            Rent in {rentCount} countries
          </span>
        )}
        {buyCount > 0 && (
          <span className="inline-flex items-center px-2 py-1 rounded-full bg-blue-100 text-blue-800">
            Buy in {buyCount} countries
          </span>
        )}
      </div>
    );
  };

  const renderMovieCard = (movieGroup: { movie: JustWatchMovieDetails; countries: CountryMovieData[]; }) => {
    const { movie, countries } = movieGroup;

    return (
      <div 
        key={`${movie.title}-${movie.originalReleaseYear}`}
        className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-lg transition-all cursor-pointer hover:border-blue-300"
        onClick={() => onMovieClick(movie, results)} // Pass all results instead of just countries for this movie
      >
        {/* Movie Header */}
        <div className="flex space-x-3 mb-3">
          {movie.posterUrl && (
            <div className="flex-shrink-0">
              <Image
                src={movie.posterUrl}
                alt={movie.title}
                width={80}
                height={120}
                className="rounded-md object-cover"
                unoptimized
              />
            </div>
          )}
          <div className="flex-1 min-w-0">
            <h4 className="font-semibold text-gray-900 text-lg mb-1">{movie.title}</h4>
            {movie.originalTitle && movie.originalTitle !== movie.title && (
              <p className="text-sm text-gray-600 mb-1">({movie.originalTitle})</p>
            )}
            {movie.originalReleaseYear && (
              <p className="text-sm text-gray-500 mb-2">{movie.originalReleaseYear}</p>
            )}
            {movie.runtime && (
              <div className="flex items-center text-sm text-gray-500 mb-2">
                <ClockIcon className="h-4 w-4 mr-1" />
                {movie.runtime} min
              </div>
            )}
            {movie.genres && movie.genres.length > 0 && (
              <div className="flex flex-wrap gap-1 mb-2">
                {movie.genres.slice(0, 3).map((genre, idx) => (
                  <span key={idx} className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                    {typeof genre === 'string' ? genre : genre.name}
                  </span>
                ))}
                {movie.genres.length > 3 && (
                  <span className="text-xs text-gray-500">+{movie.genres.length - 3} more</span>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Synopsis */}
        {movie.synopsis && (
          <p className="text-sm text-gray-600 line-clamp-2 mb-3">{movie.synopsis}</p>
        )}

        {/* Availability Preview */}
        <div className="mb-3">
          {renderAvailabilityPreview(countries)}
        </div>

        {/* Countries Found */}
        <div className="flex items-center justify-between pt-3 border-t border-gray-100">
          <div className="text-sm text-gray-600">
            Found in {countries.length} countries
          </div>
          <div className="flex items-center text-sm text-blue-600">
            <EyeIcon className="h-4 w-4 mr-1" />
            View Details
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Results Summary */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">
            Movies Found for "{displayQuery}"
          </h2>
          <div className="text-sm text-gray-600">
            {movieList.length} unique movies • Found in {foundInCountries} of {totalCountries} countries
          </div>
        </div>

        <p className="text-sm text-gray-600">
          Click on any movie to see detailed streaming availability across all countries.
        </p>
      </div>

      {/* Results Grid */}
      {movieList.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {movieList.map(renderMovieCard)}
        </div>
      ) : (
        <div className="text-center py-8 text-gray-500">
          No movies found for "{displayQuery}". Try a different search term.
        </div>
      )}
    </div>
  );
}