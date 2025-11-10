const fs = require('fs').promises;
const path = require('path');
require('dotenv').config({ path: '.env.local' });

const TMDB_API_KEY = process.env.TMDB_API_KEY;
const TMDB_BASE_URL = 'https://api.themoviedb.org/3';
const DELAY_MS = 300; // 300ms between requests to respect API limits

if (!TMDB_API_KEY) {
  console.error('❌ TMDB_API_KEY not found in environment variables');
  console.log('   Set it in .env.local or run: export TMDB_API_KEY=your_key');
  process.exit(1);
}

const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function searchTmdbByTitle(title, year) {
  try {
    const searchUrl = `${TMDB_BASE_URL}/search/movie?api_key=${TMDB_API_KEY}&query=${encodeURIComponent(title)}&year=${year}`;
    const response = await fetch(searchUrl);
    const data = await response.json();
    
    if (data.results && data.results.length > 0) {
      // Find best match - prefer exact title match, then closest year
      const exactMatch = data.results.find(r => 
        r.title.toLowerCase() === title.toLowerCase() || 
        r.original_title?.toLowerCase() === title.toLowerCase()
      );
      
      if (exactMatch) {
        return exactMatch.id;
      }
      
      // If no exact match, return first result (TMDB usually ranks best matches first)
      return data.results[0].id;
    }
    return null;
  } catch (error) {
    console.error(`   ❌ Error searching TMDB for "${title}":`, error.message);
    return null;
  }
}

async function main() {
  console.log('🔍 Finding TMDB IDs for Films Needing Review');
  console.log('='.repeat(60));
  
  // Load films data
  const filmsPath = path.join(__dirname, 'data', 'films.json');
  const filmsData = JSON.parse(await fs.readFile(filmsPath, 'utf8'));
  const films = Object.values(filmsData.films);
  
  // Find films without TMDB ID
  const needsFix = films.filter(f => !f.tmdb_id);
  
  console.log(`\n📊 Found ${needsFix.length} films without TMDB ID`);
  console.log(`\n🔍 Searching TMDB by title + year...\n`);
  
  let fixed = 0;
  let failed = 0;
  const failedFilms = [];
  
  for (let i = 0; i < needsFix.length; i++) {
    const film = needsFix[i];
    console.log(`[${i + 1}/${needsFix.length}] ${film.title} (${film.year})`);
    
    const tmdbId = await searchTmdbByTitle(film.title, film.year);
    
    if (tmdbId) {
      console.log(`   ✅ Found TMDB ID: ${tmdbId}`);
      filmsData.films[film.id].tmdb_id = tmdbId;
      fixed++;
    } else {
      console.log(`   ❌ Not found on TMDB`);
      failedFilms.push({ title: film.title, year: film.year, id: film.id });
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
  
  if (failedFilms.length > 0) {
    console.log('\n⚠️  Films that still need manual review:');
    failedFilms.forEach(f => {
      console.log(`   - ${f.title} (${f.year})`);
    });
  }
  
  console.log('='.repeat(60));
}

main().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});

