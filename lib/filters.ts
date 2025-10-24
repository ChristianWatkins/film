import type { Film, FilterState } from './types';
import { getWatchlist } from './watchlist';

// Apply all filters to films
export function applyFilters(films: Film[], filters: FilterState): Film[] {
  // Get watchlist if needed
  const watchlist = filters.watchlistOnly ? getWatchlist() : null;
  return films.filter(film => {
    // Festival filter
    if (filters.festivals.length > 0) {
      const hasMatchingFestival = film.festivals.some(f => 
        filters.festivals.includes(f.name)
      );
      if (!hasMatchingFestival) return false;
    }
    
    // Year filter
    if (filters.years.length > 0) {
      if (!filters.years.includes(film.year)) return false;
    }
    
    // Country filter
    if (filters.countries.length > 0) {
      if (!film.country || !filters.countries.includes(film.country)) return false;
    }
    
    // Genre filter
    if (filters.genres.length > 0) {
      if (!film.genres || !film.genres.some(genre => filters.genres.includes(genre))) return false;
    }
    
    // Watchlist filter
    if (filters.watchlistOnly) {
      if (!watchlist || !watchlist.has(film.filmKey)) return false;
    }
    
    // Awarded filter
    if (filters.awardedOnly && !film.awarded) {
      return false;
    }
    
    // Streaming availability and platform filter - simplified logic
    const hasStreamingFilter = filters.showStreaming;
    const hasRentBuyFilter = filters.showRentBuy;
    const hasSpecificPlatforms = filters.selectedPlatforms.length > 0;
    
    // If at least one availability filter is active or specific platforms are selected
    if (hasStreamingFilter || hasRentBuyFilter || hasSpecificPlatforms) {
      let matchesAvailability = false;
      
      // If specific platforms are selected
      if (hasSpecificPlatforms) {
        for (const selectedPlatform of filters.selectedPlatforms) {
          // Check if film has streaming on this platform
          const hasStreamingOnThisPlatform = film.streaming.some(s => s.provider === selectedPlatform);
          
          // Check if film has rent/buy on this platform
          const hasRentBuyOnThisPlatform = 
            film.rent.some(r => r.provider === selectedPlatform) ||
            film.buy.some(b => b.provider === selectedPlatform);
          
          // Apply priority logic: streaming first, then rent/buy only if no streaming anywhere
          if (hasStreamingFilter && hasStreamingOnThisPlatform) {
            matchesAvailability = true;
          } else if (hasRentBuyFilter && hasRentBuyOnThisPlatform && !film.hasStreaming) {
            matchesAvailability = true;
          }
        }
      } else {
        // No specific platforms, just check general availability
        if (hasStreamingFilter && film.hasStreaming) {
          matchesAvailability = true;
        }
        if (hasRentBuyFilter && (film.hasRent || film.hasBuy)) {
          matchesAvailability = true;
        }
      }
      
      if (!matchesAvailability) return false;
    }
    
    return true;
  });
}

// Sort films
export type SortOption = 'year-desc' | 'year-asc' | 'title-asc' | 'title-desc';

export function sortFilms(films: Film[], sortBy: SortOption): Film[] {
  const sorted = [...films];
  
  switch (sortBy) {
    case 'year-desc':
      return sorted.sort((a, b) => b.year - a.year);
    case 'year-asc':
      return sorted.sort((a, b) => a.year - b.year);
    case 'title-asc':
      return sorted.sort((a, b) => a.title.localeCompare(b.title));
    case 'title-desc':
      return sorted.sort((a, b) => b.title.localeCompare(a.title));
    default:
      return sorted;
  }
}

// Search films by title or director
export function searchFilms(films: Film[], query: string): Film[] {
  const lowerQuery = query.toLowerCase();
  
  return films.filter(film =>
    film.title.toLowerCase().includes(lowerQuery) ||
    film.director?.toLowerCase().includes(lowerQuery)
  );
}

