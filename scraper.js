import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import fs from 'fs/promises';

// Use stealth plugin to avoid detection
puppeteer.use(StealthPlugin());

const BASE_URL = 'https://mubi.com/en/awards-and-festivals/cannes';
const FESTIVAL_NAME = 'cannes'; // Used for folder name
const YEAR = 2025;
const DELAY_MS = 2500; // 2.5 seconds delay between requests to be polite

// Helper function to delay between requests
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Function to scrape a single page
async function scrapePage(page, pageNumber, year) {
  const url = `${BASE_URL}?page=${pageNumber}&year=${year}`;
  
  console.log(`Fetching page ${pageNumber} for year ${year}...`);
  
  try {
    await page.goto(url, { 
      waitUntil: 'networkidle2',
      timeout: 60000 
    });
    
    // Handle cookie consent if on first page
    if (pageNumber === 1) {
      try {
        await page.waitForSelector('button', { timeout: 3000 });
        const acceptButton = await page.$('button::-p-text(Accept All)');
        if (acceptButton) {
          await acceptButton.click();
          console.log('  Accepted cookies');
          await delay(1000);
        }
      } catch (e) {
        // Cookie dialog might not appear
      }
    }
    
    // Wait for content to load
    await delay(3000);
    
    // Extract film data
    const films = await page.evaluate(() => {
      const results = [];
      const processedFilmIds = new Set();
      
      // Find all film tile links
      const filmTileLinks = document.querySelectorAll('a[data-testid="film-tile-link"]');
      
      filmTileLinks.forEach(link => {
        const href = link.getAttribute('href');
        if (!href) return;
        
        // Extract film ID from URL
        const filmMatch = href.match(/\/films\/([^/?]+)/);
        if (!filmMatch) return;
        
        const filmSlug = filmMatch[1];
        if (processedFilmIds.has(filmSlug)) return;
        processedFilmIds.add(filmSlug);
        
        // Get the parent container (grandparent of the link)
        const container = link.parentElement?.parentElement;
        if (!container) return;
        
        // Extract title from h3
        const titleEl = container.querySelector('h3');
        let title = titleEl ? titleEl.textContent.trim() : null;
        
        // If no title from h3, try img alt
        if (!title) {
          const img = container.querySelector('img');
          title = img?.alt?.trim() || null;
        }
        
        if (!title || title.length === 0) return;
        
        // Clean title
        title = title.replace(/\s+/g, ' ').trim();
        
        // Extract director, country, and year from the director-and-year div
        const directorYearDiv = container.querySelector('[data-testid="director-and-year"]');
        
        let director = null;
        let country = null;
        let filmYear = null;
        
        if (directorYearDiv) {
          // Director is in span with font-weight="700"
          const directorEl = directorYearDiv.querySelector('span[font-weight="700"]');
          if (directorEl) {
            director = directorEl.textContent.trim();
          }
          
          // Country is typically in a span with specific class containing director-and-year info
          // It's usually the second span or has a specific class
          const allSpans = Array.from(directorYearDiv.querySelectorAll('span'));
          
          // Find country by looking for span that's not the director and contains text
          for (const span of allSpans) {
            const text = span.textContent.trim();
            // Country is typically a capitalized word/phrase that's not the year and not the director
            if (span !== directorEl && text.length > 2 && text.length < 50 && 
                !text.match(/^\d{4}$/) && text !== director) {
              // Check if it looks like a country name (starts with capital letter)
              if (text.match(/^[A-Z]/)) {
                country = text;
                break;
              }
            }
          }
          
          // Year is usually at the end
          const yearMatch = directorYearDiv.textContent.match(/\b(19|20)\d{2}\b/);
          if (yearMatch) {
            filmYear = parseInt(yearMatch[0]);
          }
        }
        
        // Build full URL
        const fullUrl = href.startsWith('http') ? href : `https://mubi.com${href}`;
        
        // Check for awards - MUBI shows awards as small badges/labels
        let awarded = false;
        const awards = [];
        
        // Look for award badges in the film card
        // Awards appear as small labels/badges, often before the title or in metadata
        const cardWrapper = container.closest('li, [class*="film"]') || container.parentElement;
        
        if (cardWrapper) {
          // Try to find award elements by looking for small text elements
          // that contain award keywords
          const allTextElements = cardWrapper.querySelectorAll('span, div, p, [class*="badge"], [class*="label"], [class*="tag"]');
          
          allTextElements.forEach(el => {
            const text = el.textContent.trim();
            const lowerText = text.toLowerCase();
            
            // Check if this element contains award text
            // Common festival awards: Palme d'Or, Golden Bear, Golden Lion, etc.
            const awardKeywords = [
              "palme d'or",
              'grand prix',
              'jury prize',
              'golden bear',
              'silver bear',
              'golden lion',
              'silver lion',
              'best director',
              'best actor', 'best actress',
              'best screenplay',
              "camera d'or",
              'short film',
              'special jury prize',
              'prix',
              'winner',
              'award'
            ];
            
            const containsAward = awardKeywords.some(keyword => lowerText.includes(keyword));
            
            // If it's a small text element (likely a badge) and contains award keywords
            // Must be SHORT (just the award name, not concatenated with other text)
            if (containsAward && text.length > 2 && text.length < 30) {
              awarded = true;
              // Clean up the award text
              const cleanAward = text.replace(/\s+/g, ' ').trim();
              
              // Skip if it contains numbers (year) or looks concatenated (too many caps)
              const hasYear = /\d{4}/.test(cleanAward);
              const tooManyCaps = (cleanAward.match(/[A-Z]/g) || []).length > 5;
              
              if (!hasYear && !tooManyCaps && !awards.includes(cleanAward)) {
                awards.push(cleanAward);
              }
            }
          });
        }
        
        results.push({
          title,
          year: filmYear || null,
          country,
          director,
          link: fullUrl,
          awarded,
          awards
        });
      });
      
      return results;
    });
    
    console.log(`  Found ${films.length} films`);
    
    // Check if there's a next page
    const hasNextPage = await page.evaluate((currentPage) => {
      const links = Array.from(document.querySelectorAll('a[href*="page="]'));
      return links.some(link => {
        const match = link.href.match(/page=(\d+)/);
        return match && parseInt(match[1]) > currentPage;
      });
    }, pageNumber);
    
    return { films, hasNextPage };
  } catch (error) {
    console.error(`Error fetching page ${pageNumber}:`, error.message);
    return { films: [], hasNextPage: false };
  }
}

