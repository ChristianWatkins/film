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
  country: JustWatchCountry
): Promise<CountryMovieData> {
  try {
    // Only log in development
    if (process.env.NODE_ENV === 'development') {
      console.log(`Searching in ${country.name} (${country.code}) for: ${query}`);
    }
    
    // Search for the movie
    const searchResults: JustWatchSearchResult[] = await justwatch.search(query, country.code);
    
    if (!searchResults || searchResults.length === 0) {
      return {
        country,
        found: false,
        error: 'No search results found'
      };
    }

    // Find the best match (prefer exact title matches and movies)
    let bestMatch = searchResults.find(result => 
      result.objectType === 'movie' && 
      result.title.toLowerCase() === query.toLowerCase()
    );
    
    if (!bestMatch) {
      bestMatch = searchResults.find(result => result.objectType === 'movie');
    }
    
    if (!bestMatch) {
      bestMatch = searchResults[0];
    }

    if (process.env.NODE_ENV === 'development') {
      console.log(`Found match in ${country.name}: ${bestMatch.title} (${bestMatch.originalReleaseYear})`);
    }

    // Get detailed information
    let details: any = null;
    if (bestMatch.fullPath) {
      try {
        details = await justwatch.getData(bestMatch.fullPath, country.code);
      } catch (error) {
        console.warn(`Failed to get details for ${bestMatch.title} in ${country.name}:`, error);
      }
    }

    const movieDetails: JustWatchMovieDetails = {
      id: bestMatch.id,
      title: bestMatch.title,
      originalTitle: details?.originalTitle || bestMatch.title,
      originalReleaseYear: bestMatch.originalReleaseYear,
      posterUrl: bestMatch.posterUrl || details?.posterUrl,
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
      justwatchUrl: bestMatch.fullPath ? `https://www.justwatch.com${bestMatch.fullPath}` : undefined
    };

    return {
      country,
      found: true,
      details: movieDetails
    };

  } catch (error) {
    console.error(`Error searching in ${country.name}:`, error);
    return {
      country,
      found: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
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
  const countries = searchParams.get('countries')?.split(',') || [];

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
      searchCountries.map(country => searchInCountry(justwatch, sanitizedQuery, country))
    );

    // Process results
    const countryResults: CountryMovieData[] = results.map((result, index) => {
      if (result.status === 'fulfilled') {
        return result.value;
      } else {
        return {
          country: searchCountries[index],
          found: false,
          error: result.reason?.message || 'Search failed'
        };
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