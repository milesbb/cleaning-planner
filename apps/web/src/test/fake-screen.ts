import { act } from '@testing-library/react';
import { LAPTOP_MEDIA_QUERY } from '@/components/shell/use-is-laptop';

type ChangeListener = () => void;

export interface FakeScreen {
  resize: (isLaptop: boolean) => void;
}

const defaultMatchMedia = Object.getOwnPropertyDescriptor(window, 'matchMedia');

// A window that is laptop width (1024px and wider) or not, for components that
// use `useIsLaptop`. Call `restoreScreen` after each test.
export function fakeScreenOf(isLaptop: boolean): FakeScreen {
  let matches = isLaptop;
  const listeners = new Set<ChangeListener>();
  Object.defineProperty(window, 'matchMedia', {
    configurable: true,
    writable: true,
    value: (query: string) => ({
      get matches(): boolean {
        return query === LAPTOP_MEDIA_QUERY && matches;
      },
      media: query,
      addEventListener: (_: string, listener: ChangeListener): void => {
        listeners.add(listener);
      },
      removeEventListener: (_: string, listener: ChangeListener): void => {
        listeners.delete(listener);
      },
    }),
  });
  return {
    resize: (isNowLaptop: boolean): void => {
      matches = isNowLaptop;
      act(() => {
        listeners.forEach((listener) => {
          listener();
        });
      });
    },
  };
}

export function restoreScreen(): void {
  if (defaultMatchMedia !== undefined) {
    Object.defineProperty(window, 'matchMedia', defaultMatchMedia);
  }
}
