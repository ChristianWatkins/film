const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const fs = require('fs').promises;
const path = require('path');
require('dotenv').config({ path: '.env.local' });

puppeteer.use(StealthPlugin());

const TMDB_API_KEY = process.env.TMDB_API_KEY;
const TMDB_BASE_URL = 'https://api.themoviedb.org/3';

if (!TMDB_API_KEY) {
  console.error('❌ TMDB_API_KEY not found');
  process.exit(1);
}

const BASE_URL = 'https://mubi.com/en/awards-and-festivals/venice';
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

async function scrapeFilmsFromPage(page) {
  const films = await page.evaluate(() => {
    const filmLinks = document.querySelectorAll('a[href*="/films/"]');
    
    return Array.from(filmLinks).map(link => {
      const card = link.closest('div');
      if (!card) return null;
      
      const href = link.getAttribute('href');
      const fullLink = href.startsWith('http') ? href : `https://mubi.com${href}`;
      
      const titleElement = card.querySelector('h3');
      const title = titleElement ? titleElement.textContent.trim() : '';
      
      if (!title) return null;
      
      const allText = card.textContent || '';
      
      let year = null;
      const yearMatch = allText.match(/\b(19|20)\d{2}\b/);
      if (yearMatch) {
        year = parseInt(yearMatch[0]);
      }
      
      let director = '';
      const directorElement = card.querySelector('span.css-1vg6q84, span[class*="e1slvksg"]');
      if (directorElement) {
        director = directorElement.textContent.trim();
      }
      
      let country = '';
      const countryElement = card.querySelector('span.css-ahepiu, span[class*="edwgj4f"]');
      if (countryElement) {
        country = countryElement.textContent.trim();
      }
      
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
    }).filter(film => film !== null && film.title && film.year === 2024);
  });
  
  return films;
}

async function getTotalPages(page) {
  return await page.evaluate(() => {
    window.scrollTo(0, document.body.scrollHeight);
    const buttons = Array.from(document.querySelectorAll('button'));
    const paginationButtons = buttons.filter(b => {
      const text = b.textContent.trim();
      return /^\d+$/.test(text) && parseInt(text) <= 100;
    });
    if (paginationButtons.length === 0) return 1;
    const pageNumbers = paginationButtons.map(b => parseInt(b.textContent.trim()));
    const maxPage = Math.max(...pageNumbers);
    return (maxPage > 0 && maxPage <= 100) ? maxPage : 1;
  });
}

async function searchTMDB(title, year, director = '') {
  try {
    const searchUrl = `${TMDB_BASE_URL}/search/movie?api_key=${TMDB_API_KEY}&query=${encodeURIComponent(title)}&year=${year}`;
    const response = await fetch(searchUrl);
    if (!response.ok) throw new Error(`TMDB API error: ${response.status}`);
    const data = await response.json();
    if (data.results && data.results.length > 0) {
      const exactYearMatch = data.results.find(r => {
        const releaseYear = r.release_date ? parseInt(r.release_date.split('-')[0]) : null;
        return releaseYear === year;
      });
      if (exactYearMatch) return exactYearMatch;
      return data.results[0];
    }
    return null;
  } catch (error) {
    console.error(`   ⚠️  TMDB search error:`, error.message);
    return null;
  }
}

