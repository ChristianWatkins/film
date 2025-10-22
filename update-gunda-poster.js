// Update Gunda with correct poster image
const fs = require('fs');

// The correct TMDB data for Gunda (2020) documentary
const correctPosterUrl = 'https://image.tmdb.org/t/p/w500/gCjJiJz5wMZWwsKL3T8UcJRlPbA.jpg';
const correctBackdropUrl = 'https://image.tmdb.org/t/p/w1280/gCjJiJz5wMZWwsKL3T8UcJRlPbA.jpg';
const correctTmdbId = 718199; // Correct TMDB ID for the documentary

// Update enhanced films data
const files = [
  './data/enhanced/enhanced-films-tmdb.json',
  './data/enhanced/enhanced-films.json'
];

files.forEach(filePath => {
  if (fs.existsSync(filePath)) {
    const fileData = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    const data = fileData.films;
    
    const gundaIndex = data.findIndex(film => 
      film.title === 'GUNDA' && 
      film.year === 2020 && 
      film.festival === 'bergen'
    );
    
    if (gundaIndex !== -1) {
      console.log(`Updating ${filePath}...`);
      console.log('Current poster:', data[gundaIndex].poster_url_tmdb);
      
      // Update poster and backdrop URLs
      data[gundaIndex].poster_url_tmdb = correctPosterUrl;
      data[gundaIndex].backdrop_url = correctBackdropUrl;
      data[gundaIndex].tmdb_id = correctTmdbId;
      data[gundaIndex].extraction_timestamp = new Date().toISOString();
      
      // Update the file metadata timestamp
      fileData.last_updated = new Date().toISOString();
      
      // Write back
      fileData.films = data;
      fs.writeFileSync(filePath, JSON.stringify(fileData, null, 2));
      
      console.log('✅ Updated poster URL');
      console.log('New poster:', correctPosterUrl);
    } else {
      console.log(`❌ Gunda not found in ${filePath}`);
    }
  }
});

console.log('\n🖼️ Gunda poster image has been updated!');