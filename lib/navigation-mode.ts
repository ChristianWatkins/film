// Utility functions for managing navigation mode between admin and main pages

export type NavigationMode = 'normal' | 'presentation';

const NAVIGATION_MODE_KEY = 'film-navigation-mode';

export function saveNavigationMode(mode: NavigationMode): void {
  if (typeof window !== 'undefined') {
    localStorage.setItem(NAVIGATION_MODE_KEY, mode);
  }
}

export function getNavigationMode(): NavigationMode {
  if (typeof window !== 'undefined') {
    const saved = localStorage.getItem(NAVIGATION_MODE_KEY);
    if (saved === 'normal' || saved === 'presentation') {
      return saved;
    }
  }
  return 'normal'; // Default fallback
}

export function clearNavigationMode(): void {
  if (typeof window !== 'undefined') {
    localStorage.removeItem(NAVIGATION_MODE_KEY);
  }
}