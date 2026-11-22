import { describe, expect, it } from 'vitest';
import { parseCalendarDate } from './calendar-date';
import { lastCompletedOn, lastDone } from './completions';
import type { Completion } from './types';

function completion(
  completedOn: string,
  outcome: Completion['outcome'],
  completedBy = 'sam',
): Completion {
  return { completedOn: parseCalendarDate(completedOn), completedBy, outcome };
}

describe('lastCompletedOn', () => {
  it('is null when the job has never been done or skipped', () => {
    expect(lastCompletedOn([])).toBeNull();
  });

  it('is the latest date, whatever order the completions come in', () => {
    const completions = [
      completion('2026-11-10', 'done'),
      completion('2026-11-20', 'done'),
      completion('2026-11-15', 'done'),
    ];
    expect(lastCompletedOn(completions)).toBe('2026-11-20');
  });

  it('counts a skip, so a skipped job moves on', () => {
    const completions = [completion('2026-11-10', 'done'), completion('2026-11-17', 'skipped')];
    expect(lastCompletedOn(completions)).toBe('2026-11-17');
  });
});

describe('lastDone', () => {
  it('is null when the job has only ever been skipped', () => {
    expect(lastDone([completion('2026-11-17', 'skipped')])).toBeNull();
  });

  it('ignores skips, so history shows who really did it', () => {
    const completions = [
      completion('2026-11-10', 'done', 'alex'),
      completion('2026-11-17', 'skipped', 'sam'),
    ];
    expect(lastDone(completions)).toEqual(completion('2026-11-10', 'done', 'alex'));
  });

  it('is the latest real completion', () => {
    const completions = [
      completion('2026-11-03', 'done', 'sam'),
      completion('2026-11-10', 'done', 'alex'),
    ];
    expect(lastDone(completions)?.completedBy).toBe('alex');
  });
});
