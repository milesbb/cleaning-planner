import { describe, expect, it } from 'vitest';
import { approximateDays, describeInterval } from './interval';
import type { Interval } from './types';

type DescriptionCase = [interval: Interval, expected: string];

const descriptionCases: DescriptionCase[] = [
  [{ value: 1, unit: 'day' }, 'daily'],
  [{ value: 3, unit: 'day' }, 'every 3 days'],
  [{ value: 1, unit: 'week' }, 'weekly'],
  [{ value: 2, unit: 'week' }, 'fortnightly'],
  [{ value: 6, unit: 'week' }, 'every 6 weeks'],
  [{ value: 1, unit: 'month' }, 'monthly'],
  [{ value: 3, unit: 'month' }, 'every 3 months'],
  [{ value: 6, unit: 'month' }, 'every 6 months'],
];

describe('describeInterval', () => {
  it.each(descriptionCases)('describes %o as "%s"', (interval, expected) => {
    expect(describeInterval(interval)).toBe(expected);
  });
});

describe('approximateDays', () => {
  it.each<[Interval, number]>([
    [{ value: 3, unit: 'day' }, 3],
    [{ value: 2, unit: 'week' }, 14],
    [{ value: 3, unit: 'month' }, 90],
  ])('treats %o as about %i days', (interval, expected) => {
    expect(approximateDays(interval)).toBe(expected);
  });
});
