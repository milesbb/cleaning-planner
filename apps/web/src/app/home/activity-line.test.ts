import type { ActivityEntry } from '@cleaning-planner/contracts/activity';
import type { Member } from '@cleaning-planner/contracts/household';
import { parseCalendarDate } from '@cleaning-planner/schedule/calendar-date';
import { describe, expect, it } from 'vitest';
import { activityDay, activityLine } from './activity-line';

const TODAY = parseCalendarDate('2026-11-24');

const MEMBERS: Member[] = [
  { userId: 'user-alex', name: 'Alex', colour: 'pink', role: 'owner' },
  { userId: 'user-sam', name: 'Sam', colour: 'blue', role: 'member' },
];

function entry(changes: Partial<ActivityEntry> = {}): ActivityEntry {
  return {
    jobId: 'job-oven',
    jobName: 'Clean the oven',
    outcome: 'done',
    completedOn: parseCalendarDate('2026-11-24'),
    completedBy: 'user-sam',
    doneAt: '2026-11-24T08:30:00.000Z',
    ...changes,
  };
}

const PEOPLE = { members: MEMBERS, myUserId: 'user-alex', today: TODAY };

describe('activityDay', () => {
  it.each([
    ['2026-11-24', 'Today'],
    ['2026-11-23', 'Yesterday'],
    ['2026-11-22', 'Sunday'],
    ['2026-11-18', 'Wednesday'],
    ['2026-11-17', '17 November'],
  ])('calls %s "%s"', (date, expected) => {
    expect(activityDay(parseCalendarDate(date), TODAY)).toBe(expected);
  });
});

describe('activityLine', () => {
  it('says who did which job, and when', () => {
    expect(activityLine(entry(), PEOPLE)).toBe('Sam · Clean the oven · Today');
  });

  it('calls the signed-in person You', () => {
    expect(activityLine(entry({ completedBy: 'user-alex' }), PEOPLE)).toBe(
      'You · Clean the oven · Today',
    );
  });

  it('says when a job was skipped', () => {
    expect(
      activityLine(
        entry({ outcome: 'skipped', completedOn: parseCalendarDate('2026-11-23') }),
        PEOPLE,
      ),
    ).toBe('Sam · Skipped Clean the oven · Yesterday');
  });

  it('names someone who has left the home calmly', () => {
    expect(activityLine(entry({ completedBy: 'user-gone' }), PEOPLE)).toBe(
      'Former member · Clean the oven · Today',
    );
  });
});
