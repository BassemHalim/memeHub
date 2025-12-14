/**
 * Session storage utilities for tracking meme engagement actions.
 * Prevents duplicate tracking of downloads and shares within the same browser session.
 */

export type EngagementAction = 'download' | 'share';

// Session storage keys for tracking engagement
const STORAGE_KEYS = {
  DOWNLOADED_MEMES: 'memedb_downloaded_memes',
  SHARED_MEMES: 'memedb_shared_memes',
} as const;

/**
 * Checks if session storage is available.
 * Returns false in private browsing mode or when storage is disabled.
 */
function isSessionStorageAvailable(): boolean {
  try {
    const testKey = '__storage_test__';
    sessionStorage.setItem(testKey, 'test');
    sessionStorage.removeItem(testKey);
    return true;
  } catch (e) {
    return false;
  }
}

/**
 * Gets the session storage key for a given action type.
 */
function getStorageKey(action: EngagementAction): string {
  return action === 'download' 
    ? STORAGE_KEYS.DOWNLOADED_MEMES 
    : STORAGE_KEYS.SHARED_MEMES;
}

/**
 * Retrieves the set of tracked meme IDs for a given action from session storage.
 * Returns an empty set if storage is unavailable or data is corrupted.
 */
function getTrackedMemes(action: EngagementAction): Set<string> {
  if (!isSessionStorageAvailable()) {
    return new Set();
  }

  try {
    const key = getStorageKey(action);
    const stored = sessionStorage.getItem(key);
    
    if (!stored) {
      return new Set();
    }

    const parsed = JSON.parse(stored);
    
    // Validate that parsed data is an array
    if (!Array.isArray(parsed)) {
      return new Set();
    }

    return new Set(parsed);
  } catch (e) {
    // Handle JSON parse errors or other exceptions gracefully
    console.warn(`Failed to retrieve tracked memes for ${action}:`, e);
    return new Set();
  }
}

/**
 * Saves the set of tracked meme IDs for a given action to session storage.
 * Fails silently if storage is unavailable.
 */
function saveTrackedMemes(action: EngagementAction, memeIds: Set<string>): void {
  if (!isSessionStorageAvailable()) {
    return;
  }

  try {
    const key = getStorageKey(action);
    const array = Array.from(memeIds);
    sessionStorage.setItem(key, JSON.stringify(array));
  } catch (e) {
    // Handle quota exceeded or other storage errors gracefully
    console.warn(`Failed to save tracked memes for ${action}:`, e);
    
    // If quota exceeded, try to clear old entries and retry
    if (e instanceof DOMException && e.name === 'QuotaExceededError') {
      try {
        const key = getStorageKey(action);
        sessionStorage.removeItem(key);
        sessionStorage.setItem(key, JSON.stringify(Array.from(memeIds)));
      } catch (retryError) {
        // If retry fails, fail silently
        console.warn(`Retry failed for ${action}:`, retryError);
      }
    }
  }
}

/**
 * Checks if a meme action has already been tracked in the current session.
 * 
 * @param memeId - The UUID of the meme
 * @param action - The engagement action type ('download' or 'share')
 * @returns true if the action has been tracked, false otherwise
 * 
 * @example
 * if (!isActionTracked(meme.id, 'download')) {
 *   // Track the download
 * }
 */
export function isActionTracked(memeId: string, action: EngagementAction): boolean {
  const trackedMemes = getTrackedMemes(action);
  return trackedMemes.has(memeId);
}

/**
 * Marks a meme action as tracked in the current session.
 * This prevents duplicate tracking of the same action within the session.
 * 
 * @param memeId - The UUID of the meme
 * @param action - The engagement action type ('download' or 'share')
 * 
 * @example
 * markActionTracked(meme.id, 'download');
 */
export function markActionTracked(memeId: string, action: EngagementAction): void {
  const trackedMemes = getTrackedMemes(action);
  trackedMemes.add(memeId);
  saveTrackedMemes(action, trackedMemes);
}
