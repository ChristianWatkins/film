// Enhanced MUBI film data extraction with TMDB integration
import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import fs from 'fs/promises';
import path from 'path';

// Import the JSON extractor function
const extractFilmDataFromJSON = async (page) => {
  return await page.evaluate(() => {
    const results = {
      title: null,
      originalTitle: null, 
      director: null,
      year: null,
      country: null,
      runtime: null,
      synopsis: null,
      genres: [],
      cast: [],
      crew: {},
      extractionMetadata: {
        extractedAt: new Date().toISOString(),
        dataSource: null,
        extractionSuccess: {},
        successRate: 0
      }
    };

    try {
      // Look for embedded JSON data in script tags
      const scripts = document.querySelectorAll('script[type="application/ld+json"], script:not([src])');
      let jsonData = null;
      
      for (const script of scripts) {
        try {
          const content = script.textContent || script.innerHTML;
          if (content.includes('"@type": "Movie"') || content.includes('film') || content.includes('duration') || content.includes('synopsis')) {
            const parsed = JSON.parse(content);
            if (parsed && (parsed['@type'] === 'Movie' || parsed.film || parsed.title)) {
              jsonData = parsed;
              results.extractionMetadata.dataSource = 'embedded_json';
              break;
            }
          }
        } catch (e) {
          // Try extracting from inline JS objects
          if (content.includes('window.') && (content.includes('film') || content.includes('movie'))) {
            const filmMatches = content.match(/window\.\w+\s*=\s*({[^}]+film[^}]+})/g);
            if (filmMatches) {
              try {
                const cleanJson = filmMatches[0].split('=')[1].trim().replace(/;$/, '');
                jsonData = JSON.parse(cleanJson);
                results.extractionMetadata.dataSource = 'window_object';
                break;
              } catch (parseError) {
                continue;
              }
            }
          }
        }
      }

      if (jsonData) {
        // Extract data from JSON structure
        if (jsonData['@type'] === 'Movie') {
          // Schema.org Movie format
          results.title = jsonData.name || jsonData.title;
          results.synopsis = jsonData.description;
          results.year = jsonData.dateCreated ? new Date(jsonData.dateCreated).getFullYear() : null;
          results.runtime = jsonData.duration ? parseInt(jsonData.duration.replace(/\D/g, '')) : null;
          results.director = jsonData.director?.name || (Array.isArray(jsonData.director) ? jsonData.director[0]?.name : null);
          results.genres = Array.isArray(jsonData.genre) ? jsonData.genre : (jsonData.genre ? [jsonData.genre] : []);
          results.extractionMetadata.successRate = 0.9;
        } else if (jsonData.film || jsonData.title) {
          // Custom film object format
          const film = jsonData.film || jsonData;
          results.title = film.title || film.name;
          results.originalTitle = film.originalTitle || film.original_title;
          results.synopsis = film.synopsis || film.description || film.overview;
          results.year = film.year || (film.releaseDate ? new Date(film.releaseDate).getFullYear() : null);
          results.runtime = film.runtime || film.duration;
          results.director = film.director?.name || film.director;
          results.country = film.country || film.countryOfOrigin;
          results.genres = Array.isArray(film.genres) ? film.genres : (film.genres ? [film.genres] : []);
          results.extractionMetadata.successRate = 0.85;
        }
      }

      // If no JSON found, fall back to DOM extraction
      if (!jsonData || results.extractionMetadata.successRate === 0) {
        results.extractionMetadata.dataSource = 'dom_fallback';
        
        // Extract title
        const titleEl = document.querySelector('h1[data-testid="film-title"], h1.film-title, h1');
        if (titleEl) results.title = titleEl.textContent.trim();
        
        // Extract synopsis
        const synopsisSelectors = [
          '[data-testid="film-synopsis"]',
          '.film-synopsis',
          '.film-description', 
          '[data-cy="synopsis"]',
          '.synopsis',
          'p:contains("synopsis")',
          '.film-details p'
        ];
        
        for (const selector of synopsisSelectors) {
          const el = document.querySelector(selector);
          if (el && el.textContent.length > 50) {
            results.synopsis = el.textContent.trim();
            break;
          }
        }
        
        // Extract runtime
        const runtimeSelectors = [
          '[data-testid="film-runtime"]',
          '.film-runtime',
          '.runtime',
          'span:contains("min")',
          'div:contains("minutes")'
        ];
        
        for (const selector of runtimeSelectors) {
          const el = document.querySelector(selector);
          if (el) {
            const match = el.textContent.match(/(\d+)\s*min/);
            if (match) {
              results.runtime = parseInt(match[1]);
              break;
            }
          }
        }
        
        // Extract director
        const directorSelectors = [
          '[data-testid="film-director"]',
          '.film-director',
          '.director',
          'a[href*="/directors/"]'
        ];
        
        for (const selector of directorSelectors) {
          const el = document.querySelector(selector);
          if (el) {
            results.director = el.textContent.trim();
            break;
          }
        }
        
        // Calculate success rate based on extracted fields
        const extractedFields = [results.title, results.synopsis, results.runtime, results.director].filter(Boolean);
        results.extractionMetadata.successRate = extractedFields.length / 4;
      }

    } catch (error) {
      results.extractionMetadata.error = error.message;
      results.extractionMetadata.successRate = 0;
    }

    return results;
  });
};

