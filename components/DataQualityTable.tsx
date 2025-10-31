'use client';

import { useState, useMemo } from 'react';
import { Film } from '@/lib/types';
import { applyFilters } from '@/lib/filters';

interface DataQualityFilter {
  justwatchFound: boolean | null; // null = all, true = found only, false = not found only
  justwatchAvailable: boolean | null; // null = all, true = available only, false = no options only
  hasEnhancedData: boolean | null; // null = all, true = enhanced only, false = basic only
  hasPoster: boolean | null; // null = all, true = with poster, false = no poster
}

interface DataSource {
  mubi: boolean;
  tmdb: boolean;
  justwatch: boolean;
}

interface DataQualityRow {
  title: string;
  year: number;
  director: string | null;
  country: string | null;
  hasEnhancedData: boolean;
  hasPoster: boolean;
  hasStreaming: boolean;
  hasGenres: boolean;
  hasSynopsis: boolean;
  hasRating: boolean;
  hasRuntime: boolean;
  hasCast: boolean;
  justwatchFound: boolean; // Whether found on JustWatch at all
  sources: DataSource;
  mubiLink?: string;
  posterSource: 'tmdb' | 'justwatch' | 'none';
  dataCompleteness: number; // Percentage of available data fields
}

interface DataQualityTableProps {
  films: Film[];
  festival: string;
  year?: string;
}

