// Complete end-to-end test of the deduplication process
const fs = require('fs');
const path = require('path');

// Copy exact functions from lib/data.ts
function createFilmKey(title, year) {
  return `${title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${year}`;
}

function normalizeTitle(title) {
  let normalized = title.replace(/\s*\([^)]+\)\s*/g, '').trim();
  normalized = normalized.toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  return normalized;
}

async function testCompleteProcess() {
  const filmsMap = new Map();
  const filmsByTmdbId = new Map();
  const festivalsDir = 'data/festivals';
  
  console.log('=== STEP 1: LOADING FESTIVAL FILES ===\n');
  
  // Load all festivals
  const festivals = fs.readdirSync(festivalsDir).filter(f => {
    const stat = fs.statSync(path.join(festivalsDir, f));
    return stat.isDirectory();
  }).sort();
  
  for (const festivalName of festivals) {
    const festivalPath = path.join(festivalsDir, festivalName);
    const yearFiles = fs.readdirSync(festivalPath).filter(f => f.endsWith('.json')).sort();
    
    for (const yearFile of yearFiles) {
      const year = yearFile.replace('.json', '');
      const normalizedYear = year.replace(/[-+].*$/, '');
      const filePath = path.join(festivalPath, yearFile);
      const rawData = JSON.parse(fs.readFileSync(filePath, 'utf8'));
      
      if (!Array.isArray(rawData)) continue;
      
      rawData.forEach(film => {
        if (!film.title || (!film.title.includes('Parthenope') && !film.title.includes('PARTHENOPE')) || film.year !== 2024) {
          return;
        }
        
        console.log(`Processing: ${festivalName}/${yearFile} - "${film.title}"`);
        
        const normalizedFilm = {
          title: film.title,
          year: film.year,
          country: film.country,
          link: film.link
        };
        
        const key = createFilmKey(normalizedFilm.title, normalizedFilm.year);
        let existingKey = key;
        
        console.log(`  Key: ${key}`);
        console.log(`  TMDB ID: ${film.tmdb_id || 'none'}`);
        
        // Check by TMDB ID
        if (film.tmdb_id) {
          const tmdbId = typeof film.tmdb_id === 'string' ? parseInt(film.tmdb_id, 10) : film.tmdb_id;
          if (!isNaN(tmdbId) && filmsByTmdbId.has(tmdbId)) {
            existingKey = filmsByTmdbId.get(tmdbId);
            console.log(`  ✅ MATCHED by TMDB ID to: ${existingKey}`);
          } else if (!isNaN(tmdbId)) {
            filmsByTmdbId.set(tmdbId, key);
            console.log(`  → Registered TMDB ID: ${tmdbId}`);
          }
        }
        
        if (!filmsMap.has(existingKey)) {
          console.log(`  → Creating NEW entry`);
          filmsMap.set(existingKey, {
            film: { ...normalizedFilm, tmdb_id: film.tmdb_id },
            festivals: []
          });
        } else {
          console.log(`  → Adding to EXISTING entry`);
        }
        
        const existingFestival = filmsMap.get(existingKey).festivals.find(f => f.name === festivalName);
        if (!existingFestival) {
          filmsMap.get(existingKey).festivals.push({
            name: festivalName,
            year: normalizedYear
          });
        }
        
        console.log('');
      });
    }
  }
  
  console.log('=== STEP 2: AFTER FIRST PASS ===\n');
  filmsMap.forEach((value, key) => {
    console.log(`Key: ${key}`);
    console.log(`  Title: ${value.film.title}`);
    console.log(`  TMDB ID: ${value.film.tmdb_id || 'none'}`);
    console.log(`  Festivals: ${value.festivals.map(f => f.name).join(', ')}`);
    console.log('');
  });
  
  console.log('=== STEP 3: FINAL PASS ===\n');
  const finalFilmsMap = new Map();
  const finalFilmsByTmdbId = new Map();
  
  for (const [key, entry] of filmsMap.entries()) {
    const film = entry.film;
    const tmdbId = film.tmdb_id;
    
    let targetKey = key;
    
    if (tmdbId && !isNaN(tmdbId)) {
      if (finalFilmsByTmdbId.has(tmdbId)) {
        console.log(`Merging ${key} (TMDB ${tmdbId}) with existing ${finalFilmsByTmdbId.get(tmdbId)}`);
        targetKey = finalFilmsByTmdbId.get(tmdbId);
        const existingEntry = finalFilmsMap.get(targetKey);
        
        entry.festivals.forEach(fest => {
          const existingFestival = existingEntry.festivals.find(f => f.name === fest.name);
          if (!existingFestival) {
            existingEntry.festivals.push(fest);
          }
        });
      } else {
        console.log(`Setting ${key} with TMDB ID ${tmdbId}`);
        finalFilmsMap.set(key, entry);
        finalFilmsByTmdbId.set(tmdbId, key);
      }
    } else {
      console.log(`Keeping ${key} (no TMDB ID)`);
      finalFilmsMap.set(key, entry);
    }
  }
  
  console.log('\n=== STEP 4: FINAL RESULT ===\n');
  finalFilmsMap.forEach((value, key) => {
    console.log(`Key: ${key}`);
    console.log(`  Title: ${value.film.title}`);
    console.log(`  TMDB ID: ${value.film.tmdb_id || 'none'}`);
    console.log(`  Festivals: ${value.festivals.map(f => f.name).join(', ')}`);
    console.log('');
  });
  
  // Now simulate getAllFilms
  console.log('=== STEP 5: SIMULATING getAllFilms ===\n');
  const finalFilms = [];
  
  for (const [filmKey, { film, festivals }] of finalFilmsMap) {
    const enhanced = JSON.parse(fs.readFileSync('data/enhanced/enhanced-films-tmdb.json', 'utf8'));
    const parthenopeEnhanced = enhanced.films.find(f => f.tmdb_id === film.tmdb_id);
    
    const finalFilm = {
      title: parthenopeEnhanced?.tmdb_title || film.title,
      country: parthenopeEnhanced?.country || film.country,
      year: film.year,
      festivals: [...new Set(festivals.map(f => f.name))].join(', '),
      filmKey: filmKey
    };
    
    console.log(`Creating Film object:`);
    console.log(`  Title: ${finalFilm.title}`);
    console.log(`  Country: ${finalFilm.country}`);
    console.log(`  Festivals: ${finalFilm.festivals}`);
    console.log(`  FilmKey: ${finalFilm.filmKey}`);
    console.log('');
    
    finalFilms.push(finalFilm);
  }
  
  console.log('=== FINAL TEST RESULT ===');
  console.log(`Total Film objects: ${finalFilms.length}`);
  console.log(`Expected: 1`);
  console.log(`\n${finalFilms.length === 1 ? '✅ PASSED - Only 1 film created' : '❌ FAILED - Multiple films created!'}`);
  
  if (finalFilms.length > 1) {
    console.log('\n❌ DUPLICATES FOUND:');
    finalFilms.forEach((f, i) => {
      console.log(`  ${i + 1}. ${f.title} (${f.country}) - Key: ${f.filmKey}`);
    });
  }
}

testCompleteProcess().catch(console.error);