// Main scraping function
async function scrapeCannes(targetYear) {
  console.log(`Starting to scrape MUBI Cannes ${targetYear} data...`);
  console.log('Launching browser...\n');
  
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  const page = await browser.newPage();
  await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
  await page.setViewport({ width: 1920, height: 1080 });
  
  let allFilms = [];
  let currentPage = 1;
  let hasMorePages = true;
  
  try {
    while (hasMorePages && currentPage <= 50) {
      const { films, hasNextPage } = await scrapePage(page, currentPage, targetYear);
      
      if (films.length > 0) {
        allFilms = allFilms.concat(films);
      } else {
        console.log(`  No films found, stopping pagination.`);
        break;
      }
      
      hasMorePages = hasNextPage;
      
      if (hasMorePages) {
        console.log(`  Waiting ${DELAY_MS}ms before next page...\n`);
        await delay(DELAY_MS);
        currentPage++;
      }
    }
    
    console.log(`\n✓ Total films scraped: ${allFilms.length}`);
    
    // Remove duplicates based on link
    const uniqueFilms = [];
    const seenLinks = new Set();
    
    allFilms.forEach(film => {
      if (!seenLinks.has(film.link)) {
        seenLinks.add(film.link);
        uniqueFilms.push(film);
      }
    });
    
    if (uniqueFilms.length < allFilms.length) {
      console.log(`✓ Removed ${allFilms.length - uniqueFilms.length} duplicates`);
    }
    
    if (uniqueFilms.length === 0) {
      console.log(`\n⚠️  No films found for year ${targetYear}.`);
      console.log(`This likely means Cannes ${targetYear} hasn't happened yet.`);
    }
    
    // Ensure data directory exists
    try {
      await fs.mkdir(`data/festivals/${FESTIVAL_NAME}`, { recursive: true });
    } catch (e) {
      // Directory might already exist
    }
    
    // Save to JSON file in new structure
    const outputFile = `data/festivals/${FESTIVAL_NAME}/${targetYear}.json`;
    await fs.writeFile(
      outputFile,
      JSON.stringify(uniqueFilms, null, 2),
      'utf-8'
    );
    
    console.log(`\n✓ Data saved to ${outputFile}`);
    
    // Print summary
    const awardedFilms = uniqueFilms.filter(f => f.awarded);
    const filmsWithDirector = uniqueFilms.filter(f => f.director);
    const filmsWithCountry = uniqueFilms.filter(f => f.country);
    
    console.log(`\n📊 Summary:`);
    console.log(`  Total films: ${uniqueFilms.length}`);
    console.log(`  Awarded films: ${awardedFilms.length}`);
    console.log(`  Films with director info: ${filmsWithDirector.length}`);
    console.log(`  Films with country info: ${filmsWithCountry.length}`);
    
    // Show first few examples
    if (uniqueFilms.length > 0) {
      console.log(`\n📽️  Sample films:`);
      uniqueFilms.slice(0, 3).forEach((film, idx) => {
        console.log(`  ${idx + 1}. ${film.title}`);
        if (film.director) console.log(`     Director: ${film.director}`);
        if (film.country) console.log(`     Country: ${film.country}`);
        if (film.year) console.log(`     Year: ${film.year}`);
        if (film.awarded) console.log(`     ⭐ Awarded`);
        console.log();
      });
    }
    
    return uniqueFilms.length > 0;
    
  } finally {
    await browser.close();
  }
}

// Run the scraper
(async () => {
  try {
    const hasData = await scrapeCannes(YEAR);
    
    if (!hasData) {
      console.log(`\n💡 Tip: Cannes 2025 hasn't occurred yet. Try changing YEAR to 2024 in scraper.js for actual data.`);
    }
  } catch (error) {
    console.error('\n❌ Scraping failed:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
})();
