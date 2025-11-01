const fs = require('fs');
const path = require('path');

function createFilmKey(title, year) {
  return `${title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${year}`;
}

function normalizeTitle(title) {
  let normalized = title.replace(/\s*\([^)]+\)\s*/g, '').trim();
  return normalized.toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

const filmsByKey = new Map();
const filmsByTmdbId = new Map();
const filmsByNormalizedTitle = new Map();

const festivalsDir = 'data/festivals';
const festivals = fs.readdirSync(festivalsDir);

for (const festival of festivals) {
  const festivalPath = path.join(festivalsDir, festival);
  const stat = fs.statSync(festivalPath);
  if (!stat.isDirectory()) continue;
  
  const yearFiles = fs.readdirSync(festivalPath).filter(f => f.endsWith('.json'));
  
  for (const yearFile of yearFiles) {
    const filePath = path.join(festivalPath, yearFile);
    const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    
    if (!Array.isArray(data)) {
      console.log(`Skipping ${filePath} - not an array`);
      continue;
    }
    
    data.forEach((film, idx) => {
      const key = createFilmKey(film.title, film.year);
      const normalizedKey = `${normalizeTitle(film.title)}-${film.year}`;
      
      // Track by exact key
      if (!filmsByKey.has(key)) {
        filmsByKey.set(key, []);
      }
      filmsByKey.get(key).push({
        festival,
        year: yearFile,
        title: film.title,
        tmdb_id: film.tmdb_id,
        index: idx
      });
      
      // Track by normalized title
      if (!filmsByNormalizedTitle.has(normalizedKey)) {
        filmsByNormalizedTitle.set(normalizedKey, []);
      }
      filmsByNormalizedTitle.get(normalizedKey).push({
        festival,
        year: yearFile,
        title: film.title,
        tmdb_id: film.tmdb_id,
        key: key,
        index: idx
      });
      
      // Track by TMDB ID
      if (film.tmdb_id) {
        const tmdbId = typeof film.tmdb_id === 'string' ? parseInt(film.tmdb_id, 10) : film.tmdb_id;
        if (!isNaN(tmdbId)) {
          if (!filmsByTmdbId.has(tmdbId)) {
            filmsByTmdbId.set(tmdbId, []);
          }
          filmsByTmdbId.get(tmdbId).push({
            festival,
            year: yearFile,
            title: film.title,
            key: key,
            normalizedKey: normalizedKey,
            index: idx
          });
        }
      }
    });
  }
}

console.log('\n=== SUMMARY ===');
console.log(`Total unique film keys: ${filmsByKey.size}`);
console.log(`Total films with TMDB IDs: ${filmsByTmdbId.size}`);

// Find exact key duplicates
const exactDuplicates = Array.from(filmsByKey.entries()).filter(([k, v]) => v.length > 1);
console.log(`\n=== EXACT KEY DUPLICATES: ${exactDuplicates.length} ===`);
exactDuplicates.slice(0, 10).forEach(([key, entries]) => {
  console.log(`\nKey: ${key}`);
  entries.forEach(e => {
    console.log(`  - ${e.festival}/${e.year} [idx ${e.index}]: "${e.title}" (tmdb: ${e.tmdb_id || 'none'})`);
  });
});

// Find normalized title duplicates (different keys but same normalized title)
const normalizedDuplicates = [];
for (const [normalizedKey, entries] of filmsByNormalizedTitle.entries()) {
  if (entries.length > 1) {
    const uniqueKeys = new Set(entries.map(e => e.key));
    if (uniqueKeys.size > 1) {
      normalizedDuplicates.push([normalizedKey, entries]);
    }
  }
}
console.log(`\n=== NORMALIZED TITLE DUPLICATES: ${normalizedDuplicates.length} ===`);
console.log('(Same film with different title formats)');
normalizedDuplicates.slice(0, 10).forEach(([normalizedKey, entries]) => {
  console.log(`\nNormalized: ${normalizedKey}`);
  entries.forEach(e => {
    console.log(`  - ${e.festival}/${e.year} [idx ${e.index}]: "${e.title}" (key: ${e.key}, tmdb: ${e.tmdb_id || 'none'})`);
  });
});

// Find TMDB ID duplicates
const tmdbDuplicates = Array.from(filmsByTmdbId.entries()).filter(([id, v]) => v.length > 1);
console.log(`\n=== TMDB ID DUPLICATES: ${tmdbDuplicates.length} ===`);
console.log('(Same TMDB ID appearing in multiple festivals)');
tmdbDuplicates.slice(0, 10).forEach(([tmdbId, entries]) => {
  console.log(`\nTMDB ID: ${tmdbId}`);
  entries.forEach(e => {
    console.log(`  - ${e.festival}/${e.year} [idx ${e.index}]: "${e.title}" (key: ${e.key})`);
  });
});

// Look specifically for arthaus duplicates with other festivals
const arthausDuplicates = tmdbDuplicates.filter(([id, entries]) => {
  const festivals = new Set(entries.map(e => e.festival));
  return festivals.has('arthaus') && festivals.size > 1;
});
console.log(`\n=== ARTHAUS + OTHER FESTIVAL DUPLICATES: ${arthausDuplicates.length} ===`);
arthausDuplicates.slice(0, 10).forEach(([tmdbId, entries]) => {
  console.log(`\nTMDB ID: ${tmdbId}`);
  entries.forEach(e => {
    console.log(`  - ${e.festival}/${e.year}: "${e.title}"`);
  });
});

