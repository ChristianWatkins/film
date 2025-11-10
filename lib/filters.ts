import type { Film, FilterState } from './types';
import { getWatchlist } from './watchlist';

// Helper function to normalize platform names for filtering
function normalizePlatformName(platform: string): string {
  const lower = platform.toLowerCase();
  
  // Netflix variations
  if (lower.includes('netflix')) {
    return 'Netflix';
  }
  // Amazon variations
  if (lower.includes('amazon')) {
    return 'Amazon';
  }
  // Apple variations
  if (lower.includes('apple')) {
    return 'Apple TV';
  }
  
  return platform;
}

// Helper function to normalize country names for comparison
function normalizeCountryName(country: string): string {
  const lower = country.toLowerCase().trim();
  
  // USA variations
  if (lower === 'united states' || 
      lower === 'united states of america' || 
      lower === 'usa' || 
      lower === 'us') {
    return 'United States';
  }
  
  // UK variations
  if (lower === 'united kingdom' || 
      lower === 'uk' || 
      lower === 'great britain') {
    return 'United Kingdom';
  }
  
  // Return original if no normalization needed
  return country;
}

// Helper function to convert display names back to filter names
function displayNameToFilterName(displayName: string): string {
  if (displayName === 'Cineast') {
    return 'Cineasterna';
  }
  return displayName;
}

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
    
    // Country filter - include
    if (filters.countries.length > 0) {
      if (!film.country || !filters.countries.includes(film.country)) return false;
    }
    
    // Country filter - exclude
    if (filters.excludedCountries.length > 0 && film.country) {
      // Normalize country name for comparison (handle USA variations)
      const normalizedCountry = normalizeCountryName(film.country);
      const shouldExclude = filters.excludedCountries.some(excluded => {
        const normalizedExcluded = normalizeCountryName(excluded);
        return normalizedCountry === normalizedExcluded;
      });
      if (shouldExclude) return false;
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
          // Convert display name back to filter name for comparison
          const filterName = displayNameToFilterName(selectedPlatform);
          
          // Check if film has streaming on this platform (with normalization)
          const hasStreamingOnThisPlatform = film.streaming.some(s => 
            normalizePlatformName(s.provider) === filterName
          );
          
          // Check if film has rent/buy on this platform (with normalization)
          const hasRentBuyOnThisPlatform = 
            film.rent.some(r => normalizePlatformName(r.provider) === filterName) ||
            film.buy.some(b => normalizePlatformName(b.provider) === filterName);
          
          // If no type filters are active, match any availability on the platform
          if (!hasStreamingFilter && !hasRentBuyFilter) {
            if (hasStreamingOnThisPlatform || hasRentBuyOnThisPlatform) {
              matchesAvailability = true;
            }
          } else {
            // Apply type filters: check for the specific availability type requested
            if (hasStreamingFilter && hasStreamingOnThisPlatform) {
              matchesAvailability = true;
            }
            if (hasRentBuyFilter && hasRentBuyOnThisPlatform) {
              matchesAvailability = true;
            }
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
    
    // JustWatch found filter
    if (filters.justwatchFound !== undefined && filters.justwatchFound !== null) {
      if (filters.justwatchFound && !film.justwatchFound) return false;
      if (!filters.justwatchFound && film.justwatchFound) return false;
    }
    
    // JustWatch availability filter (only apply if film was found on JustWatch)
    if (filters.justwatchAvailable !== undefined && filters.justwatchAvailable !== null && film.justwatchFound) {
      const hasAnyAvailability = film.hasStreaming || film.hasRent || film.hasBuy;
      if (filters.justwatchAvailable && !hasAnyAvailability) return false;
      if (!filters.justwatchAvailable && hasAnyAvailability) return false;
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

