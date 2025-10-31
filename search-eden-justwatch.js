const https = require('https');

async function searchJustWatchWeb(query, country = 'NO') {
  return new Promise((resolve, reject) => {
    const searchUrl = `https://www.justwatch.com/${country.toLowerCase()}/search?q=${encodeURIComponent(query)}`;
    
    console.log(`Searching JustWatch web: ${searchUrl}`);
    
    const options = {
      hostname: 'www.justwatch.com',
      port: 443,
      path: `/${country.toLowerCase()}/search?q=${encodeURIComponent(query)}`,
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
        'Accept-Encoding': 'gzip, deflate, br',
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache'
      }
    };

    const req = https.request(options, (res) => {
      let data = '';

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        // Look for Eden 2014 in the HTML response
        const edenMatch = data.match(/href="([^"]*eden[^"]*2014[^"]*)"/i) || 
                         data.match(/href="([^"]*\/movie\/[^"]*eden[^"]*)"/i);
        
        if (edenMatch) {
          const url = edenMatch[1];
          const fullUrl = url.startsWith('http') ? url : `https://www.justwatch.com${url}`;
          console.log('Found potential Eden URL:', fullUrl);
          
          // Extract ID from URL
          const idMatch = url.match(/\/movie\/([^\/\?]+)/);
          const movieId = idMatch ? idMatch[1] : null;
          
          resolve({
            found: true,
            url: fullUrl,
            movieId: movieId
          });
        } else {
          console.log('No Eden 2014 found in search results');
          resolve({ found: false });
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

async function searchForEden() {
  try {
    console.log('Searching for Eden 2014...');
    
    // Try different search terms
    const searchTerms = [
      'Eden 2014',
      'Eden Mia Hansen-Løve',
      'Eden 2014 Hansen-Løve',
      'Eden French film 2014'
    ];
    
    for (const term of searchTerms) {
      console.log(`\nTrying search term: "${term}"`);
      const result = await searchJustWatchWeb(term);
      
      if (result.found) {
        console.log('Success! Found Eden URL:', result.url);
        console.log('Movie ID:', result.movieId);
        return result;
      }
      
      // Wait a bit between requests
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    console.log('\nNo Eden 2014 found with any search terms');
    
  } catch (error) {
    console.error('Error searching for Eden:', error);
  }
}

searchForEden();