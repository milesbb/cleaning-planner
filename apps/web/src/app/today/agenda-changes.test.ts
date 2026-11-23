import { parseCalendarDate } from '@cleaning-planner/schedule/calendar-date';
import { describe, expect, it } from 'vitest';
import {
  findDueItem,
  withJobDone,
  withJobSkipped,
  withJobSnoozed,
  withJobUndone,
} from './agenda-changes';
import { TODAY_FIXTURE } from './today-fixture';

const { agenda } = TODAY_FIXTURE;
const TODAY = parseCalendarDate('2026-11-24');
const DONE_BY_ALEX = { today: TODAY, doneBy: 'user-alex' };

describe('withJobDone', () => {
  it('moves a job due today into today’s done list', () => {
    const changed = withJobDone(agenda, 'job-hob', DONE_BY_ALEX);
    const today = changed.days[0];
    expect(today?.due.map((item) => item.jobId)).toEqual(['job-vacuum']);
    expect(today?.done).toContainEqual({
      jobId: 'job-hob',
      completedOn: '2026-11-24',
      completedBy: 'user-alex',
    });
  });

  it('takes a late job off the late list', () => {
    const changed = withJobDone(agenda, 'job-oven', DONE_BY_ALEX);
    expect(changed.late).toEqual([]);
    expect(changed.days[0]?.done.map((item) => item.jobId)).toContain('job-oven');
  });

  it('leaves other days alone', () => {
    expect(withJobDone(agenda, 'job-hob', DONE_BY_ALEX).days[1]).toEqual(agenda.days[1]);
  });
});

describe('withJobUndone', () => {
  it('puts the job back where it was', () => {
    const lateOven = findDueItem(agenda, 'job-oven');
    const done = withJobDone(agenda, 'job-oven', DONE_BY_ALEX);
    expect(withJobUndone(done, 'job-oven', DONE_BY_ALEX.today, lateOven)).toEqual(agenda);
  });

  it('puts a job due today back on today’s list', () => {
    const hob = findDueItem(agenda, 'job-hob');
    const done = withJobDone(agenda, 'job-hob', DONE_BY_ALEX);
    const undone = withJobUndone(done, 'job-hob', DONE_BY_ALEX.today, hob);
    expect(undone.days[0]?.due.map((item) => item.jobId)).toEqual(['job-vacuum', 'job-hob']);
  });

  it('only removes the done entry when it does not know where the job was', () => {
    const undone = withJobUndone(agenda, 'job-bins', TODAY, null);
    expect(undone.days[0]?.done).toEqual([]);
    expect(undone.days[0]?.due).toEqual(agenda.days[0]?.due);
  });
});

describe('findDueItem', () => {
  it('finds a job that is late or due on any day', () => {
    expect(findDueItem(agenda, 'job-oven')?.status).toBe('late');
    expect(findDueItem(agenda, 'job-bed')?.status).toBe('tomorrow');
    expect(findDueItem(agenda, 'job-bins')).toBeNull();
  });
});

describe('withJobSkipped', () => {
  it('takes a job due today off today’s list without marking it done', () => {
    const skipped = withJobSkipped(agenda, 'job-hob');
    expect(skipped.days[0]?.due.map((item) => item.jobId)).toEqual(['job-vacuum']);
    expect(skipped.days[0]?.done).toEqual(agenda.days[0]?.done);
  });

  it('takes a late job off the late list', () => {
    expect(withJobSkipped(agenda, 'job-oven').late).toEqual([]);
  });
});

describe('withJobSnoozed', () => {
  const TOMORROW = parseCalendarDate('2026-11-25');

  it('moves a job due today to tomorrow, after tomorrow’s own jobs', () => {
    const snoozed = withJobSnoozed(agenda, 'job-hob', TOMORROW);
    expect(snoozed.days[0]?.due.map((item) => item.jobId)).toEqual(['job-vacuum']);
    expect(snoozed.days[1]?.due.map((item) => item.jobId)).toEqual(['job-bed', 'job-hob']);
    expect(snoozed.days[1]?.due.at(-1)?.dueDate).toBe('2026-11-25');
  });

  it('moves a late job to tomorrow', () => {
    const snoozed = withJobSnoozed(agenda, 'job-oven', TOMORROW);
    expect(snoozed.late).toEqual([]);
    expect(snoozed.days[1]?.due.map((item) => item.jobId)).toContain('job-oven');
  });

  it('leaves the agenda alone for a job that is not due', () => {
    expect(withJobSnoozed(agenda, 'job-bins', TOMORROW)).toEqual(agenda);
  });
});
