const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const fs = require('fs').promises;
const path = require('path');
require('dotenv').config({ path: '.env.local' });

puppeteer.use(StealthPlugin());

const TMDB_API_KEY = process.env.TMDB_API_KEY;
const TMDB_BASE_URL = 'https://api.themoviedb.org/3';

if (!TMDB_API_KEY) {
  console.error('❌ TMDB_API_KEY not found in environment variables');
  process.exit(1);
}

const COMPETITION_URL = 'https://www.labiennale.org/en/cinema/2024/venezia-81-competition';
const OUT_OF_COMPETITION_URL = 'https://www.labiennale.org/en/cinema/2024/out-competition';
const ORIZZONTI_URL = 'https://www.labiennale.org/en/cinema/2024/orizzonti';
const DELAY_MS = 2000;
const FILMS_JSON_PATH = 'data/films.json';

const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

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

// Scrape films from Venice official page
async function scrapeVenicePage(page, url) {
  console.log(`\n📄 Scraping: ${url}`);
  
  await page.goto(url, { 
    waitUntil: 'networkidle2',
    timeout: 60000 
  });
  
  await delay(2000);
  
  const films = await page.evaluate(() => {
    const films = [];
    
    // Find all film entries - they're in sections with "Read more" links
    const readMoreLinks = Array.from(document.querySelectorAll('a[href*="/cinema/2024/"]'));
    
    readMoreLinks.forEach(link => {
      // Get the parent container
      const container = link.closest('div') || link.parentElement;
      if (!container) return;
      
      // Extract title - usually in an h2 or h3, or the link text itself
      let title = '';
      const titleElement = container.querySelector('h2, h3, h4, .title, [class*="title"]');
      if (titleElement) {
        title = titleElement.textContent.trim();
      } else {
        // Try to get from the link or nearby text
        const linkText = link.textContent.trim();
        if (linkText && linkText.length > 3) {
          title = linkText;
        }
      }
      
      // Extract director - look for "Director" label
      let director = '';
      const containerText = container.textContent || '';
      const directorMatch = containerText.match(/Director\s+([^\n\r]+)/i);
      if (directorMatch) {
        director = directorMatch[1].trim();
        // Clean up director name (remove country/year info)
        director = director.split('/')[0].trim();
        director = director.split(/\s+Main\s+Cast/i)[0].trim();
      }
      
      // Extract country - look for country names after director
      let country = '';
      const countryMatch = containerText.match(/\/\s*([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)\s*\/\s*\d+['']/);
      if (countryMatch) {
        country = countryMatch[1].trim();
      } else {
        // Try alternative pattern
        const altMatch = containerText.match(/\b(Italy|France|USA|United States|United Kingdom|Spain|Germany|Japan|South Korea|China|Brazil|Argentina|Mexico|Canada|Norway|Sweden|Denmark|Finland|Poland|Russia|India|Australia|New Zealand|South Africa|Egypt|Turkey|Iran|Israel|Lebanon|Palestine|Georgia|Romania|Hungary|Czech Republic|Greece|Portugal|Belgium|Netherlands|Switzerland|Austria|Ireland|Iceland)\b/);
        if (altMatch) {
          country = altMatch[1];
        }
      }
      
      // Extract year - should be 2024
      const year = 2024;
      
      if (title && title.length > 1) {
        films.push({
          title: title,
          year: year,
          director: director || null,
          country: country || null,
          mubiLink: null, // Not from MUBI
          awarded: false
        });
      }
    });
    
    // Also try to find films by looking for film titles in headings
    const headings = Array.from(document.querySelectorAll('h1, h2, h3, h4, h5, h6'));
    headings.forEach(heading => {
      const text = heading.textContent.trim();
      // Skip if it's a section header
      if (text.includes('Competition') || text.includes('Out of Competition') || 
          text.includes('Director') || text.length < 3) return;
      
      // Filter out navigation elements and non-film titles
      const skipPatterns = [
        'competition', 'out of competition', 'screening schedule', 'venice immersive',
        'introduction by', 'technical specifications', 'venice production bridge',
        'classici fuori mostra', 'accreditation', 'services for', 'information',
        'contact us', 'newsletter', 'follow us', 'la biennale', 'venezia 81',
        'menu', 'skip to', 'your are here', 'what\'s on', 'departments',
        'biennale cinema', 'festival', 'line-up', 'archive', 'regulations',
        'biennale college', 'when and where', 'tickets', 'faq', 'press',
        'special screenings', 'non fiction', 'series', 'disclaimer'
      ];
      
      const textLower = text.toLowerCase();
      const shouldSkip = skipPatterns.some(pattern => textLower.includes(pattern));
      
      // Check if this looks like a film title (not too long, has some structure)
      if (!shouldSkip && text.length > 3 && text.length < 100 && !text.includes('©')) {
        // Check if we already have this title
        if (!films.find(f => f.title.toLowerCase() === text.toLowerCase())) {
          // Try to find director nearby
          let director = '';
          let country = '';
          const nextSibling = heading.nextElementSibling;
          if (nextSibling) {
            const siblingText = nextSibling.textContent || '';
            const dirMatch = siblingText.match(/Director\s+([^\n\r]+)/i);
            if (dirMatch) {
              director = dirMatch[1].trim().split('/')[0].trim();
            }
            const countryMatch = siblingText.match(/\b(Italy|France|USA|United States|United Kingdom|Spain|Germany|Japan)\b/);
            if (countryMatch) {
              country = countryMatch[1];
            }
          }
          
          films.push({
            title: text,
            year: 2024,
            director: director || null,
            country: country || null,
            mubiLink: null,
            awarded: false
          });
        }
      }
    });
    
    return films.filter((film, index, self) => 
      index === self.findIndex(f => f.title.toLowerCase() === film.title.toLowerCase())
    );
  });
  
  console.log(`   Found ${films.length} films`);
  return films;
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
      // Try exact year match first
      const exactYearMatch = data.results.find(r => {
        const releaseYear = r.release_date ? parseInt(r.release_date.split('-')[0]) : null;
        return releaseYear === year;
      });
      
      if (exactYearMatch) return exactYearMatch;
      
      // Return first result as fallback
      return data.results[0];
    }
    
    return null;
  } catch (error) {
    console.error(`   ⚠️  TMDB search error:`, error.message);
    return null;
  }
}