puppeteer.use(StealthPlugin());

const FESTIVALS_DIR = 'data/festivals';
const OUTPUT_DIR = 'data/enhanced';
const DELAY_MS = 2000; // 2 seconds delay between scrapes
const TMDB_API_KEY = process.env.TMDB_API_KEY; // Set this in environment

// Helper function to delay between requests
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// TMDB API integration
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
      const data = await response.json();
      
      if (data.results && data.results.length > 0) {
        // Try to find exact year match first
        let match = data.results.find(result => {
          const releaseYear = new Date(result.release_date).getFullYear();
          return releaseYear === year;
        });
        
        // If no exact match, try ±1 year
        if (!match) {
          match = data.results.find(result => {
            const releaseYear = new Date(result.release_date).getFullYear();
            return Math.abs(releaseYear - year) <= 1;
          });
        }
        
        return match || data.results[0]; // Return best match or first result
      }
      
      return null;
    } catch (error) {
      console.error(`TMDB search error for "${title}":`, error.message);
      return null;
    }
  }

  async getMovieDetails(movieId) {
    if (!this.apiKey || !movieId) return null;
    
    try {
      const params = new URLSearchParams({
        api_key: this.apiKey,
        append_to_response: 'credits,external_ids,keywords'
      });
      
      const response = await fetch(`${this.baseUrl}/movie/${movieId}?${params}`);
      const data = await response.json();
      
      return data;
    } catch (error) {
      console.error(`TMDB details error for movie ${movieId}:`, error.message);
      return null;
    }
  }

  async enhanceFilmData(film) {
    const searchResult = await this.searchMovie(film.title, film.year);
    if (!searchResult) return {};
    
    const details = await this.getMovieDetails(searchResult.id);
    if (!details) return {};
    
    return {
      tmdb_id: details.id,
      imdb_id: details.external_ids?.imdb_id || null,
      tmdb_rating: details.vote_average || null,
      tmdb_vote_count: details.vote_count || null,
      tmdb_popularity: details.popularity || null,
      poster_url_tmdb: details.poster_path ? `https://image.tmdb.org/t/p/w500${details.poster_path}` : null,
      backdrop_url: details.backdrop_path ? `https://image.tmdb.org/t/p/w1280${details.backdrop_path}` : null,
      overview_tmdb: details.overview || null,
      tagline: details.tagline || null,
      budget: details.budget || null,
      revenue: details.revenue || null,
      production_companies: details.production_companies?.map(c => c.name) || [],
      production_countries: details.production_countries?.map(c => c.name) || [],
      spoken_languages: details.spoken_languages?.map(l => l.english_name) || [],
      keywords: details.keywords?.keywords?.map(k => k.name) || [],
      cast: details.credits?.cast?.slice(0, 10).map(actor => ({
        name: actor.name,
        character: actor.character,
        profile_path: actor.profile_path ? `https://image.tmdb.org/t/p/w185${actor.profile_path}` : null
      })) || [],
      crew: {
        directors: details.credits?.crew?.filter(c => c.job === 'Director').map(d => d.name) || [],
        writers: details.credits?.crew?.filter(c => c.department === 'Writing').map(w => w.name) || [],
        producers: details.credits?.crew?.filter(c => c.job === 'Producer').map(p => p.name) || [],
        cinematographers: details.credits?.crew?.filter(c => c.job === 'Director of Photography').map(c => c.name) || [],
        composers: details.credits?.crew?.filter(c => c.department === 'Sound' && c.job.includes('Composer')).map(c => c.name) || []
      }
    };
  }
}

