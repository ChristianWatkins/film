require('dotenv').config({ path: '.env.local' });

async function searchGundaPoster() {
    const apiKey = process.env.TMDB_API_KEY;
    
    if (!apiKey) {
        console.error('❌ TMDB_API_KEY not found in environment variables');
        console.log('   Set it in .env.local or run: export TMDB_API_KEY=your_key');
        return;
    }
    
    try {
        // Search for Gunda from 2020
        console.log('Searching for Gunda (2020)...');
        const searchResponse = await fetch(`https://api.themoviedb.org/3/search/movie?api_key=${apiKey}&query=Gunda&year=2020`);
        const searchData = await searchResponse.json();
        
        console.log('Search results:');
        searchData.results?.forEach((movie, index) => {
            console.log(`${index + 1}. ${movie.title} (${movie.release_date?.substring(0, 4)})`);
            console.log(`   ID: ${movie.id}`);
            console.log(`   Poster: ${movie.poster_path ? `https://image.tmdb.org/t/p/w500${movie.poster_path}` : 'None'}`);
            console.log(`   Overview: ${movie.overview?.substring(0, 100)}...`);
            console.log('');
        });
        
        // Get details for the first result (likely our Gunda)
        if (searchData.results && searchData.results.length > 0) {
            const gundaId = searchData.results[0].id;
            console.log(`Getting details for movie ID: ${gundaId}`);
            
            const detailsResponse = await fetch(`https://api.themoviedb.org/3/movie/${gundaId}?api_key=${apiKey}`);
            const details = await detailsResponse.json();
            
            console.log('\nMovie details:');
            console.log(`Title: ${details.title}`);
            console.log(`Original Title: ${details.original_title}`);
            console.log(`Release Date: ${details.release_date}`);
            console.log(`Runtime: ${details.runtime} minutes`);
            console.log(`Countries:`, details.production_countries?.map(c => c.name));
            console.log(`Poster Path: ${details.poster_path}`);
            console.log(`Full Poster URL: ${details.poster_path ? `https://image.tmdb.org/t/p/w500${details.poster_path}` : 'None'}`);
            console.log(`Backdrop Path: ${details.backdrop_path}`);
            console.log(`Full Backdrop URL: ${details.backdrop_path ? `https://image.tmdb.org/t/p/w1280${details.backdrop_path}` : 'None'}`);
        }
        
    } catch (error) {
        console.error('Error:', error.message);
    }
}

searchGundaPoster();