import { useSyncExternalStore } from 'react';

// The width where the tab bar becomes a rail (Tailwind's `lg:`).
export const LAPTOP_MEDIA_QUERY = '(min-width: 1024px)';

function laptopQuery(): MediaQueryList {
  return window.matchMedia(LAPTOP_MEDIA_QUERY);
}

function subscribeToWidth(onChange: () => void): () => void {
  const query = laptopQuery();
  query.addEventListener('change', onChange);
  return (): void => {
    query.removeEventListener('change', onChange);
  };
}

function isLaptopNow(): boolean {
  return laptopQuery().matches;
}

function isLaptopWhilePrerendering(): boolean {
  return false;
}

export function useIsLaptop(): boolean {
  return useSyncExternalStore(subscribeToWidth, isLaptopNow, isLaptopWhilePrerendering);
}
