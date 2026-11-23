import { parseCalendarDate } from '@cleaning-planner/schedule/calendar-date';
import { describe, expect, it } from 'vitest';
import { checkEarlierDay, earlierDayChoices, earlierDayRange } from './job-done-earlier';

const TODAY = parseCalendarDate('2026-11-24');

describe('earlierDayRange', () => {
  it('runs back from yesterday with no limit when the job has never been done', () => {
    expect(earlierDayRange(TODAY, null)).toEqual({ earliest: null, latest: '2026-11-23' });
  });

  it('starts on the day it was last done', () => {
    expect(earlierDayRange(TODAY, parseCalendarDate('2026-11-20'))).toEqual({
      earliest: '2026-11-20',
      latest: '2026-11-23',
    });
  });

  it('has no days at all when it was last done today', () => {
    expect(earlierDayRange(TODAY, TODAY)).toBeNull();
  });
});

describe('earlierDayChoices', () => {
  it('offers yesterday and 2 days ago', () => {
    expect(
      earlierDayChoices(TODAY, { earliest: null, latest: parseCalendarDate('2026-11-23') }),
    ).toEqual([
      { label: 'Yesterday', day: '2026-11-23' },
      { label: '2 days ago', day: '2026-11-22' },
    ]);
  });

  it('leaves out days before it was last done', () => {
    const range = earlierDayRange(TODAY, parseCalendarDate('2026-11-23'));
    expect(range === null ? [] : earlierDayChoices(TODAY, range)).toEqual([
      { label: 'Yesterday', day: '2026-11-23' },
    ]);
  });
});

describe('checkEarlierDay', () => {
  const range = {
    earliest: parseCalendarDate('2026-11-10'),
    latest: parseCalendarDate('2026-11-23'),
  };

  it('accepts a day inside the range', () => {
    expect(checkEarlierDay('2026-11-10', range)).toEqual({ day: '2026-11-10' });
    expect(checkEarlierDay('2026-11-23', range)).toEqual({ day: '2026-11-23' });
  });

  it('needs a day', () => {
    expect(checkEarlierDay('', range)).toEqual({ error: 'Pick the day it was done' });
    expect(checkEarlierDay('2026-02-30', range)).toEqual({ error: 'Pick the day it was done' });
  });

  it('turns down today and the future', () => {
    expect(checkEarlierDay('2026-11-24', range)).toEqual({
      error: 'Pick a day before today, or use Mark as done',
    });
  });

  it('turns down days before it was last done', () => {
    expect(checkEarlierDay('2026-11-09', range)).toEqual({
      error: 'It was last done on 10 November. Pick that day or later.',
    });
  });
});
