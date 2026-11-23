import { afterEach, describe, expect, it, vi } from 'vitest';
import { sessionValue } from './session-value';

const draft = sessionValue('cleaning-planner.test-value');

afterEach(() => {
  vi.restoreAllMocks();
  draft.forget();
});

describe('a value kept for this tab', () => {
  it('is remembered in session storage only, so it never goes in a URL or outlives the tab', () => {
    draft.remember('hello');
    expect(draft.read()).toBe('hello');
    expect(window.sessionStorage.length).toBe(1);
    expect(window.localStorage.length).toBe(0);
  });

  it('is gone once forgotten', () => {
    draft.remember('hello');
    draft.forget();
    expect(draft.read()).toBeNull();
  });

  it('is simply missing when the browser blocks storage', () => {
    for (const method of ['setItem', 'getItem', 'removeItem'] as const) {
      vi.spyOn(Storage.prototype, method).mockImplementation(() => {
        throw new DOMException('blocked', 'SecurityError');
      });
    }
    expect(() => {
      draft.remember('hello');
      draft.forget();
    }).not.toThrow();
    expect(draft.read()).toBeNull();
  });
});
