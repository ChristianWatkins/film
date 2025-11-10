const fs = require('fs').promises;
const path = require('path');
require('dotenv').config({ path: '.env.local' });

const TMDB_API_KEY = process.env.TMDB_API_KEY;
const DELAY_MS = 300; // 300ms between requests to respect API limits

if (!TMDB_API_KEY) {
  console.error('❌ TMDB_API_KEY not found in environment variables');
  console.log('   Set it in .env.local or run: export TMDB_API_KEY=your_key');
  process.exit(1);
}

const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function getTmdbIdFromImdb(imdbId) {
  try {
    const url = `https://api.themoviedb.org/3/find/${imdbId}?api_key=${TMDB_API_KEY}&external_source=imdb_id`;
    const response = await fetch(url);
    const data = await response.json();
    
    if (data.movie_results && data.movie_results.length > 0) {
      return data.movie_results[0].id;
    }
    return null;
  } catch (error) {
    console.error(`   ❌ Error fetching TMDB ID for ${imdbId}:`, error.message);
    return null;
  }
}

async function main() {
  console.log('🔧 Fixing Missing TMDB IDs');
  console.log('='.repeat(60));
  
  // Load films data
  const filmsPath = path.join(__dirname, 'data', 'films.json');
  const filmsData = JSON.parse(await fs.readFile(filmsPath, 'utf8'));
  const films = Object.values(filmsData.films);
  
  // Find films with TMDB data but no tmdb_id
  const needsFix = films.filter(f => 
    !f.tmdb_id && f.imdb_id
  );
  
  console.log(`\n📊 Found ${needsFix.length} films with IMDB ID but no TMDB ID`);
  console.log(`\n🔍 Looking up TMDB IDs...\n`);
  
  let fixed = 0;
  let failed = 0;
  
  for (let i = 0; i < needsFix.length; i++) {
    const film = needsFix[i];
    console.log(`[${i + 1}/${needsFix.length}] ${film.title} (${film.year})`);
    console.log(`   IMDB: ${film.imdb_id}`);
    
    const tmdbId = await getTmdbIdFromImdb(film.imdb_id);
    
    if (tmdbId) {
      console.log(`   ✅ Found TMDB ID: ${tmdbId}`);
      filmsData.films[film.id].tmdb_id = tmdbId;
      fixed++;
    } else {
      console.log(`   ❌ Could not find TMDB ID`);
      failed++;
    }
    
    // Rate limiting
    if (i < needsFix.length - 1) {
      await delay(DELAY_MS);
    }
  }
  
  // Save updated data
  console.log(`\n💾 Saving updated films.json...`);
  await fs.writeFile(filmsPath, JSON.stringify(filmsData, null, 2));
  
  console.log('\n' + '='.repeat(60));
  console.log('📊 SUMMARY');
  console.log('='.repeat(60));
  console.log(`✅ Fixed: ${fixed} films`);
  console.log(`❌ Failed: ${failed} films`);
  console.log('='.repeat(60));
}

main().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});

