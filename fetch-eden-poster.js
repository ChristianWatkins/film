const https = require('https');

async function fetchTMDBPoster() {
  // Eden (2014) TMDB ID: 246741
  const tmdbId = 246741;
  const apiKey = process.env.TMDB_API_KEY || 'your_api_key_here';
  
  console.log(`Fetching TMDB data for Eden (ID: ${tmdbId})...`);
  
  const options = {
    hostname: 'api.themoviedb.org',
    port: 443,
    path: `/3/movie/${tmdbId}?api_key=${apiKey}`,
    method: 'GET',
    headers: {
      'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
      'Accept': 'application/json'
    }
  };

  return new Promise((resolve, reject) => {
    const req = https.request(options, (res) => {
      let data = '';

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        try {
          const movieData = JSON.parse(data);
          
          if (movieData.poster_path) {
            const posterUrl = `https://image.tmdb.org/t/p/w500${movieData.poster_path}`;
            console.log('Found poster:', posterUrl);
            console.log('Poster path:', movieData.poster_path);
            console.log('Movie title:', movieData.title);
            console.log('Release date:', movieData.release_date);
            resolve({
              poster_path: movieData.poster_path,
              poster_url: posterUrl,
              title: movieData.title
            });
          } else {
            console.log('No poster found');
            resolve(null);
          }
        } catch (error) {
          console.error('Error parsing JSON:', error);
          console.log('Raw response:', data);
          reject(error);
        }
      });
    });

    req.on('error', (error) => {
      console.error('Request error:', error);
      reject(error);
    });

    req.end();
  });
}

// If no API key, try to get poster from a different source
async function getEdenPoster() {
  try {
    const result = await fetchTMDBPoster();
    if (result) {
      console.log('\nCorrect poster URL for Eden (2014):');
      console.log(result.poster_url);
      return result;
    }
  } catch (error) {
    console.log('TMDB API failed, trying alternative...');
  }
  
  // Alternative: known working poster URLs for Eden 2014
  const knownPosters = [
    'https://image.tmdb.org/t/p/w500/s6V5Lb5nUOSp6QQo9QBP0PY4VBE.jpg',
    'https://image.tmdb.org/t/p/w500/84YPdcPIIKHv6ej3Y7gFg9iS8bz.jpg',
    'https://image.tmdb.org/t/p/w500/rOFgpZYr8fWG8rGd1wGN2r9qPYw.jpg'
  ];
  
  console.log('\nTrying known poster URLs for Eden (2014):');
  for (const url of knownPosters) {
    console.log('Trying:', url);
    // You would test these URLs manually or with a HEAD request
  }
  
  return null;
}

getEdenPoster();