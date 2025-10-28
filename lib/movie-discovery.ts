import type { Film, JustWatchMovieDetails } from '@/lib/types';

/**
 * Check if a movie from JustWatch already exists in the festival database
 */
export function isMovieInDatabase(movie: JustWatchMovieDetails, films: Film[]): boolean {
  const movieTitle = movie.title.toLowerCase().trim();
  const movieYear = movie.originalReleaseYear;
  
  return films.some(film => {
    const filmTitle = film.title.toLowerCase().trim();
    const filmYear = film.year;
    
    // Check for exact title and year match
    if (filmTitle === movieTitle && filmYear === movieYear) {
      return true;
    }
    
    // Check for title match with similar years (±1 year tolerance)
    if (filmTitle === movieTitle && movieYear && Math.abs(filmYear - movieYear) <= 1) {
      return true;
    }
    
    // Check for very similar titles (handling variations like "The Film" vs "Film")
    const normalizeTitle = (title: string) => 
      title.replace(/^(the|a|an)\s+/i, '').replace(/[^\w\s]/g, '').toLowerCase();
    
    const normalizedFilmTitle = normalizeTitle(filmTitle);
    const normalizedMovieTitle = normalizeTitle(movieTitle);
    
    if (normalizedFilmTitle === normalizedMovieTitle && movieYear && Math.abs(filmYear - movieYear) <= 1) {
      return true;
    }
    
    return false;
  });
}

/**
 * Format movie data for potential export/addition to database
 */
export function formatMovieForExport(movie: JustWatchMovieDetails): any {
  return {
    title: movie.title,
    originalTitle: movie.originalTitle,
    year: movie.originalReleaseYear,
    genres: movie.genres?.map(g => typeof g === 'string' ? g : g.name) || [],
    runtime: movie.runtime ? `${movie.runtime} min` : undefined,
    synopsis: movie.synopsis,
    justwatch_id: movie.id,
    justwatch_url: movie.justwatchUrl,
    poster_url: movie.posterUrl,
    imdb_id: movie.imdbId,
    tmdb_id: movie.tmdbId,
    streaming_availability: {
      [movie.country]: {
        streaming: movie.streamingProviders || [],
        rent: movie.rentProviders || [],
        buy: movie.buyProviders || []
      }
    },
    discovered_date: new Date().toISOString(),
    source: 'justwatch_discovery'
  };
}

/**
 * Export discovered movies to JSON for download
 */
export function exportDiscoveredMovies(movies: JustWatchMovieDetails[]): void {
  const exportData = {
    export_date: new Date().toISOString(),
    total_movies: movies.length,
    movies: movies.map(formatMovieForExport)
  };
  
  const dataStr = JSON.stringify(exportData, null, 2);
  const dataBlob = new Blob([dataStr], { type: 'application/json' });
  
  const url = URL.createObjectURL(dataBlob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `discovered-movies-${new Date().toISOString().split('T')[0]}.json`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}