'use client';

import { useState } from 'react';
import type { StreamingProvider } from '@/lib/types';
import { getBestProvider, getStreamingConfig, filterEnabledProviders, sortProvidersByPreference } from '@/lib/streaming-config';

interface StreamingBadgeProps {
  providers: StreamingProvider[];
  type: 'streaming' | 'rent' | 'buy';
}

const typeLabels = {
  streaming: 'Stream',
  rent: 'Rent',
  buy: 'Buy'
};

export default function StreamingBadge({ providers, type }: StreamingBadgeProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  
  if (!providers || providers.length === 0) return null;
  
  const config = getStreamingConfig();
  const enabledProviders = filterEnabledProviders(providers);
  const sortedProviders = sortProvidersByPreference(enabledProviders);
  
  // Deduplicate by provider name (keep first occurrence - best quality)
  const uniqueProviders: StreamingProvider[] = [];
  const seenProviders = new Set<string>();
  
  sortedProviders.forEach(provider => {
    if (!seenProviders.has(provider.provider)) {
      seenProviders.add(provider.provider);
      uniqueProviders.push(provider);
    }
  });
  
  const bestProvider = uniqueProviders[0];
  if (!bestProvider) return null;
  
  const hasMore = uniqueProviders.length > 1;
  
  return (
    <div className={`text-sm px-3 py-2 bg-gray-50 rounded border-l-2 border-blue-500 ${hasMore ? 'hover:bg-gray-100 transition-colors' : ''}`}>
      <div 
        className={`${hasMore ? 'cursor-pointer hover:text-blue-600 transition-colors' : ''}`}
        onClick={(e) => {
          if (hasMore) {
            e.stopPropagation();
            setIsExpanded(!isExpanded);
          }
        }}
      >
        <span className="font-bold text-gray-900">{typeLabels[type]}:</span>
        {' '}
        <span className="text-gray-700">{bestProvider.provider}</span>
        {hasMore && (
          <span className="text-blue-600 ml-1 text-xs font-medium underline decoration-dotted underline-offset-2 hover:text-blue-700 transition-colors">
            +{uniqueProviders.length - 1}
          </span>
        )}
      </div>
      
      {/* Expanded list of all providers */}
      {isExpanded && hasMore && (
        <div className="mt-2 pt-2 border-t border-gray-200 space-y-1">
          {uniqueProviders.slice(1).map((provider, idx) => (
            <div key={idx} className="text-xs text-gray-600 pl-2">
              {provider.provider}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
