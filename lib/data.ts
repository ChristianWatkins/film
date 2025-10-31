import fs from 'fs/promises';
import path from 'path';
import type { Film, FestivalFilm, FestivalAppearance, StreamingData, StreamingAvailability } from './types';
import { hasEnabledStreaming, hasEnabledRent } from './streaming-config';

const DATA_DIR = path.join(process.cwd(), 'data');

// Award data types
interface Award {
  festival: string;
  year: number;
  award: string;
  film: string;
  originalTitle: string | null;
  normalizedTitle: string;
}

interface AwardsData {
  metadata: {
    created: string;
    source: string;
    total_awards: number;
    total_films: number;
    festivals: string[];
    years: number[];
  };
  awards: Award[];
  films: Record<string, {
    title: string;
    year: number;
    normalizedTitle: string;
    originalTitle: string | null;
    awarded: boolean;
    awards: Array<{
      festival: string;
      award: string;
      year: number;
    }>;
    festivals: string[];
  }>;
}

// Create film key from title and year
function createFilmKey(title: string, year: number): string {
  return `${title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${year}`;
}

// Normalize film title for matching
function normalizeTitle(title: string): string {
  // Remove content in parentheses (original titles)
  let normalized = title.replace(/\s*\([^)]+\)\s*/g, '').trim();
  
  // Convert to lowercase and remove special characters
  normalized = normalized.toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
    
  return normalized;
}

// Load awards from JSON
export async function loadAwards(): Promise<Map<string, { awarded: boolean, awards: Array<{award: string, festival: string, year: number}> }>> {
  const awardsPath = path.join(DATA_DIR, 'awards', 'filmpriser.json');
  const awardMap = new Map();
  
  try {
    const content = await fs.readFile(awardsPath, 'utf-8');
    const data: AwardsData = JSON.parse(content);
    
    // Use the pre-processed films data from JSON, keeping full award objects
    Object.entries(data.films).forEach(([key, film]) => {
      awardMap.set(key, {
        awarded: film.awarded,
        awards: film.awards // Keep the full award objects with festival info
      });
    });
    
    return awardMap;
  } catch (error) {
    console.error('Error loading awards:', error);
    return new Map();
  }
}

