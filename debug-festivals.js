import { loadFestivalFilms } from './lib/data.js';

async function debugFestivalNames() {
  console.log('Loading festival data...');
  const filmsMap = await loadFestivalFilms();
  
  const festivalNames = new Set();
  
  for (const [filmKey, { film, festivals }] of filmsMap) {
    festivals.forEach(festival => {
      festivalNames.add(`${festival.name} ${festival.year}`);
    });
  }
  
  console.log('\nUnique festival names found:');
  Array.from(festivalNames).sort().forEach(name => {
    console.log(`- ${name}`);
  });
  
  // Check specifically arthaus films
  console.log('\nArthaus festival entries:');
  for (const [filmKey, { film, festivals }] of filmsMap) {
    festivals.forEach(festival => {
      if (festival.name === 'arthaus') {
        console.log(`${film.title} (${film.year}) -> ${festival.name} ${festival.year}`);
      }
    });
    if (festivals.some(f => f.name === 'arthaus')) break; // Just show first few
  }
}

debugFestivalNames().catch(console.error);