// TMDB-First Enhanced Film Data Extraction (No MUBI scraping)
import fs from 'fs/promises';
import path from 'path';
import { config } from 'dotenv';

// Load environment variables
config({ path: '.env.local' });

const FESTIVALS_DIR = 'data/festivals';
const OUTPUT_DIR = 'data/enhanced';
const TMDB_API_KEY = process.env.TMDB_API_KEY;

// Helper function to delay between requests
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// TMDB API integration (proven working)
class TMDBClient {
  constructor(apiKey) {
    this.apiKey = apiKey;
    this.baseUrl = 'https://api.themoviedb.org/3';
  }

  async searchMovie(title, year) {
    if (!this.apiKey) return null;
    
    try {
      const params = new URLSearchParams({
        api_key: this.apiKey,
        query: title,
        year: year,
        include_adult: false
      });
      
      const response = await fetch(`${this.baseUrl}/search/movie?${params}`);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      
      if (data.results && data.results.length > 0) {
        // Try to find exact year match first
        let match = data.results.find(result => {
          if (!result.release_date) return false;
          const releaseYear = new Date(result.release_date).getFullYear();
          return releaseYear === year;
        });
        
        // If no exact match, try ±1 year
        if (!match) {
          match = data.results.find(result => {
            if (!result.release_date) return false;
            const releaseYear = new Date(result.release_date).getFullYear();
            return Math.abs(releaseYear - year) <= 1;
          });
        }
        
        return match || data.results[0];
      }
      
      return null;
    } catch (error) {
      console.error(`    ❌ TMDB search error for "${title}":`, error.message);
      return null;
    }
  }

  async getMovieDetails(movieId) {
    if (!this.apiKey || !movieId) return null;
    
    try {
      const params = new URLSearchParams({
        api_key: this.apiKey,
        append_to_response: 'credits,external_ids,keywords,videos'
      });
      
      const response = await fetch(`${this.baseUrl}/movie/${movieId}?${params}`);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      return data;
      
    } catch (error) {
      console.error(`    ❌ TMDB details error for movie ${movieId}:`, error.message);
      return null;
    }
  }

  async enhanceFilmData(film) {
    console.log(`    🔍 Searching TMDB for: "${film.title}" (${film.year})`);
    
    const searchResult = await this.searchMovie(film.title, film.year);
    if (!searchResult) {
      console.log('    ⚠️  Not found on TMDB');
      return null;
    }
    
    console.log(`    📋 Found TMDB match: ${searchResult.title} (ID: ${searchResult.id})`);
    
    const details = await this.getMovieDetails(searchResult.id);
    if (!details) {
      console.log('    ❌ Failed to get TMDB details');
      return null;
    }
    
    // Build comprehensive enhanced data object
    const enhancedData = {
      // Base film data (preserve original)
      title: film.title,
      year: film.year,
      country: film.country,
      director: film.director,
      mubiLink: film.link,
      awarded: film.awarded,
      awards: film.awards,
      festival: film.festival,
      festival_year: film.festival_year,
      
      // TMDB Enhanced data
      tmdb_id: details.id,
      imdb_id: details.external_ids?.imdb_id || null,
      tmdb_title: details.title,
      original_title: details.original_title,
      
      // Synopsis and content
      synopsis: details.overview || null,
      tagline: details.tagline || null,
      
      // Ratings and popularity
      tmdb_rating: details.vote_average || null,
      tmdb_vote_count: details.vote_count || null,
      tmdb_popularity: details.popularity || null,
      
      // Technical details
      runtime: details.runtime || null,
      genres: details.genres?.map(g => g.name) || [],
      release_date: details.release_date || null,
      
      // Visual assets
      poster_url_tmdb: details.poster_path ? `https://image.tmdb.org/t/p/w500${details.poster_path}` : null,
      backdrop_url: details.backdrop_path ? `https://image.tmdb.org/t/p/w1280${details.backdrop_path}` : null,
      
      // Production details
      budget: details.budget || null,
      revenue: details.revenue || null,
      production_companies: details.production_companies?.map(c => c.name) || [],
      production_countries: details.production_countries?.map(c => c.name) || [],
      spoken_languages: details.spoken_languages?.map(l => l.english_name) || [],
      
      // Keywords and themes
      keywords: details.keywords?.keywords?.map(k => k.name) || [],
      
      // Cast and crew (detailed)
      cast: details.credits?.cast?.slice(0, 15).map(actor => ({
        name: actor.name,
        character: actor.character,
        order: actor.order,
        profile_path: actor.profile_path ? `https://image.tmdb.org/t/p/w185${actor.profile_path}` : null
      })) || [],
      
      crew: {
        directors: details.credits?.crew?.filter(c => c.job === 'Director').map(d => ({
          name: d.name,
          profile_path: d.profile_path ? `https://image.tmdb.org/t/p/w185${d.profile_path}` : null
        })) || [],
        writers: details.credits?.crew?.filter(c => c.department === 'Writing').map(w => ({
          name: w.name,
          job: w.job
        })) || [],
        producers: details.credits?.crew?.filter(c => c.job === 'Producer').map(p => p.name) || [],
        cinematographers: details.credits?.crew?.filter(c => c.job === 'Director of Photography').map(c => c.name) || [],
        composers: details.credits?.crew?.filter(c => c.department === 'Sound' && c.job.includes('Composer')).map(c => c.name) || [],
        editors: details.credits?.crew?.filter(c => c.job === 'Editor').map(c => c.name) || []
      },
      
      // Videos (trailers, etc.)
      videos: details.videos?.results?.filter(v => v.site === 'YouTube').map(v => ({
        name: v.name,
        key: v.key,
        type: v.type,
        youtube_url: `https://www.youtube.com/watch?v=${v.key}`
      })) || [],
      
      // Metadata
      extraction_sources: ['tmdb_api'],
      extraction_timestamp: new Date().toISOString(),
      extraction_success: {
        tmdb: true,
        mubi_skipped: 'avoiding_bot_detection'
      }
    };
    
    console.log(`    ✅ TMDB SUCCESS: ID ${enhancedData.tmdb_id}, Rating ${enhancedData.tmdb_rating}/10, Cast ${enhancedData.cast.length}, Runtime ${enhancedData.runtime}min`);
    
    return enhancedData;
  }
}

