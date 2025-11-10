'use client';

import { useState, useEffect, Fragment } from 'react';
import Link from 'next/link';

interface FestivalAppearance {
  name: string;
  year: string;
}

interface StreamingProvider {
  provider: string;
  quality: string;
  price: string | null;
  url?: string | null;
}

interface MasterFilm {
  id: string; // Short code - permanent ID
  filmKey: string; // For backward compatibility
  title: string; // English title from TMDB
  year: number;
  director: string | null;
  country: string | null;
  mubiLink: string | null;
  tmdb_id: number | null;
  poster_url_tmdb?: string | null;
  // TMDB enrichment fields (now in same file)
  original_title?: string | null; // Original language title from TMDB
  synopsis?: string | null;
  genres?: string[] | null;
  runtime?: number | null;
  // Festival appearances (loaded separately)
  festivals?: FestivalAppearance[];
  // JustWatch data (loaded separately)
  justwatch_url?: string | null;
  justwatch_found?: boolean;
  streaming?: StreamingProvider[];
  rent?: StreamingProvider[];
  buy?: StreamingProvider[];
}

export default function AdminFilmsPage() {
  const [films, setFilms] = useState<MasterFilm[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [editingFilm, setEditingFilm] = useState<MasterFilm | null>(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  const [availableFestivals, setAvailableFestivals] = useState<{ name: string; years: string[] }[]>([]);
  const [deletingFilmId, setDeletingFilmId] = useState<string | null>(null);
  const [refreshingJustWatch, setRefreshingJustWatch] = useState<string | null>(null);
  const [filterMode, setFilterMode] = useState<'all' | 'needs-review' | 'has-tmdb'>('all');

  // Check if we're in development
  const isDevelopment = process.env.NODE_ENV === 'development';

  useEffect(() => {
    if (!isDevelopment) return;
    
    // Load films and festivals from API
    Promise.all([
      fetch('/api/admin/films').then(res => res.json()),
      fetch('/api/admin/festivals').then(res => res.json())
    ])
      .then(([filmsData, festivalsData]) => {
        setFilms(filmsData.films || []);
        setAvailableFestivals(festivalsData.festivals || []);
        setLoading(false);
      })
      .catch(error => {
        console.error('Error loading data:', error);
        setLoading(false);
      });
  }, [isDevelopment]);

  const handleEdit = (film: MasterFilm) => {
    setEditingFilm({ ...film });
  };

  const handleCancel = () => {
    setEditingFilm(null);
  };

  const handleSave = async () => {
    if (!editingFilm) return;
    
    setSaving(true);
    setMessage(null);
    
    try {
      const response = await fetch('/api/admin/save-film', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(editingFilm),
      });
      
      const result = await response.json();
      
      if (response.ok) {
        // Update local state (using ID as key now!)
        setFilms(prevFilms => 
          prevFilms.map(f => f.id === editingFilm.id ? editingFilm : f)
        );
        setMessage({ text: 'Film saved successfully!', type: 'success' });
        setEditingFilm(null);
      } else {
        setMessage({ text: result.error || 'Failed to save film', type: 'error' });
      }
    } catch (error) {
      console.error('Error saving film:', error);
      setMessage({ text: 'Failed to save film', type: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const handleAddFestival = (festivalName: string, festivalYear: string) => {
    if (!editingFilm) return;
    
    const festivals = editingFilm.festivals || [];
    const exists = festivals.some(f => f.name === festivalName && f.year === festivalYear);
    
    if (!exists) {
      setEditingFilm({
        ...editingFilm,
        festivals: [...festivals, { name: festivalName, year: festivalYear }]
      });
    }
  };

  const handleRemoveFestival = (festivalName: string, festivalYear: string) => {
    if (!editingFilm) return;
    
    setEditingFilm({
      ...editingFilm,
      festivals: (editingFilm.festivals || []).filter(
        f => !(f.name === festivalName && f.year === festivalYear)
      )
    });
  };

  const handleDelete = async (film: MasterFilm) => {
    if (!confirm(`Are you sure you want to DELETE "${film.title}" (${film.year})?\n\nThis will:\n- Remove film from films.json\n- Remove from all festivals\n- This CANNOT be undone!`)) {
      return;
    }

    setDeletingFilmId(film.id);
    setMessage(null);

    try {
      const response = await fetch('/api/admin/delete-film', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ id: film.id }),
      });

      const result = await response.json();

      if (response.ok) {
        // Remove from local state
        setFilms(prevFilms => prevFilms.filter(f => f.id !== film.id));
        setMessage({ text: `Film "${film.title}" deleted successfully!`, type: 'success' });
        setEditingFilm(null);
      } else {
        setMessage({ text: result.error || 'Failed to delete film', type: 'error' });
      }
    } catch (error) {
      console.error('Error deleting film:', error);
      setMessage({ text: 'Failed to delete film', type: 'error' });
    } finally {
      setDeletingFilmId(null);
    }
  };

  const handleRefreshJustWatch = async (film: MasterFilm) => {
    setRefreshingJustWatch(film.id);
    setMessage(null);

    try {
      const response = await fetch('/api/admin/refresh-justwatch', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          id: film.id,
          title: film.title,
          year: film.year
        }),
      });

      const result = await response.json();

      if (response.ok) {
        // Update local state with new streaming data
        setFilms(prevFilms =>
          prevFilms.map(f =>
            f.id === film.id
              ? {
                  ...f,
                  justwatch_url: result.justwatch_url,
                  justwatch_found: result.found,
                  streaming: result.streaming || [],
                  rent: result.rent || [],
                  buy: result.buy || []
                }
              : f
          )
        );

        // Update editing film if it's the same one
        if (editingFilm?.id === film.id) {
          setEditingFilm({
            ...editingFilm,
            justwatch_url: result.justwatch_url,
            justwatch_found: result.found,
            streaming: result.streaming || [],
            rent: result.rent || [],
            buy: result.buy || []
          });
        }

        setMessage({
          text: result.found
            ? 'JustWatch data refreshed successfully!'
            : 'Film not found on JustWatch',
          type: result.found ? 'success' : 'error'
        });
      } else {
        setMessage({ text: result.error || 'Failed to refresh JustWatch data', type: 'error' });
      }
    } catch (error) {
      console.error('Error refreshing JustWatch data:', error);
      setMessage({ text: 'Failed to refresh JustWatch data', type: 'error' });
    } finally {
      setRefreshingJustWatch(null);
    }
  };

  const handleFieldChange = (field: keyof MasterFilm, value: string) => {
    if (!editingFilm) return;
    
    let processedValue: any = value || null;
    
    // Handle special field types
    if (field === 'year' || field === 'runtime' || field === 'tmdb_id') {
      processedValue = value ? parseInt(value, 10) : null;
    } else if (field === 'genres') {
      // Convert comma-separated string to array
      processedValue = value ? value.split(',').map(g => g.trim()).filter(Boolean) : null;
    }
    
    setEditingFilm({
      ...editingFilm,
      [field]: processedValue
    });
  };

  // Filter films by search term and review status
  const filteredFilms = films.filter(film => {
    // Apply search filter
    const searchLower = searchTerm.toLowerCase();
    const matchesSearch = (
      film.title.toLowerCase().includes(searchLower) ||
      film.director?.toLowerCase().includes(searchLower) ||
      film.year.toString().includes(searchLower) ||
      film.filmKey.includes(searchLower)
    );
    
    if (!matchesSearch) return false;
    
    // Apply status filter
    if (filterMode === 'needs-review') {
      return !film.tmdb_id; // Only films without TMDB ID (truly failed to find)
    } else if (filterMode === 'has-tmdb') {
      return !!film.tmdb_id;
    }
    
    return true; // 'all' mode
  });
  
  // Count films needing review (only those without TMDB ID)
  const needsReviewCount = films.filter(f => !f.tmdb_id).length;

  if (!isDevelopment) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="bg-white p-8 rounded-lg shadow-md">
          <h1 className="text-2xl font-bold text-red-600 mb-4">Access Denied</h1>
          <p className="text-gray-600">Admin interface is only available in development mode.</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="text-xl">Loading films...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-7xl mx-auto">
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <div className="flex items-center justify-between mb-2">
            <h1 className="text-3xl font-bold text-gray-900">Film Admin</h1>
            <Link
              href="/"
              className="px-4 py-2 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 cursor-pointer transition-colors"
              title="Return to film browser in your last used mode"
            >
              ← Back to Films
            </Link>
          </div>
          <p className="text-gray-700 mb-4">
            Edit all film data (core + TMDB). Changes are saved to <code className="bg-gray-100 px-2 py-1 rounded text-gray-900">data/films.json</code>
          </p>
          
          {message && (
            <div className={`p-4 rounded mb-4 ${message.type === 'success' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
              {message.text}
            </div>
          )}
          
          <div className="mb-4">
            <input
              type="text"
              placeholder="Search films by title, director, year..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent placeholder-gray-500 text-gray-900"
            />
          </div>
          
          <div className="mb-4 flex gap-2">
            <button
              onClick={() => setFilterMode('all')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                filterMode === 'all'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              All Films ({films.length})
            </button>
            <button
              onClick={() => setFilterMode('needs-review')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                filterMode === 'needs-review'
                  ? 'bg-orange-600 text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              ⚠️ Needs Review ({needsReviewCount})
            </button>
            <button
              onClick={() => setFilterMode('has-tmdb')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                filterMode === 'has-tmdb'
                  ? 'bg-green-600 text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              ✓ Has TMDB ({films.length - needsReviewCount})
            </button>
          </div>
          
          <div className="text-sm text-gray-900 mb-2">
            Showing {filteredFilms.length} of {films.length} films
          </div>
          <div className="text-xs text-gray-700">
            Click a film row to expand and edit all fields (including synopsis, genres, runtime)
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Title</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Year</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Director</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Country</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Synopsis</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredFilms.map((film) => (
                  <Fragment key={film.id}>
                    <tr className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm font-semibold text-gray-900">
                        {film.title}
                        <span className="ml-2 text-xs text-gray-500">({film.id})</span>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900">{film.year}</td>
                      <td className="px-4 py-3 text-sm text-gray-900">{film.director || '-'}</td>
                      <td className="px-4 py-3 text-sm text-gray-900">{film.country || '-'}</td>
                      <td className="px-4 py-3 text-sm text-gray-700">
                        {film.synopsis ? `${film.synopsis.substring(0, 60)}...` : '-'}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleEdit(film)}
                            className="px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 cursor-pointer"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => handleDelete(film)}
                            disabled={deletingFilmId === film.id}
                            className="px-3 py-1 bg-red-600 text-white text-sm rounded hover:bg-red-700 cursor-pointer disabled:bg-gray-400"
                          >
                            {deletingFilmId === film.id ? 'Deleting...' : 'Delete'}
                          </button>
                        </div>
                      </td>
                    </tr>
                    {editingFilm?.id === film.id && (
                      <tr className="bg-blue-50">
                        <td colSpan={6} className="px-4 py-6">
                          <div className="mb-4 p-3 bg-blue-100 border border-blue-300 rounded">
                            <p className="text-sm text-blue-900">
                              <strong>ID:</strong> {film.id} 
                              <span className="ml-4 text-xs text-blue-700">
                                (This ID never changes - edit title/year freely!)
                              </span>
                            </p>
                          </div>
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">Title (English)</label>
                              <input
                                type="text"
                                value={editingFilm.title}
                                onChange={(e) => handleFieldChange('title', e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded text-gray-900 placeholder-gray-500"
                              />
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">Original Title</label>
                              <input
                                type="text"
                                value={editingFilm.original_title || ''}
                                onChange={(e) => handleFieldChange('original_title', e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded text-gray-900 placeholder-gray-500"
                                placeholder="Original language title"
                              />
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">Year</label>
                              <input
                                type="number"
                                value={editingFilm.year}
                                onChange={(e) => handleFieldChange('year', e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded text-gray-900 placeholder-gray-500"
                              />
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">Director</label>
                              <input
                                type="text"
                                value={editingFilm.director || ''}
                                onChange={(e) => handleFieldChange('director', e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded text-gray-900 placeholder-gray-500"
                              />
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">Country</label>
                              <input
                                type="text"
                                value={editingFilm.country || ''}
                                onChange={(e) => handleFieldChange('country', e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded text-gray-900 placeholder-gray-500"
                              />
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">Runtime (minutes)</label>
                              <input
                                type="number"
                                value={editingFilm.runtime || ''}
                                onChange={(e) => handleFieldChange('runtime', e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded text-gray-900 placeholder-gray-500"
                              />
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">TMDB ID</label>
                              <input
                                type="number"
                                value={editingFilm.tmdb_id || ''}
                                onChange={(e) => handleFieldChange('tmdb_id', e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded text-gray-900 placeholder-gray-500"
                                placeholder="e.g., 123456"
                              />
                              <p className="text-xs text-gray-500 mt-1">
                                Find on <a href="https://www.themoviedb.org" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">themoviedb.org</a> - ID is in the URL
                              </p>
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">IMDB ID</label>
                              <input
                                type="text"
                                value={editingFilm.imdb_id || ''}
                                onChange={(e) => handleFieldChange('imdb_id', e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded text-gray-900 placeholder-gray-500"
                                placeholder="e.g., tt1234567"
                              />
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">MUBI Link</label>
                              <input
                                type="text"
                                value={editingFilm.mubiLink || ''}
                                onChange={(e) => handleFieldChange('mubiLink', e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded text-gray-900 placeholder-gray-500"
                                placeholder="https://mubi.com/..."
                              />
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">Genres (comma-separated)</label>
                              <input
                                type="text"
                                value={Array.isArray(editingFilm.genres) ? editingFilm.genres.join(', ') : ''}
                                onChange={(e) => handleFieldChange('genres', e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded text-gray-900 placeholder-gray-500"
                                placeholder="Drama, Comedy"
                              />
                            </div>
                            <div className="col-span-2">
                              <label className="block text-sm font-medium text-gray-700 mb-1">Poster URL (TMDB)</label>
                              <input
                                type="text"
                                value={editingFilm.poster_url_tmdb || ''}
                                onChange={(e) => handleFieldChange('poster_url_tmdb', e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded text-gray-900 placeholder-gray-500"
                                placeholder="https://image.tmdb.org/t/p/w500/..."
                              />
                              {editingFilm.poster_url_tmdb && (
                                <img 
                                  src={editingFilm.poster_url_tmdb} 
                                  alt="Poster preview" 
                                  className="mt-2 max-w-[200px] rounded shadow-md"
                                />
                              )}
                            </div>
                            <div className="col-span-2">
                              <label className="block text-sm font-medium text-gray-700 mb-2">Festivals</label>
                              <div className="bg-gray-50 border border-gray-300 rounded p-3 mb-2 max-h-40 overflow-y-auto">
                                {editingFilm.festivals && editingFilm.festivals.length > 0 ? (
                                  <div className="space-y-1">
                                    {editingFilm.festivals.map((fest, idx) => (
                                      <div key={idx} className="flex items-center justify-between bg-white px-3 py-2 rounded shadow-sm">
                                        <span className="text-sm text-gray-900">
                                          <strong className="capitalize">{fest.name}</strong> {fest.year}
                                        </span>
                                        <button
                                          onClick={() => handleRemoveFestival(fest.name, fest.year)}
                                          className="text-red-600 hover:text-red-800 text-sm font-medium cursor-pointer"
                                        >
                                          Remove
                                        </button>
                                      </div>
                                    ))}
                                  </div>
                                ) : (
                                  <p className="text-sm text-gray-500 italic">No festivals selected</p>
                                )}
                              </div>
                              <div className="grid grid-cols-2 gap-2">
                                {availableFestivals.map((festival) => (
                                  <div key={festival.name} className="flex items-center gap-2">
                                    <select
                                      onChange={(e) => {
                                        if (e.target.value) {
                                          handleAddFestival(festival.name, e.target.value);
                                          e.target.value = '';
                                        }
                                      }}
                                      className="w-full px-2 py-1 text-sm border border-gray-300 rounded text-gray-900"
                                    >
                                      <option value="">Add {festival.name}...</option>
                                      {festival.years.map((year) => (
                                        <option key={year} value={year}>{year}</option>
                                      ))}
                                    </select>
                                  </div>
                                ))}
                              </div>
                            </div>
                            <div className="col-span-2">
                              <label className="block text-sm font-medium text-gray-700 mb-2">JustWatch Data</label>
                              <div className="bg-gray-50 border border-gray-300 rounded p-4">
                                {editingFilm.justwatch_found ? (
                                  <div className="space-y-3">
                                    {editingFilm.justwatch_url && (
                                      <div>
                                        <span className="text-sm font-medium text-gray-700">URL: </span>
                                        <a
                                          href={editingFilm.justwatch_url}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          className="text-sm text-blue-600 hover:text-blue-800 underline"
                                        >
                                          {editingFilm.justwatch_url}
                                        </a>
                                      </div>
                                    )}
                                    {editingFilm.streaming && editingFilm.streaming.length > 0 && (
                                      <div>
                                        <span className="text-sm font-medium text-gray-700">Streaming: </span>
                                        <span className="text-sm text-gray-900">
                                          {editingFilm.streaming.map(s => s.provider).join(', ')}
                                        </span>
                                      </div>
                                    )}
                                    {editingFilm.rent && editingFilm.rent.length > 0 && (
                                      <div>
                                        <span className="text-sm font-medium text-gray-700">Rent: </span>
                                        <span className="text-sm text-gray-900">
                                          {editingFilm.rent.map(r => r.provider).join(', ')}
                                        </span>
                                      </div>
                                    )}
                                    {editingFilm.buy && editingFilm.buy.length > 0 && (
                                      <div>
                                        <span className="text-sm font-medium text-gray-700">Buy: </span>
                                        <span className="text-sm text-gray-900">
                                          {editingFilm.buy.map(b => b.provider).join(', ')}
                                        </span>
                                      </div>
                                    )}
                                    {!editingFilm.streaming?.length && !editingFilm.rent?.length && !editingFilm.buy?.length && (
                                      <p className="text-sm text-gray-500 italic">No streaming options available</p>
                                    )}
                                  </div>
                                ) : (
                                  <p className="text-sm text-gray-500 italic">Not found on JustWatch</p>
                                )}
                                <button
                                  onClick={() => handleRefreshJustWatch(editingFilm)}
                                  disabled={refreshingJustWatch === editingFilm.id}
                                  className="mt-3 px-4 py-2 bg-orange-600 text-white text-sm rounded hover:bg-orange-700 cursor-pointer disabled:bg-gray-400"
                                >
                                  {refreshingJustWatch === editingFilm.id ? 'Refreshing...' : 'Refresh JustWatch Data'}
                                </button>
                              </div>
                            </div>
                            <div className="col-span-2">
                              <label className="block text-sm font-medium text-gray-700 mb-1">Synopsis</label>
                              <textarea
                                value={editingFilm.synopsis || ''}
                                onChange={(e) => handleFieldChange('synopsis', e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded text-gray-900 placeholder-gray-500"
                                rows={4}
                                placeholder="Film synopsis..."
                              />
                            </div>
                            <div className="col-span-2 flex gap-2 justify-end">
                              <button
                                onClick={handleCancel}
                                disabled={saving}
                                className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700 disabled:bg-gray-400 cursor-pointer"
                              >
                                Cancel
                              </button>
                              <button
                                onClick={handleSave}
                                disabled={saving}
                                className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:bg-gray-400 cursor-pointer"
                              >
                                {saving ? 'Saving...' : 'Save Changes'}
                              </button>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
