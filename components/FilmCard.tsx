'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { Film } from '@/lib/types';
import AwardBadge from './AwardBadge';
import StreamingBadge from './StreamingBadge';
import WatchlistButton from './WatchlistButton';
import { shouldShowRentBuy, shouldShowBuy } from '@/lib/streaming-config';

interface FilmCardProps {
  film: Film;
  isFlipped: boolean;
  onFlip: () => void;
  onGenreClick?: (genre: string) => void;
  onWatchlistChange?: () => void;
}

export default function FilmCard({ film, isFlipped, onFlip, onGenreClick, onWatchlistChange }: FilmCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isTextTruncated, setIsTextTruncated] = useState(false);
  const synopsisRef = useRef<HTMLDivElement>(null);
  const textRef = useRef<HTMLParagraphElement>(null);

  // Helper function to get country code
  const getCountryCode = (country: string): string => {
    const countryCodes: { [key: string]: string } = {
      'Norway': 'NOR',
      'United States': 'USA',
      'USA': 'USA',
      'United Kingdom': 'UK',
      'UK': 'UK',
      'France': 'FRA',
      'Germany': 'GER',
      'Italy': 'ITA',
      'Spain': 'ESP',
      'Canada': 'CAN',
      'Australia': 'AUS',
      'Japan': 'JPN',
      'South Korea': 'KOR',
      'China': 'CHN',
      'Brazil': 'BRA',
      'Mexico': 'MEX',
      'Russia': 'RUS',
      'India': 'IND',
      'Sweden': 'SWE',
      'Denmark': 'DEN',
      'Finland': 'FIN',
      'Netherlands': 'NED',
      'Belgium': 'BEL',
      'Switzerland': 'SUI',
      'Austria': 'AUT',
      'Poland': 'POL',
      'Czech Republic': 'CZE',
      'Hungary': 'HUN',
      'Argentina': 'ARG',
      'Chile': 'CHI',
      'South Africa': 'RSA',
      'Turkey': 'TUR',
      'Greece': 'GRE',
      'Portugal': 'POR',
      'Ireland': 'IRE',
      'Israel': 'ISR',
      'Iran': 'IRN',
      'Thailand': 'THA',
      'Indonesia': 'IDN',
      'Philippines': 'PHI',
      'Malaysia': 'MAS',
      'Singapore': 'SGP',
      'New Zealand': 'NZL',
      'Egypt': 'EGY',
      'Morocco': 'MAR',
      'Nigeria': 'NGA',
      'Kenya': 'KEN',
      'Colombia': 'COL',
      'Peru': 'PER',
      'Venezuela': 'VEN',
      'Ukraine': 'UKR',
      'Romania': 'ROU',
      'Bulgaria': 'BUL',
      'Serbia': 'SRB',
      'Croatia': 'CRO',
      'Slovenia': 'SVN',
      'Slovakia': 'SVK',
      'Lithuania': 'LTU',
      'Latvia': 'LAT',
      'Estonia': 'EST'
    };
    return countryCodes[country] || country.substring(0, 3).toUpperCase();
  };
  
  useEffect(() => {
    if (isFlipped && synopsisRef.current && textRef.current && !isExpanded) {
      const containerHeight = synopsisRef.current.clientHeight;
      const textHeight = textRef.current.scrollHeight;
      setIsTextTruncated(textHeight > containerHeight);
    }
  }, [isFlipped, isExpanded, film.synopsis]);
  
  const handleCardClick = (e: React.MouseEvent) => {
    // Don't flip if clicking on buttons or links
    if ((e.target as HTMLElement).closest('button, a')) {
      return;
    }
    onFlip();
    // Reset synopsis expansion when card flips
    setIsExpanded(false);
    setIsTextTruncated(false);
  };

  const handleTrailerClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    const trailerUrl = `${film.mubiLink}/trailer`;
    
    // Open in new window with maximized dimensions
    const screenWidth = window.screen.width;
    const screenHeight = window.screen.height;
    
    const trailerWindow = window.open(
      trailerUrl,
      'trailer',
      `width=${screenWidth},height=${screenHeight},left=0,top=0,toolbar=no,menubar=no,location=no,status=no,resizable=yes,scrollbars=no`
    );
    
    // Try to focus the new window
    if (trailerWindow) {
      trailerWindow.focus();
    }
  };

  return (
    <div className="w-full h-full relative" style={{ perspective: '1000px' }}>
      <AnimatePresence mode="wait" initial={false}>
        {!isFlipped ? (
          <motion.div
            key="front"
            initial={{ rotateY: 0 }}
            animate={{ rotateY: 0 }}
            exit={{ rotateY: -180 }}
            transition={{ duration: 0.6, ease: "easeInOut" }}
            className="w-full h-full cursor-pointer"
            onClick={handleCardClick}
            style={{ 
              transformStyle: 'preserve-3d',
              backfaceVisibility: 'hidden'
            }}
          >
        <div className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-xl transition-shadow duration-300 flex flex-col h-full relative">
          {/* Flip indicator - top right corner */}
          <div className="absolute top-3 right-3 z-20 bg-black/60 rounded-full p-1.5 opacity-70 hover:opacity-100 transition-opacity">
            <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </div>

          {/* Poster Image - clickable to MUBI */}
          <a
            href={film.mubiLink}
            target="_blank"
            rel="noopener noreferrer"
            className="block relative w-full aspect-[2/3] group"
            onClick={(e) => e.stopPropagation()}
          >
            {film.posterUrl ? (
              <div className="relative w-full h-full bg-gray-200">
                <img
                  src={film.posterUrl}
                  alt={film.title}
                  className="w-full h-full object-cover group-hover:opacity-90 transition-opacity"
                  loading="lazy"
                />
                {/* Watchlist button - top left to avoid flip indicator */}
                <div className="absolute top-2 left-2 z-10">
                  <WatchlistButton filmKey={film.filmKey} title={film.title} onChange={onWatchlistChange} />
                </div>
                
                {/* Award badges overlay on poster */}
                {film.awarded && film.awards.length > 0 && (
                  <div className="absolute bottom-2 left-2 right-12">
                    <AwardBadge awards={film.awards} compact />
                  </div>
                )}
              </div>
            ) : (
              <div className="relative w-full h-full bg-gradient-to-br from-gray-200 to-gray-300 flex items-center justify-center group-hover:from-gray-300 group-hover:to-gray-400 transition-colors">
                <div className="text-center p-4">
                  <div className="text-4xl mb-2">🎬</div>
                  <p className="text-xs text-gray-500 font-medium">No poster available</p>
                </div>
                {/* Watchlist button - top left to avoid flip indicator */}
                <div className="absolute top-2 left-2 z-10">
                  <WatchlistButton filmKey={film.filmKey} title={film.title} onChange={onWatchlistChange} />
                </div>
                
                {/* Award badges overlay on placeholder */}
                {film.awarded && film.awards.length > 0 && (
                  <div className="absolute bottom-2 left-2 right-12">
                    <AwardBadge awards={film.awards} compact />
                  </div>
                )}
              </div>
            )}
          </a>
          
          {/* Film info - flex-1 to push buttons to bottom */}
          <div className="p-4 flex flex-col flex-1">
            <h3 className="font-bold text-lg mb-1 line-clamp-2 text-gray-900">{film.title}</h3>
            
            {film.director && (
              <p className="text-sm text-gray-700 mb-1">{film.director}</p>
            )}
            
            <p className="text-sm text-gray-600 mb-3">
              {film.country && <span>{film.country}</span>}
              {film.country && film.year && <span> • </span>}
              {film.year && <span>{film.year}</span>}
            </p>
            
            {/* Spacer to push content down */}
            <div className="flex-1"></div>
            
            {/* Streaming info - just above buttons */}
            <div className="space-y-1 mb-3">
              <StreamingBadge providers={film.streaming} type="streaming" />
              
              {/* Only show rent/buy if no streaming OR if config allows */}
              {shouldShowRentBuy(film.hasStreaming) && (
                <>
                  <StreamingBadge providers={film.rent} type="rent" />
                  {/* Only show buy if no rent OR if config allows */}
                  {shouldShowBuy(film.hasRent) && (
                    <StreamingBadge providers={film.buy} type="buy" />
                  )}
                </>
              )}
              
              {!film.hasStreaming && !film.hasRent && !film.hasBuy && (
                <p className="text-xs text-gray-400 italic">
                  Not available in Norway
                </p>
              )}
            </div>
            
            {/* Action buttons - anchored at bottom */}
            <div className="flex gap-1 mt-auto">
              <a
                href={film.mubiLink}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 px-2 py-2 bg-[#1A1A2E] text-white text-xs font-semibold rounded hover:bg-[#0F0F1E] transition-colors flex items-center justify-center"
                onClick={(e) => e.stopPropagation()}
              >
                MUBI
              </a>
              
              <button
                onClick={handleTrailerClick}
                className="px-2 py-2 bg-[#1A1A2E] text-white text-xs font-medium rounded hover:bg-[#0F0F1E] transition-colors flex items-center justify-center cursor-pointer"
                title="Watch trailer fullscreen"
              >
                <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M8 5v14l11-7z"/>
                </svg>
              </button>
              
              {film.justwatchLink && (
                <a
                  href={film.justwatchLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-2 py-2 bg-[#1A1A2E] text-[#FFB800] text-xs font-semibold rounded hover:bg-[#0F0F1E] transition-colors whitespace-nowrap flex items-center justify-center"
                  title="View streaming options on JustWatch"
                  onClick={(e) => e.stopPropagation()}
                >
                  JustWatch
                </a>
              )}
            </div>
          </div>
        </div>
      </motion.div>

        ) : (
          <motion.div
            key="back"
            initial={{ rotateY: 180 }}
            animate={{ rotateY: 0 }}
            exit={{ rotateY: 180 }}
            transition={{ duration: 0.4, ease: "easeInOut" }}
            className="w-full h-full cursor-pointer"
            onClick={handleCardClick}
            style={{ 
              transformStyle: 'preserve-3d',
              backfaceVisibility: 'hidden'
            }}
          >
        <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 rounded-lg shadow-xl overflow-hidden hover:shadow-2xl transition-all duration-300 flex flex-col h-full border border-slate-700 relative">
          {/* Subtle pattern overlay */}
          <div className="absolute inset-0 opacity-10 bg-gradient-to-br from-transparent via-white/5 to-transparent pointer-events-none"></div>
          
          {/* Back indicator - top right corner */}
          <div className="absolute top-3 right-3 z-20 bg-white/10 backdrop-blur-sm rounded-full p-1.5 border border-white/20">
            <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </div>

          {/* Back content */}
          <div className="p-4 flex flex-col h-full text-left relative z-10">
            {/* Header */}
            <motion.div
              initial={false}
              animate={{ 
                opacity: isFlipped ? 1 : 0,
                y: isFlipped ? 0 : -20
              }}
              transition={{ delay: isFlipped ? 0.1 : 0, duration: 0.3 }}
              className="text-center mb-3"
            >
              <h3 className="text-lg font-bold text-white mb-1 leading-tight">
                {film.title}
              </h3>
              <div className="text-sm text-slate-300 space-y-1">
                {film.director && (
                  <div className="font-medium text-slate-200 text-sm">{film.director}</div>
                )}
                <div className="flex items-center justify-center gap-1.5 text-xs">
                  {film.year && (
                    <span className="bg-white/10 px-2 rounded text-xs h-6 inline-flex items-center justify-center">
                      {film.year}
                    </span>
                  )}
                  {film.runtime && (
                    <span className="bg-white/10 px-2 rounded text-xs h-6 inline-flex items-center justify-center gap-1">
                      {film.runtime}<span className="text-[9px] opacity-60">min</span>
                    </span>
                  )}
                  {film.country && (
                    <span className="relative group">
                      <span className="bg-white/10 px-2 rounded text-xs h-6 inline-flex items-center justify-center cursor-help">
                        {getCountryCode(film.country)}
                      </span>
                      <span className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 text-xs text-white bg-black/90 rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none z-50">
                        {film.country}
                        <span className="absolute top-full left-1/2 transform -translate-x-1/2 border-l-4 border-r-4 border-t-4 border-transparent border-t-black/90"></span>
                      </span>
                    </span>
                  )}
                </div>
              </div>
            </motion.div>

            {/* Genres and Rating Row */}
            <div className="flex flex-col gap-2 mb-3">
              {/* Genres */}
              {film.genres && film.genres.length > 0 && (
                <motion.div
                  initial={false}
                  animate={{ 
                    opacity: isFlipped ? 1 : 0,
                    x: isFlipped ? 0 : -20
                  }}
                  transition={{ delay: isFlipped ? 0.15 : 0, duration: 0.3 }}
                >
                  <div className="flex flex-wrap gap-1 justify-center">
                    {film.genres.slice(0, 4).map((genre, idx) => (
                      <button
                        key={idx}
                        onClick={(e) => {
                          e.stopPropagation();
                          onGenreClick?.(genre);
                          onFlip(); // Flip card back to front side
                        }}
                        className="px-2 py-0.5 bg-gradient-to-r from-blue-500/20 to-purple-500/20 text-blue-200 text-xs font-medium rounded-full border border-blue-400/30 backdrop-blur-sm hover:from-blue-500/30 hover:to-purple-500/30 hover:border-blue-300/50 transition-all duration-200 cursor-pointer"
                        title={`Filter by ${genre}`}
                      >
                        {genre}
                      </button>
                    ))}
                  </div>
                </motion.div>
              )}
            </div>

            {/* Synopsis - expandable */}
            {film.synopsis && (
              <motion.div
                initial={false}
                animate={{ 
                  opacity: isFlipped ? 1 : 0,
                  y: isFlipped ? 0 : 20
                }}
                transition={{ delay: isFlipped ? 0.2 : 0, duration: 0.3 }}
                className="mb-3"
              >
                <h4 className="text-xs font-semibold text-slate-200 mb-1 mt-1 flex items-center gap-1 flex-shrink-0">
                  <span className="w-0.5 h-3 bg-gradient-to-b from-blue-400 to-purple-400 rounded-full"></span>
                  Synopsis
                </h4>
                <motion.div
                  ref={synopsisRef}
                  initial={false}
                  animate={{ 
                    maxHeight: isExpanded ? '20rem' : '12rem'
                  }}
                  transition={{ duration: 0.3, ease: 'easeInOut' }}
                  className="overflow-hidden"
                >
                  <p ref={textRef} className="text-xs text-slate-300 leading-relaxed">
                    {film.synopsis}
                  </p>
                </motion.div>
                {isTextTruncated && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setIsExpanded(!isExpanded);
                    }}
                    className="mt-2 text-xs text-blue-300 hover:text-blue-200 transition-colors focus:outline-none self-start flex-shrink-0"
                  >
                    {isExpanded ? 'Show less' : 'Show all'}
                  </button>
                )}
              </motion.div>
            )}

            {/* Bottom section - Cast and Festivals */}
            <div className="space-y-2">
              {/* Cast - compact */}
              {film.cast && film.cast.length > 0 && (
                <motion.div
                  initial={false}
                  animate={{ 
                    opacity: isFlipped ? 1 : 0,
                    y: isFlipped ? 0 : 20
                  }}
                  transition={{ delay: isFlipped ? 0.25 : 0, duration: 0.3 }}
                >
                  <h4 className="text-xs font-semibold text-slate-200 mb-1 mt-1 flex items-center gap-1">
                    <span className="w-0.5 h-3 bg-gradient-to-b from-green-400 to-teal-400 rounded-full"></span>
                    Cast
                  </h4>
                  <p className="text-xs text-slate-300">
                    {film.cast.slice(0, 3).join(', ')}
                    {film.cast.length > 3 && <span className="text-slate-400"> & others</span>}
                  </p>
                </motion.div>
              )}
              
              {/* Festival appearances - compact */}
              <motion.div
                initial={false}
                animate={{ 
                  opacity: isFlipped ? 1 : 0,
                  y: isFlipped ? 0 : 20
                }}
                transition={{ delay: isFlipped ? 0.3 : 0, duration: 0.3 }}
              >
                <h4 className="text-xs font-semibold text-slate-200 mb-1 mt-3 flex items-center gap-1">
                  <span className="w-0.5 h-3 bg-gradient-to-b from-amber-400 to-orange-400 rounded-full"></span>
                  Festivals
                </h4>
                <div className="flex flex-wrap gap-1">
                  {film.festivals.slice(0, 3).map((festival, idx) => (
                    <span
                      key={idx}
                      className="px-2 py-0.5 text-xs font-medium rounded border backdrop-blur-sm bg-white/10 text-slate-300 border-white/20"
                    >
                      {festival.name.toUpperCase()} {festival.year}
                    </span>
                  ))}
                  {film.festivals.length > 3 && (
                    <span className="text-xs text-slate-400 px-1">+{film.festivals.length - 3} more</span>
                  )}
                </div>
              </motion.div>
            </div>

            {/* Footer */}
            <motion.div
              initial={false}
              animate={{ 
                opacity: isFlipped ? 1 : 0
              }}
              transition={{ delay: isFlipped ? 0.35 : 0, duration: 0.3 }}
              className="pt-3 border-t border-white/10 mt-auto"
            >
              {/* Action buttons - same as front card */}
              <div className="flex gap-1">
                <a
                  href={film.mubiLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 text-center px-2 py-2 bg-[#1A1A2E] text-white text-xs font-medium rounded hover:bg-[#0F0F1E] transition-colors"
                  onClick={(e) => e.stopPropagation()}
                >
                  MUBI
                </a>
                
                <button
                  onClick={handleTrailerClick}
                  className="px-2 py-2 bg-[#1A1A2E] text-white text-xs font-medium rounded hover:bg-[#0F0F1E] transition-colors flex items-center justify-center cursor-pointer"
                  title="Watch trailer fullscreen"
                >
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M8 5v14l11-7z"/>
                  </svg>
                </button>
                
                {film.justwatchLink && (
                  <a
                    href={film.justwatchLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-2 py-2 bg-[#1A1A2E] text-[#FFB800] text-xs font-semibold rounded hover:bg-[#0F0F1E] transition-colors whitespace-nowrap"
                    title="View streaming options on JustWatch"
                    onClick={(e) => e.stopPropagation()}
                  >
                    JustWatch
                  </a>
                )}
              </div>
            </motion.div>
          </div>
        </div>
      </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

