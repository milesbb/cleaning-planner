import { describe, expect, it } from 'vitest';
import { days, months, weeks } from './intervals';
import { isRecommendedInterval, recommendationText } from './recommended-range';

describe('recommendationText', () => {
  it('describes a range', () => {
    expect(
      recommendationText({
        shortest: { value: 1, unit: 'week' },
        longest: { value: 2, unit: 'week' },
      }),
    ).toBe('Most homes do this weekly to fortnightly.');
  });

  it('describes a single recommendation', () => {
    expect(
      recommendationText({
        shortest: { value: 1, unit: 'month' },
        longest: { value: 1, unit: 'month' },
      }),
    ).toBe('Most homes do this monthly.');
  });
});

describe('isRecommendedInterval', () => {
  const range = { shortest: weeks(2), longest: months(3) };

  it.each([
    [weeks(2), true],
    [days(14), true],
    [months(1), true],
    [months(3), true],
    [days(13), false],
    [weeks(1), false],
    [months(4), false],
  ])('says whether %o is within two weeks to three months', (interval, isRecommended) => {
    expect(isRecommendedInterval(interval, range)).toBe(isRecommended);
  });
});