// Enhanced film scraping with multiple data sources
async function enhanceFilmWithAllSources(page, film, tmdbClient) {
  console.log(`\n🎬 Enhancing: "${film.title}" (${film.year})`);
  console.log(`📍 URL: ${film.link}`);
  
  const result = {
    // Base film data
    title: film.title,
    year: film.year,
    country: film.country,
    director: film.director,
    mubiLink: film.link,
    awarded: film.awarded,
    awards: film.awards,
    
    // Enhanced data to be populated
    synopsis: null,
    runtime: null,
    genres: [],
    cast: [],
    crew: {},
    
    // Metadata
    extraction_sources: [],
    extraction_timestamp: new Date().toISOString(),
    extraction_success: {}
  };
  
  // 1. Extract from MUBI JSON (primary source)
  try {
    console.log('  📱 Extracting from MUBI JSON...');
    await page.goto(film.link, { waitUntil: 'networkidle0', timeout: 30000 });
    await delay(1000);
    
    const mubiData = await extractFilmDataFromJSON(page);
    
    if (mubiData.extractionMetadata.dataSource === 'embedded_json') {
      result.synopsis = mubiData.synopsis;
      result.runtime = mubiData.runtime;
      result.genres = mubiData.genres;
      result.director = mubiData.director || film.director; // Use MUBI data if available
      result.country = mubiData.country || film.country;
      result.originalTitle = mubiData.originalTitle;
      
      result.extraction_sources.push('mubi_json');
      result.extraction_success.mubi_json = mubiData.extractionMetadata.successRate;
      
      console.log(`    ✓ Success rate: ${(mubiData.extractionMetadata.successRate * 100).toFixed(1)}%`);
    } else {
      console.log('    ⚠️  JSON not found, extracted via DOM fallback');
      result.extraction_sources.push('mubi_dom');
      result.extraction_success.mubi_dom = mubiData.extractionMetadata.successRate;
    }
    
  } catch (error) {
    console.error(`    ❌ MUBI extraction error:`, error.message);
    result.extraction_success.mubi_error = error.message;
  }
  
  // 2. Enhance with TMDB data
  if (tmdbClient) {
    try {
      console.log('  🎭 Enhancing with TMDB...');
      const tmdbData = await tmdbClient.enhanceFilmData(result);
      
      if (tmdbData.tmdb_id) {
        // Merge TMDB data
        Object.assign(result, tmdbData);
        
        // Use TMDB data as fallback if MUBI data is missing
        if (!result.synopsis && tmdbData.overview_tmdb) {
          result.synopsis = tmdbData.overview_tmdb;
        }
        
        result.extraction_sources.push('tmdb');
        result.extraction_success.tmdb = true;
        
        console.log(`    ✓ TMDB ID: ${tmdbData.tmdb_id}, Rating: ${tmdbData.tmdb_rating}/10`);
      } else {
        console.log('    ⚠️  Not found on TMDB');
        result.extraction_success.tmdb = false;
      }
      
    } catch (error) {
      console.error(`    ❌ TMDB error:`, error.message);
      result.extraction_success.tmdb_error = error.message;
    }
  }
  
  return result;
}

