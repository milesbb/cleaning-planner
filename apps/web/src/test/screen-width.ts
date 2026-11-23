import { LAPTOP_MEDIA_QUERY } from '@/components/shell/use-is-laptop';

// jsdom has no screen: makes `window.matchMedia` answer as a laptop (1024px or
// wider) or a phone would, for screens that lay out differently on each.
export function pretendTheScreenIs(size: 'laptop' | 'phone'): void {
  Object.defineProperty(window, 'matchMedia', {
    configurable: true,
    writable: true,
    value: (query: string) => ({
      matches: size === 'laptop' && query === LAPTOP_MEDIA_QUERY,
      media: query,
      addEventListener: (): void => undefined,
      removeEventListener: (): void => undefined,
    }),
  });
}
