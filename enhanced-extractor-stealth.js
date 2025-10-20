// Ultra-Stealth Enhanced MUBI film data extraction with advanced bot avoidance
import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import fs from 'fs/promises';
import path from 'path';

puppeteer.use(StealthPlugin());

const FESTIVALS_DIR = 'data/festivals';
const OUTPUT_DIR = 'data/enhanced';
const BASE_DELAY_MS = 3000; // 3 seconds minimum
const MAX_DELAY_MS = 8000; // 8 seconds maximum
const TMDB_API_KEY = process.env.TMDB_API_KEY;

// Advanced delay with random human-like patterns
const humanDelay = () => {
  const baseDelay = Math.random() * (MAX_DELAY_MS - BASE_DELAY_MS) + BASE_DELAY_MS;
  // Add occasional longer pauses (simulate human reading/thinking)
  const longPause = Math.random() < 0.1 ? Math.random() * 15000 : 0;
  return Math.floor(baseDelay + longPause);
};

// Simulate human-like mouse movements and scrolling
const simulateHumanBehavior = async (page) => {
  try {
    // Random small mouse movements
    await page.mouse.move(
      Math.random() * 100 + 100,
      Math.random() * 100 + 100
    );
    
    // Random scroll (humans often scroll while reading)
    if (Math.random() < 0.3) {
      await page.evaluate(() => {
        window.scrollBy(0, Math.random() * 200 + 100);
      });
      await new Promise(resolve => setTimeout(resolve, Math.random() * 1000 + 500));
    }
    
    // Occasional "reading pause"
    if (Math.random() < 0.2) {
      await new Promise(resolve => setTimeout(resolve, Math.random() * 3000 + 1000));
    }
  } catch (error) {
    // Ignore errors in human simulation
  }
};