// Load all festival films
export async function loadFestivalFilms(): Promise<Map<string, { film: FestivalFilm, festivals: FestivalAppearance[] }>> {
  const filmsMap = new Map();
  const festivalsDir = path.join(DATA_DIR, 'festivals');
  
  try {
    const festivals = await fs.readdir(festivalsDir);
    
    for (const festivalName of festivals) {
      const festivalPath = path.join(festivalsDir, festivalName);
      const stat = await fs.stat(festivalPath);
      
      if (!stat.isDirectory()) continue;
      
      const yearFiles = await fs.readdir(festivalPath);
      
      for (const yearFile of yearFiles) {
        if (!yearFile.endsWith('.json')) continue;
        
        const year = yearFile.replace('.json', '');
        // Normalize year names for display (remove suffixes like -fixed, +)
        const normalizedYear = year.replace(/[-+].*$/, '');
        const filePath = path.join(festivalPath, yearFile);
        const content = await fs.readFile(filePath, 'utf-8');
        const rawData = JSON.parse(content);
        
        // Expect all festival data to be in array format
        if (!Array.isArray(rawData)) {
          console.warn(`Expected array format in ${filePath}, skipping...`);
          continue;
        }
        
        const filmList: any[] = rawData;
        
        filmList.forEach(film => {
          // Normalize film data to match standard FestivalFilm format
          // Convert Arthaus/TMDB format fields to standard format
          const normalizedFilm: FestivalFilm = {
            title: film.title,
            year: film.year,
            country: film.country,
            director: film.director,
            link: film.link,
            awarded: film.awarded || false,
            awards: film.awards || [],
            // Normalize synopsis/overview
            synopsis: film.synopsis || film.overview || undefined,
            // Normalize genres (should already be array, but ensure it is)
            genres: Array.isArray(film.genres) ? film.genres : undefined,
            // Normalize runtime (convert number to string if needed)
            runtime: film.runtime ? (typeof film.runtime === 'number' ? film.runtime.toString() : film.runtime) : undefined,
            // Normalize cast - handle both string arrays and object arrays
            cast: Array.isArray(film.cast) 
              ? film.cast.map((c: any) => typeof c === 'string' ? c : c.name || c).filter(Boolean)
              : undefined
          };
          
          const key = createFilmKey(normalizedFilm.title, normalizedFilm.year);
          
          if (!filmsMap.has(key)) {
            filmsMap.set(key, {
              film: normalizedFilm,
              festivals: []
            });
            // Preserve tmdb_id for enhanced data lookup (not in FestivalFilm interface)
            if (film.tmdb_id) {
              (filmsMap.get(key)!.film as any).tmdb_id = film.tmdb_id;
            }
          } else {
            // If film already exists, preserve tmdb_id if it wasn't there before
            const existingFilm = filmsMap.get(key)!.film;
            if (film.tmdb_id && !(existingFilm as any).tmdb_id) {
              (existingFilm as any).tmdb_id = film.tmdb_id;
            }
            // Preserve link: prefer non-empty link (new one wins if existing is empty, otherwise keep existing)
            if (normalizedFilm.link && (!existingFilm.link || !existingFilm.link.trim())) {
              existingFilm.link = normalizedFilm.link;
            }
          }
          
          const existingFestival = filmsMap.get(key)!.festivals.find((f: FestivalAppearance) => 
            f.name === festivalName && f.year === normalizedYear
          );
          
          if (!existingFestival) {
            filmsMap.get(key)!.festivals.push({
              name: festivalName,
              year: normalizedYear,
              awarded: false // We'll get award info from CSV instead
            });
          }
        });
      }
    }
    
    return filmsMap;
  } catch (error) {
    console.error('Error loading festival films:', error);
    throw error;
  }
}

// Load streaming data
export async function loadStreamingData(): Promise<StreamingAvailability> {
  const streamingPath = path.join(DATA_DIR, 'streaming', 'availability.json');
  
  try {
    const content = await fs.readFile(streamingPath, 'utf-8');
    return JSON.parse(content);
  } catch (error) {
    console.error('Error loading streaming data:', error);
    // Return empty data if file doesn't exist
    return {
      last_updated: new Date().toISOString(),
      country: 'NO',
      total_films: 0,
      films: {}
    };
  }
}

// Load enhanced TMDB data
export async function loadEnhancedData(): Promise<any> {
  const enhancedPath = path.join(DATA_DIR, 'enhanced', 'enhanced-films-tmdb.json');
  
  try {
    const content = await fs.readFile(enhancedPath, 'utf-8');
    const data = JSON.parse(content);
    return data.films || [];
  } catch (error) {
    console.error('Error loading enhanced TMDB data:', error);
    return [];
  }
}

