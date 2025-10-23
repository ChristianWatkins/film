'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth-context';

interface WatchlistButtonProps {
  filmKey: string;
  title: string;
  onChange?: () => void;
  onAuthRequired?: () => void;
}

export default function WatchlistButton({ filmKey, title, onChange, onAuthRequired }: WatchlistButtonProps) {
  const [isInWatchlist, setIsInWatchlist] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { user } = useAuth();
  
  // Check if in watchlist on mount and when user changes
  useEffect(() => {
    if (user) {
      checkWatchlistStatus();
    } else {
      setIsInWatchlist(false);
    }
  }, [filmKey, user]);

  const checkWatchlistStatus = async () => {
    if (!user) return;
    
    try {
      const res = await fetch('/api/watchlist');
      if (res.ok) {
        const data = await res.json();
        if (data.success && data.watchlist) {
          const isInList = data.watchlist.some((item: any) => item.filmKey === filmKey);
          setIsInWatchlist(isInList);
        }
      }
    } catch (error) {
      console.error('Error checking watchlist status:', error);
    }
  };
  
  const handleClick = async (e: React.MouseEvent) => {
    e.preventDefault(); // Don't trigger parent link
    e.stopPropagation();
    
    // If not logged in, show auth modal
    if (!user) {
      onAuthRequired?.();
      return;
    }
    
    setIsLoading(true);
    
    try {
      if (isInWatchlist) {
        // Remove from watchlist
        const res = await fetch(`/api/watchlist?filmKey=${encodeURIComponent(filmKey)}`, {
          method: 'DELETE'
        });
        
        if (res.ok) {
          setIsInWatchlist(false);
          onChange?.();
        }
      } else {
        // Add to watchlist
        const res = await fetch('/api/watchlist', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ filmKey, filmTitle: title })
        });
        
        if (res.ok) {
          setIsInWatchlist(true);
          onChange?.();
        }
      }
      
      // Animate
      setIsAnimating(true);
      setTimeout(() => setIsAnimating(false), 300);
      
    } catch (error) {
      console.error('Error updating watchlist:', error);
    } finally {
      setIsLoading(false);
    }
  };
  
  return (
    <button
      onClick={handleClick}
      disabled={isLoading}
      className={`p-2 rounded-full transition-all duration-200 cursor-pointer hover:scale-110 hover:shadow-md transform ${
        isAnimating ? 'scale-125' : 'scale-100'
      } ${
        isInWatchlist 
          ? 'bg-red-100 hover:bg-red-200 text-red-600' 
          : 'bg-gray-100 hover:bg-gray-200 text-gray-400'
      } ${
        isLoading ? 'opacity-50 cursor-not-allowed' : ''
      } ${
        !user ? 'hover:bg-blue-100 hover:text-blue-600' : ''
      }`}
      title={
        !user 
          ? 'Login to add to watchlist' 
          : isInWatchlist 
            ? 'Remove from watchlist' 
            : 'Add to watchlist'
      }
      aria-label={
        !user 
          ? 'Login to add to watchlist' 
          : isInWatchlist 
            ? 'Remove from watchlist' 
            : 'Add to watchlist'
      }
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

