import { describe, expect, it } from 'vitest';
import { calendarDateInTimeZone } from './time-zone';

type TimeZoneCase = [description: string, instant: string, timeZone: string, expected: string];

const timeZoneCases: TimeZoneCase[] = [
  ['just before midnight in London', '2026-11-22T23:59:00Z', 'Europe/London', '2026-11-22'],
  [
    'the next day in Sydney at the same instant',
    '2026-11-22T23:59:00Z',
    'Australia/Sydney',
    '2026-11-23',
  ],
  ['the previous day in New York', '2026-11-23T03:00:00Z', 'America/New_York', '2026-11-22'],
  ['London before the clocks go forward', '2026-03-29T00:30:00Z', 'Europe/London', '2026-03-29'],
  ['London after the clocks go forward', '2026-03-29T23:30:00Z', 'Europe/London', '2026-03-30'],
  [
    'Sydney the evening before daylight saving starts',
    '2026-10-03T13:30:00Z',
    'Australia/Sydney',
    '2026-10-03',
  ],
  [
    'Sydney just after midnight once daylight saving has started',
    '2026-10-04T13:30:00Z',
    'Australia/Sydney',
    '2026-10-05',
  ],
  ['a half-hour offset in Adelaide', '2026-11-22T13:15:00Z', 'Australia/Adelaide', '2026-11-22'],
  [
    'a new year in Auckland before London',
    '2026-12-31T11:30:00Z',
    'Pacific/Auckland',
    '2027-01-01',
  ],
  ['UTC', '2026-11-22T00:00:00Z', 'UTC', '2026-11-22'],
];

describe('calendarDateInTimeZone', () => {
  it.each(timeZoneCases)('gives %s', (_, instant, timeZone, expected) => {
    expect(calendarDateInTimeZone(instant, timeZone)).toBe(expected);
  });

  it('rejects an unknown time zone', () => {
    expect(() => calendarDateInTimeZone('2026-11-22T00:00:00Z', 'Mars/Olympus_Mons')).toThrow(
      'Unknown time zone: Mars/Olympus_Mons',
    );
  });

  it.each(['yesterday', '2026-11-22', '2026-11-22T10:00:00'])('rejects instant %s', (instant) => {
    expect(() => calendarDateInTimeZone(instant, 'Europe/London')).toThrow(
      `Expected a UTC instant like 2026-11-22T08:30:00Z, got ${instant}`,
    );
  });
});
