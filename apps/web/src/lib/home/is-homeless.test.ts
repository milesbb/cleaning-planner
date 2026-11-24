import { describe, expect, it } from 'vitest';
import { isHomeless } from './is-homeless';

const HOME = { id: 'home-1', name: 'Our flat', role: 'owner' as const };

describe('isHomeless', () => {
  it('is true once the API says there are no homes', () => {
    expect(isHomeless({ data: [], isFetching: false })).toBe(true);
  });

  it('waits while a saved empty list is being refreshed, since it may be out of date', () => {
    expect(isHomeless({ data: [], isFetching: true })).toBe(false);
  });

  it('is false with a home, or before anything is known', () => {
    expect(isHomeless({ data: [HOME], isFetching: false })).toBe(false);
    expect(isHomeless({ data: undefined, isFetching: true })).toBe(false);
  });
});
