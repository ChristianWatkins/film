'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { parseSharedFavorites, addToWatchlist, getWatchlist } from '@/lib/watchlist';
import type { Film } from '@/lib/types';
import FilmCard from '@/components/FilmCard';

interface SharedFavoritesClientProps {
  films: Film[];
}

export default function SharedFavoritesClient({ films }: SharedFavoritesClientProps) {
  const searchParams = useSearchParams();
  const [sharedFilms, setSharedFilms] = useState<Film[]>([]);
  const [listName, setListName] = useState<string>('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [userWatchlist, setUserWatchlist] = useState<Set<string>>(new Set());
  const [importSuccess, setImportSuccess] = useState(false);
  
  useEffect(() => {
    const loadSharedFavorites = async () => {
      try {
        // Get the favs parameter from URL
        const favsParam = searchParams.get('favs');
        const nameParam = searchParams.get('name');
        
        if (!favsParam) {
          setError('No favorites data found in URL');
          setLoading(false);
          return;
        }
        
        // Store list name if provided
        if (nameParam) {
          setListName(decodeURIComponent(nameParam));
        }
        
        // Parse the shared favorites
        const result = await parseSharedFavorites(favsParam);
        
        if (!result.success || !result.filmKeys) {
          setError(result.error || 'Failed to load shared favorites');
          setLoading(false);
          return;
        }
        
        // Filter to only show shared favorites
        const shared = films.filter(film => result.filmKeys?.includes(film.filmKey));
        setSharedFilms(shared);
        
        // Load user's current watchlist
        setUserWatchlist(getWatchlist());
        
        setLoading(false);
      } catch (e) {
        console.error('Error loading shared favorites:', e);
        setError('Failed to load shared favorites');
        setLoading(false);
      }
    };
    
    loadSharedFavorites();
  }, [searchParams, films]);
  
  const handleAddAllToFavorites = () => {
    let addedCount = 0;
    sharedFilms.forEach(film => {
      if (!userWatchlist.has(film.filmKey)) {
        addToWatchlist(film.filmKey, film.title);
        addedCount++;
      }
    });
    
    // Refresh watchlist
    setUserWatchlist(getWatchlist());
    setImportSuccess(true);
    
    setTimeout(() => setImportSuccess(false), 3000);
  };
  
  const handleAddToFavorites = (filmKey: string, title: string) => {
    addToWatchlist(filmKey, title);
    setUserWatchlist(getWatchlist());
  };
  
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-gray-600 text-lg">Loading shared favorites...</div>
        </div>
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-2xl mx-auto px-4 py-16">
          <div className="bg-white rounded-lg shadow-lg p-8 text-center">
            <div className="text-6xl mb-4">⚠️</div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Error Loading Favorites</h1>
            <p className="text-gray-600 mb-6">{error}</p>
            <a
              href="/"
              className="inline-block bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-6 rounded-lg transition-colors cursor-pointer"
            >
              Go to Homepage
            </a>
          </div>
        </div>
      </div>
    );
  }
  
  if (sharedFilms.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-2xl mx-auto px-4 py-16">
          <div className="bg-white rounded-lg shadow-lg p-8 text-center">
            <div className="text-6xl mb-4">🎬</div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">No Favorites Found</h1>
            <p className="text-gray-600 mb-6">This shared link doesn't contain any favorites.</p>
            <a
              href="/"
              className="inline-block bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-6 rounded-lg transition-colors cursor-pointer"
            >
              Go to Homepage
            </a>
          </div>
        </div>
      </div>
    );
  }
  
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-[#1A1A2E] shadow-lg border-b-4 border-[#FFB800]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-white mb-2">
                {listName || 'Shared Favorites'}
              </h1>
              <p className="text-gray-300">
                {listName 
                  ? 'Someone shared this list with you!' 
                  : 'Someone shared their favorite films with you!'}
              </p>
            </div>
            <a
              href="/"
              className="bg-white hover:bg-gray-100 text-gray-900 font-medium py-2 px-4 rounded-lg transition-colors cursor-pointer"
            >
              Browse All Films
            </a>
          </div>
        </div>
      </header>
      
      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Info Banner */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <div className="flex items-start gap-3">
            <svg className="w-6 h-6 text-blue-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div className="flex-1">
              <p className="text-blue-900 font-medium">You're viewing shared favorites</p>
              <p className="text-blue-700 text-sm mt-1">
                These films won't be added to your favorites automatically. Hearts show which films are already in your collection.
              </p>
            </div>
          </div>
        </div>
        
        {/* Action Bar */}
        <div className="bg-white rounded-lg shadow p-4 mb-6">
          <div className="flex items-center justify-between">
            <div className="text-gray-900">
              Showing <span className="font-semibold">{sharedFilms.length}</span> shared film{sharedFilms.length !== 1 ? 's' : ''}
            </div>
            <button
              onClick={handleAddAllToFavorites}
              className="bg-red-600 hover:bg-red-700 text-white font-medium py-2 px-4 rounded-lg transition-colors flex items-center gap-2 cursor-pointer"
            >
              <svg className="w-5 h-5" fill="currentColor" stroke="currentColor" strokeWidth="0" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
              </svg>
              Add All to My Favorites
            </button>
          </div>
        </div>
        
        {/* Success Message */}
        {importSuccess && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
            <div className="flex items-center gap-2 text-green-800">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              <span className="font-medium">Added to your favorites!</span>
            </div>
          </div>
        )}
        
        {/* Film Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {sharedFilms.map(film => (
            <FilmCard
              key={film.filmKey}
              film={film}
              isFlipped={false}
              onFlip={() => {}}
              onWatchlistChange={() => setUserWatchlist(getWatchlist())}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

