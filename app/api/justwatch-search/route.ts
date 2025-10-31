import { NextRequest, NextResponse } from 'next/server';
import JustWatchAPI from 'justwatch-api-client';
import type { JustWatchCountry, JustWatchSearchResult, JustWatchMovieDetails, CountryMovieData } from '@/lib/types';

// Rate limiting - simple in-memory cache (use Redis in production)
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();
const RATE_LIMIT_WINDOW = 60000; // 1 minute
const RATE_LIMIT_MAX_REQUESTS = parseInt(process.env.RATE_LIMIT_REQUESTS_PER_MINUTE || '10');

// Global rate limiting
const GLOBAL_RATE_LIMIT_WINDOW = 60000; // 1 minute
const GLOBAL_RATE_LIMIT_MAX_REQUESTS = parseInt(process.env.GLOBAL_RATE_LIMIT_REQUESTS_PER_MINUTE || '3');
let globalRateLimit = { count: 0, resetTime: Date.now() + GLOBAL_RATE_LIMIT_WINDOW };

function checkRateLimit(ip: string): { allowed: boolean; reason?: string } {
  const now = Date.now();
  
  // Check global rate limit first
  if (now > globalRateLimit.resetTime) {
    globalRateLimit = { count: 1, resetTime: now + GLOBAL_RATE_LIMIT_WINDOW };
  } else {
    if (globalRateLimit.count >= GLOBAL_RATE_LIMIT_MAX_REQUESTS) {
      return { 
        allowed: false, 
        reason: `Global rate limit reached (${GLOBAL_RATE_LIMIT_MAX_REQUESTS} searches per minute for all users). Please wait a moment.`
      };
    }
    globalRateLimit.count++;
  }
  
  // Check per-IP rate limit
  const userLimit = rateLimitMap.get(ip);

  if (!userLimit || now > userLimit.resetTime) {
    rateLimitMap.set(ip, { count: 1, resetTime: now + RATE_LIMIT_WINDOW });
    return { allowed: true };
  }

  if (userLimit.count >= RATE_LIMIT_MAX_REQUESTS) {
    return { 
      allowed: false, 
      reason: `You've reached the limit of ${RATE_LIMIT_MAX_REQUESTS} searches per minute. Please wait a moment.`
    };
  }

  userLimit.count++;
  return { allowed: true };
}

// Supported countries with Norway first
const COUNTRIES: JustWatchCountry[] = [
  { code: 'NO', name: 'Norway', flag: '🇳🇴' },
  { code: 'SE', name: 'Sweden', flag: '🇸🇪' },
  { code: 'DK', name: 'Denmark', flag: '🇩🇰' },
  { code: 'GB', name: 'United Kingdom', flag: '🇬🇧' },
  { code: 'DE', name: 'Germany', flag: '🇩🇪' },
  { code: 'FR', name: 'France', flag: '🇫🇷' },
  { code: 'FI', name: 'Finland', flag: '🇫🇮' },
  { code: 'IT', name: 'Italy', flag: '🇮🇹' },
  { code: 'ES', name: 'Spain', flag: '🇪🇸' },
  { code: 'NL', name: 'Netherlands', flag: '🇳🇱' },
  { code: 'US', name: 'United States', flag: '🇺🇸' }
];

