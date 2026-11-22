import { describe, expect, it } from 'vitest';
import { parseCalendarDate } from './calendar-date';
import type { Assignment, Completion } from './types';
import { whoseTurn } from './whose-turn';

const household = ['sam', 'alex', 'jo'];
const takeTurns: Assignment = { kind: 'takeTurns' };

function completion(
  completedOn: string,
  completedBy: string,
  outcome: Completion['outcome'] = 'done',
): Completion {
  return { completedOn: parseCalendarDate(completedOn), completedBy, outcome };
}

describe('whoseTurn for anyone', () => {
  it('is nobody in particular', () => {
    expect(whoseTurn({ kind: 'anyone' }, [], household)).toBeNull();
  });
});

describe('whoseTurn for one person', () => {
  it('is that person', () => {
    expect(whoseTurn({ kind: 'member', memberId: 'alex' }, [], household)).toBe('alex');
  });

  it('falls back to anyone when that person has left the home', () => {
    expect(whoseTurn({ kind: 'member', memberId: 'chris' }, [], household)).toBeNull();
  });
});

describe('whoseTurn when taking turns', () => {
  it('starts with the first member when nobody has done it yet', () => {
    expect(whoseTurn(takeTurns, [], household)).toBe('sam');
  });

  it('is the next member after whoever did it last', () => {
    expect(whoseTurn(takeTurns, [completion('2026-11-20', 'sam')], household)).toBe('alex');
    expect(whoseTurn(takeTurns, [completion('2026-11-20', 'alex')], household)).toBe('jo');
  });

  it('wraps round to the first member', () => {
    expect(whoseTurn(takeTurns, [completion('2026-11-20', 'jo')], household)).toBe('sam');
  });

  it('goes by the latest completion, whatever order they come in', () => {
    const newestFirst = [completion('2026-11-20', 'alex'), completion('2026-11-13', 'sam')];
    const oldestFirst = [completion('2026-11-13', 'sam'), completion('2026-11-20', 'alex')];
    expect(whoseTurn(takeTurns, newestFirst, household)).toBe('jo');
    expect(whoseTurn(takeTurns, oldestFirst, household)).toBe('jo');
  });

  it('does not move the turn on for a skip', () => {
    const completions = [
      completion('2026-11-13', 'sam'),
      completion('2026-11-20', 'alex', 'skipped'),
    ];
    expect(whoseTurn(takeTurns, completions, household)).toBe('alex');
  });

  it('skips past someone who has left, carrying on from the last current member', () => {
    const completions = [completion('2026-11-13', 'sam'), completion('2026-11-20', 'chris')];
    expect(whoseTurn(takeTurns, completions, household)).toBe('alex');
  });

  it('starts again with the first member when only people who left have done it', () => {
    expect(whoseTurn(takeTurns, [completion('2026-11-20', 'chris')], household)).toBe('sam');
  });

  it('is always the only member when there is just one', () => {
    expect(whoseTurn(takeTurns, [completion('2026-11-20', 'sam')], ['sam'])).toBe('sam');
  });

  it('is nobody when the home has no members', () => {
    expect(whoseTurn(takeTurns, [], [])).toBeNull();
  });
});
