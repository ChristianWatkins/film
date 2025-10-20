import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import fs from 'fs/promises';
import path from 'path';

// Use stealth plugin to avoid detection
puppeteer.use(StealthPlugin());

const FESTIVALS_DIR = 'data/festivals';
const DELAY_MS = 2000; // 2 seconds delay between detailed scrapes

// Helper function to delay between requests
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Function to scrape detailed information from a film page
async function scrapeFilmDetails(page, filmUrl) {
  try {
    console.log(`    Fetching details from: ${filmUrl}`);
    
    await page.goto(filmUrl, { 
      waitUntil: 'networkidle2',
      timeout: 60000 
    });

    // Extract detailed film information
    const details = await page.evaluate(() => {
      let synopsis = '';
      let genres = [];
      let runtime = '';
      let cast = [];

      // Get synopsis - look for h2 with "SYNOPSIS" text
      const h2Elements = document.querySelectorAll('h2');
      let synopsisH2 = null;
      for (let h2 of h2Elements) {
        if (h2.textContent.includes('SYNOPSIS')) {
          synopsisH2 = h2;
          break;
        }
      }
      
      if (synopsisH2) {
        let nextEl = synopsisH2.nextElementSibling;
        while (nextEl && nextEl.tagName !== 'H2') {
          if (nextEl.tagName === 'P' && nextEl.textContent.trim()) {
            synopsis = nextEl.textContent.trim();
            break;
          }
          nextEl = nextEl.nextElementSibling;
        }
      }

      // Alternative: look for common synopsis patterns in paragraphs
      if (!synopsis) {
        const paragraphs = document.querySelectorAll('p');
        for (let p of paragraphs) {
          const text = p.textContent.trim();
          // Look for paragraphs that seem like synopsis (longer text, story-like)
          if (text.length > 50 && 
              (text.includes('struggling') || text.includes('follows') || 
               text.includes('story') || text.includes('young') ||
               text.includes('after') || text.includes('when'))) {
            synopsis = text;
            break;
          }
        }
      }

      // Get genre from the film metadata - try multiple approaches
      let allText = document.body.textContent || '';
      
      // Look for genre information in various places
      const genreSelectors = [
        '.genre', '.genres', '[data-testid="genre"]', '.film-genre',
        '.metadata', '.film-info', '.details', '.info'
      ];
      
      let metaTexts = [];
      
      // Try specific selectors first
      genreSelectors.forEach(selector => {
        const els = document.querySelectorAll(selector);
        els.forEach(el => {
          if (el.textContent.trim()) {
            metaTexts.push(el.textContent.trim());
          }
        });
      });
      
      // Look for paragraphs with metadata patterns
      const paragraphs = document.querySelectorAll('p');
      for (let p of paragraphs) {
        const text = p.textContent.trim();
        if (text.includes('Directed by') || 
            text.includes('Genre') || 
            text.includes('Runtime') ||
            /\b(19|20)\d{2}\b/.test(text)) {
          metaTexts.push(text);
        }
      }
      
      // Also check all text elements for standalone genres
      const allElements = document.querySelectorAll('*');
      allElements.forEach(element => {
        // Skip elements with children (we want leaf text nodes)
        if (element.children.length === 0) {
          const text = element.textContent?.trim();
          // Check if text exactly matches a genre
          if (text && text.match(/^(Drama|Comedy|Thriller|Horror|Action|Romance|Documentary|Animation|Fantasy|Science Fiction|Sci-Fi|Mystery|Crime|Adventure|Family|Western|Musical|War|History|Biography|Sport)$/i)) {
            metaTexts.push(text);
            console.log('Found standalone genre:', text);
          }
        }
      });
      
      // Also check spans and divs that might contain genre info
      const spans = document.querySelectorAll('span, div');
      spans.forEach(element => {
        const text = element.textContent.trim();
        // Look for colored badges/tags (like the purple "Documentary" badge)
        const style = window.getComputedStyle(element);
        const hasColoredBackground = style.backgroundColor !== 'rgba(0, 0, 0, 0)' && style.backgroundColor !== 'transparent';
        
        if (text.match(/^(Drama|Comedy|Thriller|Horror|Action|Romance|Documentary|Animation|Fantasy|Science Fiction|Sci-Fi|Mystery|Crime|Adventure|Family|Western|Musical|War|History|Biography|Sport|Short|Feature)$/i)) {
          metaTexts.push(text);
          console.log('Found potential genre badge:', text, 'hasColoredBG:', hasColoredBackground);
        }
        
        // Also check if it's a small standalone text that could be a genre
        if (text.length < 15 && text.length > 3 && hasColoredBackground) {
          const genreWords = ['drama', 'comedy', 'thriller', 'horror', 'action', 'romance', 'documentary', 'animation', 'fantasy', 'sci-fi', 'mystery', 'crime', 'adventure', 'family', 'western', 'musical', 'war', 'history', 'biography', 'sport'];
          if (genreWords.some(genre => text.toLowerCase().includes(genre))) {
            metaTexts.push(text);
            console.log('Found colored genre element:', text);
          }
        }
      });
      
      // Look for genres in all collected metadata
      const genrePatterns = [
        /\bDrama\b/gi, /\bComedy\b/gi, /\bThriller\b/gi, /\bHorror\b/gi, /\bAction\b/gi,
        /\bRomance\b/gi, /\bDocumentary\b/gi, /\bAnimation\b/gi, /\bFantasy\b/gi,
        /\bScience Fiction\b/gi, /\bSci-Fi\b/gi, /\bMystery\b/gi, /\bCrime\b/gi, 
        /\bAdventure\b/gi, /\bFamily\b/gi, /\bWestern\b/gi, /\bMusical\b/gi, 
        /\bWar\b/gi, /\bHistory\b/gi, /\bBiography\b/gi, /\bSport\b/gi
      ];
      
      metaTexts.forEach(metaText => {
        genrePatterns.forEach(pattern => {
          const matches = metaText.match(pattern);
          if (matches) {
            matches.forEach(match => {
              const genre = match.trim().toLowerCase();
              if (!genres.includes(genre)) {
                genres.push(genre);
              }
            });
          }
        });
      });
      
      // If still no genres found, try to infer from synopsis
      if (genres.length === 0 && synopsis) {
        const synopsisGenres = {
          'documentary': /documentary|documents|footage|archive/i,
          'drama': /emotional|relationship|family|life|personal|struggle/i,
          'thriller': /suspense|tension|dangerous|chase|hunt/i,
          'horror': /terror|fear|scary|nightmare|haunted/i,
          'comedy': /funny|humor|laugh|comic|amusing/i,
          'action': /fight|battle|war|explosive|chase|combat/i,
          'romance': /love|romantic|relationship|couple|heart/i
        };
        
        Object.entries(synopsisGenres).forEach(([genre, pattern]) => {
          if (pattern.test(synopsis) && !genres.includes(genre)) {
            genres.push(genre);
          }
        });
      }

      // Get runtime if available
      const runtimeEl = document.querySelector('.runtime, [data-testid="runtime"]');
      if (runtimeEl) {
        runtime = runtimeEl.textContent.trim();
      }
      
      // If runtime not found, look for number near clock icon or standalone
      if (!runtime) {
        // Look for elements that might contain runtime as just a number
        const allElements = document.querySelectorAll('*');
        allElements.forEach(element => {
          if (element.children.length === 0) {
            const text = element.textContent?.trim();
            // Look for standalone numbers that could be runtime (60-300 minutes)
            if (text && /^\d{2,3}$/.test(text)) {
              const num = parseInt(text);
              if (num >= 60 && num <= 300) {
                // Check if there's a clock-like symbol nearby or if it's in a context suggesting runtime
                const parent = element.parentElement;
                const siblings = parent ? Array.from(parent.children) : [];
                const hasClockContext = siblings.some(el => 
                  el.textContent?.includes('⏰') || 
                  el.textContent?.includes('🕐') ||
                  el.innerHTML?.includes('clock') ||
                  el.className?.includes('time')
                );
                
                if (hasClockContext || !runtime) {
                  runtime = text;
                  console.log('Found potential runtime:', text);
                }
              }
            }
          }
        });
      }

      // Get main cast - look for links to cast members
      const castLinks = document.querySelectorAll('a[href*="/cast/"]');
      castLinks.forEach((link, index) => {
        if (index < 5) { // Limit to first 5 cast members
          const name = link.textContent.trim();
          // Filter out crew roles by looking for common crew keywords
          const crewKeywords = ['DIRECTOR', 'SCREENPLAY', 'CINEMATOGRAPHY', 'MUSIC', 'PRODUCER', 'EDITOR'];
          const isCrewMember = crewKeywords.some(keyword => 
            name.toUpperCase().includes(keyword) || 
            link.parentElement?.textContent.toUpperCase().includes(keyword)
          );
          
          if (name && !isCrewMember && !cast.includes(name)) {
            cast.push(name);
          }
        }
      });

      return {
        synopsis: synopsis || '',
        genres: genres,
        runtime: runtime || '',
        cast: cast
      };
    });

    return details;
  } catch (error) {
    console.log(`    Error fetching details: ${error.message}`);
    return {
      synopsis: '',
      genres: [],
      runtime: '',
      cast: []
    };
  }
}

