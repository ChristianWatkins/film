import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import fs from 'fs/promises';

// Use stealth plugin to avoid detection
puppeteer.use(StealthPlugin());

const BASE_URL = 'https://mubi.com/en/awards-and-festivals/venice';
const FESTIVAL_NAME = 'venice'; // Used for folder name
const YEAR = 2024; // Change this to scrape different years
const DELAY_MS = 2500; // 2.5 seconds delay between requests to be polite

// Helper function to delay between requests
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Function to scrape a single page
async function scrapePage(page, pageNumber, year) {
  const url = pageNumber === 1 
    ? `${BASE_URL}?year=${year}`
    : `${BASE_URL}?page=${pageNumber}&year=${year}`;
  
  console.log(`Fetching page ${pageNumber} for year ${year}...`);
  
  try {
    await page.goto(url, { 
      waitUntil: 'networkidle2',
      timeout: 60000 
    });
    
    // Handle cookie consent if on first page
    if (pageNumber === 1) {
      try {
        // Wait a bit for any overlays to appear
        await page.waitForTimeout(2000);
        
        // Try to click the cookie consent button if it exists
        const cookieButton = await page.$('button[data-testid="cookie-consent-button"]');
        if (cookieButton) {
          console.log('Accepting cookies...');
          await cookieButton.click();
          await page.waitForTimeout(1000);
        }
      } catch (e) {
        console.log('No cookie consent found or error clicking it, continuing...');
      }
    }
    
    // Wait for films to load
    await page.waitForSelector('.film-tile', { timeout: 30000 });
    
    // Extract film data from this page
    const films = await page.evaluate(() => {
      const filmElements = document.querySelectorAll('.film-tile');
      return Array.from(filmElements).map(element => {
        // Get the film link element
        const linkElement = element.querySelector('a[href*="/films/"]');
        if (!linkElement) return null;
        
        const href = linkElement.getAttribute('href');
        const fullLink = href.startsWith('http') ? href : `https://mubi.com${href}`;
        
        // Extract title - try multiple selectors
        let title = '';
        const titleElement = element.querySelector('.film-tile__title, .film-title, h3, h2') || 
                           linkElement.querySelector('.film-tile__title, .film-title, h3, h2');
        if (titleElement) {
          title = titleElement.textContent.trim();
        } else {
          // Fallback: extract from link title or href
          title = linkElement.getAttribute('title') || 
                 linkElement.textContent.trim() ||
                 href.split('/films/')[1]?.replace(/-/g, ' ') || 
                 'Unknown Title';
        }
        
        // Extract year from various possible locations
        let year = null;
        const yearText = element.textContent;
        const yearMatch = yearText.match(/\b(19|20)\d{2}\b/);
        if (yearMatch) {
          year = parseInt(yearMatch[0]);
        }
        
        // Extract country - look for country info
        let country = '';
        const countryElement = element.querySelector('.film-tile__country, .country, .film-meta');
        if (countryElement) {
          country = countryElement.textContent.trim();
        }
        
        // Extract director
        let director = '';
        const directorElement = element.querySelector('.film-tile__director, .director, .film-tile__meta');
        if (directorElement) {
          director = directorElement.textContent.trim();
        }
        
        // Check for awards - look for award indicators
        const awarded = !!(element.querySelector('.award, .winner, .prize') || 
                          element.textContent.toLowerCase().includes('winner') ||
                          element.textContent.toLowerCase().includes('award') ||
                          element.textContent.toLowerCase().includes('golden lion') ||
                          element.textContent.toLowerCase().includes('silver lion'));
        
        // Extract specific awards
        const awards = [];
        const awardText = element.textContent.toLowerCase();
        if (awardText.includes('golden lion')) awards.push('Golden Lion');
        if (awardText.includes('silver lion')) awards.push('Silver Lion');
        if (awardText.includes('jury prize')) awards.push('Jury Prize');
        if (awardText.includes('grand jury prize')) awards.push('Grand Jury Prize');
        if (awardText.includes('special jury prize')) awards.push('Special Jury Prize');
        
        return {
          title: title,
          year: year,
          country: country,
          director: director,
          link: fullLink,
          awarded: awarded,
          awards: awards
        };
      }).filter(film => film !== null);
    });
    
    console.log(`Found ${films.length} films on page ${pageNumber}`);
    return films;
    
  } catch (error) {
    console.error(`Error scraping page ${pageNumber}:`, error.message);
    return [];
  }
}

// Function to check if there are more pages
async function hasNextPage(page) {
  try {
    // Look for next page button or pagination
    const nextButton = await page.$('.pagination__next, .next-page, a[rel="next"]');
    if (nextButton) {
      const isDisabled = await page.evaluate(el => {
        return el.disabled || el.classList.contains('disabled') || el.getAttribute('aria-disabled') === 'true';
      }, nextButton);
      return !isDisabled;
    }
    
    // Alternative: check if there are more films by looking at pagination info
    const paginationInfo = await page.$('.pagination, .page-info');
    if (paginationInfo) {
      const text = await page.evaluate(el => el.textContent, paginationInfo);
      // Look for patterns like "Page 1 of 3" or "1-20 of 60"
      if (text.includes('of') && !text.includes('of 1')) {
        return true;
      }
    }
    
    return false;
  } catch (error) {
    return false;
  }
}

// Main scraping function
async function scrapeYear(year) {
  console.log(`Starting to scrape Venice International Film Festival ${year}...`);
  
  const browser = await puppeteer.launch({
    headless: false, // Set to true for production
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  try {
    const page = await browser.newPage();
    
    // Set a user agent to appear more like a real browser
    await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
    
    let allFilms = [];
    let pageNumber = 1;
    let hasMore = true;
    
    while (hasMore && pageNumber <= 10) { // Safety limit of 10 pages
      const films = await scrapePage(page, pageNumber, year);
      
      if (films.length === 0) {
        console.log(`No films found on page ${pageNumber}, stopping.`);
        break;
      }
      
      allFilms = allFilms.concat(films);
      
      // Check if there are more pages
      hasMore = await hasNextPage(page);
      
      if (hasMore) {
        console.log(`Page ${pageNumber} complete, moving to next page...`);
        pageNumber++;
        
        // Be polite and wait between requests
        await delay(DELAY_MS);
      } else {
        console.log(`Page ${pageNumber} was the last page.`);
      }
    }
    
    console.log(`\nScraping complete! Found ${allFilms.length} total films for Venice ${year}`);
    
    // Ensure the directory exists
    await fs.mkdir(`data/festivals/${FESTIVAL_NAME}`, { recursive: true });
    
    // Save to file
    const filename = `data/festivals/${FESTIVAL_NAME}/${year}.json`;
    await fs.writeFile(filename, JSON.stringify(allFilms, null, 2));
    
    console.log(`Data saved to ${filename}`);
    
    // Log some sample films
    if (allFilms.length > 0) {
      console.log('\nSample films:');
      allFilms.slice(0, 3).forEach((film, i) => {
        console.log(`${i + 1}. ${film.title} (${film.year})`);
        console.log(`   Director: ${film.director}`);
        console.log(`   Country: ${film.country}`);
        console.log(`   Awarded: ${film.awarded}`);
        if (film.awards.length > 0) {
          console.log(`   Awards: ${film.awards.join(', ')}`);
        }
        console.log('');
      });
    }
    
  } catch (error) {
    console.error('Error during scraping:', error);
  } finally {
    await browser.close();
  }
}

// Run the scraper
scrapeYear(YEAR).catch(console.error);