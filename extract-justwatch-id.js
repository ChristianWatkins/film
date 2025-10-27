const https = require('https');
const { URL } = require('url');

async function extractJustwatchId(url) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    
    const options = {
      hostname: urlObj.hostname,
      port: 443,
      path: urlObj.pathname,
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
        'Accept-Encoding': 'gzip, deflate, br',
        'DNT': '1',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1',
      }
    };

    const req = https.request(options, (res) => {
      let data = '';

      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        try {
          // Look for various patterns where the JustWatch ID might be
          const patterns = [
            /"object_id["\s]*:\s*(\d+)/,
            /"id["\s]*:\s*(\d+)/,
            /data-object-id["\s]*=["\s]*(\d+)/,
            /"objectId["\s]*:\s*(\d+)/,
            /"tmdb_id["\s]*:\s*(\d+)/,
            /justwatch\.com\/[^\/]+\/movie\/[^\/]+\/(\d+)/,
            /"content_id["\s]*:\s*(\d+)/
          ];

          console.log('Searching for JustWatch ID patterns...\n');
          
          let foundId = null;
          for (let i = 0; i < patterns.length; i++) {
            const matches = data.match(patterns[i]);
            if (matches && matches[1]) {
              console.log(`Pattern ${i + 1} found ID: ${matches[1]}`);
              if (!foundId) foundId = matches[1];
            }
          }

          // Also look for JSON-LD structured data
          const jsonLdMatch = data.match(/<script type="application\/ld\+json"[^>]*>(.*?)<\/script>/gs);
          if (jsonLdMatch) {
            jsonLdMatch.forEach((match, index) => {
              try {
                const jsonContent = match.replace(/<script[^>]*>/, '').replace(/<\/script>/, '');
                const jsonData = JSON.parse(jsonContent);
                console.log(`JSON-LD ${index + 1}:`, JSON.stringify(jsonData, null, 2).substring(0, 200) + '...');
                
                if (jsonData.identifier) {
                  console.log(`Found identifier in JSON-LD: ${jsonData.identifier}`);
                }
              } catch (e) {
                // Ignore invalid JSON
              }
            });
          }

          // Look for any large numbers that might be IDs
          const numberMatches = data.match(/\d{6,}/g);
          if (numberMatches) {
            console.log('\nLarge numbers found (potential IDs):');
            const uniqueNumbers = [...new Set(numberMatches)].slice(0, 10);
            uniqueNumbers.forEach(num => console.log(`  ${num}`));
          }

          if (foundId) {
            console.log(`\n✅ Most likely JustWatch ID: ${foundId}`);
            resolve(foundId);
          } else {
            console.log('\n❌ No clear JustWatch ID found');
            resolve(null);
          }

        } catch (error) {
          reject(error);
        }
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    req.end();
  });
}

// Get URL from command line argument
const url = process.argv[2] || 'https://www.justwatch.com/us/movie/against-the-tide-2023';

console.log(`Extracting JustWatch ID from: ${url}\n`);

extractJustwatchId(url)
  .then(id => {
    if (id) {
      console.log(`\n🎯 JustWatch ID: ${id}`);
      console.log(`\nTo update your availability.json, change the entry for this film to:`);
      console.log(`{`);
      console.log(`  "found": true,`);
      console.log(`  "justwatch_id": "${id}",`);
      console.log(`  "justwatch_url": "${url}",`);
      console.log(`  "last_updated": "${new Date().toISOString()}"`);
      console.log(`}`);
    } else {
      console.log('\n❌ Could not extract JustWatch ID automatically');
      console.log('Try manually searching the page source for "object_id" or similar patterns');
    }
  })
  .catch(error => {
    console.error('Error:', error.message);
  });