export default function DataQualityTable({ films, festival, year }: DataQualityTableProps) {
  // Filter state for data quality table
  const [filters, setFilters] = useState<DataQualityFilter>({
    justwatchFound: null,
    justwatchAvailable: null,
    hasEnhancedData: null,
    hasPoster: null,
  });

  // Filter films for the specific festival and year if provided
  const filteredFilms = useMemo(() => {
    let result = films.filter(film => {
      const hasFestival = film.festivals.some(f => f.name === festival);
      if (!hasFestival) return false;
      
      if (year) {
        return film.festivals.some(f => f.name === festival && f.year === year);
      }
      return true;
    });

    // Apply data quality filters
    return result.filter(film => {
      // JustWatch found filter
      if (filters.justwatchFound !== null) {
        if (filters.justwatchFound && !film.justwatchFound) return false;
        if (!filters.justwatchFound && film.justwatchFound) return false;
      }

      // JustWatch availability filter (only for films found on JustWatch)
      if (filters.justwatchAvailable !== null && film.justwatchFound) {
        const hasAnyAvailability = film.hasStreaming || film.hasRent || film.hasBuy;
        if (filters.justwatchAvailable && !hasAnyAvailability) return false;
        if (!filters.justwatchAvailable && hasAnyAvailability) return false;
      }

      // Enhanced data filter
      if (filters.hasEnhancedData !== null) {
        const hasEnhanced = !!(film.synopsis || film.genres?.length || film.tmdbRating);
        if (filters.hasEnhancedData && !hasEnhanced) return false;
        if (!filters.hasEnhancedData && hasEnhanced) return false;
      }

      // Poster filter
      if (filters.hasPoster !== null) {
        if (filters.hasPoster && !film.posterUrl) return false;
        if (!filters.hasPoster && film.posterUrl) return false;
      }

      return true;
    });
  }, [films, festival, year, filters]);

  // Convert films to data quality rows
  const dataQualityRows: DataQualityRow[] = filteredFilms.map(film => {
    // Determine data sources
    const sources: DataSource = {
      mubi: !!film.mubiLink,
      tmdb: !!(film.tmdbRating || film.synopsis || film.genres?.length || film.runtime || film.cast?.length || 
               (film.posterUrl && film.posterUrl.includes('tmdb'))),
      justwatch: !!(film.justwatchLink || film.hasStreaming || film.hasRent || film.hasBuy ||
                    (film.posterUrl && !film.posterUrl.includes('tmdb')))
    };

    // Determine poster source
    let posterSource: 'tmdb' | 'justwatch' | 'none' = 'none';
    if (film.posterUrl) {
      posterSource = film.posterUrl.includes('tmdb') ? 'tmdb' : 'justwatch';
    }

    // Calculate data completeness (out of available enhanced fields)
    const availableFields = 8; // synopsis, genres, rating, runtime, cast, poster, streaming, awards
    let completedFields = 0;
    if (film.synopsis) completedFields++;
    if (film.genres?.length) completedFields++;
    if (film.tmdbRating) completedFields++;
    if (film.runtime) completedFields++;
    if (film.cast?.length) completedFields++;
    if (film.posterUrl) completedFields++;
    if (film.hasStreaming || film.hasRent || film.hasBuy) completedFields++;
    if (film.awarded) completedFields++;

    const dataCompleteness = Math.round((completedFields / availableFields) * 100);

    return {
      title: film.title,
      year: film.year,
      director: film.director,
      country: film.country,
      hasEnhancedData: !!(film.synopsis || film.genres?.length || film.tmdbRating),
      hasPoster: !!film.posterUrl,
      hasStreaming: film.hasStreaming || film.hasRent || film.hasBuy,
      hasGenres: !!(film.genres && film.genres.length > 0),
      hasSynopsis: !!film.synopsis,
      hasRating: !!film.tmdbRating,
      hasRuntime: !!film.runtime,
      hasCast: !!(film.cast && film.cast.length > 0),
      justwatchFound: film.justwatchFound,
      sources,
      mubiLink: film.mubiLink,
      posterSource,
      dataCompleteness
    };
  });

  const totalFilms = dataQualityRows.length;
  const withEnhancedData = dataQualityRows.filter(r => r.hasEnhancedData).length;
  const withPosters = dataQualityRows.filter(r => r.hasPoster).length;
  const withStreaming = dataQualityRows.filter(r => r.hasStreaming).length;
  const withGenres = dataQualityRows.filter(r => r.hasGenres).length;
  const withSynopsis = dataQualityRows.filter(r => r.hasSynopsis).length;
  const withRating = dataQualityRows.filter(r => r.hasRating).length;
  const withRuntime = dataQualityRows.filter(r => r.hasRuntime).length;
  const withCast = dataQualityRows.filter(r => r.hasCast).length;
  const foundOnJustwatch = dataQualityRows.filter(r => r.justwatchFound).length;

  const withMubi = dataQualityRows.filter(r => r.sources.mubi).length;
  const withTmdb = dataQualityRows.filter(r => r.sources.tmdb).length;
  const withJustwatch = dataQualityRows.filter(r => r.sources.justwatch).length;

  const avgCompleteness = totalFilms > 0 
    ? Math.round(dataQualityRows.reduce((sum, row) => sum + row.dataCompleteness, 0) / totalFilms)
    : 0;

  // Filter toggle functions
  const toggleJustwatchFound = (value: boolean | null) => {
    setFilters(prev => ({ 
      ...prev, 
      justwatchFound: prev.justwatchFound === value ? null : value 
    }));
  };

  const toggleJustwatchAvailable = (value: boolean | null) => {
    setFilters(prev => ({ 
      ...prev, 
      justwatchAvailable: prev.justwatchAvailable === value ? null : value 
    }));
  };

  const toggleEnhancedData = (value: boolean | null) => {
    setFilters(prev => ({ 
      ...prev, 
      hasEnhancedData: prev.hasEnhancedData === value ? null : value 
    }));
  };

  const togglePoster = (value: boolean | null) => {
    setFilters(prev => ({ 
      ...prev, 
      hasPoster: prev.hasPoster === value ? null : value 
    }));
  };

  const clearFilters = () => {
    setFilters({
      justwatchFound: null,
      justwatchAvailable: null,
      hasEnhancedData: null,
      hasPoster: null,
    });
  };

  return (
    <div className="space-y-6">
      {/* Summary Statistics */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold">
            Data Quality Overview - {festival.charAt(0).toUpperCase() + festival.slice(1)}
            {year && ` ${year}`}
          </h2>
          
          {/* Filter Status and Clear Button */}
          {(filters.justwatchFound !== null || filters.justwatchAvailable !== null || 
            filters.hasEnhancedData !== null || filters.hasPoster !== null) && (
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-600">
                Filters active ({Object.values(filters).filter(v => v !== null).length})
              </span>
              <button
                onClick={clearFilters}
                className="px-3 py-1 bg-gray-200 text-gray-700 rounded text-sm hover:bg-gray-300 transition-colors cursor-pointer"
              >
                Clear Filters
              </button>
            </div>
          )}
        </div>
        
        {/* Quick Filter Links */}
        <div className="mb-6 p-4 bg-gray-50 rounded-lg">
          <h3 className="text-sm font-medium text-gray-700 mb-3">Quick Filters:</h3>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => togglePoster(false)}
              className={`px-3 py-1 text-sm rounded-full border transition-colors cursor-pointer ${
                filters.hasPoster === false
                  ? 'bg-red-100 border-red-300 text-red-700'
                  : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-100'
              }`}
            >
              🖼️ No Image ({totalFilms - withPosters})
            </button>
            <button
              onClick={() => toggleJustwatchFound(false)}
              className={`px-3 py-1 text-sm rounded-full border transition-colors cursor-pointer ${
                filters.justwatchFound === false
                  ? 'bg-red-100 border-red-300 text-red-700'
                  : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-100'
              }`}
            >
              🔍 JustWatch Not Found ({totalFilms - foundOnJustwatch})
            </button>
            <button
              onClick={() => toggleEnhancedData(false)}
              className={`px-3 py-1 text-sm rounded-full border transition-colors cursor-pointer ${
                filters.hasEnhancedData === false
                  ? 'bg-red-100 border-red-300 text-red-700'
                  : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-100'
              }`}
            >
              📝 No Enhanced Data ({totalFilms - withEnhancedData})
            </button>
            <button
              onClick={() => setFilters({
                justwatchFound: true,
                justwatchAvailable: false,
                hasEnhancedData: null,
                hasPoster: null,
              })}
              className={`px-3 py-1 text-sm rounded-full border transition-colors cursor-pointer ${
                filters.justwatchFound === true && filters.justwatchAvailable === false
                  ? 'bg-yellow-100 border-yellow-300 text-yellow-700'
                  : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-100'
              }`}
            >
              📺 Found but No Streaming ({foundOnJustwatch - withStreaming})
            </button>
            <button
              onClick={() => setFilters({
                justwatchFound: null,
                justwatchAvailable: null,
                hasEnhancedData: true,
                hasPoster: true,
              })}
              className={`px-3 py-1 text-sm rounded-full border transition-colors cursor-pointer ${
                filters.hasEnhancedData === true && filters.hasPoster === true
                  ? 'bg-green-100 border-green-300 text-green-700'
                  : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-100'
              }`}
            >
              ✅ Complete Data ({dataQualityRows.filter(r => r.hasEnhancedData && r.hasPoster).length})
            </button>
            {/* Clear Filters Link */}
            {(filters.justwatchFound !== null || filters.justwatchAvailable !== null || 
              filters.hasEnhancedData !== null || filters.hasPoster !== null) && (
              <button
                onClick={clearFilters}
                className="px-3 py-1 text-sm rounded-full border border-gray-400 text-gray-600 hover:bg-gray-100 cursor-pointer"
              >
                🔄 Clear All
              </button>
            )}
          </div>
        </div>
        
        <div className="grid grid-cols-2 md:grid-cols-6 gap-4 mb-6">
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600">{totalFilms}</div>
            <div className="text-sm text-gray-600">Total Films</div>
          </div>
          <button
            onClick={() => toggleEnhancedData(true)}
            className={`text-center p-2 rounded transition-colors cursor-pointer ${
              filters.hasEnhancedData === true 
                ? 'bg-green-100 border-2 border-green-400' 
                : 'hover:bg-gray-50'
            }`}
          >
            <div className="text-2xl font-bold text-green-600">
              {totalFilms > 0 ? Math.round((withEnhancedData / totalFilms) * 100) : 0}%
            </div>
            <div className="text-sm text-gray-600">Enhanced Data</div>
          </button>
          <button
            onClick={() => togglePoster(true)}
            className={`text-center p-2 rounded transition-colors cursor-pointer ${
              filters.hasPoster === true 
                ? 'bg-purple-100 border-2 border-purple-400' 
                : 'hover:bg-gray-50'
            }`}
          >
            <div className="text-2xl font-bold text-purple-600">
              {totalFilms > 0 ? Math.round((withPosters / totalFilms) * 100) : 0}%
            </div>
            <div className="text-sm text-gray-600">With Posters</div>
          </button>
          <button
            onClick={() => toggleJustwatchFound(true)}
            className={`text-center p-2 rounded transition-colors cursor-pointer ${
              filters.justwatchFound === true 
                ? 'bg-cyan-100 border-2 border-cyan-400' 
                : 'hover:bg-gray-50'
            }`}
          >
            <div className="text-2xl font-bold text-cyan-600">
              {totalFilms > 0 ? Math.round((foundOnJustwatch / totalFilms) * 100) : 0}%
            </div>
            <div className="text-sm text-gray-600">Found on JW</div>
          </button>
          <button
            onClick={() => toggleJustwatchAvailable(true)}
            className={`text-center p-2 rounded transition-colors cursor-pointer ${
              filters.justwatchAvailable === true 
                ? 'bg-orange-100 border-2 border-orange-400' 
                : 'hover:bg-gray-50'
            }`}
          >
            <div className="text-2xl font-bold text-orange-600">
              {totalFilms > 0 ? Math.round((withStreaming / totalFilms) * 100) : 0}%
            </div>
            <div className="text-sm text-gray-600">With Streaming</div>
          </button>
          <div className="text-center">
            <div className="text-2xl font-bold text-indigo-600">{avgCompleteness}%</div>
            <div className="text-sm text-gray-600">Avg Completeness</div>
          </div>
        </div>

        {/* Data Sources */}
        <div className="grid grid-cols-3 gap-4">
          <div className="text-center p-4 bg-red-50 rounded">
            <div className="text-xl font-bold text-red-600">{withMubi}</div>
            <div className="text-sm text-gray-600">MUBI Data</div>
            <div className="text-xs text-gray-500">
              {totalFilms > 0 ? Math.round((withMubi / totalFilms) * 100) : 0}%
            </div>
          </div>
          <div className="text-center p-4 bg-blue-50 rounded">
            <div className="text-xl font-bold text-blue-600">{withTmdb}</div>
            <div className="text-sm text-gray-600">TMDB Data</div>
            <div className="text-xs text-gray-500">
              {totalFilms > 0 ? Math.round((withTmdb / totalFilms) * 100) : 0}%
            </div>
          </div>
          <div className="text-center p-4 bg-green-50 rounded">
            <div className="text-xl font-bold text-green-600">{withJustwatch}</div>
            <div className="text-sm text-gray-600">JustWatch Data</div>
            <div className="text-xs text-gray-500">
              {totalFilms > 0 ? Math.round((withJustwatch / totalFilms) * 100) : 0}%
            </div>
          </div>
        </div>
      </div>

      {/* Detailed breakdown */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold mb-4">Data Completeness Breakdown</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="flex justify-between">
            <span>Genres:</span>
            <span className="font-semibold">{withGenres}/{totalFilms} ({totalFilms > 0 ? Math.round((withGenres / totalFilms) * 100) : 0}%)</span>
          </div>
          <div className="flex justify-between">
            <span>Synopsis:</span>
            <span className="font-semibold">{withSynopsis}/{totalFilms} ({totalFilms > 0 ? Math.round((withSynopsis / totalFilms) * 100) : 0}%)</span>
          </div>
          <div className="flex justify-between">
            <span>TMDB Rating:</span>
            <span className="font-semibold">{withRating}/{totalFilms} ({totalFilms > 0 ? Math.round((withRating / totalFilms) * 100) : 0}%)</span>
          </div>
          <div className="flex justify-between">
            <span>Runtime:</span>
            <span className="font-semibold">{withRuntime}/{totalFilms} ({totalFilms > 0 ? Math.round((withRuntime / totalFilms) * 100) : 0}%)</span>
          </div>
          <div className="flex justify-between">
            <span>Cast Info:</span>
            <span className="font-semibold">{withCast}/{totalFilms} ({totalFilms > 0 ? Math.round((withCast / totalFilms) * 100) : 0}%)</span>
          </div>
          <div className="flex justify-between">
            <span>Found on JustWatch:</span>
            <span className="font-semibold">{foundOnJustwatch}/{totalFilms} ({totalFilms > 0 ? Math.round((foundOnJustwatch / totalFilms) * 100) : 0}%)</span>
          </div>
          <div className="flex justify-between">
            <span>Has Streaming/Rent:</span>
            <span className="font-semibold">{withStreaming}/{totalFilms} ({totalFilms > 0 ? Math.round((withStreaming / totalFilms) * 100) : 0}%)</span>
          </div>
          <div className="flex justify-between">
            <span>Poster (TMDB):</span>
            <span className="font-semibold">
              {dataQualityRows.filter(r => r.posterSource === 'tmdb').length}/{totalFilms} 
              ({totalFilms > 0 ? Math.round((dataQualityRows.filter(r => r.posterSource === 'tmdb').length / totalFilms) * 100) : 0}%)
            </span>
          </div>
        </div>
      </div>

      {/* Films Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Film
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Director / Country
                </th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Data Sources
                </th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Enhanced Data
                </th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  JustWatch Status
                </th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Poster Source
                </th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Completeness
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {dataQualityRows.map((row, index) => (
                <tr key={index} className="hover:bg-gray-50">
                  <td className="px-4 py-4">
                    <div>
                      <div className="font-medium text-gray-900">{row.title}</div>
                      <div className="text-sm text-gray-500">{row.year}</div>
                    </div>
                  </td>
                  <td className="px-4 py-4">
                    <div className="text-sm text-gray-900">{row.director || 'N/A'}</div>
                    <div className="text-sm text-gray-500">{row.country || 'N/A'}</div>
                  </td>
                  <td className="px-4 py-4 text-center">
                    <div className="flex justify-center space-x-1">
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                        row.sources.mubi ? 'bg-red-100 text-red-800' : 'bg-gray-100 text-gray-400'
                      }`}>
                        MUBI
                      </span>
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                        row.sources.tmdb ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-400'
                      }`}>
                        TMDB
                      </span>
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                        row.sources.justwatch ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-400'
                      }`}>
                        JW
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-4 text-center">
                    <div className="grid grid-cols-2 gap-1">
                      <div className={`inline-flex items-center px-1 py-1 rounded text-xs font-medium ${
                        row.hasGenres ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-400'
                      }`}>
                        Genres
                      </div>
                      <div className={`inline-flex items-center px-1 py-1 rounded text-xs font-medium ${
                        row.hasSynopsis ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-400'
                      }`}>
                        Synopsis
                      </div>
                      <div className={`inline-flex items-center px-1 py-1 rounded text-xs font-medium ${
                        row.hasRating ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-400'
                      }`}>
                        Rating
                      </div>
                      <div className={`inline-flex items-center px-1 py-1 rounded text-xs font-medium ${
                        row.hasRuntime ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-400'
                      }`}>
                        Runtime
                      </div>
                      <div className={`inline-flex items-center px-1 py-1 rounded text-xs font-medium ${
                        row.hasCast ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-400'
                      }`}>
                        Cast
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-4 text-center">
                    <div className="space-y-1">
                      <button
                        onClick={() => toggleJustwatchFound(row.justwatchFound)}
                        className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium transition-colors cursor-pointer ${
                          row.justwatchFound 
                            ? (filters.justwatchFound === true 
                                ? 'bg-cyan-200 text-cyan-900 ring-2 ring-cyan-400' 
                                : 'bg-cyan-100 text-cyan-800 hover:bg-cyan-200')
                            : (filters.justwatchFound === false
                                ? 'bg-red-200 text-red-900 ring-2 ring-red-400'
                                : 'bg-red-100 text-red-800 hover:bg-red-200')
                        }`}
                      >
                        {row.justwatchFound ? 'Found' : 'Not Found'}
                      </button>
                      {row.justwatchFound && (
                        <button
                          onClick={() => toggleJustwatchAvailable(row.hasStreaming)}
                          className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium transition-colors cursor-pointer ${
                            row.hasStreaming 
                              ? (filters.justwatchAvailable === true
                                  ? 'bg-green-200 text-green-900 ring-2 ring-green-400'
                                  : 'bg-green-100 text-green-800 hover:bg-green-200')
                              : (filters.justwatchAvailable === false
                                  ? 'bg-gray-200 text-gray-900 ring-2 ring-gray-400'
                                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200')
                          }`}
                        >
                          {row.hasStreaming ? 'Available' : 'No Options'}
                        </button>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-4 text-center">
                    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                      row.posterSource === 'tmdb' ? 'bg-blue-100 text-blue-800' :
                      row.posterSource === 'justwatch' ? 'bg-green-100 text-green-800' :
                      'bg-red-100 text-red-800'
                    }`}>
                      {row.posterSource === 'tmdb' ? 'TMDB' :
                       row.posterSource === 'justwatch' ? 'JustWatch' :
                       'None'}
                    </span>
                  </td>
                  <td className="px-4 py-4 text-center">
                    <div className={`text-sm font-semibold ${
                      row.dataCompleteness >= 80 ? 'text-green-600' :
                      row.dataCompleteness >= 50 ? 'text-yellow-600' :
                      'text-red-600'
                    }`}>
                      {row.dataCompleteness}%
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}