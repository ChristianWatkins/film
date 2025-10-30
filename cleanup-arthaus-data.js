const fs = require('fs');

function cleanupArthausData() {
  console.log('🧹 Cleaning up arthaus data - removing TMDB fields and restoring empty links...\n');
  
  // Load arthaus data
  const arthausPath = './data/festivals/arthaus/2025.json';
  const arthausData = JSON.parse(fs.readFileSync(arthausPath, 'utf8'));
  
  console.log(`📂 Found ${arthausData.length} arthaus films to clean up\n`);
  
  let cleaned = 0;
  
  for (const film of arthausData) {
    let modified = false;
    
    // Remove TMDB-related fields
    if (film.tmdbLink) {
      delete film.tmdbLink;
      modified = true;
    }
    if (film.trailerUrl) {
      delete film.trailerUrl;
      modified = true;
    }
    if (film.trailerKey) {
      delete film.trailerKey;
      modified = true;
    }
    
    // Reset link to empty (for manual MUBI links later)
    if (film.link && film.link.includes('themoviedb.org')) {
      film.link = '';
      modified = true;
    }
    
    if (modified) {
      cleaned++;
      console.log(`✅ Cleaned: ${film.title}`);
    }
  }
  
  // Save cleaned data
  fs.writeFileSync(arthausPath, JSON.stringify(arthausData, null, 2));
  
  console.log('\n🎉 Cleanup complete!');
  console.log('='.repeat(50));
  console.log(`📂 Total films processed: ${arthausData.length}`);
  console.log(`🧹 Films cleaned: ${cleaned}`);
  console.log(`📄 Updated file: ${arthausPath}`);
  console.log('\n📝 Next steps:');
  console.log('  1. All arthaus films now have empty links (ready for manual MUBI URLs)');
  console.log('  2. MUBI buttons will be hidden until links are manually added');
  console.log('  3. Original MUBI trailer functionality restored');
}

cleanupArthausData();