const fs = require('fs').promises;
const path = require('path');

// Parse CSV content
function parseCSV(content) {
  const lines = content.trim().split('\n');
  const awards = [];
  
  // Skip header line
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    
    // Handle quoted fields properly
    const fields = [];
    let currentField = '';
    let inQuotes = false;
    
    for (let j = 0; j < line.length; j++) {
      const char = line[j];
      
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        fields.push(currentField.trim());
        currentField = '';
      } else {
        currentField += char;
      }
    }
    fields.push(currentField.trim()); // Push the last field
    
    if (fields.length >= 4) {
      const [festival, yearStr, award, film] = fields;
      const year = parseInt(yearStr);
      
      if (!isNaN(year) && film) {
        awards.push({
          festival,
          year,
          award,
          film,
          // Extract original title if in parentheses
          originalTitle: extractOriginalTitle(film),
          normalizedTitle: normalizeTitle(film)
        });
      }
    }
  }
  
  return awards;
}

// Extract original title from parentheses
function extractOriginalTitle(title) {
  const match = title.match(/\(([^)]+)\)$/);
  return match ? match[1] : null;
}

// Normalize film title for matching
function normalizeTitle(title) {
  // Remove content in parentheses (original titles)
  let normalized = title.replace(/\s*\([^)]+\)\s*/g, '').trim();
  
  // Convert to lowercase and remove special characters
  normalized = normalized.toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
    
  return normalized;
}

// Group awards by film
function groupAwardsByFilm(awards) {
  const filmMap = new Map();
  
  awards.forEach(award => {
    const key = `${award.normalizedTitle}-${award.year}`;
    
    if (!filmMap.has(key)) {
      filmMap.set(key, {
        title: award.film,
        year: award.year,
        normalizedTitle: award.normalizedTitle,
        originalTitle: award.originalTitle,
        awarded: true,
        awards: [],
        festivals: new Set()
      });
    }
    
    const film = filmMap.get(key);
    film.awards.push({
      festival: award.festival,
      award: award.award,
      year: award.year
    });
    film.festivals.add(award.festival);
  });
  
  // Convert to regular object and handle Set conversion
  const result = {};
  for (const [key, film] of filmMap) {
    result[key] = {
      ...film,
      festivals: Array.from(film.festivals)
    };
  }
  
  return result;
}

// Main conversion function
async function convertCSVToJSON() {
  try {
    console.log('🎬 Converting awards CSV to JSON...');
    
    // Read CSV file
    const csvPath = path.join(__dirname, 'data', 'awards', 'filmpriser.csv');
    const csvContent = await fs.readFile(csvPath, 'utf-8');
    
    // Parse CSV
    const awards = parseCSV(csvContent);
    console.log(`📊 Parsed ${awards.length} award entries`);
    
    // Group by film
    const filmAwards = groupAwardsByFilm(awards);
    const filmCount = Object.keys(filmAwards).length;
    console.log(`🏆 Found ${filmCount} unique awarded films`);
    
    // Create output structure
    const output = {
      metadata: {
        created: new Date().toISOString(),
        source: 'filmpriser.csv',
        total_awards: awards.length,
        total_films: filmCount,
        festivals: [...new Set(awards.map(a => a.festival))],
        years: [...new Set(awards.map(a => a.year))].sort((a, b) => a - b)
      },
      awards: awards,
      films: filmAwards
    };
    
    // Write JSON file
    const jsonPath = path.join(__dirname, 'data', 'awards', 'filmpriser.json');
    await fs.writeFile(jsonPath, JSON.stringify(output, null, 2), 'utf-8');
    
    console.log(`✅ Successfully converted to: ${jsonPath}`);
    console.log(`\n📈 Statistics:`);
    console.log(`   • Total awards: ${awards.length}`);
    console.log(`   • Unique films: ${filmCount}`);
    console.log(`   • Festivals: ${output.metadata.festivals.join(', ')}`);
    console.log(`   • Years: ${output.metadata.years.join(', ')}`);
    
    // Show some examples
    console.log(`\n🎭 Sample films with awards:`);
    const sampleFilms = Object.values(filmAwards).slice(0, 5);
    sampleFilms.forEach((film, idx) => {
      console.log(`   ${idx + 1}. ${film.title} (${film.year})`);
      console.log(`      Awards: ${film.awards.length}`);
      console.log(`      Festivals: ${film.festivals.join(', ')}`);
      if (film.originalTitle) {
        console.log(`      Original: ${film.originalTitle}`);
      }
      console.log();
    });
    
  } catch (error) {
    console.error('❌ Error converting CSV to JSON:', error);
    process.exit(1);
  }
}

// Run the conversion
if (require.main === module) {
  convertCSVToJSON();
}

module.exports = { convertCSVToJSON, parseCSV, groupAwardsByFilm };