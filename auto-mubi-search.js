const puppeteer = require('puppeteer');
const fs = require('fs');

/**
 * Automated MUBI link finder using Puppeteer to properly handle the JavaScript-rendered search results
 */

async function getMubiUrlForFilm(filmTitle) {
  const browser = await puppeteer.launch({ 
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  try {
    const page = await browser.newPage();
    
    // Set user agent to avoid blocking
    await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36');
    
    // Construct search URL
    const searchQuery = encodeURIComponent(filmTitle);
    const searchUrl = `https://mubi.com/en/search/films?query=${searchQuery}`;
    
    console.log(`🔍 Searching for: ${filmTitle}`);
    console.log(`📱 URL: ${searchUrl}`);
    
    // Navigate to search page
    await page.goto(searchUrl, { waitUntil: 'networkidle2' });
    
    // Wait for search results to load
    await page.waitForTimeout(3000);
    
    // Look for the first film result link
    const firstFilmUrl = await page.evaluate(() => {
      // Try different selectors for film links
      const selectors = [
        'a[href*="/films/"]',
        'a[href*="/en/no/films/"]',
        '[data-testid="film-tile"] a',
        '.film-tile a',
        '.search-result a[href*="/films/"]'
      ];
      
      for (const selector of selectors) {
        const link = document.querySelector(selector);
        if (link) {
          const href = link.getAttribute('href');
          if (href && href.includes('/films/')) {
            // Convert relative URLs to absolute
            return href.startsWith('http') ? href : `https://mubi.com${href}`;
          }
        }
      }
      
      return null;
    });
    
    if (firstFilmUrl) {
      console.log(`✅ Found: ${firstFilmUrl}`);
      return firstFilmUrl;
    } else {
      console.log(`❌ No film URL found for: ${filmTitle}`);
      return null;
    }
    
  } catch (error) {
    console.error(`Error searching for ${filmTitle}:`, error.message);
    return null;
  } finally {
    await browser.close();
  }
}

async function autoFindMubiLinks() {
  console.log('🎬 Starting automated MUBI link search...\n');
  
  // Read the current script to get films with "LINK" placeholders
  const scriptContent = fs.readFileSync('./add-mubi-links.js', 'utf8');
  
  // Extract films with "LINK" placeholders
  const linkPlaceholders = [];
  const lines = scriptContent.split('\n');
  for (const line of lines) {
    if (line.includes('"LINK"') && line.includes(':')) {
      const match = line.match(/"([^"]+)":\s*"LINK"/);
      if (match) {
        linkPlaceholders.push(match[1]);
      }
    }
  }
  
  console.log(`📋 Found ${linkPlaceholders.length} films needing MUBI links\n`);
  
  const results = {};
  let found = 0;
  let failed = 0;
  
  // Process films one by one to avoid overwhelming the server
  for (let i = 0; i < Math.min(linkPlaceholders.length, 5); i++) { // Start with first 5 films
    const filmTitle = linkPlaceholders[i];
    console.log(`\n[${i + 1}/${Math.min(linkPlaceholders.length, 5)}] Processing: ${filmTitle}`);
    
    const mubiUrl = await getMubiUrlForFilm(filmTitle);
    
    if (mubiUrl) {
      results[filmTitle] = mubiUrl;
      found++;
    } else {
      results[filmTitle] = 'NOT_FOUND';
      failed++;
    }
    
    // Small delay between requests
    await new Promise(resolve => setTimeout(resolve, 2000));
  }
  
  console.log('\n' + '='.repeat(50));
  console.log(`🎉 Search complete!`);
  console.log(`✅ Found: ${found}`);
  console.log(`❌ Failed: ${failed}`);
  console.log('='.repeat(50));
  
  // Save results
  fs.writeFileSync('./auto-mubi-results.json', JSON.stringify(results, null, 2));
  console.log('\n📄 Results saved to: auto-mubi-results.json');
  
  // Show what was found
  console.log('\n🔗 Found URLs:');
  for (const [title, url] of Object.entries(results)) {
    if (url !== 'NOT_FOUND') {
      console.log(`  "${title}": "${url}"`);
    }
  }
  
  return results;
}

// Run if called directly
if (require.main === module) {
  autoFindMubiLinks().catch(console.error);
}

module.exports = { getMubiUrlForFilm, autoFindMubiLinks };