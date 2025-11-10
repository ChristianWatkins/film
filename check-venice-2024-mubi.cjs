const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const fs = require('fs').promises;
const path = require('path');

puppeteer.use(StealthPlugin());

const BASE_URL = 'https://mubi.com/en/awards-and-festivals/venice';
const DELAY_MS = 2000;

const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Scrape films from a single page
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

// Get total pages
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

async function main() {
  console.log('🔍 Checking MUBI Venice 2024 for missing films...\n');
  
  const browser = await puppeteer.launch({
    headless: false,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  try {
    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
    
    // Load existing Venice 2024 films
    const venice2024Content = await fs.readFile('data/festivals/venice/2024.json', 'utf-8');
    const venice2024Ids = JSON.parse(venice2024Content).map(f => f.id);
    
    const filmsData = JSON.parse(await fs.readFile('data/films.json', 'utf-8'));
    const existingTitles = new Set();
    venice2024Ids.forEach(id => {
      const film = filmsData.films[id];
      if (film) {
        existingTitles.add(film.title.toLowerCase().trim());
      }
    });
    
    console.log(`📊 Currently have ${venice2024Ids.length} films in Venice 2024\n`);
    
    // Try page 2 first (user said page 1 might not work)
    console.log('📄 Checking page 2...');
    const page2Url = `${BASE_URL}?page=2&year=2024`;
    await page.goto(page2Url, { waitUntil: 'networkidle2', timeout: 60000 });
    await page.waitForSelector('a[href*="/films/"]', { timeout: 30000 });
    await delay(1500);
    
    const totalPages = await getTotalPages(page);
    console.log(`   Found ${totalPages} total pages\n`);
    
    let allMubiFilms = [];
    
    // Scrape all pages starting from page 2
    for (let pageNum = 2; pageNum <= totalPages && pageNum <= 10; pageNum++) {
      console.log(`📄 Scraping page ${pageNum}/${totalPages}...`);
      
      if (pageNum > 2) {
        const pageUrl = `${BASE_URL}?year=2024&page=${pageNum}`;
        await page.goto(pageUrl, { waitUntil: 'networkidle2', timeout: 60000 });
        await page.waitForSelector('a[href*="/films/"]', { timeout: 30000 });
        await delay(1000);
      }
      
      const films = await scrapeFilmsFromPage(page);
      console.log(`   Found ${films.length} films from 2024`);
      allMubiFilms = allMubiFilms.concat(films);
      
      if (pageNum < totalPages) {
        await delay(DELAY_MS);
      }
    }
    
    // Deduplicate
    const uniqueMubiFilms = [];
    const seenTitles = new Set();
    allMubiFilms.forEach(film => {
      const normalizedTitle = film.title.toLowerCase().trim();
      if (!seenTitles.has(normalizedTitle)) {
        seenTitles.add(normalizedTitle);
        uniqueMubiFilms.push(film);
      }
    });
    
    console.log(`\n📊 Found ${uniqueMubiFilms.length} unique films on MUBI (pages 2+)`);
    
    // Find missing films
    const missingFilms = uniqueMubiFilms.filter(film => {
      const normalizedTitle = film.title.toLowerCase().trim();
      return !existingTitles.has(normalizedTitle);
    });
    
    console.log(`\n🔍 Missing films: ${missingFilms.length}`);
    if (missingFilms.length > 0) {
      console.log('\nFilms on MUBI but not in our database:');
      missingFilms.forEach(film => {
        console.log(`  - ${film.title} (${film.year}) - Director: ${film.director || 'N/A'}`);
      });
    } else {
      console.log('\n✅ All MUBI films are already in our database!');
    }
    
  } catch (error) {
    console.error('\n❌ Error:', error.message);
  } finally {
    await browser.close();
  }
}

main().catch(console.error);

