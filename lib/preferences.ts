/**
 * User preferences stored in localStorage
 * Presentation mode is now the only available mode
 */

type ViewMode = 'presentation';

/**
 * Get the last used view mode.
 * Always returns 'presentation' since it's the only available mode.
 */
export function getLastUsedMode(): ViewMode {
  return 'presentation';
}

/**
 * Save the current view mode to localStorage.
 * Always saves 'presentation' since it's the only available mode.
 */
export function saveLastUsedMode(mode: ViewMode): void {
  // No-op: mode is always 'presentation' now
  // Keeping function for API compatibility but it doesn't need to do anything
}

