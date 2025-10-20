import JustWatchAPI from 'justwatch-api-client';
import fs from 'fs/promises';

const COUNTRY = 'NO';
const DELAY_MS = 2000;
const INPUT_FILE = 'data/streaming/availability.json';
const OUTPUT_FILE = 'data/streaming/availability.json';

const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function addPosters() {
  console.log('📸 Adding poster URLs to streaming data...\n');
  
  // Load existing data
  const data = JSON.parse(await fs.readFile(INPUT_FILE, 'utf-8'));
  const justwatch = new JustWatchAPI(10000);
  
  let updated = 0;
  let alreadyHad = 0;
  let failed = 0;
  const total = Object.keys(data.films).length;
  
  let count = 0;
  
  for (const [key, film] of Object.entries(data.films)) {
    count++;
    
    // Skip if already has poster or wasn't found
    if (film.poster_url) {
      alreadyHad++;
      continue;
    }
    
    if (!film.found || !film.justwatch_url) {
      continue;
    }
    
    try {
      console.log(`[${count}/${total}] Fetching poster for "${film.title}"...`);
      
      // Search for the film - poster URL is in search result
      const searchResults = await justwatch.search(film.title, COUNTRY);
      
      if (searchResults && searchResults.length > 0) {
        // Try to find exact year match
        let match = searchResults.find(r => r.originalReleaseYear === film.year);
        if (!match) match = searchResults[0];
        
        if (match && match.posterUrl) {
          film.poster_url = match.posterUrl;
          updated++;
          console.log(`  ✓ Added poster: ${match.posterUrl.substring(0, 60)}...`);
        } else {
          console.log(`  ⚠️  No poster in result`);
          failed++;
        }
      } else {
        console.log(`  ⚠️  Film not found`);
        failed++;
      }
      
      // Save progress every 20 films
      if (count % 20 === 0) {
        await fs.writeFile(OUTPUT_FILE, JSON.stringify(data, null, 2), 'utf-8');
        console.log(`  💾 Progress saved (${count}/${total})\n`);
      }
      
      await delay(DELAY_MS);
      
    } catch (error) {
      console.log(`  ❌ Error: ${error.message}`);
      failed++;
    }
  }
  
  // Final save
  data.last_updated = new Date().toISOString();
  await fs.writeFile(OUTPUT_FILE, JSON.stringify(data, null, 2), 'utf-8');
  
  console.log('\n' + '='.repeat(50));
  console.log('📊 Summary:');
  console.log('='.repeat(50));
  console.log(`Already had posters: ${alreadyHad}`);
  console.log(`Successfully added: ${updated}`);
  console.log(`Failed: ${failed}`);
  console.log(`\n✓ Data saved to ${OUTPUT_FILE}`);
}

addPosters().catch(console.error);