async function searchInCountry(
  justwatch: any,
  query: string, 
  country: JustWatchCountry,
  targetYear?: number | null
): Promise<CountryMovieData[]> {
  try {
    // Only log in development
    if (process.env.NODE_ENV === 'development') {
      console.log(`Searching in ${country.name} (${country.code}) for: ${query}`);
    }
    
    // Search for the movie
    const searchResults: JustWatchSearchResult[] = await justwatch.search(query, country.code);
    
    if (!searchResults || searchResults.length === 0) {
      return [{
        country,
        found: false,
        error: 'No search results found'
      }];
    }

    // Filter to movies only - check both objectType and if it's undefined, assume it's a movie if it has a year
    const movies = searchResults.filter(result => {
      // If objectType is defined, use it
      if (result.objectType !== undefined) {
        return result.objectType === 'movie';
      }
      // If objectType is undefined but it has a release year, likely a movie
      // (TV shows usually don't have originalReleaseYear in the same way)
      return result.originalReleaseYear !== undefined && result.originalReleaseYear !== null;
    });

    if (movies.length === 0) {
      return [{
        country,
        found: false,
        error: 'No movies found in search results'
      }];
    }

    // Sort movies by relevance:
    // 1. Exact title + year match (if year provided)
    // 2. Exact title match
    // 3. Closest year match (if year provided)
    // 4. Others
    const queryLower = query.toLowerCase().trim();
    const sortedMovies = [...movies].sort((a, b) => {
      const aTitleMatch = a.title.toLowerCase() === queryLower;
      const bTitleMatch = b.title.toLowerCase() === queryLower;
      
      if (targetYear) {
        const aYearMatch = a.originalReleaseYear === targetYear;
        const bYearMatch = b.originalReleaseYear === targetYear;
        
        // Exact title + year match is best
        if (aTitleMatch && aYearMatch && !(bTitleMatch && bYearMatch)) return -1;
        if (bTitleMatch && bYearMatch && !(aTitleMatch && aYearMatch)) return 1;
        
        // Exact title match is next
        if (aTitleMatch && !bTitleMatch) return -1;
        if (bTitleMatch && !aTitleMatch) return 1;
        
        // Then closest year match
        const aYearDiff = Math.abs((a.originalReleaseYear || 0) - targetYear);
        const bYearDiff = Math.abs((b.originalReleaseYear || 0) - targetYear);
        return aYearDiff - bYearDiff;
      } else {
        // No year provided, just prioritize exact title match
        if (aTitleMatch && !bTitleMatch) return -1;
        if (bTitleMatch && !aTitleMatch) return 1;
      }
      
      return 0;
    });

    // Return all matching movies (limit to 10 per country to avoid too many results)
    const moviesToProcess = sortedMovies.slice(0, 10);
    const results: CountryMovieData[] = [];

    for (const match of moviesToProcess) {
      if (process.env.NODE_ENV === 'development') {
        console.log(`Found match in ${country.name}: ${match.title} (${match.originalReleaseYear})`);
      }

      // Get detailed information
      let details: any = null;
      if (match.fullPath) {
        try {
          details = await justwatch.getData(match.fullPath, country.code);
        } catch (error) {
          console.warn(`Failed to get details for ${match.title} in ${country.name}:`, error);
          continue; // Skip this movie if we can't get details
        }
      }

      const movieDetails: JustWatchMovieDetails = {
        id: match.id,
        title: match.title,
        originalTitle: details?.originalTitle || match.title,
        originalReleaseYear: match.originalReleaseYear,
        posterUrl: match.posterUrl || details?.posterUrl,
        imdbId: details?.externalIds?.imdbId,
        tmdbId: details?.externalIds?.tmdbId,
        runtime: details?.runtime,
        genres: details?.genres,
        synopsis: details?.shortDescription || details?.synopsis,
        streamingProviders: details?.Streams?.filter((stream: any) => {
          const type = stream.Type?.toLowerCase() || '';
          return type.includes('subscription') || type.includes('flatrate') || type.includes('free');
        }).map((stream: any) => ({
          provider: stream.Provider || stream.Name,
          quality: stream.Resolution,
          price: stream.Price || null,
          url: stream.Link
        })) || [],
        rentProviders: details?.Streams?.filter((stream: any) => stream.Type === 'RENT').map((stream: any) => ({
          provider: stream.Provider || stream.Name,
          quality: stream.Resolution,
          price: stream.Price || null,
          url: stream.Link
        })) || [],
        buyProviders: details?.Streams?.filter((stream: any) => stream.Type === 'BUY').map((stream: any) => ({
          provider: stream.Provider || stream.Name,
          quality: stream.Resolution,
          price: stream.Price || null,
          url: stream.Link
        })) || [],
        country: country.code,
        justwatchUrl: match.fullPath ? `https://www.justwatch.com${match.fullPath}` : undefined
      };

      results.push({
        country,
        found: true,
        details: movieDetails
      });
    }

    return results.length > 0 ? results : [{
      country,
      found: false,
      error: 'Could not fetch movie details'
    }];

  } catch (error) {
    console.error(`Error searching in ${country.name}:`, error);
    return [{
      country,
      found: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }];
  }
}

