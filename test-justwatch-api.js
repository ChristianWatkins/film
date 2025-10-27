const https = require('https');
const { URL } = require('url');

// JustWatch API endpoints (these are commonly used patterns)
const JUSTWATCH_API_BASE = 'https://apis.justwatch.com';
const JUSTWATCH_WEB_API = 'https://www.justwatch.com/us/api';

async function fetchJustwatchAPI(endpoint, options = {}) {
  return new Promise((resolve, reject) => {
    const url = new URL(endpoint);
    
    const requestOptions = {
      hostname: url.hostname,
      port: 443,
      path: url.pathname + url.search,
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        'Accept': 'application/json, text/plain, */*',
        'Accept-Language': 'en-US,en;q=0.9',
        'Accept-Encoding': 'gzip, deflate, br',
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache',
        'Sec-Fetch-Dest': 'empty',
        'Sec-Fetch-Mode': 'cors',
        'Sec-Fetch-Site': 'same-origin',
        ...options.headers
      }
    };

    const req = https.request(requestOptions, (res) => {
      let data = '';

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        try {
          if (res.statusCode === 200) {
            const jsonData = JSON.parse(data);
            resolve({ status: res.statusCode, data: jsonData, raw: data });
          } else {
            resolve({ status: res.statusCode, error: `HTTP ${res.statusCode}`, raw: data });
          }
        } catch (error) {
          resolve({ status: res.statusCode, error: 'Invalid JSON', raw: data });
        }
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    req.end();
  });
}

async function testJustwatchAPIs() {
  const movieId = "tm679789"; // Another Round - known working movie
  const numericId = "679789";
  const title = "Another Round";
  
  console.log(`🎬 Testing JustWatch APIs for "${title}" (ID: ${movieId})\n`);

  // Test different API endpoints
  const endpoints = [
    // Direct movie API
    `${JUSTWATCH_WEB_API}/titles/movie/${numericId}`,
    `${JUSTWATCH_WEB_API}/titles/movie/${numericId}/localized_providers`,
    
    // Content API
    `${JUSTWATCH_WEB_API}/content/titles/movie/${numericId}`,
    `${JUSTWATCH_WEB_API}/content/titles/movie/${numericId}/providers`,
    
    // Search API
    `${JUSTWATCH_WEB_API}/search/titles?query=${encodeURIComponent(title)}`,
    
    // Offers API
    `${JUSTWATCH_WEB_API}/titles/movie/${numericId}/offers`,
    
    // Alternative endpoints with tm prefix
    `https://www.justwatch.com/us/api/titles/${movieId}`,
    `https://www.justwatch.com/us/api/content/titles/${movieId}`,
    
    // Try Norwegian version (from the data)
    `https://www.justwatch.com/no/api/titles/${movieId}`,
    
    // GraphQL endpoint (might need different approach)
    `https://www.justwatch.com/graphql`
  ];

  for (let i = 0; i < endpoints.length; i++) {
    const endpoint = endpoints[i];
    console.log(`📡 Testing endpoint ${i + 1}/${endpoints.length}:`);
    console.log(`   ${endpoint}`);
    
    try {
      const result = await fetchJustwatchAPI(endpoint);
      
      if (result.status === 200 && result.data) {
        console.log(`   ✅ SUCCESS! Status: ${result.status}`);
        console.log(`   📄 Response preview:`, JSON.stringify(result.data, null, 2).substring(0, 500) + '...');
        
        // Save the successful response to a file for inspection
        const fs = require('fs');
        const filename = `justwatch-api-${movieId}-endpoint-${i + 1}.json`;
        fs.writeFileSync(filename, JSON.stringify(result.data, null, 2));
        console.log(`   💾 Full response saved to: ${filename}`);
        
      } else {
        console.log(`   ❌ Status: ${result.status}${result.error ? ` - ${result.error}` : ''}`);
        if (result.raw && result.raw.length < 500) {
          console.log(`   📄 Response: ${result.raw}`);
        }
      }
    } catch (error) {
      console.log(`   ❌ ERROR: ${error.message}`);
    }
    
    console.log('');
    
    // Small delay to be respectful to their servers
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  // Also try the GraphQL query that the website uses
  console.log(`🚀 Testing GraphQL query...\n`);
  
  const graphqlQuery = {
    query: `
      query GetTitleDetails($fullPath: String!, $country: Country!, $language: Language!) {
        urlToContent(fullPath: $fullPath, country: $country, language: $language) {
          ... on Movie {
            id
            objectId
            objectType
            content(country: $country, language: $language) {
              title
              fullPath
              posterUrl
              genres {
                translation(language: $language)
              }
              scoring {
                imdbScore
                imdbVotes
                tomatoMeter
              }
            }
            offers(country: $country, platform: WEB) {
              id
              monetizationType
              presentationType
              retailPrice(language: $language)
              package {
                id
                clearName
                technicalName
              }
              standardWebURL
            }
          }
        }
      }
    `,
    variables: {
      fullPath: "/no/movie/another-round",
      country: "NO",
      language: "en"
    }
  };

  try {
    const graphqlResult = await fetchJustwatchAPI('https://www.justwatch.com/graphql', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(graphqlQuery)
    });

    if (graphqlResult.status === 200) {
      console.log(`✅ GraphQL SUCCESS!`);
      console.log(`📄 Response:`, JSON.stringify(graphqlResult.data, null, 2));
      
      const fs = require('fs');
      fs.writeFileSync(`justwatch-graphql-${movieId}.json`, JSON.stringify(graphqlResult.data, null, 2));
      console.log(`💾 GraphQL response saved to: justwatch-graphql-${movieId}.json`);
    } else {
      console.log(`❌ GraphQL failed: Status ${graphqlResult.status}`);
    }
  } catch (error) {
    console.log(`❌ GraphQL ERROR: ${error.message}`);
  }
}

// Run the tests
testJustwatchAPIs()
  .then(() => {
    console.log('\n🏁 API testing complete!');
    process.exit(0);
  })
  .catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });