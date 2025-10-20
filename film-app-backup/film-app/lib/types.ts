// Festival data types
export interface FestivalFilm {
  title: string;
  year: number;
  country: string | null;
  director: string | null;
  link: string; // MUBI link
  awarded: boolean;
  awards: string[];
  synopsis?: string; // Film synopsis/plot
  genres?: string[]; // Film genres
  runtime?: string; // Film runtime
  cast?: string[]; // Main cast members
}

// Streaming data types
export interface StreamingProvider {
  provider: string;
  quality: string | null;
  price: string | null;
  url: string | null;
}

export interface FestivalAppearance {
  name: string;
  year: string;
  awarded: boolean;
}

export interface StreamingData {
  found: boolean;
  title: string;
  year: number;
  director?: string | null;
  justwatch_id?: string | null;
  justwatch_url?: string | null;
  imdb_id?: string | null;
  tmdb_id?: number | null;
  poster_url?: string | null;
  streaming?: StreamingProvider[];
  rent?: StreamingProvider[];
  buy?: StreamingProvider[];
  festivals?: FestivalAppearance[];
  last_updated?: string;
  search_attempted?: boolean;
  error?: string;
}

export interface StreamingAvailability {
  last_updated: string;
  country: string;
  total_films: number;
  films: Record<string, StreamingData>;
}

// Combined film type for the app
export interface Film {
  // Core metadata
  title: string;
  year: number;
  country: string | null;
  director: string | null;
  
  // Enhanced metadata
  synopsis?: string;
  genres?: string[];
  runtime?: string;
  cast?: string[];
  tmdbRating?: number; // TMDB rating out of 10
  
  // Links
  mubiLink: string;
  justwatchLink?: string | null;
  posterUrl?: string | null;
  
  // Awards
  awarded: boolean;
  awards: string[];
  
  // Streaming availability
  hasStreaming: boolean;
  hasRent: boolean;
  hasBuy: boolean;
  streaming: StreamingProvider[];
  rent: StreamingProvider[];
  buy: StreamingProvider[];
  
  // Festival info
  festivals: FestivalAppearance[];
  
  // Internal
  filmKey: string;
}

// Filter state
export interface FilterState {
  festivals: string[];
  years: number[];
  countries: string[];
  awardedOnly: boolean;
  watchlistOnly: boolean;
  showStreaming: boolean;
  showRentBuy: boolean;
  selectedPlatforms: string[];
}

