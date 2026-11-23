import { useMediaQuery } from '@/lib/use-media-query';

// The width where the tab bar becomes a rail (Tailwind's `lg:`).
export const LAPTOP_MEDIA_QUERY = '(min-width: 1024px)';

export function useIsLaptop(): boolean {
  return useMediaQuery(LAPTOP_MEDIA_QUERY);
}
