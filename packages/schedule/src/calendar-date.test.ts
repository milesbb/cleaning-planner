import { describe, expect, it } from 'vitest';
import { addInterval, compareDates, isCalendarDate, parseCalendarDate } from './calendar-date';

describe('isCalendarDate', () => {
  it.each(['2026-01-01', '2024-02-29', '2026-12-31'])('accepts %s', (value) => {
    expect(isCalendarDate(value)).toBe(true);
  });

  it.each([
    '2026-1-01',
    '2026-01-1',
    '2026-13-01',
    '2026-02-30',
    '2025-02-29',
    'not-a-date',
    '',
    '2026-01-01T00:00',
  ])('rejects %s', (value) => {
    expect(isCalendarDate(value)).toBe(false);
  });
});

describe('parseCalendarDate', () => {
  it('returns the value when valid', () => {
    expect(parseCalendarDate('2026-11-22')).toBe('2026-11-22');
  });

  it('throws on an invalid date', () => {
    expect(() => parseCalendarDate('2026-02-30')).toThrow('Invalid calendar date: 2026-02-30');
  });
});

describe('addInterval', () => {
  it('adds days across a month boundary', () => {
    expect(addInterval(parseCalendarDate('2026-01-30'), { value: 3, unit: 'day' })).toBe(
      '2026-02-02',
    );
  });

  it('adds weeks across a year boundary', () => {
    expect(addInterval(parseCalendarDate('2026-12-28'), { value: 2, unit: 'week' })).toBe(
      '2027-01-11',
    );
  });

  it('adds days across a DST change without drifting', () => {
    expect(addInterval(parseCalendarDate('2026-03-28'), { value: 1, unit: 'day' })).toBe(
      '2026-03-29',
    );
    expect(addInterval(parseCalendarDate('2026-10-24'), { value: 2, unit: 'day' })).toBe(
      '2026-10-26',
    );
  });

  it('adds months keeping the day of month', () => {
    expect(addInterval(parseCalendarDate('2026-01-15'), { value: 1, unit: 'month' })).toBe(
      '2026-02-15',
    );
  });

  it('clamps to the last day when the target month is shorter', () => {
    expect(addInterval(parseCalendarDate('2026-01-31'), { value: 1, unit: 'month' })).toBe(
      '2026-02-28',
    );
    expect(addInterval(parseCalendarDate('2028-01-31'), { value: 1, unit: 'month' })).toBe(
      '2028-02-29',
    );
  });

  it('adds months across a year boundary', () => {
    expect(addInterval(parseCalendarDate('2026-11-30'), { value: 3, unit: 'month' })).toBe(
      '2027-02-28',
    );
  });
});

describe('compareDates', () => {
  it('orders dates chronologically', () => {
    const dates = ['2026-03-01', '2025-12-31', '2026-02-28'].map(parseCalendarDate);
    expect([...dates].sort(compareDates)).toEqual(['2025-12-31', '2026-02-28', '2026-03-01']);
  });

  it('returns -1 when the first date is earlier and 1 when it is later', () => {
    const earlier = parseCalendarDate('2026-05-04');
    const later = parseCalendarDate('2026-05-05');
    expect(compareDates(earlier, later)).toBe(-1);
    expect(compareDates(later, earlier)).toBe(1);
  });

  it('returns 0 for equal dates', () => {
    expect(compareDates(parseCalendarDate('2026-05-05'), parseCalendarDate('2026-05-05'))).toBe(0);
  });
});
