import { describe, expect, it } from 'vitest';
import { parseCalendarDate } from './calendar-date';
import { createSnooze } from './snooze';

const dueToday = parseCalendarDate('2026-11-22');
const today = parseCalendarDate('2026-11-22');

describe('createSnooze', () => {
  it('remembers which due date it moves and where to', () => {
    expect(
      createSnooze({
        currentDueDate: dueToday,
        requestedDate: parseCalendarDate('2026-11-24'),
        today,
      }),
    ).toEqual({ from: '2026-11-22', until: '2026-11-24' });
  });

  it('lets a late job be snoozed to any later day', () => {
    expect(
      createSnooze({
        currentDueDate: parseCalendarDate('2026-11-18'),
        requestedDate: parseCalendarDate('2026-11-23'),
        today,
      }),
    ).toEqual({ from: '2026-11-18', until: '2026-11-23' });
  });

  it.each([
    ['the current due date', '2026-11-22'],
    ['before the current due date', '2026-11-21'],
  ])('rejects snoozing to %s', (_, requestedText) => {
    expect(() =>
      createSnooze({
        currentDueDate: dueToday,
        requestedDate: parseCalendarDate(requestedText),
        today,
      }),
    ).toThrow('A snooze must move the job to a later day');
  });

  it('rejects snoozing a late job to today or earlier', () => {
    expect(() =>
      createSnooze({
        currentDueDate: parseCalendarDate('2026-11-18'),
        requestedDate: today,
        today,
      }),
    ).toThrow('A snooze must move the job to a later day');
  });
});
