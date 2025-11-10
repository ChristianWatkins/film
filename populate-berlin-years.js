import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import fs from 'fs/promises';
import path from 'path';

// Use stealth plugin to avoid detection
puppeteer.use(StealthPlugin());

// Load environment variables from .env.local
const __dirname = path.dirname(new URL(import.meta.url).pathname);
const envPath = path.join(__dirname, '.env.local');
try {
  const envContent = await fs.readFile(envPath, 'utf8');
  envContent.split('\n').forEach(line => {
    const [key, value] = line.split('=');
    if (key && value && key.trim() && !key.startsWith('#')) {
      process.env[key.trim()] = value.trim();
    }
  });
} catch (error) {
  console.log('⚠️  .env.local not found, using process.env');
}

const TMDB_API_KEY = process.env.TMDB_API_KEY;
const TMDB_BASE_URL = 'https://api.themoviedb.org/3';

if (!TMDB_API_KEY) {
  console.error('❌ TMDB_API_KEY not found in environment variables');
  console.log('   Set it in .env.local or run: export TMDB_API_KEY=your_key');
  process.exit(1);
}

const BASE_URL = 'https://mubi.com/en/awards-and-festivals/berlinale';
const FESTIVAL_NAME = 'berlin';
const DELAY_MS = 2000; // 2 seconds delay between requests
const FILMS_JSON_PATH = 'data/films.json';

// Helper function to delay between requests
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Generate 3-character short codes
const CHARS = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';

function generateShortCode(index) {
  const char1 = CHARS[Math.floor(index / (62 * 62)) % 62];
  const char2 = CHARS[Math.floor(index / 62) % 62];
  const char3 = CHARS[index % 62];
  return char1 + char2 + char3;
}

