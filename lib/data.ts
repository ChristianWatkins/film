import fs from 'fs/promises';
import path from 'path';
import type { Film, FilterState, StreamingProvider, FestivalFilm, FestivalAppearance, StreamingAvailability } from './types';
import { getWatchlist } from './watchlist';
import { filterEnabledProviders } from './streaming-config';
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

// Master films data types (now includes all TMDB data too)
interface MasterFilm {
  id: string; // Short code ID (3 chars) - NEVER changes
  filmKey: string; // For backward compatibility
  title: string; // English title from TMDB
  year: number;
  director: string | null;
  country: string | null;
  mubiLink: string | null;
  tmdb_id: number | null;
  // TMDB enrichment fields
  imdb_id?: string;
  original_title?: string; // Original language title from TMDB
  synopsis?: string;
  tagline?: string;
  tmdb_rating?: number;
  tmdb_vote_count?: number;
  tmdb_popularity?: number;
  runtime?: number;
  genres?: string[];
  release_date?: string;
  poster_url_tmdb?: string;
  backdrop_url?: string;
  budget?: number;
  revenue?: number;
  production_companies?: string[];
  production_countries?: string[];
  spoken_languages?: string[];
  keywords?: string[];
  cast?: any[];
  crew?: any[];
  similar_films?: any[];
  recommendations?: any[];
}

interface MasterFilmsData {
  last_updated: string;
  total_films: number;
  note?: string;
  films: Record<string, MasterFilm>; // Keyed by ID (short code)
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

// Load master films database
export async function loadMasterFilms(): Promise<Map<string, MasterFilm>> {
  const filmsPath = path.join(DATA_DIR, 'films.json');
  const filmsMap = new Map();
  
  try {
    const content = await fs.readFile(filmsPath, 'utf-8');
    const data: MasterFilmsData = JSON.parse(content);
    
    Object.entries(data.films).forEach(([filmKey, film]) => {
      filmsMap.set(filmKey, film);
    });
    
    return filmsMap;
  } catch (error) {
    console.error('Error loading master films:', error);
    throw error;
  }
}

// Load festival appearances (now simplified to id references only)
export async function loadFestivalAppearances(): Promise<Map<string, FestivalAppearance[]>> {
  const appearancesMap = new Map<string, FestivalAppearance[]>();
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
        
        // Expect all festival data to be in array format with id references
        if (!Array.isArray(rawData)) {
          console.warn(`Expected array format in ${filePath}, skipping...`);
          continue;
        }
        
        const filmList: { id: string }[] = rawData;
        
        filmList.forEach(({ id }) => {
          if (!id) return;
          
          // Get or create appearances array for this film
          if (!appearancesMap.has(id)) {
            appearancesMap.set(id, []);
          }
          
          const appearances = appearancesMap.get(id)!;
          
          // Check if this festival appearance already exists
          const existingFestival = appearances.find(f => f.name === festivalName);
          
          if (!existingFestival) {
            appearances.push({
              name: festivalName,
              year: normalizedYear,
              awarded: false // We'll get award info from CSV instead
            });
          }
        });
      }
    }
    
    return appearancesMap;
  } catch (error) {
    console.error('Error loading festival appearances:', error);
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

// Note: Enhanced TMDB data is now merged into films.json, so this function is no longer needed
// Keeping it for backwards compatibility but it returns empty
export async function loadEnhancedData(): Promise<Map<string, MasterFilm>> {
  // Enhanced data is now merged into films.json
  return new Map();
}

// Merge all data sources into Film objects
export async function getAllFilms(): Promise<Film[]> {
  const [masterFilms, festivalAppearances, streamingData, awardMap] = await Promise.all([
    loadMasterFilms(),
    loadFestivalAppearances(),
    loadStreamingData(),
    loadAwards()
  ]);
  
  const films: Film[] = [];
  
  for (const [id, film] of masterFilms) {
    const appearances = festivalAppearances.get(id) || [];
    const streamingInfo = streamingData.films[id];
    
    // Look up award information using normalized title
    const normalizedTitle = normalizeTitle(film.title);
    const awardKey = `${normalizedTitle}-${film.year}`;
    const awardInfo = awardMap.get(awardKey);
    
    // Update festival appearances with award status
    const updatedFestivals = appearances.map(fest => ({
      ...fest,
      awarded: awardInfo?.awarded || false
    }));
    
    films.push({
      // Core metadata (now all in one file!)
      title: film.title, // Already English from TMDB after migration
      year: film.year,
      // Prefer country from TMDB production_countries when available
      country: film.production_countries?.[0] || film.country,
      director: film.director,
      
      // TMDB metadata (now in same file)
      synopsis: film.synopsis || undefined,
      genres: film.genres || undefined,
      runtime: film.runtime?.toString() || undefined,
      cast: film.cast?.map((c: any) => c.name || c).slice(0, 6) || undefined,
      tmdbRating: film.tmdb_rating || undefined,
      
      // Links
      mubiLink: film.mubiLink || undefined,
      justwatchLink: streamingInfo?.justwatch_url || null,
      // Poster priority: TMDB poster URL > streaming poster
      posterUrl: film.poster_url_tmdb || streamingInfo?.poster_url || null,
      
      // Awards
      awarded: awardInfo?.awarded || false,
      awards: awardInfo?.awards || [],
      
      // Streaming availability - only count enabled platforms
      hasStreaming: hasEnabledStreaming(streamingInfo?.streaming || []),
      hasRent: hasEnabledRent(streamingInfo?.rent || []),
      hasBuy: hasEnabledRent(streamingInfo?.buy || []), // Using same logic for buy
      justwatchFound: streamingInfo?.found || false,
      streaming: streamingInfo?.streaming || [],
      rent: streamingInfo?.rent || [],
      buy: streamingInfo?.buy || [],
      
      // Festival info
      festivals: updatedFestivals,
      
      // Internal - keep filmKey for backward compatibility (watchlist, sharing, etc.)
      filmKey: film.filmKey
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
// Helper function to normalize platform names (same as in filters.ts)
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

// Function to get display name for platforms (same as StreamingBadge.tsx)
function getPlatformDisplayName(platform: string): string {
  if (platform === 'Cineasterna') {
    return 'Cineast';
  }
  // Handle both normalized and non-normalized Amazon names
  if (platform === 'Amazon Prime Video' || platform === 'Amazon') {
    return 'Amazon';
  }
  return platform;
}

// Get unique streaming providers from films
export function getUniqueProviders(films: Film[]): string[] {
  const providers = new Set<string>();
  films.forEach(film => {
    // Filter to enabled platforms and then extract normalized display names
    const enabledStreaming = filterEnabledProviders(film.streaming);
    const enabledRent = filterEnabledProviders(film.rent);
    const enabledBuy = filterEnabledProviders(film.buy);
    
    enabledStreaming.forEach((s: StreamingProvider) => {
      const normalized = normalizePlatformName(s.provider);
      const displayName = getPlatformDisplayName(normalized);
      providers.add(displayName);
    });
    enabledRent.forEach((s: StreamingProvider) => {
      const normalized = normalizePlatformName(s.provider);
      const displayName = getPlatformDisplayName(normalized);
      providers.add(displayName);
    });
    enabledBuy.forEach((s: StreamingProvider) => {
      const normalized = normalizePlatformName(s.provider);
      const displayName = getPlatformDisplayName(normalized);
      providers.add(displayName);
    });
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
