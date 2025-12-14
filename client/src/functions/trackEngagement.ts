/**
 * API client functions for tracking meme engagement (downloads and shares).
 * Implements session-based deduplication to prevent duplicate tracking.
 */

import { isActionTracked, markActionTracked, type EngagementAction } from '@/utils/sessionTracking';

/**
 * Tracks a meme download by sending a POST request to the tracking endpoint.
 * Checks session storage before sending to prevent duplicate tracking.
 * Errors are handled silently to avoid blocking the user's download action.
 * 
 * @param memeId - The UUID of the meme being downloaded
 * 
 * @example
 * // Call when user clicks download button
 * await trackDownload(meme.id);
 * // Then proceed with actual download
 */
export async function trackDownload(memeId: string): Promise<void> {
  await trackEngagement(memeId, 'download');
}

/**
 * Tracks a meme share by sending a POST request to the tracking endpoint.
 * Checks session storage before sending to prevent duplicate tracking.
 * Errors are handled silently to avoid blocking the user's share action.
 * 
 * @param memeId - The UUID of the meme being shared
 * 
 * @example
 * // Call when user clicks share button
 * await trackShare(meme.id);
 * // Then proceed with actual share action
 */
export async function trackShare(memeId: string): Promise<void> {
  await trackEngagement(memeId, 'share');
}

/**
 * Internal function to track engagement actions.
 * Implements the core logic for deduplication and API calls.
 */
async function trackEngagement(memeId: string, action: EngagementAction): Promise<void> {
  // Check if this action has already been tracked in this session
  if (isActionTracked(memeId, action)) {
    return;
  }

  try {
    // Construct the API endpoint URL
    const url = new URL(
      `/api/memes/${memeId}/${action}`,
      process.env.NEXT_PUBLIC_API_HOST
    );

    // Send POST request to tracking endpoint
    const response = await fetch(url.toString(), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Only mark as tracked if the request was successful
    if (response.ok) {
      markActionTracked(memeId, action);
    } else {
      // Log error for debugging but don't throw
      console.warn(`Failed to track ${action} for meme ${memeId}: ${response.status}`);
    }
  } catch (error) {
    // Handle network errors silently - don't block user action
    console.warn(`Error tracking ${action} for meme ${memeId}:`, error);
  }
}
