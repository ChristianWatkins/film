const fs = require('fs');
const path = require('path');

// Load environment variables from .env.local
const envPath = path.join(__dirname, '.env.local');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  envContent.split('\n').forEach(line => {
    const [key, value] = line.split('=');
    if (key && value && key.trim() && !key.startsWith('#')) {
      process.env[key.trim()] = value.trim();
    }
  });
}

const TMDB_API_KEY = process.env.TMDB_API_KEY;
const TMDB_BASE_URL = 'https://api.themoviedb.org/3';

if (!TMDB_API_KEY) {
  console.error('❌ TMDB_API_KEY not found in environment variables');
  console.log('   Set it in .env.local or run: export TMDB_API_KEY=your_key');
  process.exit(1);
}

async function testSingleMovieEnhancement() {
  console.log('🎬 Testing TMDB enhancement for single arthaus film...\n');
  
  // Load arthaus data
  const arthausPath = './data/festivals/arthaus/2025.json';
  const arthausData = JSON.parse(fs.readFileSync(arthausPath, 'utf8'));
  
  // Find a movie with a TMDB ID to test
  const testMovie = arthausData.find(film => film.tmdb_id);
  
  if (!testMovie) {
    console.error('❌ No movie with TMDB ID found');
    return;
  }
  
  console.log(`🎭 Testing with: ${testMovie.title} (${testMovie.year})`);
  console.log(`🆔 TMDB ID: ${testMovie.tmdb_id}`);
  console.log(`🔗 Current link: ${testMovie.link || 'empty'}\n`);
  
  // Create backup of original data
  const originalData = JSON.parse(JSON.stringify(testMovie));
  
  try {
    // Add TMDB page link
    const tmdbPageUrl = `https://www.themoviedb.org/movie/${testMovie.tmdb_id}`;
    testMovie.tmdbLink = tmdbPageUrl;
    testMovie.link = tmdbPageUrl; // Update main link field
    
    console.log(`🔗 Added TMDB link: ${tmdbPageUrl}`);
    
    // Fetch videos/trailers from TMDB
    console.log(`🎥 Fetching trailers from TMDB...`);
    
    const videosResponse = await fetch(
      `${TMDB_BASE_URL}/movie/${testMovie.tmdb_id}/videos?api_key=${TMDB_API_KEY}&language=en-US`
    );
    
    if (!videosResponse.ok) {
      throw new Error(`TMDB API error: ${videosResponse.status}`);
    }
    
    const videosData = await videosResponse.json();
    console.log(`📊 Found ${videosData.results?.length || 0} videos`);
    
    // Find the best trailer
    const trailers = videosData.results?.filter(video => 
      video.site === 'YouTube' && 
      (video.type === 'Trailer' || video.type === 'Teaser')
    ) || [];
    
    console.log(`🎬 Found ${trailers.length} trailers/teasers`);
    
    if (trailers.length > 0) {
      console.log('Available trailers:');
      trailers.forEach((trailer, i) => {
        console.log(`  ${i + 1}. ${trailer.name} (${trailer.type})`);
      });
    }
    
    const officialTrailer = trailers.find(t => t.name.toLowerCase().includes('official trailer'));
    const anyTrailer = trailers.find(t => t.type === 'Trailer');
    const teaser = trailers.find(t => t.type === 'Teaser');
    
    const bestTrailer = officialTrailer || anyTrailer || teaser;
    
    if (bestTrailer) {
      testMovie.trailerUrl = `https://www.youtube.com/watch?v=${bestTrailer.key}`;
      testMovie.trailerKey = bestTrailer.key;
      
      console.log(`✅ Selected trailer: ${bestTrailer.name}`);
      console.log(`🎥 YouTube URL: ${testMovie.trailerUrl}`);
      console.log(`🔑 Video key: ${bestTrailer.key}`);
    } else {
      console.log('⚠️  No suitable trailers found');
    }
    
    // Show the enhanced movie data
    console.log('\n📋 Enhanced movie data:');
    console.log('='.repeat(50));
    console.log(JSON.stringify({
      title: testMovie.title,
      year: testMovie.year,
      tmdb_id: testMovie.tmdb_id,
      link: testMovie.link,
      tmdbLink: testMovie.tmdbLink,
      trailerUrl: testMovie.trailerUrl,
      trailerKey: testMovie.trailerKey,
      mubiLink: testMovie.mubiLink
    }, null, 2));
    
    // Ask if user wants to save the changes
    console.log('\n🤔 Do you want to save these changes?');
    console.log('   This will update the arthaus/2025.json file');
    console.log('   Press Ctrl+C to cancel, or wait 5 seconds to save...');
    
    await new Promise(resolve => {
      let countdown = 5;
      const timer = setInterval(() => {
        process.stdout.write(`\r💾 Saving in ${countdown}... `);
        countdown--;
        
        if (countdown < 0) {
          clearInterval(timer);
          console.log('\n');
          resolve();
        }
      }, 1000);
      
      process.on('SIGINT', () => {
        clearInterval(timer);
        console.log('\n❌ Cancelled by user');
        // Restore original data
        Object.assign(testMovie, originalData);
        console.log('   Original data restored');
        process.exit(0);
      });
    });
    
    // Save the updated data
    fs.writeFileSync(arthausPath, JSON.stringify(arthausData, null, 2));
    
    console.log('✅ Changes saved successfully!');
    console.log('\n🎉 Test complete!');
    console.log('='.repeat(50));
    console.log('Summary:');
    console.log(`✅ TMDB link added: ${testMovie.tmdbLink ? 'Yes' : 'No'}`);
    console.log(`✅ Trailer found: ${testMovie.trailerUrl ? 'Yes' : 'No'}`);
    console.log(`📁 File updated: ${arthausPath}`);
    
    console.log('\n🔄 Next steps:');
    console.log('  1. Test the web app to see if the TMDB button works');
    console.log('  2. Check if trailer button opens YouTube correctly');
    console.log('  3. If working, run full enhancement for all arthaus films');
    
  } catch (error) {
    console.error('\n❌ Error during enhancement:', error.message);
    // Restore original data on error
    Object.assign(testMovie, originalData);
    console.log('   Original data restored');
  }
}

testSingleMovieEnhancement();