export async function GET(request: NextRequest) {
  // Rate limiting
  const forwarded = request.headers.get('x-forwarded-for');
  const ip = forwarded ? forwarded.split(',')[0] : request.headers.get('x-real-ip') || 'unknown';
  const rateLimitCheck = checkRateLimit(ip);
  if (!rateLimitCheck.allowed) {
    return NextResponse.json(
      { error: rateLimitCheck.reason || 'Rate limit exceeded. Please try again later.' }, 
      { status: 429 }
    );
  }

  const { searchParams } = new URL(request.url);
  const query = searchParams.get('q');
  const yearParam = searchParams.get('year');
  const targetYear = yearParam ? parseInt(yearParam, 10) : null;
  const countriesParam = searchParams.get('countries');
  const countries = countriesParam ? countriesParam.split(',').filter(c => c.trim().length > 0) : [];

  // Input validation
  if (!query) {
    return NextResponse.json({ error: 'Query parameter "q" is required' }, { status: 400 });
  }

  // Sanitize and validate query
  const sanitizedQuery = query.trim();
  if (sanitizedQuery.length === 0) {
    return NextResponse.json({ error: 'Query cannot be empty' }, { status: 400 });
  }

  if (sanitizedQuery.length > 100) {
    return NextResponse.json({ error: 'Query too long (max 100 characters)' }, { status: 400 });
  }

  // Validate country codes
  const validCountryCodes = countries.filter(code => 
    COUNTRIES.some(country => country.code === code.toUpperCase())
  );

  if (countries.length > 0 && validCountryCodes.length === 0) {
    return NextResponse.json({ error: 'No valid country codes provided' }, { status: 400 });
  }

  try {
    const justwatch = new JustWatchAPI(parseInt(process.env.JUSTWATCH_TIMEOUT || '10000'));
    
    // Filter countries if specified, otherwise use all
    const searchCountries = validCountryCodes.length > 0 
      ? COUNTRIES.filter(country => validCountryCodes.includes(country.code))
      : COUNTRIES;

    if (process.env.NODE_ENV === 'development') {
      console.log(`Searching for "${sanitizedQuery}" in ${searchCountries.length} countries...`);
    }

    // Search in all countries (or filtered countries)
    const results = await Promise.allSettled(
      searchCountries.map(country => searchInCountry(justwatch, sanitizedQuery, country, targetYear))
    );

    // Process results - flatten arrays since searchInCountry now returns multiple results
    const countryResults: CountryMovieData[] = [];
    results.forEach((result, index) => {
      if (result.status === 'fulfilled') {
        // result.value is now an array of CountryMovieData
        if (Array.isArray(result.value)) {
          countryResults.push(...result.value);
        } else {
          // Fallback for backward compatibility
          countryResults.push(result.value);
        }
      } else {
        countryResults.push({
          country: searchCountries[index],
          found: false,
          error: result.reason?.message || 'Search failed'
        });
      }
    });

    // Sort results: Norway first, then found results, then not found
    const sortedResults = countryResults.sort((a, b) => {
      // Norway always first
      if (a.country.code === 'NO') return -1;
      if (b.country.code === 'NO') return 1;
      
      // Found results before not found
      if (a.found && !b.found) return -1;
      if (!a.found && b.found) return 1;
      
      // Otherwise maintain original order
      return 0;
    });

    return NextResponse.json({
      query: sanitizedQuery,
      totalCountries: searchCountries.length,
      foundInCountries: countryResults.filter(r => r.found).length,
      results: sortedResults
    });

  } catch (error) {
    console.error('JustWatch search error:', error);
    return NextResponse.json(
      { error: 'JustWatch API is temporarily unavailable. Please try again later.' },
      { status: 500 }
    );
  }
}