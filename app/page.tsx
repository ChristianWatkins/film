import { getAllFilms, getUniqueYears, getUniqueFestivals, getUniqueProviders, getUniqueCountries, getUniqueGenres } from '@/lib/data';
import FilmBrowser from '@/components/FilmBrowser';

export default async function Home() {
  // Load and merge all data server-side
  const films = await getAllFilms();
  
  // Get filter options
  const availableYears = getUniqueYears(films);
  const availableFestivals = getUniqueFestivals(films);
  const availablePlatforms = getUniqueProviders(films);
  const availableCountries = getUniqueCountries(films);
  const availableGenres = getUniqueGenres(films);
  
  return (
    <FilmBrowser
      films={films}
      availableYears={availableYears}
      availableFestivals={availableFestivals}
      availablePlatforms={availablePlatforms}
      availableCountries={availableCountries}
      availableGenres={availableGenres}
    />
  );
}
