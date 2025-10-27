import Link from 'next/link';
import { getAllFilms, getUniqueFestivals } from '@/lib/data';

export default async function DataQualityPage() {
  const films = await getAllFilms();
  const festivals = getUniqueFestivals(films);

  // Calculate overall stats
  const totalFilms = films.length;
  const withEnhancedData = films.filter(f => f.synopsis || f.genres?.length || f.tmdbRating).length;
  const withPosters = films.filter(f => f.posterUrl).length;
  const withStreaming = films.filter(f => f.hasStreaming || f.hasRent || f.hasBuy).length;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-[#1A1A2E] shadow-lg border-b-4 border-[#FFB800]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-4xl font-bold text-[#FFB800] mb-2 flex items-center gap-3">
                <span className="text-5xl">📊</span>
                <span>Data Quality Analysis</span>
              </h1>
              <p className="text-white/90 text-lg font-medium">
                Analyze data completeness and sources for festival films
              </p>
            </div>
            <Link 
              href="/" 
              className="bg-[#FFB800] text-[#1A1A2E] px-6 py-3 rounded-lg font-semibold hover:bg-yellow-400 transition-colors"
            >
              ← Back to Films
            </Link>
          </div>
        </div>
      </header>
      
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-6xl mx-auto">
          {/* Overall Statistics */}
          <div className="bg-white rounded-lg shadow p-6 mb-8">
            <h2 className="text-xl font-semibold mb-4">Overall Data Quality</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">{totalFilms}</div>
                <div className="text-sm text-gray-600">Total Films</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">
                  {totalFilms > 0 ? Math.round((withEnhancedData / totalFilms) * 100) : 0}%
                </div>
                <div className="text-sm text-gray-600">Enhanced Data</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-purple-600">
                  {totalFilms > 0 ? Math.round((withPosters / totalFilms) * 100) : 0}%
                </div>
                <div className="text-sm text-gray-600">With Posters</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-orange-600">
                  {totalFilms > 0 ? Math.round((withStreaming / totalFilms) * 100) : 0}%
                </div>
                <div className="text-sm text-gray-600">With Streaming</div>
              </div>
            </div>
          </div>

          {/* Festival Links */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold mb-4">Festival Data Quality</h2>
            <p className="text-gray-600 mb-6">
              Click on a festival to see detailed data quality analysis including source breakdown (MUBI, TMDB, JustWatch).
            </p>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {festivals.map(festival => {
                const festivalFilms = films.filter(f => 
                  f.festivals.some(fest => fest.name === festival)
                );
                const festivalEnhanced = festivalFilms.filter(f => 
                  f.synopsis || f.genres?.length || f.tmdbRating
                ).length;
                
                return (
                  <Link 
                    key={festival} 
                    href={`/data-quality/${festival}`}
                    className="block p-4 border rounded-lg hover:shadow-md transition-shadow"
                  >
                    <h3 className="font-semibold text-lg capitalize mb-2">{festival}</h3>
                    <div className="text-sm text-gray-600">
                      <div>{festivalFilms.length} films</div>
                      <div>
                        {festivalFilms.length > 0 ? Math.round((festivalEnhanced / festivalFilms.length) * 100) : 0}% enhanced
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>

          {/* Data Sources Explanation */}
          <div className="bg-white rounded-lg shadow p-6 mt-8">
            <h2 className="text-xl font-semibold mb-4">Data Sources</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <h3 className="font-semibold text-red-600 mb-2">MUBI</h3>
                <p className="text-sm text-gray-600">
                  Basic film information including title, year, director, country, and MUBI link. 
                  This is our primary source for festival film data.
                </p>
              </div>
              <div>
                <h3 className="font-semibold text-blue-600 mb-2">TMDB (The Movie Database)</h3>
                <p className="text-sm text-gray-600">
                  Enhanced metadata including synopsis, genres, ratings, runtime, cast, and high-quality posters.
                  Provides rich content information for better browsing experience.
                </p>
              </div>
              <div>
                <h3 className="font-semibold text-green-600 mb-2">JustWatch</h3>
                <p className="text-sm text-gray-600">
                  Streaming availability information including which platforms offer the film
                  for streaming, rental, or purchase in Norway.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}