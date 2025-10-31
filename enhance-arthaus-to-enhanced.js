// Enhanced data extraction for Arthaus films
// Fetches full TMDB data (including cast) for all Arthaus films and adds to enhanced-films-tmdb.json
import fs from 'fs/promises';
import path from 'path';
import { config } from 'dotenv';

// Load environment variables
config({ path: '.env.local' });

const FESTIVALS_DIR = 'data/festivals/arthaus';
const ENHANCED_FILE = 'data/enhanced/enhanced-films-tmdb.json';
const TMDB_API_KEY = process.env.TMDB_API_KEY;

// Helper function to delay between requests
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Helper function to create film key
function createFilmKey(title, year) {
  return `${title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${year}`;
}

// TMDB API client
class TMDBClient {
  constructor(apiKey) {
    this.apiKey = apiKey;
    this.baseUrl = 'https://api.themoviedb.org/3';
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
    if (!film.tmdb_id) {
      console.log(`    ⚠️  No TMDB ID available for "${film.title}"`);
      return null;
    }

    console.log(`    🔍 Fetching TMDB data for ID: ${film.tmdb_id} - "${film.title}" (${film.year})`);
    
    const details = await this.getMovieDetails(film.tmdb_id);
    if (!details) {
      console.log('    ❌ Failed to get TMDB details');
      return null;
    }

    // Verify the TMDB ID is correct by checking title similarity
    const tmdbTitleLower = details.title?.toLowerCase() || '';
    const filmTitleLower = film.title?.toLowerCase() || '';
    const tmdbYear = details.release_date ? new Date(details.release_date).getFullYear() : null;
    
    // Check if titles are similar (allowing for some variation)
    const titleSimilar = tmdbTitleLower.includes(filmTitleLower.substring(0, 5)) || 
                        filmTitleLower.includes(tmdbTitleLower.substring(0, 5)) ||
                        Math.abs(tmdbYear - film.year) <= 1;
    
    if (!titleSimilar && Math.abs(tmdbYear - film.year) > 1) {
      console.log(`    ⚠️  WARNING: TMDB ID ${film.tmdb_id} might be incorrect:`);
      console.log(`       Festival: "${film.title}" (${film.year})`);
      console.log(`       TMDB: "${details.title}" (${tmdbYear})`);
      // Continue anyway, but log the warning
    }
    
    // Build comprehensive enhanced data object
    const enhancedData = {
      // Base film data (preserve original from festival)
      title: film.title,
      year: film.year,
      country: film.country,
      director: film.director,
      mubiLink: film.link,
      awarded: film.awarded || false,
      awards: film.awards || [],
      
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
      
      // Cast and crew (detailed) - THIS IS WHAT WE NEED FOR CAST
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
        tmdb: true
      }
    };
    
    console.log(`    ✅ SUCCESS: Cast ${enhancedData.cast.length} actors, Rating ${enhancedData.tmdb_rating}/10, Runtime ${enhancedData.runtime}min`);
    
    return enhancedData;
  }
}

// Load all Arthaus festival files
async function getAllArthausFilms() {
  const films = [];
  const arthausDir = path.join(process.cwd(), FESTIVALS_DIR);
  
  try {
    const files = await fs.readdir(arthausDir);
    
    for (const file of files) {
      if (!file.endsWith('.json')) continue;
      
      const filePath = path.join(arthausDir, file);
      const content = await fs.readFile(filePath, 'utf-8');
      const filmList = JSON.parse(content);
      
      if (Array.isArray(filmList)) {
        filmList.forEach(film => {
          if (film.tmdb_id) {
            films.push(film);
          }
        });
      }
    }
    
    return films;
  } catch (error) {
    console.error('Error loading Arthaus films:', error);
    throw error;
  }
}

// Load existing enhanced data
async function loadEnhancedData() {
  try {
    const content = await fs.readFile(ENHANCED_FILE, 'utf-8');
    const data = JSON.parse(content);
    return {
      films: data.films || [],
      metadata: {
        last_updated: data.last_updated,
        total_films: data.total_films,
        tmdb_found: data.tmdb_found,
        success_rate: data.success_rate
      }
    };
  } catch (error) {
    console.log('Enhanced file not found or invalid, starting fresh');
    return {
      films: [],
      metadata: {
        last_updated: new Date().toISOString(),
        total_films: 0,
        tmdb_found: 0,
        success_rate: '0%'
      }
    };
  }
}

