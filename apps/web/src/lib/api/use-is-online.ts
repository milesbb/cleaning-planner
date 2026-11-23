import { onlineManager } from '@tanstack/react-query';
import { useSyncExternalStore } from 'react';

function isOnlineWhilePrerendering(): boolean {
  return true;
}

// TanStack Query assumes it starts online and only hears later changes. A browser
// that says it is offline is right (one that says online may not be), so start
// offline then and keep changes made before a restart paused until the connection returns.
export function startOfflineIfTheBrowserIs(): void {
  const isInBrowser = typeof window !== 'undefined';
  if (isInBrowser && !navigator.onLine) onlineManager.setOnline(false);
}

// The same online state TanStack Query uses to pause and resume requests.
export function useIsOnline(): boolean {
  return useSyncExternalStore(
    (onChange) => onlineManager.subscribe(onChange),
    () => onlineManager.isOnline(),
    isOnlineWhilePrerendering,
  );
}