// Enhanced JSON extractor with better error handling
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

      // Enhanced DOM extraction with more selectors
      if (!jsonData || results.extractionMetadata.successRate === 0) {
        results.extractionMetadata.dataSource = 'dom_fallback';
        
        // Extract title - more comprehensive selectors
        const titleSelectors = [
          'h1[data-testid="film-title"]',
          'h1.film-title',
          'h1[class*="title"]',
          '[data-cy="film-title"]',
          '.hero-title',
          '.film-header h1',
          'h1'
        ];
        
        for (const selector of titleSelectors) {
          const el = document.querySelector(selector);
          if (el && el.textContent.trim().length > 0) {
            results.title = el.textContent.trim();
            break;
          }
        }
        
        // Extract synopsis - enhanced selectors
        const synopsisSelectors = [
          '[data-testid="film-synopsis"]',
          '[data-cy="synopsis"]',
          '.film-synopsis',
          '.film-description', 
          '.synopsis',
          '.overview',
          '.description',
          '[class*="synopsis"]',
          '[class*="description"]',
          'p[class*="plot"]',
          '.film-details p:nth-of-type(1)',
          '.content p:first-of-type'
        ];
        
        for (const selector of synopsisSelectors) {
          const el = document.querySelector(selector);
          if (el && el.textContent.trim().length > 50) {
            results.synopsis = el.textContent.trim();
            break;
          }
        }
        
        // Extract runtime - enhanced patterns
        const runtimeSelectors = [
          '[data-testid="film-runtime"]',
          '[data-cy="runtime"]',
          '.film-runtime',
          '.runtime',
          '.duration',
          '[class*="runtime"]',
          '[class*="duration"]'
        ];
        
        // First try dedicated runtime elements
        for (const selector of runtimeSelectors) {
          const el = document.querySelector(selector);
          if (el) {
            const match = el.textContent.match(/(\d+)\s*min/i);
            if (match) {
              results.runtime = parseInt(match[1]);
              break;
            }
          }
        }
        
        // If not found, search in all text for runtime patterns
        if (!results.runtime) {
          const allText = document.body.textContent;
          const runtimeMatch = allText.match(/(\d+)\s*minutes?/i) || allText.match(/(\d+)\s*min/i);
          if (runtimeMatch) {
            results.runtime = parseInt(runtimeMatch[1]);
          }
        }
        
        // Extract director - enhanced selectors
        const directorSelectors = [
          '[data-testid="film-director"]',
          '[data-cy="director"]',
          '.film-director',
          '.director',
          '[class*="director"]',
          'a[href*="/directors/"]',
          '.credits .director',
          '.film-credits .director'
        ];
        
        for (const selector of directorSelectors) {
          const el = document.querySelector(selector);
          if (el && el.textContent.trim().length > 0) {
            results.director = el.textContent.trim();
            break;
          }
        }
        
        // Extract genres
        const genreSelectors = [
          '.genres',
          '.film-genres',
          '[data-testid="genres"]',
          '[class*="genre"]'
        ];
        
        for (const selector of genreSelectors) {
          const el = document.querySelector(selector);
          if (el) {
            const genreText = el.textContent;
            results.genres = genreText.split(/[,·•]/).map(g => g.trim()).filter(g => g.length > 0);
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

// TMDB API integration (unchanged - already working perfectly)
class TMDBClient {
  constructor(apiKey) {
    this.apiKey = apiKey;
    this.baseUrl = 'https://api.themoviedb.org/3';
  }

  async searchMovie(title, year) {
    if (!this.apiKey) {
      console.log('    ⚠️  No TMDB API key provided');
      return null;
    }
    
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
        append_to_response: 'credits,external_ids,keywords'
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
      return { tmdb_search_attempted: true, tmdb_found: false };
    }
    
    console.log(`    📋 Found TMDB match: ${searchResult.title} (ID: ${searchResult.id})`);
    
    const details = await this.getMovieDetails(searchResult.id);
    if (!details) {
      console.log('    ❌ Failed to get TMDB details');
      return { tmdb_search_attempted: true, tmdb_found: true, tmdb_details_failed: true };
    }
    
    // Build the enhanced data object
    const enhancedData = {
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
      },
      tmdb_search_attempted: true,
      tmdb_found: true,
      tmdb_details_success: true
    };
    
    console.log(`    ✓ TMDB data: ID ${enhancedData.tmdb_id}, Rating ${enhancedData.tmdb_rating}/10, Cast ${enhancedData.cast.length}`);
    
    return enhancedData;
  }
}

// Enhanced film scraping with ultra-stealth behavior
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
  
  // 1. Navigate with human-like behavior
  try {
    console.log('  🤖 Navigating with stealth mode...');
    
    // Pre-navigation delay
    await new Promise(resolve => setTimeout(resolve, humanDelay()));
    
    // Navigate to page
    await page.goto(film.link, { 
      waitUntil: 'networkidle0', 
      timeout: 45000 
    });
    
    // Post-navigation human behavior simulation
    await simulateHumanBehavior(page);
    
    // Check for CAPTCHA or bot detection
    const bodyText = await page.evaluate(() => document.body.textContent.toLowerCase());
    if (bodyText.includes('confirm you are human') || bodyText.includes('captcha') || bodyText.includes('verify')) {
      console.log('    ⚠️  Bot detection triggered - implementing longer delay');
      await new Promise(resolve => setTimeout(resolve, 30000)); // 30 second pause
      
      // Try refreshing the page
      await page.reload({ waitUntil: 'networkidle0' });
      await simulateHumanBehavior(page);
    }
    
    console.log('  📱 Extracting from MUBI...');
    const mubiData = await extractFilmDataFromJSON(page);
    
    if (mubiData.extractionMetadata.dataSource === 'embedded_json') {
      result.synopsis = mubiData.synopsis;
      result.runtime = mubiData.runtime;
      result.genres = mubiData.genres;
      result.director = mubiData.director || film.director;
      result.country = mubiData.country || film.country;
      result.originalTitle = mubiData.originalTitle;
      
      result.extraction_sources.push('mubi_json');
      result.extraction_success.mubi_json = mubiData.extractionMetadata.successRate;
      
      console.log(`    ✓ JSON Success rate: ${(mubiData.extractionMetadata.successRate * 100).toFixed(1)}%`);
    } else {
      console.log('    ⚠️  JSON not found, using DOM extraction');
      result.extraction_sources.push('mubi_dom');
      result.extraction_success.mubi_dom = mubiData.extractionMetadata.successRate;
      
      // Still use the DOM fallback data
      if (mubiData.synopsis) result.synopsis = mubiData.synopsis;
      if (mubiData.runtime) result.runtime = mubiData.runtime;
      if (mubiData.genres?.length) result.genres = mubiData.genres;
      if (mubiData.director) result.director = mubiData.director;
      
      console.log(`    ✓ DOM Success rate: ${(mubiData.extractionMetadata.successRate * 100).toFixed(1)}%`);
    }
    
    // Human-like reading pause
    await simulateHumanBehavior(page);
    
  } catch (error) {
    console.error(`    ❌ MUBI extraction error:`, error.message);
    result.extraction_success.mubi_error = error.message;
  }
  
  // 2. Enhance with TMDB data (with delay to respect rate limits)
  if (tmdbClient) {
    try {
      console.log('  🎭 Enhancing with TMDB...');
      
      // Small delay before TMDB API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const tmdbData = await tmdbClient.enhanceFilmData(result);
      
      if (tmdbData && tmdbData.tmdb_id) {
        // Explicit field assignment for reliability
        result.tmdb_id = tmdbData.tmdb_id;
        result.imdb_id = tmdbData.imdb_id;
        result.tmdb_rating = tmdbData.tmdb_rating;
        result.tmdb_vote_count = tmdbData.tmdb_vote_count;
        result.tmdb_popularity = tmdbData.tmdb_popularity;
        result.poster_url_tmdb = tmdbData.poster_url_tmdb;
        result.backdrop_url = tmdbData.backdrop_url;
        result.overview_tmdb = tmdbData.overview_tmdb;
        result.tagline = tmdbData.tagline;
        result.budget = tmdbData.budget;
        result.revenue = tmdbData.revenue;
        result.production_companies = tmdbData.production_companies;
        result.production_countries = tmdbData.production_countries;
        result.spoken_languages = tmdbData.spoken_languages;
        result.keywords = tmdbData.keywords;
        
        // Merge cast and crew data
        if (tmdbData.cast?.length) {
          result.cast = tmdbData.cast;
        }
        
        if (tmdbData.crew && Object.keys(tmdbData.crew).length) {
          result.crew = tmdbData.crew;
        }
        
        // Use TMDB data as fallback if MUBI data is missing
        if (!result.synopsis && tmdbData.overview_tmdb) {
          result.synopsis = tmdbData.overview_tmdb;
        }
        
        result.extraction_sources.push('tmdb');
        result.extraction_success.tmdb = true;
        
        console.log(`    ✅ TMDB SUCCESS: ID ${result.tmdb_id}, Rating ${result.tmdb_rating}/10, Cast ${result.cast.length}`);
      } else {
        console.log('    ⚠️  TMDB data incomplete or not found');
        result.extraction_success.tmdb = false;
      }
      
    } catch (error) {
      console.error(`    ❌ TMDB error:`, error.message);
      result.extraction_success.tmdb_error = error.message;
    }
  }
  
  return result;
}

