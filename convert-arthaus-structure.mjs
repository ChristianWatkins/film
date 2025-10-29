import fs from 'fs';

console.log('Converting arthaus data structure to match other festivals...');

// Load the arthaus data
const arthausData = JSON.parse(fs.readFileSync('./data/festivals/arthaus/all_films.json', 'utf8'));

console.log(`Processing ${arthausData.films.length} arthaus films...`);

// Create year categories based on film years
const yearCategories = {
  'pre-2000': [],
  '2000-2010': [],
  '2010-2020': [],
  '2020+': []
};

// Categorize films by year
arthausData.films.forEach(film => {
  if (film.year < 2000) {
    yearCategories['pre-2000'].push(film);
  } else if (film.year >= 2000 && film.year < 2010) {
    yearCategories['2000-2010'].push(film);
  } else if (film.year >= 2010 && film.year < 2020) {
    yearCategories['2010-2020'].push(film);
  } else {
    yearCategories['2020+'].push(film);
  }
});

console.log('Year distribution:');
Object.entries(yearCategories).forEach(([category, films]) => {
  console.log(`  ${category}: ${films.length} films`);
});

// Create individual JSON files for each year category
Object.entries(yearCategories).forEach(([category, films]) => {
  if (films.length > 0) {
    const filename = `./data/festivals/arthaus/${category}.json`;
    fs.writeFileSync(filename, JSON.stringify(films, null, 2));
    console.log(`✅ Created ${filename} with ${films.length} films`);
  }
});

// Also create a 2025.json file with all films (since arthaus is 2025 festival)
fs.writeFileSync('./data/festivals/arthaus/2025.json', JSON.stringify(arthausData.films, null, 2));
console.log(`✅ Created ./data/festivals/arthaus/2025.json with ${arthausData.films.length} films`);

console.log('\n🎉 Arthaus data structure conversion complete!');