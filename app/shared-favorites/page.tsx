import { Suspense } from 'react';
import { getAllFilms } from '@/lib/data';
import SharedFavoritesClient from './SharedFavoritesClient';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function SharedFavoritesPage() {
  // Load films server-side
  const films = await getAllFilms();
  
  return (
    <Suspense fallback={<div className="flex items-center justify-center min-h-screen">
      <div className="text-gray-600">Loading shared favorites...</div>
    </div>}>
      <SharedFavoritesClient films={films} />
    </Suspense>
  );
}