// Main processing function with enhanced stealth settings
async function enhanceAllFilms() {
  console.log('🚀 Starting ULTRA-STEALTH enhanced film data extraction...\n');
  console.log('🛡️  Enhanced Bot Avoidance Features:');
  console.log('  • Random delays: 3-8 seconds + occasional 15s pauses');
  console.log('  • Human behavior simulation: mouse movements, scrolling');
  console.log('  • Advanced stealth browser settings');
  console.log('  • CAPTCHA detection and handling');
  console.log('  • Enhanced DOM extraction fallbacks\n');
  
  // Initialize TMDB client
  const tmdbClient = TMDB_API_KEY ? new TMDBClient(TMDB_API_KEY) : null;
  if (!tmdbClient) {
    console.log('⚠️  TMDB_API_KEY not set - skipping TMDB enhancement');
    return;
  }
  
  console.log('✅ TMDB API key configured\n');
  
  // Initialize browser with ultra-stealth settings
  const browser = await puppeteer.launch({ 
    headless: false,
    defaultViewport: null,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-blink-features=AutomationControlled',
      '--disable-extensions',
      '--no-first-run',
      '--disable-default-apps',
      '--disable-sync',
      '--disable-translate',
      '--hide-scrollbars',
      '--mute-audio',
      '--no-zygote',
      '--disable-web-security',
      '--disable-features=VizDisplayCompositor'
    ]
  });
  
  const page = await browser.newPage();
  
  // Set additional stealth properties
  await page.evaluateOnNewDocument(() => {
    // Override webdriver property
    Object.defineProperty(navigator, 'webdriver', {
      get: () => false,
    });
    
    // Override plugins property
    Object.defineProperty(navigator, 'plugins', {
      get: () => [1, 2, 3, 4, 5],
    });
    
    // Override permissions
    const originalQuery = window.navigator.permissions.query;
    window.navigator.permissions.query = (parameters) => (
      parameters.name === 'notifications' ?
        Promise.resolve({ state: Notification.permission }) :
        originalQuery(parameters)
    );
  });
  
  // Set user agent to look more human
  await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
  
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
      const existingFile = path.join(OUTPUT_DIR, 'enhanced-films.json');
      const existingContent = await fs.readFile(existingFile, 'utf-8');
      const existingData = JSON.parse(existingContent);
      results = existingData.films || [];
      startFrom = results.length;
      console.log(`📂 Resuming from film ${startFrom + 1}/${allFilms.length}\n`);
    } catch (e) {
      console.log('📂 Starting fresh extraction\n');
    }
    
    let processed = startFrom;
    
    for (let i = startFrom; i < allFilms.length; i++) {
      const film = allFilms[i];
      processed++;
      console.log(`[${processed}/${allFilms.length}] (${((processed/allFilms.length)*100).toFixed(1)}%)`);
      
      try {
        const enhanced = await enhanceFilmWithAllSources(page, film, tmdbClient);
        results.push(enhanced);
        
        // Save progress every 3 films (more frequent saves)
        if (processed % 3 === 0 || processed === allFilms.length) {
          const outputFile = path.join(OUTPUT_DIR, 'enhanced-films.json');
          await fs.writeFile(outputFile, JSON.stringify({
            last_updated: new Date().toISOString(),
            total_films: results.length,
            extraction_config: {
              stealth_mode: true,
              delay_range: `${BASE_DELAY_MS}-${MAX_DELAY_MS}ms`,
              human_behavior: true,
              captcha_detection: true
            },
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
      
      // Human-like delay between films
      if (processed < allFilms.length) {
        const delay = humanDelay();
        console.log(`  ⏳ Human-like pause: ${(delay/1000).toFixed(1)}s`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
    
    // Final summary
    const outputFile = path.join(OUTPUT_DIR, 'enhanced-films.json');
    console.log('\n' + '='.repeat(60));
    console.log('📊 ULTRA-STEALTH EXTRACTION COMPLETE');
    console.log('='.repeat(60));
    console.log(`Total films processed: ${processed}`);
    
    const mubiJsonCount = results.filter(f => f.extraction_sources?.includes('mubi_json')).length;
    const mubiDomCount = results.filter(f => f.extraction_sources?.includes('mubi_dom')).length;
    const tmdbCount = results.filter(f => f.tmdb_id).length;
    const withSynopsis = results.filter(f => f.synopsis).length;
    const withRuntime = results.filter(f => f.runtime).length;
    const withCast = results.filter(f => f.cast?.length > 0).length;
    
    console.log(`\n📱 MUBI JSON extractions: ${mubiJsonCount}/${processed} (${((mubiJsonCount/processed)*100).toFixed(1)}%)`);
    console.log(`📱 MUBI DOM fallbacks: ${mubiDomCount}/${processed} (${((mubiDomCount/processed)*100).toFixed(1)}%)`);
    console.log(`🎭 TMDB matches: ${tmdbCount}/${processed} (${((tmdbCount/processed)*100).toFixed(1)}%)`);
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

// Run the ultra-stealth enhancement
enhanceAllFilms().catch(error => {
  console.error('\n❌ Fatal error:', error);
  process.exit(1);
});

export { enhanceAllFilms, TMDBClient };