import JustWatchAPI from 'justwatch-api-client';
import fs from 'fs/promises';

const COUNTRY = 'NO'; // Norway

async function fetchEdenStreaming() {
  const client = new JustWatchAPI();
  
  try {
    console.log('Searching for Eden (2014) by Mia Hansen-Løve...');
    
    // Search for the specific Eden film
    const searchResults = await client.search({
      query: 'Eden 2014 Mia Hansen-Løve',
      country: COUNTRY,
      language: 'en'
    });
    
    console.log(`Found ${searchResults.length} search results`);
    
    // Look for the correct Eden film
    const edenFilm = searchResults.find(film => 
      film.title && 
      film.title.toLowerCase().includes('eden') &&
      film.release_year === 2014
    );
    
    if (!edenFilm) {
      console.log('Eden (2014) not found. Trying broader search...');
      
      // Try broader search
      const broaderResults = await client.search({
        query: 'Eden',
        country: COUNTRY,
        language: 'en'
      });
      
      console.log(`Broader search found ${broaderResults.length} results`);
      
      // Filter for 2014 films
      const eden2014Films = broaderResults.filter(film => film.release_year === 2014);
      console.log('2014 Eden films found:', eden2014Films.map(f => ({
        title: f.title,
        year: f.release_year,
        id: f.id
      })));
      
      if (eden2014Films.length > 0) {
        const film = eden2014Films[0];
        const details = await client.getTitle(film.id, COUNTRY);
        console.log('\nEden (2014) streaming details:');
        console.log(JSON.stringify({
          id: film.id,
          title: film.title,
          year: film.release_year,
          justwatch_url: `https://www.justwatch.com/no/movie/${film.id}`,
          streaming: details.offers || [],
          details: details
        }, null, 2));
      }
    } else {
      console.log('Found Eden (2014):', edenFilm);
      
      // Get detailed streaming information
      const details = await client.getTitle(edenFilm.id, COUNTRY);
      
      console.log('\nEden (2014) streaming details:');
      console.log(JSON.stringify({
        id: edenFilm.id,
        title: edenFilm.title,
        year: edenFilm.release_year,
        justwatch_url: `https://www.justwatch.com/no/movie/${edenFilm.id}`,
        streaming: details.offers || [],
        details: details
      }, null, 2));
    }
    
  } catch (error) {
    console.error('Error fetching Eden streaming data:', error);
  }
}

fetchEdenStreaming();