'use client';

// Cached mapping data
let cachedMappings: MappingData | null = null;
let loadingPromise: Promise<MappingData> | null = null;

interface MappingData {
  metadata: {
    generated: string;
    totalFilms: number;
    codeLength: number;
    charset: string;
    maxCapacity: number;
  };
  filmKeyToCode: Record<string, string>;
  codeToFilmKey: Record<string, string>;
}

/**
 * Load the film key mappings from the public data file
 * Results are cached after first load
 */
export async function loadMappings(): Promise<MappingData> {
  // Return cached data if available
  if (cachedMappings) {
    return cachedMappings;
  }
  
  // If already loading, return the existing promise
  if (loadingPromise) {
    return loadingPromise;
  }
  
  // Start loading
  loadingPromise = (async () => {
    try {
      const response = await fetch('/data/film-key-mappings.json');
      if (!response.ok) {
        throw new Error(`Failed to load mappings: ${response.status}`);
      }
      
      const data = await response.json();
      cachedMappings = data;
      return data;
    } catch (error) {
      console.error('Error loading film mappings:', error);
      throw error;
    } finally {
      loadingPromise = null;
    }
  })();
  
  return loadingPromise;
}

/**
 * Convert an array of film keys to comma-separated short codes
 * @param filmKeys Array of film keys (e.g., ["no-other-land-2024", "eden-2014"])
 * @returns Comma-separated short codes (e.g., "a4g,0zv")
 */
export async function encodeFilmKeys(filmKeys: string[]): Promise<string> {
  if (filmKeys.length === 0) {
    return '';
  }
  
  const mappings = await loadMappings();
  
  // Convert each film key to its short code
  const shortCodes = filmKeys.map(filmKey => {
    const code = mappings.filmKeyToCode[filmKey];
    if (!code) {
      console.warn(`No mapping found for film key: ${filmKey}`);
      return filmKey; // Fallback to original if no mapping found
    }
    return code;
  });
  
  return shortCodes.join(',');
}

/**
 * Convert comma-separated short codes back to an array of film keys
 * @param shortCodes Comma-separated short codes (e.g., "a4g,0zv")
 * @returns Array of film keys (e.g., ["no-other-land-2024", "eden-2014"])
 */
export async function decodeFilmKeys(shortCodes: string): Promise<string[]> {
  if (!shortCodes || shortCodes.trim() === '') {
    return [];
  }
  
  const mappings = await loadMappings();
  
  // Split codes and convert back to film keys
  const codes = shortCodes.split(',').map(c => c.trim()).filter(c => c.length > 0);
  
  const filmKeys = codes.map(code => {
    const filmKey = mappings.codeToFilmKey[code];
    if (!filmKey) {
      console.warn(`No film key found for code: ${code}`);
      return code; // Fallback to original if no mapping found
    }
    return filmKey;
  });
  
  return filmKeys;
}

/**
 * Clear the cached mappings (useful for testing or forcing a reload)
 */
export function clearMappingsCache(): void {
  cachedMappings = null;
  loadingPromise = null;
}