// Process all films from festival data
async function enhanceAllFilms() {
  console.log('🚀 Starting enhanced film data extraction...\n');
  console.log('📊 Data Sources:');
  console.log('  1. MUBI JSON (primary metadata)');
  console.log('  2. TMDB API (enhanced data)');
  console.log('  3. Existing JustWatch (streaming)\n');
  
  // Initialize TMDB client
  const tmdbClient = TMDB_API_KEY ? new TMDBClient(TMDB_API_KEY) : null;
  if (!tmdbClient) {
    console.log('⚠️  TMDB_API_KEY not set - skipping TMDB enhancement');
    console.log('   To get TMDB data, set: export TMDB_API_KEY=your_api_key\n');
  }
  
  // Initialize browser
  const browser = await puppeteer.launch({ 
    headless: false,
    defaultViewport: null,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  const page = await browser.newPage();
  
  try {
    // Get all festival films
    const allFilms = await getAllFestivalFilms();
    console.log(`📂 Found ${allFilms.length} films to enhance\n`);
    
    // Ensure output directory exists
    await fs.mkdir(OUTPUT_DIR, { recursive: true });
    
    const results = [];
    let processed = 0;
    
    for (const film of allFilms) {
      processed++;
      console.log(`[${processed}/${allFilms.length}]`);
      
      try {
        const enhanced = await enhanceFilmWithAllSources(page, film, tmdbClient);
        results.push(enhanced);
        
        // Save progress every 10 films
        if (processed % 10 === 0) {
          const outputFile = path.join(OUTPUT_DIR, 'enhanced-films.json');
          await fs.writeFile(outputFile, JSON.stringify({
            last_updated: new Date().toISOString(),
            total_films: results.length,
            films: results
          }, null, 2));
          console.log(`  💾 Progress saved (${processed}/${allFilms.length})\n`);
        }
        
      } catch (error) {
        console.error(`❌ Error processing "${film.title}":`, error.message);
        results.push({
          ...film,
          extraction_error: error.message,
          extraction_timestamp: new Date().toISOString()
        });
      }
      
      // Delay between films
      if (processed < allFilms.length) {
        await delay(DELAY_MS);
      }
    }
    
    // Final save
    const outputFile = path.join(OUTPUT_DIR, 'enhanced-films.json');
    await fs.writeFile(outputFile, JSON.stringify({
      last_updated: new Date().toISOString(),
      total_films: results.length,
      data_sources: ['mubi_json', 'tmdb_api', 'justwatch_existing'],
      films: results
    }, null, 2));
    
    // Print summary
    console.log('\n' + '='.repeat(60));
    console.log('📊 ENHANCEMENT SUMMARY');
    console.log('='.repeat(60));
    console.log(`Total films processed: ${processed}`);
    
    const mubiSuccess = results.filter(f => f.extraction_sources?.includes('mubi_json')).length;
    const tmdbSuccess = results.filter(f => f.extraction_sources?.includes('tmdb')).length;
    const withSynopsis = results.filter(f => f.synopsis).length;
    const withRuntime = results.filter(f => f.runtime).length;
    const withCast = results.filter(f => f.cast?.length > 0).length;
    
    console.log(`\n📱 MUBI JSON extractions: ${mubiSuccess}/${processed} (${((mubiSuccess/processed)*100).toFixed(1)}%)`);
    console.log(`🎭 TMDB enhancements: ${tmdbSuccess}/${processed} (${((tmdbSuccess/processed)*100).toFixed(1)}%)`);
    console.log(`\n📝 Films with synopsis: ${withSynopsis}/${processed} (${((withSynopsis/processed)*100).toFixed(1)}%)`);
    console.log(`⏱️  Films with runtime: ${withRuntime}/${processed} (${((withRuntime/processed)*100).toFixed(1)}%)`);
    console.log(`🎬 Films with cast: ${withCast}/${processed} (${((withCast/processed)*100).toFixed(1)}%)`);
    
    console.log(`\n✅ Enhanced data saved to: ${outputFile}`);
    
  } finally {
    await browser.close();
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

// Run the enhancement
enhanceAllFilms().catch(error => {
  console.error('\n❌ Fatal error:', error);
  process.exit(1);
});

export { enhanceAllFilms, TMDBClient };