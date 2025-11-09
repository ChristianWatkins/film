/**
 * User preferences stored in localStorage
 */

type ViewMode = 'presentation' | 'normal';

const STORAGE_KEY = 'lastUsedMode';

/**
 * Get the last used view mode from localStorage.
 * Defaults to 'presentation' for new users.
 */
export function getLastUsedMode(): ViewMode {
  if (typeof window === 'undefined') {
    return 'presentation'; // Server-side default
  }

  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved === 'presentation' || saved === 'normal') {
      return saved;
    }
  } catch (error) {
    console.warn('Failed to read lastUsedMode from localStorage:', error);
  }

  return 'presentation'; // Default for new users
}

/**
 * Save the current view mode to localStorage.
 */
export function saveLastUsedMode(mode: ViewMode): void {
  if (typeof window === 'undefined') {
    return; // Skip on server-side
  }

  try {
    localStorage.setItem(STORAGE_KEY, mode);
  } catch (error) {
    console.warn('Failed to save lastUsedMode to localStorage:', error);
  }
}

