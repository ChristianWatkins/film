import streamingConfig from '@/config/app-config.json';
import type { StreamingProvider } from './types';

export interface PlatformConfig {
  name: string;
  enabled: boolean;
}

export interface StreamingConfig {
  platforms: PlatformConfig[];
  hideRentBuyIfStreaming: boolean;
  hideBuyIfRent: boolean;
  showOnlyFirstMatch: boolean;
  showMoreIndicator: boolean;
  hideDisabledPlatforms: boolean;
  enableCardAnimations: boolean;
}

// Get the config
export function getStreamingConfig(): StreamingConfig {
  return streamingConfig as StreamingConfig;
}

// Sort providers by array order (index = priority)
export function sortProvidersByPreference(providers: StreamingProvider[]): StreamingProvider[] {
  const config = getStreamingConfig();
  
  return [...providers].sort((a, b) => {
    const indexA = config.platforms.findIndex(p => p.name === a.provider);
    const indexB = config.platforms.findIndex(p => p.name === b.provider);
    
    // If both in list, sort by index (lower index = higher priority)
    if (indexA !== -1 && indexB !== -1) {
      return indexA - indexB;
    }
    
    // Prefer items in the list
    if (indexA !== -1) return -1;
    if (indexB !== -1) return 1;
    
    // Both not in list, keep original order
    return 0;
  });
}

// Filter to only enabled platforms
export function filterEnabledProviders(providers: StreamingProvider[]): StreamingProvider[] {
  const config = getStreamingConfig();
  
  if (!config.hideDisabledPlatforms) {
    return providers; // Show all if not hiding
  }
  
  return providers.filter(provider => {
    const platformConfig = config.platforms.find(p => p.name === provider.provider);
    // Only show platforms that are explicitly enabled
    return platformConfig && platformConfig.enabled;
  });
}

// Get the best available provider (first in array order + enabled)
export function getBestProvider(providers: StreamingProvider[]): StreamingProvider | null {
  if (!providers || providers.length === 0) return null;
  
  // Filter to enabled only
  const enabled = filterEnabledProviders(providers);
  if (enabled.length === 0) return null;
  
  // Sort by array order
  const sorted = sortProvidersByPreference(enabled);
  return sorted[0];
}

// Check if should show rent/buy based on streaming availability
export function shouldShowRentBuy(hasStreaming: boolean): boolean {
  const config = getStreamingConfig();
  if (config.hideRentBuyIfStreaming && hasStreaming) {
    return false;
  }
  return true;
}

// Check if should show buy based on rent availability
export function shouldShowBuy(hasRent: boolean): boolean {
  const config = getStreamingConfig();
  if (config.hideBuyIfRent && hasRent) {
    return false;
  }
  return true;
}

// Check if there are enabled streaming providers available
export function hasEnabledStreaming(providers: StreamingProvider[]): boolean {
  if (!providers || providers.length === 0) return false;
  
  const enabled = filterEnabledProviders(providers);
  return enabled.length > 0;
}

// Check if there are enabled rent providers available
export function hasEnabledRent(providers: StreamingProvider[]): boolean {
  if (!providers || providers.length === 0) return false;
  
  const enabled = filterEnabledProviders(providers);
  return enabled.length > 0;
}

// Check if card animations should be enabled
export function shouldEnableCardAnimations(): boolean {
  const config = getStreamingConfig();
  return config.enableCardAnimations !== false; // Default to true if not specified
}
