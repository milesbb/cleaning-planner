import { parseCalendarDate } from '@cleaning-planner/schedule/calendar-date';
import { describe, expect, it } from 'vitest';
import { lateByText, personLabel } from './job-wording';

const MEMBERS = [{ userId: 'user-sam', name: 'Sam', colour: 'blue', role: 'owner' }] as const;
const TODAY = parseCalendarDate('2026-11-24');

describe('lateByText', () => {
  it.each([
    ['2026-11-23', '1 day late'],
    ['2026-11-20', '4 days late'],
    ['2026-10-25', '30 days late'],
  ])('says a job due %s is %s', (dueDate, expected) => {
    expect(lateByText(parseCalendarDate(dueDate), TODAY)).toBe(expected);
  });
});

describe('personLabel', () => {
  it('names who a job is for, calling the signed-in person you', () => {
    expect(personLabel(MEMBERS, 'user-alex', null)).toBe('Anyone');
    expect(personLabel(MEMBERS, 'user-alex', 'user-alex')).toBe('You');
    expect(personLabel(MEMBERS, 'user-alex', 'user-sam')).toBe('Sam');
    expect(personLabel(MEMBERS, 'user-alex', 'user-gone')).toBe('Former member');
  });
});
