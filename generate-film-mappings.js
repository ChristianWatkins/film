import { getAllFilms } from './lib/data.js';
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

async function generateMappings() {
  console.log('Loading all films...');
  const films = await getAllFilms();
  
  console.log(`Found ${films.length} films`);
  
  // Create mappings
  const filmKeyToCode = {};
  const codeToFilmKey = {};
  
  // Sort film keys for deterministic ordering
  const sortedFilmKeys = films.map(f => f.filmKey).sort();
  
  sortedFilmKeys.forEach((filmKey, index) => {
    const code = generateShortCode(index);
    filmKeyToCode[filmKey] = code;
    codeToFilmKey[code] = filmKey;
  });
  
  // Create output structure with both mappings
  const output = {
    metadata: {
      generated: new Date().toISOString(),
      totalFilms: films.length,
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
  
  console.log(`\n✅ Generated mappings for ${films.length} films`);
  console.log(`📁 Saved to: ${outputPath}`);
  console.log(`📦 File size: ${(JSON.stringify(output).length / 1024).toFixed(1)} KB`);
  console.log(`\n📊 Sample mappings:`);
  
  // Show first 10 mappings as examples
  sortedFilmKeys.slice(0, 10).forEach(key => {
    console.log(`  ${key.padEnd(30)} → ${filmKeyToCode[key]}`);
  });
  
  console.log(`\n✨ Compression example:`);
  const exampleKeys = sortedFilmKeys.slice(0, 5).join(',');
  const exampleCodes = sortedFilmKeys.slice(0, 5).map(k => filmKeyToCode[k]).join(',');
  console.log(`  Original: ${exampleKeys} (${exampleKeys.length} chars)`);
  console.log(`  Encoded:  ${exampleCodes} (${exampleCodes.length} chars)`);
  console.log(`  Reduction: ${((1 - exampleCodes.length / exampleKeys.length) * 100).toFixed(1)}%`);
}

// Run the script
generateMappings().catch(error => {
  console.error('Error generating mappings:', error);
  process.exit(1);
});

