import { useEffect, useCallback } from 'react';

/**
 * Custom hook for multi-tab synchronization
 * 
 * Uses BroadcastChannel API to sync state changes across browser tabs.
 * Falls back to localStorage events for older browsers.
 */

type SyncCallback<T> = (data: T) => void;

interface UseSyncOptions<T> {
  /** Channel name for this sync */
  channelName: string;
  /** Callback when data is received from another tab */
  onReceive: SyncCallback<T>;
  /** Enable debug logging */
  debug?: boolean;
}

export function useTabSync<T>({ channelName, onReceive, debug = false }: UseSyncOptions<T>) {
  // Broadcast a message to other tabs
  const broadcast = useCallback((data: T) => {
    if (debug) {
      console.log(`[TabSync:${channelName}] Broadcasting:`, data);
    }

    // Try BroadcastChannel first (modern browsers)
    if (typeof BroadcastChannel !== 'undefined') {
      const channel = new BroadcastChannel(channelName);
      channel.postMessage(data);
      channel.close();
    } else {
      // Fallback to localStorage events
      const key = `__tabsync_${channelName}`;
      localStorage.setItem(key, JSON.stringify({ data, timestamp: Date.now() }));
      // Remove immediately - we only care about the event
      localStorage.removeItem(key);
    }
  }, [channelName, debug]);

  // Listen for messages from other tabs
  useEffect(() => {
    let channel: BroadcastChannel | null = null;

    if (typeof BroadcastChannel !== 'undefined') {
      channel = new BroadcastChannel(channelName);
      channel.onmessage = (event) => {
        if (debug) {
          console.log(`[TabSync:${channelName}] Received:`, event.data);
        }
        onReceive(event.data);
      };
    } else {
      // Fallback: listen to localStorage changes
      const handleStorage = (event: StorageEvent) => {
        if (event.key === `__tabsync_${channelName}` && event.newValue) {
          try {
            const { data } = JSON.parse(event.newValue);
            if (debug) {
              console.log(`[TabSync:${channelName}] Received (localStorage):`, data);
            }
            onReceive(data);
          } catch {
            // Ignore parse errors
          }
        }
      };
      window.addEventListener('storage', handleStorage);
      return () => window.removeEventListener('storage', handleStorage);
    }

    return () => {
      if (channel) {
        channel.close();
      }
    };
  }, [channelName, onReceive, debug]);

  return { broadcast };
}

// Pre-defined sync channels
export const SYNC_CHANNELS = {
  PROGRESS: 'auditpath_progress',
  STREAK: 'auditpath_streak',
  QUIZ_SESSION: 'auditpath_quiz',
} as const;

/**
 * Hook to sync progress updates across tabs
 */
export function useProgressSync(onProgressUpdate: (courseId: string) => void) {
  return useTabSync<{ courseId: string; action: 'video_complete' | 'refresh' }>({
    channelName: SYNC_CHANNELS.PROGRESS,
    onReceive: (data) => {
      onProgressUpdate(data.courseId);
    },
  });
}
