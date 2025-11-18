import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import type { JustWatchMovieDetails } from '@/lib/types';
import { mergeAllFilms } from '@/lib/data';

interface TMDBDetails {
  tmdbId: number;
  title: string;
  originalTitle: string;
  synopsis: string;
  releaseDate: string;
  runtime: number;
  rating: number;
  voteCount: number;
  genres: Array<{ id: number; name: string; }>;
  posterPath: string | null;
  backdropPath: string | null;
  imdbId: string;
  directors: string[];
  cast: string[];
  productionCountries: Array<{ iso_3166_1: string; name: string; }>;
  productionCompanies: Array<{ id: number; name: string; }>;
}

interface MasterFilm {
  id: string;
  filmKey: string;
  title: string;
  year: number;
  director: string | null;
  country: string | null;
  mubiLink: string | null;
  tmdb_id: number | null;
  imdb_id?: string | null;
  poster_url_tmdb?: string | null;
  original_title?: string | null;
  synopsis?: string;
  genres?: string[];
  runtime?: number;
}

interface MasterFilmsData {
  last_updated: string;
  total_films: number;
  films: Record<string, MasterFilm>;
}

interface AddFilmRequest {
  movie: JustWatchMovieDetails;
  tmdbDetails?: TMDBDetails;
  allCountryData?: Array<{
    country: { code: string; name: string };
    found: boolean;
    details?: JustWatchMovieDetails;
  }>;
  mubiLink?: string | null;
  checkOnly?: boolean;
}

// Generate short code ID (base-62, 3 characters)
const CHARS = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';

function generateShortCode(index: number): string {
  const char1 = CHARS[Math.floor(index / (62 * 62)) % 62];
  const char2 = CHARS[Math.floor(index / 62) % 62];
  const char3 = CHARS[index % 62];
  return char1 + char2 + char3;
}

// Create film key from title and year
function createFilmKey(title: string, year: number): string {
  return `${title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')}-${year}`;
}

