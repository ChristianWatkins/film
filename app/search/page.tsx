'use client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
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
  const searchParams = useSearchParams();
  const [searchResults, setSearchResults] = useState<SearchResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedMovie, setSelectedMovie] = useState<{
    movie: JustWatchMovieDetails;
    countries: CountryMovieData[];
    isExpandedSearch?: boolean;
    tmdbType?: 'movie' | 'tv';
  } | null>(null);

  // Handle automatic search from URL parameters
  useEffect(() => {
    const query = searchParams.get('q');
    const auto = searchParams.get('auto');
    const yearParam = searchParams.get('year');
    
    if (query && auto === 'true') {
      // Perform automatic search without country restrictions
      // Use showAllMovies = false by default for auto searches (maintains original behavior)
      handleSearch(query, [], false, yearParam ? parseInt(yearParam, 10) : null);
    }
  }, [searchParams]);

  const handleSearch = async (query: string, countries: string[], showAllMovies: boolean = false, targetYear?: number | null) => {
    setIsLoading(true);
    setError(null);
    setSearchResults(null);
    setSelectedMovie(null); // Clear any selected movie
    
    let wasExpandedSearch = false;

    try {
      // First attempt: search in selected countries
      let params = new URLSearchParams({
        q: query
      });
      
      // Add year parameter if provided
      if (targetYear) {
        params.set('year', String(targetYear));
      }
      
      // Only add countries parameter if we have valid countries
      if (countries.length > 0) {
        params.set('countries', countries.join(','));
      }

      let response = await fetch(`/api/justwatch-search?${params}`);
      
      if (!response.ok) {
        // Try to get the error message from the JSON response
        try {
          const errorData = await response.json();
          if (errorData.error) {
            throw new Error(errorData.error);
          }
        } catch (jsonError) {
          // If JSON parsing fails, fall back to status text
        }
        
        // Handle specific status codes with user-friendly messages
        if (response.status === 429) {
          throw new Error('Too many searches. Please wait a moment and try again.');
        } else if (response.status === 400) {
          throw new Error('Invalid search request. Please check your input.');
        } else {
          throw new Error(`Search failed: ${response.statusText}`);
        }
      }

      let data: SearchResponse = await response.json();
      
      // Check if we found any results with actual streaming/rental/purchase options
      const foundResults = data.results.filter(result => result.found);
      const resultsWithOptions = foundResults.filter(result => {
        if (!result.details) return false;
        const hasOptions = 
          (result.details.streamingProviders && result.details.streamingProviders.length > 0) ||
          (result.details.rentProviders && result.details.rentProviders.length > 0) ||
          (result.details.buyProviders && result.details.buyProviders.length > 0);
        return hasOptions;
      });
      
      // If no useful results found in selected countries, try searching all countries
      if (resultsWithOptions.length === 0 && countries.length < 14) { // 14 is total number of countries
        console.log(`No streaming options in selected countries (found ${foundResults.length} catalog entries, ${resultsWithOptions.length} with options), expanding search to all countries...`);
        
        // Search all countries as fallback
        const fallbackParams = new URLSearchParams({
          q: query
          // Don't include countries parameter to get all countries
        });
        
        // Add year parameter if provided
        if (targetYear) {
          fallbackParams.set('year', String(targetYear));
        }

        response = await fetch(`/api/justwatch-search?${fallbackParams}`);
        
        if (response.ok) {
          const fallbackData: SearchResponse = await response.json();
          const fallbackFoundResults = fallbackData.results.filter(result => result.found);
          const fallbackResultsWithOptions = fallbackFoundResults.filter(result => {
            if (!result.details) return false;
            const hasOptions = 
              (result.details.streamingProviders && result.details.streamingProviders.length > 0) ||
              (result.details.rentProviders && result.details.rentProviders.length > 0) ||
              (result.details.buyProviders && result.details.buyProviders.length > 0);
            return hasOptions;
          });
          
          if (fallbackResultsWithOptions.length > 0) {
            // Use fallback results but add a note
            data = {
              ...fallbackData,
              query: `${fallbackData.query} (expanded to all countries - no streaming options in selected countries)`
            };
            wasExpandedSearch = true;
            console.log(`Found ${fallbackResultsWithOptions.length} results with streaming options after expanding search`);
          }
        }
      }
      
      setSearchResults(data);
      
      // Auto-navigate to detail view if only one unique movie found
      const finalFoundResults = data.results.filter(result => result.found);
      if (finalFoundResults.length > 0) {
        // Group by movie title to count unique movies
        const uniqueMovies = new Map();
        finalFoundResults.forEach(result => {
          if (result.details) {
            const movieKey = `${result.details.title}-${result.details.originalReleaseYear}`;
            if (!uniqueMovies.has(movieKey)) {
              uniqueMovies.set(movieKey, {
                movie: result.details,
                countries: [result]
              });
            } else {
              uniqueMovies.get(movieKey).countries.push(result);
            }
          }
        });
        
        // Only auto-navigate if:
        // 1. There's exactly one unique movie, AND
        // 2. There are no other movies with the same title but different years
        const movieList = Array.from(uniqueMovies.values());
        const hasMultipleVersions = movieList.some((movieData) => {
          return movieList.some(other => 
            other !== movieData &&
            other.movie.title === movieData.movie.title && 
            other.movie.originalReleaseYear !== movieData.movie.originalReleaseYear
          );
        });
        
        // Check if the found movie matches the target year (if provided)
        const yearMatches = targetYear ? 
          movieList.every(m => m.movie.originalReleaseYear === targetYear) : true;
        
        // Only auto-select if:
        // 1. showAllMovies setting is NOT enabled (if enabled, always show selection UI)
        // 2. There's exactly one unique movie
        // 3. No multiple versions with same title but different years
        // 4. The found movie matches the target year (if year was provided)
        if (!showAllMovies && uniqueMovies.size === 1 && !hasMultipleVersions && yearMatches) {
          const [movieData] = uniqueMovies.values();
          setSelectedMovie({
            ...movieData,
            isExpandedSearch: wasExpandedSearch
          });
        }
        // If showAllMovies is enabled, or there are multiple movies with same title but different years, or year doesn't match, show selection UI
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Search failed');
    } finally {
      setIsLoading(false);
    }
  };

  const handleMovieClick = (movie: JustWatchMovieDetails, allCountryData: CountryMovieData[]) => {
    // Check if this was an expanded search by looking at the query
    const isExpanded = searchResults?.query.includes('(expanded to all countries') || false;
    setSelectedMovie({ 
      movie, 
      countries: allCountryData,
      isExpandedSearch: isExpanded
    });
  };

  const handleBackToSearch = () => {
    setSelectedMovie(null);
  };

  const handleTMDBLink = async (tmdbUrl: string) => {
    setIsLoading(true);
    setError(null);
    setSearchResults(null);
    setSelectedMovie(null);

    try {
      // Parse TMDB URL to extract ID and type
      // Examples:
      // https://www.themoviedb.org/movie/676727-the-inventor
      // https://www.themoviedb.org/tv/255451-leonardo-da-vinci
      // https://www.themoviedb.org/movie/676727
      // https://www.themoviedb.org/tv/255451
      const movieMatch = tmdbUrl.match(/themoviedb\.org\/movie\/(\d+)/);
      const tvMatch = tmdbUrl.match(/themoviedb\.org\/tv\/(\d+)/);
      
      let tmdbId: string | null = null;
      let type: 'movie' | 'tv' | null = null;

      if (movieMatch) {
        tmdbId = movieMatch[1];
        type = 'movie';
      } else if (tvMatch) {
        tmdbId = tvMatch[1];
        type = 'tv';
      } else {
        throw new Error('Invalid TMDB URL. Please use a URL like https://www.themoviedb.org/movie/676727 or https://www.themoviedb.org/tv/255451');
      }

      // Fetch TMDB details
      const response = await fetch(`/api/tmdb-details?tmdbId=${tmdbId}&type=${type}`);
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch TMDB details');
      }

      const tmdbData = await response.json();

      // Convert TMDB data to JustWatchMovieDetails format
      const releaseYear = tmdbData.releaseDate ? parseInt(tmdbData.releaseDate.substring(0, 4)) : new Date().getFullYear();
      
      const movie: JustWatchMovieDetails = {
        id: `tmdb-${tmdbId}`,
        title: tmdbData.title,
        originalTitle: tmdbData.originalTitle,
        originalReleaseYear: releaseYear,
        posterUrl: tmdbData.posterPath,
        imdbId: tmdbData.imdbId,
        tmdbId: tmdbData.tmdbId,
        runtime: tmdbData.runtime,
        genres: tmdbData.genres?.map((g: { name: string }) => ({ name: g.name })),
        synopsis: tmdbData.synopsis,
        streamingProviders: [],
        rentProviders: [],
        buyProviders: [],
        country: 'US', // Default country
      };

      // Create empty country data array
      const allCountryData: CountryMovieData[] = [];

      // Store type in a way that MovieDetailView can access it
      // We'll pass it through the movie object or use a separate state
      setSelectedMovie({
        movie,
        countries: allCountryData,
        isExpandedSearch: false,
        tmdbType: type // Store the type so MovieDetailView can use it
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load TMDB data');
    } finally {
      setIsLoading(false);
    }
  };

  // If a movie is selected, show the detailed view
  if (selectedMovie) {
    return (
      <MovieDetailView
        movie={selectedMovie.movie}
        allCountryData={selectedMovie.countries}
        onBack={handleBackToSearch}
        isExpandedSearch={selectedMovie.isExpandedSearch}
        initialTmdbType={selectedMovie.tmdbType}
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

        {/* TMDB Link Input */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">
            Or add from TMDB link
          </h2>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const form = e.currentTarget;
              const input = form.querySelector('input') as HTMLInputElement;
              if (input?.value.trim()) {
                handleTMDBLink(input.value.trim());
                input.value = '';
              }
            }}
            className="flex gap-2"
          >
            <input
              type="text"
              placeholder="Paste TMDB link (e.g., https://www.themoviedb.org/movie/676727 or https://www.themoviedb.org/tv/255451)"
              className="flex-1 px-4 py-2 border border-gray-300 rounded-md text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
              disabled={isLoading}
            />
            <button
              type="submit"
              disabled={isLoading}
              className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
              {isLoading ? 'Loading...' : 'Load from TMDB'}
            </button>
          </form>
        </div>

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
      </div>
    </div>
  );
}