function normalizeTitle(title) {
  return title
    .toLowerCase()
    .replace(/[^\w\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function createFilmKey(title, year) {
  return `${title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')}-${year}`;
}

// Scrape films from a single page
async function scrapeFilmsFromPage(page) {
  const films = await page.evaluate(() => {
    const filmLinks = document.querySelectorAll('a[href*="/films/"]');
    
    return Array.from(filmLinks).map(link => {
      // Get the card container
      const card = link.closest('div');
      if (!card) return null;
      
      const href = link.getAttribute('href');
      const fullLink = href.startsWith('http') ? href : `https://mubi.com${href}`;
      
      // Extract title from H3
      const titleElement = card.querySelector('h3');
      const title = titleElement ? titleElement.textContent.trim() : '';
      
      if (!title) return null;
      
      // Get all text content and parse it
      const allText = card.textContent || '';
      
      // Extract year - look for 4-digit year
      let year = null;
      const yearMatch = allText.match(/\b(19|20)\d{2}\b/);
      if (yearMatch) {
        year = parseInt(yearMatch[0]);
      }
      
      // Extract director - usually follows title, before country
      let director = '';
      const directorElement = card.querySelector('span.css-1vg6q84, span[class*="e1slvksg"]');
      if (directorElement) {
        director = directorElement.textContent.trim();
      }
      
      // Extract country
      let country = '';
      const countryElement = card.querySelector('span.css-ahepiu, span[class*="edwgj4f"]');
      if (countryElement) {
        country = countryElement.textContent.trim();
      }
      
      // Check for awards
      const awardElement = card.querySelector('div[class*="eiz03ik"]');
      const awarded = !!awardElement;
      const awards = awarded ? awardElement.textContent.trim() : '';
      
      return {
        title,
        year,
        director,
        country,
        mubiLink: fullLink,
        awarded,
        awards
      };
    }).filter(film => film !== null && film.title && film.year);
  });
  
  return films;
}

// Get the total number of pages
async function getTotalPages(page) {
  return await page.evaluate(() => {
    // Scroll to bottom to ensure pagination is loaded
    window.scrollTo(0, document.body.scrollHeight);
    
    // Look for pagination buttons (MUBI uses buttons, not links)
    const buttons = Array.from(document.querySelectorAll('button'));
    const paginationButtons = buttons.filter(b => {
      const text = b.textContent.trim();
      return /^\d+$/.test(text) && parseInt(text) <= 100; // Buttons that are just numbers
    });
    
    if (paginationButtons.length === 0) return 1;
    
    // Find the highest page number
    const pageNumbers = paginationButtons.map(b => parseInt(b.textContent.trim()));
    const maxPage = Math.max(...pageNumbers);
    
    // Sanity check - if maxPage is unreasonably high, default to 1
    return (maxPage > 0 && maxPage <= 100) ? maxPage : 1;
  });
}

// Scrape all films from all pages for a year
async function scrapeYear(page, year) {
  console.log(`\n🎬 Fetching Berlin ${year} from MUBI...`);
  
  try {
    // First, visit page 1 to determine total number of pages
    const firstPageUrl = `${BASE_URL}?year=${year}`;
    console.log(`   URL: ${firstPageUrl}`);
    
    await page.goto(firstPageUrl, { 
      waitUntil: 'networkidle2',
      timeout: 60000 
    });
    
    // Wait for films to load
    await page.waitForSelector('a[href*="/films/"]', { timeout: 30000 });
    
    // Scroll to bottom and wait a bit for pagination to load
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await delay(1500);
    
    // Get total number of pages
    const totalPages = await getTotalPages(page);
    console.log(`   📊 Found ${totalPages} page(s) to scrape`);
    
    let allFilms = [];
    
    // Scrape each page
    for (let pageNum = 1; pageNum <= totalPages && pageNum <= 10; pageNum++) {
      console.log(`   📄 Scraping page ${pageNum}/${totalPages}...`);
      
      // Navigate to page if not the first one
      if (pageNum > 1) {
        const pageUrl = `${BASE_URL}?year=${year}&page=${pageNum}`;
        await page.goto(pageUrl, { 
          waitUntil: 'networkidle2',
          timeout: 60000 
        });
        await page.waitForSelector('a[href*="/films/"]', { timeout: 30000 });
        await delay(1000); // Small delay for content to fully render
      }
      
      // Scrape films from current page
      const films = await scrapeFilmsFromPage(page);
      console.log(`      Found ${films.length} films`);
      
      allFilms = allFilms.concat(films);
      
      // Be polite between pages
      if (pageNum < totalPages) {
        await delay(DELAY_MS);
      }
    }
    
    console.log(`   ✅ Total found: ${allFilms.length} films across ${totalPages} page(s)`);
    return allFilms;
    
  } catch (error) {
    console.error(`   ❌ Error scraping ${year}:`, error.message);
    return [];
  }
}

// Search TMDB for a film
async function searchTMDB(title, year, director = '') {
  try {
    const searchUrl = `${TMDB_BASE_URL}/search/movie?api_key=${TMDB_API_KEY}&query=${encodeURIComponent(title)}&year=${year}`;
    const response = await fetch(searchUrl);
    
    if (!response.ok) {
      throw new Error(`TMDB API error: ${response.status}`);
    }
    
    const data = await response.json();
    
    if (data.results && data.results.length > 0) {
      // If we have director info, try to match it
      if (director) {
        // First try exact year match with director validation
        for (const result of data.results) {
          const releaseYear = result.release_date ? parseInt(result.release_date.split('-')[0]) : null;
          if (releaseYear === year) {
            // Fetch credits to check director
            const creditsUrl = `${TMDB_BASE_URL}/movie/${result.id}/credits?api_key=${TMDB_API_KEY}`;
            const creditsResponse = await fetch(creditsUrl);
            if (creditsResponse.ok) {
              const creditsData = await creditsResponse.json();
              const tmdbDirector = creditsData.crew?.find(person => person.job === 'Director');
              if (tmdbDirector && director.toLowerCase().includes(tmdbDirector.name.toLowerCase())) {
                return result;
              }
            }
          }
        }
      }
      
      // Fallback to best match by year
      const exactYearMatch = data.results.find(r => {
        const releaseYear = r.release_date ? parseInt(r.release_date.split('-')[0]) : null;
        return releaseYear === year;
      });
      
      if (exactYearMatch) return exactYearMatch;
      
      // Return first result as last resort
      return data.results[0];
    }
    
    return null;
  } catch (error) {
    console.error(`   ⚠️  TMDB search error for "${title}":`, error.message);
    return null;
  }
}

// Enhance film with full TMDB data
async function enhanceWithTMDB(tmdbId) {
  try {
    const detailsUrl = `${TMDB_BASE_URL}/movie/${tmdbId}?api_key=${TMDB_API_KEY}&append_to_response=credits,keywords`;
    const response = await fetch(detailsUrl);
    
    if (!response.ok) {
      throw new Error(`TMDB API error: ${response.status}`);
    }
    
    const data = await response.json();
    
    // Extract relevant data
    const enhancement = {
      tmdb_id: data.id,
      imdb_id: data.imdb_id,
      original_title: data.original_title,
      synopsis: data.overview || '',
      tmdb_rating: data.vote_average || 0,
      tmdb_vote_count: data.vote_count || 0,
      tmdb_popularity: data.popularity || 0,
      runtime: data.runtime || null,
      genres: data.genres?.map(g => g.name) || [],
      release_date: data.release_date || '',
      poster_path: data.poster_path || '',
      poster_url_tmdb: data.poster_path ? `https://image.tmdb.org/t/p/w500${data.poster_path}` : '',
      backdrop_url: data.backdrop_path ? `https://image.tmdb.org/t/p/w1280${data.backdrop_path}` : '',
      production_companies: data.production_companies?.map(c => c.name) || [],
      production_countries: data.production_countries?.map(c => c.name) || [],
      spoken_languages: data.spoken_languages?.map(l => l.english_name) || [],
      keywords: data.keywords?.keywords?.map(k => k.name) || [],
      cast: data.credits?.cast?.slice(0, 10).map(c => ({
        name: c.name,
        character: c.character,
        order: c.order
      })) || []
    };
    
    // Get director from credits
    const director = data.credits?.crew?.find(person => person.job === 'Director');
    if (director) {
      enhancement.director = director.name;
    }
    
    return enhancement;
  } catch (error) {
    console.error(`   ⚠️  TMDB enhancement error for ID ${tmdbId}:`, error.message);
    return null;
  }
}

// Match and process films
async function processFilms(scrapedFilms, year) {
  console.log(`\n📊 Processing ${scrapedFilms.length} films for Berlin ${year}...`);
  
  // Load existing films.json
  const filmsJsonContent = await fs.readFile(FILMS_JSON_PATH, 'utf8');
  const filmsData = JSON.parse(filmsJsonContent);
  const existingFilms = filmsData.films || {};
  
  // Build lookup maps
  const filmsByTmdbId = new Map();
  const filmsByTitleYear = new Map();
  const existingIds = new Set(Object.keys(existingFilms));
  
  Object.entries(existingFilms).forEach(([id, film]) => {
    if (film.tmdb_id) {
      filmsByTmdbId.set(film.tmdb_id, id);
    }
    const normalizedKey = `${normalizeTitle(film.title)}-${film.year}`;
    filmsByTitleYear.set(normalizedKey, id);
  });
  
  const results = {
    matched: [],
    created: [],
    failed: []
  };
  
  for (let i = 0; i < scrapedFilms.length; i++) {
    const film = scrapedFilms[i];
    console.log(`\n[${i + 1}/${scrapedFilms.length}] ${film.title} (${film.year})`);
    
    let filmId = null;
    let isNewFilm = false;
    
    // Try to match by title + year first
    const normalizedKey = `${normalizeTitle(film.title)}-${film.year}`;
    if (filmsByTitleYear.has(normalizedKey)) {
      filmId = filmsByTitleYear.get(normalizedKey);
      console.log(`   ✅ Matched by title+year to existing ID: ${filmId}`);
      results.matched.push({ id: filmId, title: film.title });
    } else {
      // Search TMDB
      console.log(`   🔍 Searching TMDB...`);
      const tmdbResult = await searchTMDB(film.title, film.year, film.director);
      
      if (tmdbResult) {
        console.log(`   📍 Found on TMDB: "${tmdbResult.title}" (ID: ${tmdbResult.id})`);
        
        // Check if this TMDB ID already exists
        if (filmsByTmdbId.has(tmdbResult.id)) {
          filmId = filmsByTmdbId.get(tmdbResult.id);
          console.log(`   ✅ Matched by TMDB ID to existing film: ${filmId}`);
          results.matched.push({ id: filmId, title: film.title });
        } else {
          // Create new film entry
          console.log(`   ➕ Creating new film entry...`);
          const enhancement = await enhanceWithTMDB(tmdbResult.id);
          
          if (enhancement) {
            // Generate new short code ID
            let newId;
            let attempt = 0;
            do {
              const index = existingIds.size + attempt;
              newId = generateShortCode(index);
              attempt++;
            } while (existingIds.has(newId));
            
            filmId = newId;
            existingIds.add(newId);
            isNewFilm = true;
            
            // Create film entry
            const filmKey = createFilmKey(film.title, film.year);
            const newFilm = {
              id: newId,
              filmKey: filmKey,
              title: film.title,
              year: film.year,
              country: film.country || enhancement.production_countries[0] || '',
              mubiLink: film.mubiLink,
              ...enhancement
            };
            
            existingFilms[newId] = newFilm;
            filmsByTmdbId.set(enhancement.tmdb_id, newId);
            filmsByTitleYear.set(normalizedKey, newId);
            
            console.log(`   ✅ Created new film with ID: ${newId}`);
            results.created.push({ 
              id: newId, 
              title: film.title, 
              tmdb_id: enhancement.tmdb_id 
            });
          } else {
            console.log(`   ❌ Failed to enhance with TMDB data`);
            results.failed.push({ title: film.title, year: film.year, reason: 'Enhancement failed' });
          }
        }
      } else {
        console.log(`   ❌ Not found on TMDB`);
        results.failed.push({ title: film.title, year: film.year, reason: 'Not found on TMDB' });
      }
      
      // Be polite to TMDB API
      await delay(DELAY_MS);
    }
    
    if (filmId) {
      film.id = filmId;
    }
  }
  
  // Save updated films.json if we created new films
  if (results.created.length > 0) {
    filmsData.films = existingFilms;
    filmsData.last_updated = new Date().toISOString();
    filmsData.total_films = Object.keys(existingFilms).length;
    
    await fs.writeFile(FILMS_JSON_PATH, JSON.stringify(filmsData, null, 2));
    console.log(`\n💾 Updated ${FILMS_JSON_PATH} with ${results.created.length} new films`);
  }
  
  return { scrapedFilms, results };
}

// Update festival JSON file
async function updateFestivalFile(year, films) {
  const festivalPath = `data/festivals/${FESTIVAL_NAME}/${year}.json`;
  
  // Create array of ID references
  const idArray = films
    .filter(f => f.id)
    .map(f => ({ id: f.id }));
  
  await fs.writeFile(festivalPath, JSON.stringify(idArray, null, 2));
  console.log(`\n📁 Updated ${festivalPath} with ${idArray.length} film IDs`);
  
  return idArray.length;
}

// Generate summary report
function printSummary(year, results) {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`📊 SUMMARY: Berlin ${year}`);
  console.log('='.repeat(60));
  console.log(`✅ Matched to existing films: ${results.matched.length}`);
  console.log(`➕ New films created: ${results.created.length}`);
  console.log(`❌ Failed to process: ${results.failed.length}`);
  console.log('='.repeat(60));
  
  if (results.created.length > 0) {
    console.log(`\n🆕 New films created:`);
    results.created.forEach(f => {
      console.log(`   ${f.id} - ${f.title} (TMDB: ${f.tmdb_id})`);
    });
  }
  
  if (results.failed.length > 0) {
    console.log(`\n⚠️  Failed films (need manual review):`);
    results.failed.forEach(f => {
      console.log(`   ${f.title} (${f.year}) - ${f.reason}`);
    });
  }
}

// Main function
async function main() {
  const years = [2020, 2021, 2022, 2023, 2024, 2025];
  
  console.log('🎬 Berlin Festival Data Population');
  console.log('='.repeat(60));
  
  const browser = await puppeteer.launch({
    headless: false,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  try {
    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
    
    // Handle cookie consent on first page
    await page.goto(BASE_URL, { waitUntil: 'networkidle2' });
    try {
      await page.waitForTimeout(2000);
      const cookieButton = await page.$('button[data-testid="cookie-consent-button"]');
      if (cookieButton) {
        console.log('🍪 Accepting cookies...');
        await cookieButton.click();
        await page.waitForTimeout(1000);
      }
    } catch (e) {
      // No cookie consent needed
    }
    
    for (const year of years) {
      // Scrape films from MUBI
      const scrapedFilms = await scrapeYear(page, year);
      
      if (scrapedFilms.length === 0) {
        console.log(`⚠️  No films found for ${year}, skipping...`);
        continue;
      }
      
      // Process and match films
      const { results } = await processFilms(scrapedFilms, year);
      
      // Update festival JSON file
      await updateFestivalFile(year, scrapedFilms);
      
      // Print summary
      printSummary(year, results);
      
      if (year !== years[years.length - 1]) {
        console.log(`\n⏳ Waiting before processing next year...`);
        await delay(DELAY_MS);
      }
    }
    
    console.log(`\n${'='.repeat(60)}`);
    console.log('✅ All years processed successfully!');
    console.log('='.repeat(60));
    
  } catch (error) {
    console.error('\n❌ Error during execution:', error);
  } finally {
    await browser.close();
  }
}

// Run the script
main().catch(console.error);

