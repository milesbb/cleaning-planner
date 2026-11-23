import { act, renderHook } from '@testing-library/react';
import { renderToString } from 'react-dom/server';
import { createElement } from 'react';
import type { ReactNode } from 'react';
import { afterEach, describe, expect, it } from 'vitest';
import { useMediaQuery } from './use-media-query';

type ChangeListener = () => void;

const WIDE = '(min-width: 1024px)';
const defaultMatchMedia = Object.getOwnPropertyDescriptor(window, 'matchMedia');

// A window whose `matchingQueries` match; `change` makes a new set match and
// tells the listeners, as a browser does when the window is resized.
function fakeWindowMatching(matchingQueries: readonly string[]): {
  change: (nowMatching: readonly string[]) => void;
  listenerCount: () => number;
} {
  let matching = new Set(matchingQueries);
  const listeners = new Set<ChangeListener>();
  Object.defineProperty(window, 'matchMedia', {
    configurable: true,
    writable: true,
    value: (query: string) => ({
      get matches(): boolean {
        return matching.has(query);
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
    change: (nowMatching): void => {
      matching = new Set(nowMatching);
      act(() => {
        listeners.forEach((listener) => {
          listener();
        });
      });
    },
    listenerCount: (): number => listeners.size,
  };
}

function ShowsWhetherWide(): ReactNode {
  return useMediaQuery(WIDE) ? 'wide' : 'narrow';
}

afterEach(() => {
  if (defaultMatchMedia !== undefined) {
    Object.defineProperty(window, 'matchMedia', defaultMatchMedia);
  }
});

describe('useMediaQuery', () => {
  it('says whether the query matches now', () => {
    fakeWindowMatching([WIDE]);
    expect(renderHook(() => useMediaQuery(WIDE)).result.current).toBe(true);
    expect(renderHook(() => useMediaQuery('(pointer: fine)')).result.current).toBe(false);
  });

  it('follows the query as it starts and stops matching', () => {
    const fakeWindow = fakeWindowMatching([]);
    const { result } = renderHook(() => useMediaQuery(WIDE));
    expect(result.current).toBe(false);
    fakeWindow.change([WIDE]);
    expect(result.current).toBe(true);
    fakeWindow.change([]);
    expect(result.current).toBe(false);
  });

  it('stops listening once unmounted', () => {
    const fakeWindow = fakeWindowMatching([]);
    const { unmount } = renderHook(() => useMediaQuery(WIDE));
    expect(fakeWindow.listenerCount()).toBe(1);
    unmount();
    expect(fakeWindow.listenerCount()).toBe(0);
  });

  it('is false while the page is prerendered, before hydration', () => {
    fakeWindowMatching([WIDE]);
    expect(renderToString(createElement(ShowsWhetherWide))).toBe('narrow');
  });
});