async function enhanceWithTMDB(tmdbId) {
  try {
    const detailsUrl = `${TMDB_BASE_URL}/movie/${tmdbId}?api_key=${TMDB_API_KEY}&append_to_response=credits,keywords`;
    const response = await fetch(detailsUrl);
    if (!response.ok) throw new Error(`TMDB API error: ${response.status}`);
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
  
  // Load existing Venice 2024 to check what we already have
  const venice2024Content = await fs.readFile('data/festivals/venice/2024.json', 'utf-8');
  const venice2024Ids = JSON.parse(venice2024Content).map(f => f.id);
  const existingVeniceTitles = new Set();
  venice2024Ids.forEach(id => {
    const film = existingFilms[id];
    if (film) {
      existingVeniceTitles.add(normalizeTitle(film.title));
    }
  });
  
  // Filter out films we already have
  const newFilms = scrapedFilms.filter(film => {
    const normalizedTitle = normalizeTitle(film.title);
    return !existingVeniceTitles.has(normalizedTitle);
  });
  
  console.log(`   ${newFilms.length} new films to add (${scrapedFilms.length - newFilms.length} already in database)\n`);
  
  const results = {
    matched: [],
    created: [],
    failed: []
  };
  
  for (let i = 0; i < newFilms.length; i++) {
    const film = newFilms[i];
    console.log(`\n[${i + 1}/${newFilms.length}] ${film.title} (${film.year})`);
    
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
  
  if (results.created.length > 0 || results.matched.length > 0) {
    filmsData.films = existingFilms;
    filmsData.last_updated = new Date().toISOString();
    filmsData.total_films = Object.keys(existingFilms).length;
    
    await fs.writeFile(FILMS_JSON_PATH, JSON.stringify(filmsData, null, 2));
    console.log(`\n💾 Updated ${FILMS_JSON_PATH}`);
  }
  
  return { scrapedFilms: newFilms, results };
}

async function updateFestivalFile(films) {
  const festivalPath = 'data/festivals/venice/2024.json';
  
  // Load existing
  const existingContent = await fs.readFile(festivalPath, 'utf-8');
  const existingIds = new Set(JSON.parse(existingContent).map(f => f.id));
  
  // Add new films
  films.forEach(f => {
    if (f.id) {
      existingIds.add(f.id);
    }
  });
  
  const idArray = Array.from(existingIds).map(id => ({ id }));
  
  await fs.writeFile(festivalPath, JSON.stringify(idArray, null, 2));
  console.log(`\n📁 Updated ${festivalPath} with ${idArray.length} film IDs`);
  
  return idArray.length;
}

async function main() {
  console.log('🎬 Adding Missing Venice 2024 Films from MUBI');
  console.log('='.repeat(60));
  
  const browser = await puppeteer.launch({
    headless: false,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  try {
    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
    
    // Start from page 2 (page 1 might not work)
    console.log('📄 Scraping pages 2-5...');
    const page2Url = `${BASE_URL}?page=2&year=2024`;
    await page.goto(page2Url, { waitUntil: 'networkidle2', timeout: 60000 });
    await page.waitForSelector('a[href*="/films/"]', { timeout: 30000 });
    await delay(1500);
    
    const totalPages = await getTotalPages(page);
    console.log(`   Found ${totalPages} total pages\n`);
    
    let allFilms = [];
    
    // Scrape pages 2-5
    for (let pageNum = 2; pageNum <= totalPages && pageNum <= 5; pageNum++) {
      console.log(`📄 Scraping page ${pageNum}/${totalPages}...`);
      
      if (pageNum > 2) {
        const pageUrl = `${BASE_URL}?year=2024&page=${pageNum}`;
        await page.goto(pageUrl, { waitUntil: 'networkidle2', timeout: 60000 });
        await page.waitForSelector('a[href*="/films/"]', { timeout: 30000 });
        await delay(1000);
      }
      
      const films = await scrapeFilmsFromPage(page);
      console.log(`   Found ${films.length} films from 2024`);
      allFilms = allFilms.concat(films);
      
      if (pageNum < totalPages) {
        await delay(DELAY_MS);
      }
    }
    
    // Deduplicate
    const uniqueFilms = [];
    const seenTitles = new Set();
    allFilms.forEach(film => {
      const normalizedTitle = normalizeTitle(film.title);
      if (!seenTitles.has(normalizedTitle)) {
        seenTitles.add(normalizedTitle);
        uniqueFilms.push(film);
      }
    });
    
    console.log(`\n📊 Found ${uniqueFilms.length} unique films from MUBI pages 2-5\n`);
    
    // Process films
    const { results } = await processFilms(uniqueFilms);
    
    // Update festival file
    await updateFestivalFile(uniqueFilms);
    
    // Print summary
    console.log(`\n${'='.repeat(60)}`);
    console.log(`📊 SUMMARY: Venice 2024 (MUBI pages 2-5)`);
    console.log('='.repeat(60));
    console.log(`✅ Matched to existing films: ${results.matched.length}`);
    console.log(`➕ New films created: ${results.created.length}`);
    console.log(`❌ Failed to process: ${results.failed.length}`);
    console.log('='.repeat(60));
    
    if (results.failed.length > 0 && results.failed.length < 20) {
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

