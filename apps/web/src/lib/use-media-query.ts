import { useCallback, useSyncExternalStore } from 'react';

function matchesWhilePrerendering(): boolean {
  return false;
}

// Whether a CSS media query matches, following changes such as a resize. False
// while the static export is prerendered, then the real answer once hydrated.
export function useMediaQuery(query: string): boolean {
  const subscribe = useCallback(
    (onChange: () => void): (() => void) => {
      const mediaQuery = window.matchMedia(query);
      mediaQuery.addEventListener('change', onChange);
      return (): void => {
        mediaQuery.removeEventListener('change', onChange);
      };
    },
    [query],
  );
  const matchesNow = useCallback((): boolean => window.matchMedia(query).matches, [query]);
  return useSyncExternalStore(subscribe, matchesNow, matchesWhilePrerendering);
}
