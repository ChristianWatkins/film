import fs from 'fs';

// List of films to remove (those not found on JustWatch)
const filmsToRemove = [
  "Boy from Heaven",
  "Lille mamma [Petite Maman]", 
  "Oss to",
  "3 kvinner",
  "Afterparty",
  "Leviatan",
  "Barbara",
  "Poesi",
  "Mother"
];

console.log('Cleaning up arthaus data - removing films not found on JustWatch...');

// 1. Clean the original arthaus film data
console.log('\n1. Cleaning original film data...');
const arthausData = JSON.parse(fs.readFileSync('./data/festivals/arthaus/all_films.json', 'utf8'));
const originalCount = arthausData.films.length;

arthausData.films = arthausData.films.filter(film => !filmsToRemove.includes(film.title));
const newCount = arthausData.films.length;
const removedCount = originalCount - newCount;

console.log(`   Removed ${removedCount} films from original data (${originalCount} → ${newCount})`);

// Update the metadata
arthausData.last_updated = new Date().toISOString();

// Save the cleaned data
fs.writeFileSync('./data/festivals/arthaus/all_films.json', JSON.stringify(arthausData, null, 2));
console.log('   ✅ Updated all_films.json');

// 2. Clean the streaming availability data
console.log('\n2. Cleaning streaming availability data...');
const streamingData = JSON.parse(fs.readFileSync('./data/streaming/arthaus-availability.json', 'utf8'));
const originalStreamingCount = Object.keys(streamingData.films).length;

// Create film keys for the films to remove
const keysToRemove = filmsToRemove.map(title => {
  const year = {
    "Boy from Heaven": "2010",
    "Lille mamma [Petite Maman]": "1983", 
    "Oss to": "1966",
    "3 kvinner": "1977",
    "Afterparty": "2009",
    "Leviatan": "1984",
    "Barbara": "1998",
    "Poesi": "1990",
    "Mother": "2025"
  }[title];
  return `${title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${year}`;
});

console.log('   Keys to remove:', keysToRemove);

// Remove the films
let streamingRemovedCount = 0;
keysToRemove.forEach(key => {
  if (streamingData.films[key]) {
    delete streamingData.films[key];
    streamingRemovedCount++;
  }
});

const newStreamingCount = Object.keys(streamingData.films).length;

console.log(`   Removed ${streamingRemovedCount} films from streaming data (${originalStreamingCount} → ${newStreamingCount})`);

// Update metadata
streamingData.total_films = newStreamingCount;
streamingData.last_updated = new Date().toISOString();

// Save the cleaned streaming data
fs.writeFileSync('./data/streaming/arthaus-availability.json', JSON.stringify(streamingData, null, 2));
console.log('   ✅ Updated arthaus-availability.json');

console.log('\n🎉 Cleanup complete!');
console.log(`Final count: ${newCount} films with ${newStreamingCount} streaming entries`);

// Verify they match
if (newCount === newStreamingCount) {
  console.log('✅ Film counts match between datasets');
} else {
  console.log('⚠️  Warning: Film counts do not match');
}