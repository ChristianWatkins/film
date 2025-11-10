/**
 * Build-time script to generate a pre-merged films file
 * This eliminates runtime merging and speeds up page loads
 */

import fs from 'fs/promises';
import path from 'path';
import { mergeAllFilms } from '../lib/data';

const DATA_DIR = path.join(process.cwd(), 'data');
const OUTPUT_FILE = path.join(DATA_DIR, 'merged-films.json');

async function generateMergedFilms() {
  console.log('🔄 Generating merged films file...');
  const startTime = Date.now();
  
  try {
    // Generate merged films using existing logic
    const films = await mergeAllFilms();
    
    // Create output object with metadata
    const output = {
      generated_at: new Date().toISOString(),
      total_films: films.length,
      films: films
    };
    
    // Write to file
    await fs.writeFile(OUTPUT_FILE, JSON.stringify(output, null, 2), 'utf-8');
    
    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    console.log(`✅ Generated merged films file: ${OUTPUT_FILE}`);
    console.log(`   ${films.length} films merged in ${duration}s`);
    
  } catch (error) {
    console.error('❌ Error generating merged films:', error);
    process.exit(1);
  }
}

// Run if called directly
generateMergedFilms();

export { generateMergedFilms };