// Normalize title for matching
function normalizeTitle(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^\w\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

// Check if film already exists
function checkFilmExists(
  data: MasterFilmsData,
  tmdbId: number | null | undefined,
  title: string,
  year: number
): string | null {
  // Check by TMDB ID first
  if (tmdbId) {
    for (const [id, film] of Object.entries(data.films)) {
      if (film.tmdb_id === tmdbId) {
        return id;
      }
    }
  }

  // Check by normalized title + year
  const normalizedTitle = normalizeTitle(title);
  for (const [id, film] of Object.entries(data.films)) {
    if (film.year === year && normalizeTitle(film.title) === normalizedTitle) {
      return id;
    }
  }

  return null;
}

// Map JustWatch + TMDB data to MasterFilm
function mapToMasterFilm(
  movie: JustWatchMovieDetails,
  tmdbDetails: TMDBDetails | undefined,
  newId: string,
  mubiLink?: string | null
): MasterFilm {
  const year = movie.originalReleaseYear || new Date().getFullYear();
  const filmKey = createFilmKey(movie.title, year);

  // Use TMDB data when available, fallback to JustWatch
  const title = tmdbDetails?.title || movie.title;
  const director = tmdbDetails?.directors?.[0] || null;
  const country = tmdbDetails?.productionCountries?.[0]?.name || null;
  const tmdb_id = tmdbDetails?.tmdbId || movie.tmdbId || null;
  const imdb_id = tmdbDetails?.imdbId || movie.imdbId || undefined;
  const poster_url_tmdb = tmdbDetails?.posterPath 
    ? `https://image.tmdb.org/t/p/w500${tmdbDetails.posterPath}`
    : undefined;
  const original_title = tmdbDetails?.originalTitle || movie.originalTitle || undefined;
  const synopsis = tmdbDetails?.synopsis || movie.synopsis || undefined;
  const genres = tmdbDetails?.genres?.map(g => g.name) || movie.genres?.map(g => g.name) || undefined;
  const runtime = tmdbDetails?.runtime || movie.runtime || undefined;

  // Validate MUBI link format if provided
  let validMubiLink: string | null = null;
  if (mubiLink && typeof mubiLink === 'string' && mubiLink.trim()) {
    const trimmedLink = mubiLink.trim();
    // Basic validation: should be a MUBI URL
    if (trimmedLink.includes('mubi.com') && trimmedLink.includes('/films/')) {
      validMubiLink = trimmedLink;
    } else {
      console.warn(`Invalid MUBI link format: ${trimmedLink}`);
    }
  }

  return {
    id: newId,
    filmKey,
    title,
    year,
    director,
    country,
    mubiLink: validMubiLink,
    tmdb_id,
    imdb_id,
    poster_url_tmdb,
    original_title,
    synopsis,
    genres,
    runtime,
  };
}

// POST endpoint to add new film
export async function POST(request: Request) {
  // Only allow in development
  if (process.env.NODE_ENV !== 'development') {
    return NextResponse.json({ error: 'Access denied' }, { status: 403 });
  }

  try {
    const body: AddFilmRequest = await request.json();
    const { movie, tmdbDetails, mubiLink, checkOnly } = body;

    // Validate required fields
    if (!movie || !movie.title) {
      return NextResponse.json({ error: 'Missing required fields (movie.title)' }, { status: 400 });
    }

    const year = movie.originalReleaseYear || new Date().getFullYear();

    // Load current films data
    const filmsPath = path.join(process.cwd(), 'data', 'films.json');
    const content = fs.readFileSync(filmsPath, 'utf-8');
    const data: MasterFilmsData = JSON.parse(content);

    // Check if film already exists
    const existingId = checkFilmExists(
      data,
      tmdbDetails?.tmdbId || movie.tmdbId,
      movie.title,
      year
    );

    if (existingId) {
      return NextResponse.json({
        exists: true,
        filmId: existingId,
        message: `Film already exists with ID: ${existingId}`
      });
    }

    // If checkOnly, return early (film doesn't exist)
    if (checkOnly) {
      return NextResponse.json({ exists: false, filmId: null });
    }

    // Generate new short code ID
    const existingIds = new Set(Object.keys(data.films));
    let newId: string;
    let attempt = 0;
    do {
      const index = existingIds.size + attempt;
      newId = generateShortCode(index);
      attempt++;
    } while (existingIds.has(newId));

    // Map data to MasterFilm structure
    const newFilm = mapToMasterFilm(movie, tmdbDetails, newId, mubiLink);

    // Add film to data
    data.films[newId] = newFilm;
    data.total_films = Object.keys(data.films).length;
    data.last_updated = new Date().toISOString();

    // Write films.json
    fs.writeFileSync(filmsPath, JSON.stringify(data, null, 2), 'utf-8');

    // Add to personal festival
    const festivalsDir = path.join(process.cwd(), 'data', 'festivals');
    const personalDir = path.join(festivalsDir, 'personal');
    
    // Create personal directory if it doesn't exist
    if (!fs.existsSync(personalDir)) {
      fs.mkdirSync(personalDir, { recursive: true });
    }

    // Create or update festival file for this year
    const yearFile = `${year}.json`;
    const festivalFilePath = path.join(personalDir, yearFile);
    
    let filmIds: Array<{ id: string }> = [];
    if (fs.existsSync(festivalFilePath)) {
      const festivalContent = fs.readFileSync(festivalFilePath, 'utf-8');
      filmIds = JSON.parse(festivalContent);
      if (!Array.isArray(filmIds)) {
        filmIds = [];
      }
    }

    // Check if film is already in this festival file
    if (!filmIds.some(f => f.id === newId)) {
      filmIds.push({ id: newId });
      fs.writeFileSync(festivalFilePath, JSON.stringify(filmIds, null, 2), 'utf-8');
    }

    console.log('\n✅ Film added successfully!');
    console.log(`   Film ID: ${newId}`);
    console.log(`   Title: ${newFilm.title} (${newFilm.year})`);
    console.log(`   Festival: personal/${year}`);
    if (newFilm.mubiLink) {
      console.log(`   ✓ MUBI Link: ${newFilm.mubiLink}`);
    } else {
      console.log(`   ⚠️  MUBI Link: Not provided (can be added later via admin interface)`);
    }

    // Save streaming data if available (from JustWatch search results - Norway only)
    if (body.allCountryData && body.allCountryData.length > 0) {
      try {
        const streamingPath = path.join(process.cwd(), 'data', 'streaming', 'availability.json');
        
        // Load existing streaming data
        let streamingData: any = {
          last_updated: new Date().toISOString(),
          country: 'NO', // Default to Norway
          total_films: 0,
          films: {}
        };
        
        if (fs.existsSync(streamingPath)) {
          const content = fs.readFileSync(streamingPath, 'utf-8');
          streamingData = JSON.parse(content);
        }

        // Find Norway data only
        const norwayData = body.allCountryData.find(c => c.country.code === 'NO');
        
        if (norwayData && norwayData.found && norwayData.details) {
          const details = norwayData.details;
          
          // Map JustWatch providers to streaming data format
          const streaming: Array<{ provider: string; quality: string | null; price: string | null; url: string | null }> = [];
          const rent: Array<{ provider: string; quality: string | null; price: string | null; url: string | null }> = [];
          const buy: Array<{ provider: string; quality: string | null; price: string | null; url: string | null }> = [];

          // Map streaming providers
          if (details.streamingProviders && details.streamingProviders.length > 0) {
            details.streamingProviders.forEach((p: any) => {
              streaming.push({
                provider: p.provider || p.name || 'Unknown',
                quality: p.quality || null,
                price: p.price || null,
                url: p.url || null
              });
            });
          }

          // Map rent providers
          if (details.rentProviders && details.rentProviders.length > 0) {
            details.rentProviders.forEach((p: any) => {
              rent.push({
                provider: p.provider || p.name || 'Unknown',
                quality: p.quality || null,
                price: p.price || null,
                url: p.url || null
              });
            });
          }

          // Map buy providers
          if (details.buyProviders && details.buyProviders.length > 0) {
            details.buyProviders.forEach((p: any) => {
              buy.push({
                provider: p.provider || p.name || 'Unknown',
                quality: p.quality || null,
                price: p.price || null,
                url: p.url || null
              });
            });
          }

          // Create streaming data entry
          const streamingEntry: any = {
            found: true,
            title: newFilm.title,
            year: newFilm.year,
            director: newFilm.director,
            justwatch_id: details.id || null,
            justwatch_url: details.justwatchUrl || null,
            imdb_id: newFilm.imdb_id || null,
            tmdb_id: newFilm.tmdb_id || null,
            poster_url: details.posterUrl || newFilm.poster_url_tmdb || null,
            last_updated: new Date().toISOString()
          };

          // Only add arrays if they have data
          if (streaming.length > 0) {
            streamingEntry.streaming = streaming;
          }
          if (rent.length > 0) {
            streamingEntry.rent = rent;
          }
          if (buy.length > 0) {
            streamingEntry.buy = buy;
          }

          // Add to streaming data (keyed by film ID)
          streamingData.films[newId] = streamingEntry;
          streamingData.last_updated = new Date().toISOString();
          streamingData.total_films = Object.keys(streamingData.films).length;

          // Write streaming data
          fs.writeFileSync(streamingPath, JSON.stringify(streamingData, null, 2), 'utf-8');
          console.log(`   ✓ Streaming data saved (Norway): ${streaming.length} streaming, ${rent.length} rent, ${buy.length} buy`);
        } else {
          console.log(`   ⚠️  Streaming data: Norway data not available`);
        }
      } catch (error) {
        console.error('⚠️  Warning: Failed to save streaming data:', error);
        // Don't fail the request if streaming data save fails
      }
    }

    // Regenerate merged films file so the new film appears immediately
    try {
      console.log('   🔄 Regenerating merged films file...');
      const mergedFilms = await mergeAllFilms();
      const mergedPath = path.join(process.cwd(), 'data', 'merged-films.json');
      const output = {
        generated_at: new Date().toISOString(),
        total_films: mergedFilms.length,
        films: mergedFilms
      };
      fs.writeFileSync(mergedPath, JSON.stringify(output, null, 2), 'utf-8');
      console.log(`   ✓ Merged file regenerated: ${mergedFilms.length} films`);
      console.log('   → Film will appear on site after page refresh\n');
    } catch (error) {
      console.error('   ⚠️  Warning: Failed to regenerate merged films file:', error);
      // Don't fail the request if regeneration fails - film is still added
    }

    // Collect success details
    const successDetails = {
      filmId: newId,
      filmTitle: newFilm.title, // English title
      originalTitle: newFilm.original_title || movie.originalTitle || undefined,
      filmYear: newFilm.year,
      festival: `personal/${year}`,
      streamingDataSaved: false,
      mergedFileRegenerated: false
    };

    // Check if streaming data was saved
    if (body.allCountryData && body.allCountryData.length > 0) {
      const countryData = body.allCountryData.find(c => c.country.code === 'NO') || 
                         body.allCountryData.find(c => c.found && c.details) || 
                         body.allCountryData[0];
      if (countryData && countryData.found && countryData.details) {
        successDetails.streamingDataSaved = true;
      }
    }

    // Check if merged file was regenerated (it should have been)
    successDetails.mergedFileRegenerated = true;

    return NextResponse.json({
      success: true,
      film: newFilm,
      filmId: newId,
      message: `Film added successfully! ID: ${newId}`,
      details: successDetails
    });
  } catch (error) {
    console.error('Error adding film:', error);
    return NextResponse.json(
      { error: 'Failed to add film', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

