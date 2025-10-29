import fs from 'fs';

console.log('Integrating arthaus streaming data into main availability.json...');

// Load the main streaming data
const mainStreamingPath = './data/streaming/availability.json';
const mainData = JSON.parse(fs.readFileSync(mainStreamingPath, 'utf8'));

// Load the arthaus streaming data  
const arthausStreamingPath = './data/streaming/arthaus-availability.json';
const arthausData = JSON.parse(fs.readFileSync(arthausStreamingPath, 'utf8'));

console.log(`Main streaming data: ${Object.keys(mainData.films).length} films`);
console.log(`Arthaus streaming data: ${Object.keys(arthausData.films).length} films`);

// Merge arthaus films into main data
let addedCount = 0;
let updatedCount = 0;

Object.entries(arthausData.films).forEach(([filmKey, filmData]) => {
  if (mainData.films[filmKey]) {
    // Film already exists, update with newer info
    mainData.films[filmKey] = {
      ...mainData.films[filmKey],
      ...filmData
    };
    updatedCount++;
  } else {
    // New film, add it
    mainData.films[filmKey] = filmData;
    addedCount++;
  }
});

// Update metadata
mainData.total_films = Object.keys(mainData.films).length;
mainData.last_updated = new Date().toISOString();

// Save the merged data
fs.writeFileSync(mainStreamingPath, JSON.stringify(mainData, null, 2));

console.log(`✅ Merged streaming data:`);
console.log(`   Added: ${addedCount} new films`);
console.log(`   Updated: ${updatedCount} existing films`);
console.log(`   Total films: ${mainData.total_films}`);
console.log(`   Saved to: ${mainStreamingPath}`);