// Merge festival and streaming data
export async function getAllFilms(): Promise<Film[]> {
  const [festivalFilmsMap, streamingData, enhancedFilms, awardMap] = await Promise.all([
    loadFestivalFilms(),
    loadStreamingData(),
    loadEnhancedData(),
    loadAwards()
  ]);
  
  // Create a map of enhanced data for quick lookup
  const enhancedMap = new Map();
  const enhancedMapByTmdbId = new Map(); // Also index by TMDB ID for fallback lookup
  
  enhancedFilms.forEach((film: any) => {
    const key = createFilmKey(film.title, film.year);
    enhancedMap.set(key, film);
    
    // Also index by TMDB ID if available
    if (film.tmdb_id) {
      enhancedMapByTmdbId.set(film.tmdb_id, film);
    }
  });
  
  const films: Film[] = [];
  
  for (const [filmKey, { film, festivals }] of festivalFilmsMap) {
    const streamingInfo = streamingData.films[filmKey];
    let enhancedInfo = enhancedMap.get(filmKey);
    
    // Fallback: if no enhanced data found by title/year, try TMDB ID lookup
    if (!enhancedInfo && (film as any).tmdb_id) {
      enhancedInfo = enhancedMapByTmdbId.get((film as any).tmdb_id);
    }
    
    // Look up award information using normalized title
    const normalizedTitle = normalizeTitle(film.title);
    const awardKey = `${normalizedTitle}-${film.year}`;
    const awardInfo = awardMap.get(awardKey);
    
    // Update festival appearances with award status
    const updatedFestivals = festivals.map(fest => ({
      ...fest,
      awarded: awardInfo?.awarded || false
    }));
    
    films.push({
      // Core metadata
      title: film.title,
      year: film.year,
      country: film.country,
      director: film.director,
      
      // Enhanced metadata - prefer enhanced data over festival data
      synopsis: enhancedInfo?.synopsis || film.synopsis || undefined,
      genres: enhancedInfo?.genres || film.genres || undefined,
      runtime: enhancedInfo?.runtime?.toString() || film.runtime || undefined,
      cast: enhancedInfo?.cast?.map((c: any) => c.name || c).slice(0, 6) || film.cast || undefined,
      tmdbRating: enhancedInfo?.tmdb_rating || undefined,
      
      // Links - prefer enhanced poster
      // Use festival link, but filter out empty strings and convert to undefined if empty
      mubiLink: (film.link && film.link.trim()) || undefined,
      justwatchLink: streamingInfo?.justwatch_url || null,
      // Poster priority: enhanced > festival poster_path > streaming
      posterUrl: enhancedInfo?.poster_url_tmdb 
        || ((film as any).poster_path ? `https://image.tmdb.org/t/p/w500${(film as any).poster_path}` : null)
        || streamingInfo?.poster_url || null,
      
      // Awards - now from CSV data
      awarded: awardInfo?.awarded || false,
      awards: awardInfo?.awards || [],
      
      // Streaming availability - only count enabled platforms
      hasStreaming: hasEnabledStreaming(streamingInfo?.streaming || []),
      hasRent: hasEnabledRent(streamingInfo?.rent || []),
      hasBuy: hasEnabledRent(streamingInfo?.buy || []), // Using same logic for buy
      justwatchFound: streamingInfo?.found || false, // Whether film was found on JustWatch
      streaming: streamingInfo?.streaming || [],
      rent: streamingInfo?.rent || [],
      buy: streamingInfo?.buy || [],
      
      // Festival info
      festivals: updatedFestivals,
      
      // Internal
      filmKey
    });
  }
  
  return films;
}

// Get unique years from films
export function getUniqueYears(films: Film[]): number[] {
  const years = new Set(films.map(f => f.year));
  return Array.from(years).sort((a, b) => b - a); // Descending
}

// Get unique festivals from films
export function getUniqueFestivals(films: Film[]): string[] {
  const festivals = new Set<string>();
  films.forEach(film => {
    film.festivals.forEach(f => festivals.add(f.name));
  });
  return Array.from(festivals).sort();
}

// Get unique streaming providers from films
export function getUniqueProviders(films: Film[]): string[] {
  const providers = new Set<string>();
  films.forEach(film => {
    film.streaming.forEach(s => providers.add(s.provider));
    film.rent.forEach(s => providers.add(s.provider));
    film.buy.forEach(s => providers.add(s.provider));
  });
  return Array.from(providers).sort();
}

// Get unique countries from films
export function getUniqueCountries(films: Film[]): string[] {
  const countries = new Set<string>();
  films.forEach(film => {
    if (film.country) {
      countries.add(film.country);
    }
  });
  return Array.from(countries).sort();
}

// Get unique genres from films
export function getUniqueGenres(films: Film[]): string[] {
  const genres = new Set<string>();
  films.forEach(film => {
    if (film.genres) {
      film.genres.forEach(genre => genres.add(genre));
    }
  });
  return Array.from(genres).sort();
}

