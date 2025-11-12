import fs from 'fs/promises';
import path from 'path';

// Generate 3-character codes using a-z, A-Z, 0-9 (62 characters)
// Supports up to 62^3 = 238,328 unique codes
const CHARS = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';

function generateShortCode(index) {
  // Convert index to base-62 with 3 characters
  const char1 = CHARS[Math.floor(index / (62 * 62)) % 62];
  const char2 = CHARS[Math.floor(index / 62) % 62];
  const char3 = CHARS[index % 62];
  return char1 + char2 + char3;
}

async function regenerateMappings() {
  console.log('Loading films from data/films.json...');
  
  // Read existing mappings to preserve them
  const mappingsPath = path.join(process.cwd(), 'public', 'data', 'film-key-mappings.json');
  let existingMappings = { filmKeyToCode: {}, codeToFilmKey: {} };
  try {
    const existingContent = await fs.readFile(mappingsPath, 'utf-8');
    existingMappings = JSON.parse(existingContent);
    console.log(`Found existing mappings for ${Object.keys(existingMappings.filmKeyToCode || {}).length} films`);
  } catch (e) {
    console.log('No existing mappings found, creating new ones');
  }
  
  // Read films.json directly
  const filmsPath = path.join(process.cwd(), 'data', 'films.json');
  const content = await fs.readFile(filmsPath, 'utf-8');
  const data = JSON.parse(content);
  
  // Extract filmKeys from each film object (films are keyed by short codes)
  const filmKeyToCode = { ...(existingMappings.filmKeyToCode || {}) };
  const codeToFilmKey = { ...(existingMappings.codeToFilmKey || {}) };
  const filmEntries = [];
  const usedCodes = new Set(Object.values(filmKeyToCode));
  
  // Collect all films with their filmKey
  Object.entries(data.films).forEach(([code, film]) => {
    if (film.filmKey) {
      filmEntries.push({ code, filmKey: film.filmKey });
    }
  });
  
  console.log(`Found ${filmEntries.length} films with filmKey`);
  
  // Find films that don't have mappings yet
  const filmsNeedingMappings = filmEntries.filter(entry => !filmKeyToCode[entry.filmKey]);
  console.log(`Films needing new mappings: ${filmsNeedingMappings.length}`);
  
  // Sort films needing mappings by filmKey for deterministic ordering
  filmsNeedingMappings.sort((a, b) => a.filmKey.localeCompare(b.filmKey));
  
  // Find the highest index used in existing mappings to continue from there
  let nextIndex = 0;
  if (Object.keys(codeToFilmKey).length > 0) {
    // Find the highest index by checking all codes
    const allCodes = Object.keys(codeToFilmKey);
    allCodes.forEach(code => {
      // Try to reverse-engineer the index from the code
      const chars = code.split('');
      if (chars.length === 3) {
        const idx1 = CHARS.indexOf(chars[0]) * 62 * 62;
        const idx2 = CHARS.indexOf(chars[1]) * 62;
        const idx3 = CHARS.indexOf(chars[2]);
        const index = idx1 + idx2 + idx3;
        if (index >= nextIndex) nextIndex = index + 1;
      }
    });
  }
  
  // Generate new mappings for films that don't have them
  filmsNeedingMappings.forEach((entry, offset) => {
    let newCode;
    let attempts = 0;
    do {
      newCode = generateShortCode(nextIndex + offset + attempts);
      attempts++;
      if (attempts > 1000) {
        throw new Error('Could not find unused code after 1000 attempts');
      }
    } while (usedCodes.has(newCode));
    
    filmKeyToCode[entry.filmKey] = newCode;
    codeToFilmKey[newCode] = entry.filmKey;
    usedCodes.add(newCode);
  });
  
  const sortedFilmKeys = Object.keys(filmKeyToCode).sort();
  
  // Create output structure with both mappings
  const output = {
    metadata: {
      generated: new Date().toISOString(),
      totalFilms: sortedFilmKeys.length,
      codeLength: 3,
      charset: 'a-z, A-Z, 0-9 (62 chars)',
      maxCapacity: 238328
    },
    filmKeyToCode,
    codeToFilmKey
  };
  
  // Write to public/data directory
  const outputPath = path.join(process.cwd(), 'public', 'data', 'film-key-mappings.json');
  await fs.writeFile(outputPath, JSON.stringify(output, null, 2));
  
  console.log(`\n✅ Generated mappings for ${sortedFilmKeys.length} films`);
  console.log(`📁 Saved to: ${outputPath}`);
  console.log(`📦 File size: ${(JSON.stringify(output).length / 1024).toFixed(1)} KB`);
  console.log(`\n📊 Sample mappings:`);
  
  // Show first 10 mappings as examples
  sortedFilmKeys.slice(0, 10).forEach(key => {
    console.log(`  ${key.padEnd(30)} → ${filmKeyToCode[key]}`);
  });
  
  // Verify mission-ulja-funk-2021 is included
  if (filmKeyToCode['mission-ulja-funk-2021']) {
    console.log(`\n✅ mission-ulja-funk-2021 mapped to: ${filmKeyToCode['mission-ulja-funk-2021']}`);
  } else {
    console.log(`\n❌ mission-ulja-funk-2021 NOT FOUND in mappings!`);
  }
}

// Run the script
regenerateMappings().catch(error => {
  console.error('Error regenerating mappings:', error);
  process.exit(1);
});

