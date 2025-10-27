import { getAllFilms } from '@/lib/data';
import DataQualityTable from '@/components/DataQualityTable';
import Link from 'next/link';
import { notFound } from 'next/navigation';

interface PageProps {
  params: Promise<{
    festival: string;
  }>;
}

const VALID_FESTIVALS = ['bergen', 'berlin', 'cannes', 'haugesund', 'venice'];

export default async function FestivalDataQualityPage({ params }: PageProps) {
  const { festival } = await params;
  
  // Validate festival name
  if (!VALID_FESTIVALS.includes(festival)) {
    notFound();
  }

  const films = await getAllFilms();
  
  // Filter films for this festival
  const festivalFilms = films.filter(film => 
    film.festivals.some(f => f.name === festival)
  );

  if (festivalFilms.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <header className="bg-[#1A1A2E] shadow-lg border-b-4 border-[#FFB800]">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <div className="flex justify-between items-center">
              <div>
                <h1 className="text-4xl font-bold text-[#FFB800] mb-2 flex items-center gap-3 capitalize">
                  <span className="text-5xl">📊</span>
                  <span>{festival} Festival - Data Quality</span>
                </h1>
                <p className="text-white/90 text-lg font-medium">
                  No films found for this festival
                </p>
              </div>
              <div className="space-x-4">
                <Link 
                  href="/data-quality" 
                  className="bg-gray-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-gray-700 transition-colors"
                >
                  ← Data Quality Overview
                </Link>
                <Link 
                  href="/" 
                  className="bg-[#FFB800] text-[#1A1A2E] px-6 py-3 rounded-lg font-semibold hover:bg-yellow-400 transition-colors"
                >
                  Back to Films
                </Link>
              </div>
            </div>
          </div>
        </header>
        
        <div className="container mx-auto px-4 py-8">
          <div className="max-w-6xl mx-auto">
            <div className="bg-white rounded-lg shadow p-6">
              <p className="text-gray-600">No films found for {festival} festival.</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Get unique years for this festival
  const years = Array.from(new Set(
    festivalFilms.flatMap(film => 
      film.festivals
        .filter(f => f.name === festival)
        .map(f => f.year)
    )
  )).sort((a, b) => b.localeCompare(a)); // Descending order

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-[#1A1A2E] shadow-lg border-b-4 border-[#FFB800]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-4xl font-bold text-[#FFB800] mb-2 flex items-center gap-3 capitalize">
                <span className="text-5xl">📊</span>
                <span>{festival} Festival - Data Quality</span>
              </h1>
              <p className="text-white/90 text-lg font-medium">
                {festivalFilms.length} films • Data completeness analysis by source
              </p>
            </div>
            <div className="space-x-4">
              <Link 
                href="/data-quality" 
                className="bg-gray-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-gray-700 transition-colors"
              >
                ← Data Quality Overview
              </Link>
              <Link 
                href="/" 
                className="bg-[#FFB800] text-[#1A1A2E] px-6 py-3 rounded-lg font-semibold hover:bg-yellow-400 transition-colors"
              >
                Back to Films
              </Link>
            </div>
          </div>
        </div>
      </header>
      
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-6xl mx-auto">
          {/* Year Navigation */}
          {years.length > 1 && (
            <div className="bg-white rounded-lg shadow p-6 mb-8">
              <h2 className="text-lg font-semibold mb-4">Filter by Year</h2>
              <div className="flex flex-wrap gap-2">
                <Link
                  href={`/data-quality/${festival}`}
                  className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
                >
                  All Years
                </Link>
                {years.map(year => (
                  <Link
                    key={year}
                    href={`/data-quality/${festival}/${year}`}
                    className="px-3 py-1 bg-gray-200 text-gray-700 rounded hover:bg-gray-300 transition-colors"
                  >
                    {year}
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* Data Quality Table - All years */}
          <DataQualityTable 
            films={films} 
            festival={festival}
          />
        </div>
      </div>
    </div>
  );
}

// Generate static params for all valid festivals
export async function generateStaticParams() {
  return VALID_FESTIVALS.map(festival => ({
    festival,
  }));
}