// Main processing function
async function enhanceArthausFilms() {
  if (!TMDB_API_KEY) {
    console.error('❌ TMDB_API_KEY not found in environment variables');
    console.error('   Please set it in .env.local file');
    process.exit(1);
  }

  console.log('🚀 Starting Arthaus films enhancement for enhanced-films-tmdb.json\n');

  const tmdbClient = new TMDBClient(TMDB_API_KEY);
  
  // Load all Arthaus films
  const arthausFilms = await getAllArthausFilms();
  console.log(`📂 Found ${arthausFilms.length} Arthaus films with TMDB IDs\n`);

  // Load existing enhanced data
  const existingData = await loadEnhancedData();
  const existingFilms = existingData.films;
  const existingFilmKeys = new Set(existingFilms.map(f => createFilmKey(f.title, f.year)));
  const existingTmdbIds = new Set(existingFilms.map(f => f.tmdb_id).filter(Boolean));

  console.log(`📊 Existing enhanced data: ${existingFilms.length} films\n`);

  // Process Arthaus films
  const results = [...existingFilms];
  const arthausEnhanced = [];
  const skipped = [];
  const failed = [];
  
  let processed = 0;
  let updated = 0;
  let added = 0;

  for (const film of arthausFilms) {
    processed++;
    const filmKey = createFilmKey(film.title, film.year);
    
    console.log(`[${processed}/${arthausFilms.length}] Processing: "${film.title}" (${film.year})`);
    console.log(`   MUBI: ${film.link}`);
    console.log(`   TMDB ID: ${film.tmdb_id}`);

    // Check if already exists
    if (existingFilmKeys.has(filmKey) || existingTmdbIds.has(film.tmdb_id)) {
      console.log(`   ⏭️  Already in enhanced data, skipping\n`);
      skipped.push(film.title);
      continue;
    }

    try {
      const enhanced = await tmdbClient.enhanceFilmData(film);
      
      if (enhanced) {
        arthausEnhanced.push(enhanced);
        results.push(enhanced);
        added++;
        console.log(`   ✅ Added to enhanced data\n`);
      } else {
        failed.push(film.title);
        console.log(`   ❌ Failed to enhance\n`);
      }
      
      // Save progress every 5 films
      if (processed % 5 === 0 || processed === arthausFilms.length) {
        const totalTmdbFound = results.filter(f => f.tmdb_id).length;
        const outputData = {
          last_updated: new Date().toISOString(),
          total_films: results.length,
          tmdb_found: totalTmdbFound,
          success_rate: `${((totalTmdbFound/results.length)*100).toFixed(1)}%`,
          extraction_strategy: 'tmdb_api',
          data_sources: ['tmdb_api', 'justwatch_existing', 'festival_data'],
          films: results
        };
        
        await fs.writeFile(ENHANCED_FILE, JSON.stringify(outputData, null, 2));
        console.log(`  💾 Progress saved: ${added} Arthaus films added, ${totalTmdbFound}/${results.length} with TMDB data\n`);
      }
      
    } catch (error) {
      console.error(`   ❌ Error: ${error.message}\n`);
      failed.push(film.title);
    }
    
    // Rate limiting - TMDB allows 40 requests per 10 seconds
    await delay(250); // 4 requests per second to be safe
  }

  // Final summary
  console.log('\n' + '='.repeat(60));
  console.log('📊 ENHANCEMENT SUMMARY');
  console.log('='.repeat(60));
  console.log(`Total Arthaus films processed: ${processed}`);
  console.log(`✅ Successfully enhanced: ${added}`);
  console.log(`⏭️  Already existed (skipped): ${skipped.length}`);
  console.log(`❌ Failed: ${failed.length}`);
  console.log(`\nTotal films in enhanced data: ${results.length}`);
  console.log(`Films with TMDB data: ${results.filter(f => f.tmdb_id).length}`);
  console.log(`\n✅ Enhanced data saved to: ${ENHANCED_FILE}`);

  if (failed.length > 0) {
    console.log(`\n⚠️  Failed films:`);
    failed.forEach(title => console.log(`   - ${title}`));
  }
}

// Run the enhancement
enhanceArthausFilms().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});