// Enhance film with TMDB data
async function enhanceWithTMDB(tmdbId) {
  try {
    const detailsUrl = `${TMDB_BASE_URL}/movie/${tmdbId}?api_key=${TMDB_API_KEY}&append_to_response=credits,keywords`;
    const response = await fetch(detailsUrl);
    
    if (!response.ok) {
      throw new Error(`TMDB API error: ${response.status}`);
    }
    
    const data = await response.json();
    
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
    
    const director = data.credits?.crew?.find(person => person.job === 'Director');
    if (director) {
      enhancement.director = director.name;
    }
    
    return enhancement;
  } catch (error) {
    console.error(`   ⚠️  TMDB enhancement error:`, error.message);
    return null;
  }
}

// Process films
async function processFilms(scrapedFilms) {
  console.log(`\n📊 Processing ${scrapedFilms.length} films...`);
  
  const filmsJsonContent = await fs.readFile(FILMS_JSON_PATH, 'utf8');
  const filmsData = JSON.parse(filmsJsonContent);
  const existingFilms = filmsData.films || {};
  
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
    
    // Try to match by title + year
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
        
        if (filmsByTmdbId.has(tmdbResult.id)) {
          filmId = filmsByTmdbId.get(tmdbResult.id);
          console.log(`   ✅ Matched by TMDB ID to existing film: ${filmId}`);
          results.matched.push({ id: filmId, title: film.title });
        } else {
          console.log(`   ➕ Creating new film entry...`);
          const enhancement = await enhanceWithTMDB(tmdbResult.id);
          
          if (enhancement) {
            let newId;
            let attempt = 0;
            do {
              const index = existingIds.size + attempt;
              newId = generateShortCode(index);
              attempt++;
            } while (existingIds.has(newId));
            
            filmId = newId;
            existingIds.add(newId);
            
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
      
      await delay(DELAY_MS);
    }
    
    if (filmId) {
      film.id = filmId;
    }
  }
  
  if (results.created.length > 0) {
    filmsData.films = existingFilms;
    filmsData.last_updated = new Date().toISOString();
    filmsData.total_films = Object.keys(existingFilms).length;
    
    await fs.writeFile(FILMS_JSON_PATH, JSON.stringify(filmsData, null, 2));
    console.log(`\n💾 Updated ${FILMS_JSON_PATH} with ${results.created.length} new films`);
  }
  
  return { scrapedFilms, results };
}

// Update festival file
async function updateFestivalFile(films) {
  const festivalPath = 'data/festivals/venice/2024.json';
  
  const idArray = films
    .filter(f => f.id)
    .map(f => ({ id: f.id }));
  
  await fs.writeFile(festivalPath, JSON.stringify(idArray, null, 2));
  console.log(`\n📁 Updated ${festivalPath} with ${idArray.length} film IDs`);
  
  return idArray.length;
}

async function main() {
  console.log('🎬 Venice 2024 Official Website Scraper');
  console.log('='.repeat(60));
  
  const browser = await puppeteer.launch({
    headless: false,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  try {
    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
    
    // Scrape competition films
    const competitionFilms = await scrapeVenicePage(page, COMPETITION_URL);
    await delay(DELAY_MS);
    
    // Scrape out of competition films
    const outOfCompetitionFilms = await scrapeVenicePage(page, OUT_OF_COMPETITION_URL);
    await delay(DELAY_MS);
    
    // Scrape Orizzonti films
    const orizzontiFilms = await scrapeVenicePage(page, ORIZZONTI_URL);
    
    // Combine and deduplicate
    const allFilms = [...competitionFilms, ...outOfCompetitionFilms, ...orizzontiFilms];
    const uniqueFilms = [];
    const seenTitles = new Set();
    
    allFilms.forEach(film => {
      const normalizedTitle = normalizeTitle(film.title);
      if (!seenTitles.has(normalizedTitle)) {
        seenTitles.add(normalizedTitle);
        uniqueFilms.push(film);
      }
    });
    
    console.log(`\n📊 Total unique films found: ${uniqueFilms.length}`);
    
    // Process films
    const { results } = await processFilms(uniqueFilms);
    
    // Update festival file
    await updateFestivalFile(uniqueFilms);
    
    // Print summary
    console.log(`\n${'='.repeat(60)}`);
    console.log(`📊 SUMMARY: Venice 2024`);
    console.log('='.repeat(60));
    console.log(`✅ Matched to existing films: ${results.matched.length}`);
    console.log(`➕ New films created: ${results.created.length}`);
    console.log(`❌ Failed to process: ${results.failed.length}`);
    console.log('='.repeat(60));
    
    if (results.failed.length > 0) {
      console.log(`\n⚠️  Failed films:`);
      results.failed.forEach(f => {
        console.log(`   ${f.title} (${f.year}) - ${f.reason}`);
      });
    }
    
  } catch (error) {
    console.error('\n❌ Error:', error);
  } finally {
    await browser.close();
  }
}

main().catch(console.error);