// Enhanced scraping function that adds detailed info to existing festival data
async function enhanceFilmData(festivalName, year) {
  console.log(`\nEnhancing ${festivalName} ${year} with detailed film information...`);
  
  const filePath = path.join(FESTIVALS_DIR, festivalName, `${year}.json`);
  
  try {
    // Read existing data
    const existingData = await fs.readFile(filePath, 'utf-8');
    const films = JSON.parse(existingData);
    
    if (!films || films.length === 0) {
      console.log(`No films found in ${filePath}`);
      return;
    }

    console.log(`Found ${films.length} films to enhance`);

    const browser = await puppeteer.launch({
      headless: false, // Set to true for production
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    try {
      const page = await browser.newPage();
      
      // Set a user agent to appear more like a real browser
      await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');

      let enhancedCount = 0;

      for (let i = 0; i < films.length; i++) {
        const film = films[i];
        
        // Skip if already has detailed info
        if (film.synopsis && film.synopsis.length > 0) {
          console.log(`  [${i + 1}/${films.length}] ${film.title} - Already enhanced, skipping`);
          continue;
        }

        console.log(`  [${i + 1}/${films.length}] Enhancing: ${film.title}`);

        if (film.link) {
          const details = await scrapeFilmDetails(page, film.link);
          
          // Add the new details to the film object
          film.synopsis = details.synopsis;
          film.genres = details.genres;
          film.runtime = details.runtime;
          film.cast = details.cast;

          enhancedCount++;
          
          // Log what we found
          if (details.synopsis) {
            console.log(`    + Synopsis: ${details.synopsis.substring(0, 100)}...`);
          }
          if (details.genres.length > 0) {
            console.log(`    + Genres: ${details.genres.join(', ')}`);
          }
          if (details.cast.length > 0) {
            console.log(`    + Cast: ${details.cast.slice(0, 3).join(', ')}`);
          }

          // Be polite and wait between requests
          if (i < films.length - 1) {
            await delay(DELAY_MS);
          }
        } else {
          console.log(`    No MUBI link available`);
        }
      }

      // Save the enhanced data
      await fs.writeFile(filePath, JSON.stringify(films, null, 2));
      console.log(`\n✓ Enhanced ${enhancedCount}/${films.length} films`);
      console.log(`✓ Data saved to ${filePath}`);

    } finally {
      await browser.close();
    }

  } catch (error) {
    console.error('Error enhancing film data:', error);
  }
}

// Main function to enhance all festival data
async function enhanceAllFestivals() {
  const festivals = ['cannes', 'berlin', 'venice', 'bergen'];
  const years = ['2020', '2021', '2022', '2023', '2024', '2025'];

  for (const festival of festivals) {
    for (const year of years) {
      try {
        await enhanceFilmData(festival, year);
      } catch (error) {
        console.error(`Error enhancing ${festival} ${year}:`, error.message);
      }
    }
  }
}

// Run specific festival/year if provided as arguments
const args = process.argv.slice(2);
if (args.length >= 2) {
  const [festival, year] = args;
  enhanceFilmData(festival, year).catch(console.error);
} else {
  // Run all if no specific arguments
  enhanceAllFestivals().catch(console.error);
}

export { enhanceFilmData, scrapeFilmDetails };