// Process all films using TMDB only
async function enhanceAllFilmsWithTMDB() {
  console.log('🚀 Starting TMDB-FIRST enhanced film data extraction...\n');
  console.log('🎯 Strategy: Pure TMDB Enhancement (No MUBI scraping)');
  console.log('✅ Benefits: No bot detection, 100% reliable, rich metadata');
  console.log('📊 Data Sources: TMDB API + Existing JustWatch + Festival data\n');
  
  // Initialize TMDB client
  const tmdbClient = TMDB_API_KEY ? new TMDBClient(TMDB_API_KEY) : null;
  if (!tmdbClient) {
    console.log('❌ TMDB_API_KEY not set - cannot proceed');
    return;
  }
  
  console.log('✅ TMDB API key configured\n');
  
  try {
    // Get all festival films
    const allFilms = await getAllFestivalFilms();
    console.log(`📂 Found ${allFilms.length} films to enhance\n`);
    
    // Ensure output directory exists
    await fs.mkdir(OUTPUT_DIR, { recursive: true });
    
    // Check if we have existing progress to resume from
    let results = [];
    let startFrom = 0;
    
    try {
      const existingFile = path.join(OUTPUT_DIR, 'enhanced-films-tmdb.json');
      const existingContent = await fs.readFile(existingFile, 'utf-8');
      const existingData = JSON.parse(existingContent);
      results = existingData.films || [];
      startFrom = results.length;
      console.log(`📂 Resuming from film ${startFrom + 1}/${allFilms.length}\n`);
    } catch (e) {
      console.log('📂 Starting fresh TMDB extraction\n');
    }
    
    let processed = startFrom;
    let tmdbFound = 0;
    
    for (let i = startFrom; i < allFilms.length; i++) {
      const film = allFilms[i];
      processed++;
      console.log(`[${processed}/${allFilms.length}] (${((processed/allFilms.length)*100).toFixed(1)}%)`);
      console.log(`🎬 Enhancing: "${film.title}" (${film.year})`);
      
      try {
        const enhanced = await tmdbClient.enhanceFilmData(film);
        
        if (enhanced) {
          results.push(enhanced);
          tmdbFound++;
        } else {
          // Still save film with original data if TMDB not found
          results.push({
            ...film,
            extraction_sources: ['festival_data_only'],
            extraction_timestamp: new Date().toISOString(),
            extraction_success: {
              tmdb: false,
              tmdb_not_found: true
            }
          });
        }
        
        // Save progress every 5 films
        if (processed % 5 === 0 || processed === allFilms.length) {
          const outputFile = path.join(OUTPUT_DIR, 'enhanced-films-tmdb.json');
          await fs.writeFile(outputFile, JSON.stringify({
            last_updated: new Date().toISOString(),
            total_films: results.length,
            tmdb_found: tmdbFound,
            success_rate: `${((tmdbFound/results.length)*100).toFixed(1)}%`,
            extraction_strategy: 'tmdb_first_no_mubi_scraping',
            data_sources: ['tmdb_api', 'justwatch_existing', 'festival_data'],
            films: results
          }, null, 2));
          console.log(`  💾 Progress saved (${processed}/${allFilms.length}) - TMDB found: ${tmdbFound}/${processed}\n`);
        }
        
      } catch (error) {
        console.error(`❌ Error processing "${film.title}":`, error.message);
        results.push({
          ...film,
          extraction_error: error.message,
          extraction_timestamp: new Date().toISOString()
        });
      }
      
      // Respectful delay for TMDB API
      if (processed < allFilms.length) {
        await delay(500); // 0.5 second delay (much faster than MUBI scraping)
      }
    }
    
    // Final summary
    const outputFile = path.join(OUTPUT_DIR, 'enhanced-films-tmdb.json');
    console.log('\n' + '='.repeat(60));
    console.log('📊 TMDB-FIRST EXTRACTION COMPLETE');
    console.log('='.repeat(60));
    console.log(`Total films processed: ${processed}`);
    console.log(`TMDB matches found: ${tmdbFound}/${processed} (${((tmdbFound/processed)*100).toFixed(1)}%)`);
    
    const withSynopsis = results.filter(f => f.synopsis).length;
    const withRuntime = results.filter(f => f.runtime).length;
    const withCast = results.filter(f => f.cast?.length > 0).length;
    const withTrailers = results.filter(f => f.videos?.length > 0).length;
    
    console.log(`\n📝 Films with synopsis: ${withSynopsis}/${processed} (${((withSynopsis/processed)*100).toFixed(1)}%)`);
    console.log(`⏱️  Films with runtime: ${withRuntime}/${processed} (${((withRuntime/processed)*100).toFixed(1)}%)`);
    console.log(`🎬 Films with cast: ${withCast}/${processed} (${((withCast/processed)*100).toFixed(1)}%)`);
    console.log(`🎥 Films with trailers: ${withTrailers}/${processed} (${((withTrailers/processed)*100).toFixed(1)}%)`);
    
    console.log(`\n✅ Enhanced data saved to: ${outputFile}`);
    console.log('🎯 Strategy successful: No bot detection issues!');
    
  } catch (error) {
    console.error('\n❌ Fatal error:', error);
    process.exit(1);
  }
}

// Helper function to read all festival films
async function getAllFestivalFilms() {
  const films = [];
  
  const festivalDirs = await fs.readdir(FESTIVALS_DIR);
  
  for (const festivalName of festivalDirs) {
    const festivalPath = path.join(FESTIVALS_DIR, festivalName);
    const stat = await fs.stat(festivalPath);
    
    if (!stat.isDirectory()) continue;
    
    const yearFiles = await fs.readdir(festivalPath);
    
    for (const yearFile of yearFiles) {
      if (!yearFile.endsWith('.json')) continue;
      
      const filePath = path.join(festivalPath, yearFile);
      const content = await fs.readFile(filePath, 'utf-8');
      const filmList = JSON.parse(content);
      
      filmList.forEach(film => {
        // Add festival context
        film.festival = festivalName;
        film.festival_year = yearFile.replace('.json', '');
        films.push(film);
      });
    }
  }
  
  return films;
}

// Run the TMDB-first enhancement
enhanceAllFilmsWithTMDB().catch(error => {
  console.error('\n❌ Fatal error:', error);
  process.exit(1);
});

export { enhanceAllFilmsWithTMDB, TMDBClient };