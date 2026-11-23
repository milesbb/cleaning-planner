import { onlineManager } from '@tanstack/react-query';
import { useSyncExternalStore } from 'react';

function isOnlineWhilePrerendering(): boolean {
  return true;
}

// The same online state TanStack Query uses to pause and resume requests.
export function useIsOnline(): boolean {
  return useSyncExternalStore(
    (onChange) => onlineManager.subscribe(onChange),
    () => onlineManager.isOnline(),
    isOnlineWhilePrerendering,
  );
}
