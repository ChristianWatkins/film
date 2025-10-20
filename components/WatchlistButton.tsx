'use client';

import { useState, useEffect } from 'react';
import { toggleWatchlist, getWatchlist } from '@/lib/watchlist';

interface WatchlistButtonProps {
  filmKey: string;
  title: string;
  onChange?: () => void;
}

export default function WatchlistButton({ filmKey, title, onChange }: WatchlistButtonProps) {
  const [isInWatchlist, setIsInWatchlist] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);
  
  // Check if in watchlist on mount
  useEffect(() => {
    const watchlist = getWatchlist();
    setIsInWatchlist(watchlist.has(filmKey));
  }, [filmKey]);
  
  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault(); // Don't trigger parent link
    e.stopPropagation();
    
    const newState = toggleWatchlist(filmKey, title);
    setIsInWatchlist(newState);
    
    // Notify parent component of watchlist change
    onChange?.();
    
    // Animate
    setIsAnimating(true);
    setTimeout(() => setIsAnimating(false), 300);
  };
  
  return (
    <button
      onClick={handleClick}
      className={`p-2 rounded-full transition-all ${
        isAnimating ? 'scale-125' : 'scale-100'
      } ${
        isInWatchlist 
          ? 'bg-red-100 hover:bg-red-200 text-red-600' 
          : 'bg-gray-100 hover:bg-gray-200 text-gray-400'
      }`}
      title={isInWatchlist ? 'Remove from watchlist' : 'Add to watchlist'}
      aria-label={isInWatchlist ? 'Remove from watchlist' : 'Add to watchlist'}
    >
      <svg 
        className="w-5 h-5" 
        fill={isInWatchlist ? 'currentColor' : 'none'}
        stroke="currentColor" 
        strokeWidth="2" 
        viewBox="0 0 24 24"
      >
        <path 
          strokeLinecap="round" 
          strokeLinejoin="round" 
          d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
        />
      </svg>
    </button>
  );
}

