import { jobProgressSchema } from '@cleaning-planner/contracts/completion';
import type { JobProgress } from '@cleaning-planner/contracts/completion';
import type { Job } from '@cleaning-planner/contracts/job';
import { parseCalendarDate } from '@cleaning-planner/schedule/calendar-date';
import { describe, expect, it } from 'vitest';
import { TODAY_FIXTURE } from '../today/today-fixture';
import { freshnessOfJob } from './room-freshness';

const TODAY = parseCalendarDate('2026-11-24');
const [WEEKLY_OVEN] = TODAY_FIXTURE.jobs;

function oven(changes: Partial<Job> = {}): Job {
  if (WEEKLY_OVEN === undefined) throw new Error('The fixture has an oven');
  return { ...WEEKLY_OVEN, ...changes };
}

function progressDoneOn(completedOn: string | null, nextDueDate: string): JobProgress {
  return jobProgressSchema.parse({
    jobId: 'job-oven',
    nextDueDate,
    snooze: null,
    latestCompletion:
      completedOn === null
        ? null
        : {
            jobId: 'job-oven',
            outcome: 'done',
            completedOn,
            completedBy: 'user-sam',
            doneAt: `${completedOn}T09:00:00.000Z`,
          },
  });
}

describe('freshnessOfJob', () => {
  it('says how much longer a repeat-after-done job stays fresh', () => {
    expect(freshnessOfJob(oven(), progressDoneOn('2026-11-21', '2026-11-28'), TODAY)).toEqual({
      level: 4 / 7,
      label: 'Fresh for about 4 more days',
    });
  });

  it('counts one day as one day', () => {
    expect(freshnessOfJob(oven(), progressDoneOn('2026-11-18', '2026-11-25'), TODAY)?.label).toBe(
      'Fresh for about 1 more day',
    );
  });

  it.each([
    ['due today', '2026-11-17', '2026-11-24'],
    ['late', '2026-11-10', '2026-11-17'],
  ])('stays calm when %s', (_case, completedOn, nextDueDate) => {
    expect(freshnessOfJob(oven(), progressDoneOn(completedOn, nextDueDate), TODAY)).toEqual({
      level: 0,
      label: 'Ready for a clean',
    });
  });

  it('counts a job never done towards its start date', () => {
    const neverDone = oven({ startDate: parseCalendarDate('2026-11-27') });
    expect(freshnessOfJob(neverDone, progressDoneOn(null, '2026-11-27'), TODAY)?.level).toBeCloseTo(
      3 / 7,
    );
  });

  it('runs down to a snoozed day', () => {
    const snoozed = jobProgressSchema.parse({
      ...progressDoneOn('2026-11-17', '2026-11-28'),
      snooze: { from: '2026-11-24', until: '2026-11-28' },
    });
    expect(freshnessOfJob(oven(), snoozed, TODAY)?.label).toBe('Fresh for about 4 more days');
  });

  it('has no bar for jobs on set days, or before progress has loaded', () => {
    const binsOnMonday = oven({
      schedule: { type: 'fixed', on: { kind: 'weekdays', weekdays: ['monday'] } },
    });
    expect(freshnessOfJob(binsOnMonday, progressDoneOn('2026-11-23', '2026-11-30'), TODAY)).toBe(
      null,
    );
    expect(freshnessOfJob(oven(), undefined, TODAY)).toBeNull();
  });
});
