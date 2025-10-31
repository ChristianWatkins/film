import { getAllFilms } from './lib/data.js';

async function debugEden() {
  console.log('Loading all films...');
  const films = await getAllFilms();
  
  console.log(`Total films loaded: ${films.length}`);
  
  // Find Eden film
  const edenFilm = films.find(film => 
    film.title.toLowerCase().includes('eden') && 
    (film.year === 2014 || film.year === 2025)
  );
  
  if (edenFilm) {
    console.log('\nFound Eden film:');
    console.log('Title:', edenFilm.title);
    console.log('Year:', edenFilm.year);
    console.log('Director:', edenFilm.director);
    console.log('Country:', edenFilm.country);
    console.log('MUBI Link:', edenFilm.mubiLink);
    console.log('Festivals:', edenFilm.festivals.map(f => `${f.name}-${f.year}`));
  } else {
    console.log('\nNo Eden film found');
    
    // List all films with 'eden' in title
    const edenMatches = films.filter(film => 
      film.title.toLowerCase().includes('eden')
    );
    console.log('Films with "eden" in title:');
    edenMatches.forEach(film => {
      console.log(`- ${film.title} (${film.year}) by ${film.director}`);
    });
  }
}

debugEden().catch(console.error);