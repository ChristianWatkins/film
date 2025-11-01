import { getAllFilms } from '@/lib/data';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function DebugPostersPage() {
  const films = await getAllFilms();
  
  // Find THE STATE AND ME
  const theStateAndMe = films.find(f => f.title === 'THE STATE AND ME');
  
  // Find the other 3 films we added posters for
  // For WE - try multiple variations since title might be transformed
  const we = films.find(f => 
    (f.title === 'WE' || f.title === 'NOUS' || f.title === 'Wè' || f.title.toLowerCase().includes('we')) 
    && f.year === 2021 
    && f.director === 'Alice Diop'
  );
  const trenque = films.find(f => f.title.includes('TRENQUE'));
  const soil = films.find(f => f.title.includes('SOIL') || f.title.includes('A SOIL'));
  
  // Debug: show all 2021 films by Alice Diop
  const aliceDiopFilms = films.filter(f => f.director === 'Alice Diop');
  
  const testFilms = [
    { name: 'THE STATE AND ME', film: theStateAndMe },
    { name: 'WE / Wè', film: we },
    { name: 'TRENQUE LAUQUEN', film: trenque },
    { name: 'A SOIL...', film: soil }
  ];
  
  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <h1 className="text-3xl font-bold mb-8">Poster Debug Page</h1>
      
      <div className="space-y-8">
        {testFilms.map(({ name, film }) => (
          <div key={name} className="bg-white p-6 rounded-lg shadow">
            <h2 className="text-xl font-bold mb-4">{name}</h2>
            
            {film ? (
              <div className="space-y-2">
                <p><strong>Title:</strong> {film.title}</p>
                <p><strong>Year:</strong> {film.year}</p>
                <p><strong>Poster URL:</strong> {film.posterUrl || 'MISSING'}</p>
                
                {film.posterUrl ? (
                  <div className="mt-4">
                    <p className="font-bold mb-2">Poster Preview:</p>
                    <img 
                      src={film.posterUrl} 
                      alt={film.title}
                      className="w-48 border border-gray-300"
                    />
                  </div>
                ) : (
                  <div className="mt-4 p-4 bg-red-100 text-red-800 rounded">
                    ❌ No poster URL found!
                  </div>
                )}
              </div>
            ) : (
              <p className="text-red-600">Film not found in database!</p>
            )}
          </div>
        ))}
      </div>
      
      <div className="mt-8 p-4 bg-blue-100 rounded">
        <p><strong>Total films in database:</strong> {films.length}</p>
        <p className="text-sm mt-2">If posters show here but not on main page, it's a browser cache issue.</p>
        <p className="text-sm">Try hard refresh: Cmd+Shift+R (Mac) or Ctrl+Shift+R (Windows)</p>
      </div>
      
      <div className="mt-8 p-4 bg-yellow-100 rounded">
        <p className="font-bold mb-2">Debug: All films by Alice Diop</p>
        {aliceDiopFilms.map((f, i) => (
          <div key={i} className="text-sm">
            {i + 1}. "{f.title}" ({f.year}) - Poster: {f.posterUrl ? '✅' : '❌'}
          </div>
        ))}
      </div>
    </div>
  );
}

