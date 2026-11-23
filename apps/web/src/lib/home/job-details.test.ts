import { jobProgressSchema } from '@cleaning-planner/contracts/completion';
import type { JobProgress } from '@cleaning-planner/contracts/completion';
import { jobSchema } from '@cleaning-planner/contracts/job';
import type { Job } from '@cleaning-planner/contracts/job';
import { parseCalendarDate } from '@cleaning-planner/schedule/calendar-date';
import { describe, expect, it } from 'vitest';
import { TODAY_FIXTURE } from '@/app/today/today-fixture';
import { jobDetailsOf, snoozeChoices } from './job-details';
import type { JobDetails } from './job-details';
import type { RoomSources } from './room-jobs';

const TODAY = parseCalendarDate('2026-11-24');

function oven(changes: Partial<Record<keyof Job, unknown>> = {}): Job {
  const original = TODAY_FIXTURE.jobs.find((job) => job.id === 'job-oven');
  return jobSchema.parse({ ...original, libraryId: 'kitchen.oven', ...changes });
}

function progress(changes: Record<string, unknown> = {}): JobProgress {
  return jobProgressSchema.parse({
    jobId: 'job-oven',
    nextDueDate: '2026-11-22',
    snooze: null,
    latestCompletion: null,
    ...changes,
  });
}

function sourcesWith(job: Job, jobProgress: JobProgress | null): RoomSources {
  return {
    rooms: TODAY_FIXTURE.rooms,
    jobs: [job],
    progress: jobProgress === null ? [] : [jobProgress],
    members: TODAY_FIXTURE.members,
    myUserId: 'user-alex',
    today: TODAY,
  };
}

function detailsOf(job: Job = oven(), jobProgress: JobProgress | null = progress()): JobDetails {
  const details = jobDetailsOf(sourcesWith(job, jobProgress), 'job-oven');
  if (details === null) throw new Error('Expected the oven to be found');
  return details;
}

describe('jobDetailsOf', () => {
  it('finds nothing for a job that is not in the home', () => {
    expect(jobDetailsOf(sourcesWith(oven(), progress()), 'job-gone')).toBeNull();
  });

  it('describes a late library job with its room, advice and who it is for', () => {
    expect(detailsOf()).toMatchObject({
      name: 'Clean the oven',
      icon: 'oven',
      roomName: 'Kitchen',
      roomType: 'kitchen',
      roomHref: '/room?id=room-kitchen',
      when: 'Was due 22 November',
      lateBy: '2 days late',
      howOften: 'Weekly',
      recommendation: 'Most homes do this every 3 months to every 6 months.',
      whoFor: 'Anyone',
      why: 'Burnt-on grease smokes, smells and can affect how food tastes.',
      howTo: [
        'Take out the racks and soak them in hot soapy water.',
        'Spread a paste of bicarbonate of soda and water inside and leave it overnight.',
        'Wipe it out with a damp cloth and rinse.',
      ],
      lastDone: 'Not done yet',
      version: 1,
    });
  });

  it('has no advice for a job someone made up', () => {
    expect(detailsOf(oven({ libraryId: null }))).toMatchObject({
      recommendation: null,
      why: null,
      howTo: [],
    });
  });

  it.each([
    ['2026-11-24', 'Due today'],
    ['2026-11-25', 'Due tomorrow'],
    ['2026-12-14', 'Next due 14 December'],
  ])('says when a job due on %s is next due', (nextDueDate, when) => {
    const details = detailsOf(oven(), progress({ nextDueDate }));
    expect(details.when).toBe(when);
    expect(details.lateBy).toBeUndefined();
  });

  it('says how long a job is snoozed for', () => {
    const snooze = { from: '2026-11-22', until: '2026-11-28' };
    const details = detailsOf(oven({ snooze }), progress({ nextDueDate: '2026-11-28', snooze }));
    expect(details.when).toBe('Snoozed until 28 November');
  });

  it('says when a job has no next due date yet', () => {
    expect(detailsOf(oven(), null).when).toBe('Not scheduled');
  });

  it.each([
    [{ kind: 'member', memberId: 'user-sam' }, 'Sam'],
    [{ kind: 'member', memberId: 'user-alex' }, 'You'],
    [{ kind: 'takeTurns' }, 'Take turns'],
  ])('says who a job is for', (assignment, whoFor) => {
    expect(detailsOf(oven({ assignment })).whoFor).toBe(whoFor);
  });

  it.each([
    ['done', 'user-sam', 'Done by Sam on 20 November'],
    ['skipped', 'user-alex', 'Skipped by You on 20 November'],
  ])('says when it was last %s and by whom', (outcome, completedBy, lastDone) => {
    const latestCompletion = {
      jobId: 'job-oven',
      outcome,
      completedOn: '2026-11-20',
      completedBy,
      doneAt: '2026-11-20T18:00:00.000Z',
    };
    expect(detailsOf(oven(), progress({ latestCompletion })).lastDone).toBe(lastDone);
  });
});

describe('snoozeChoices', () => {
  it('offers tomorrow, three days and a week from today for a late job', () => {
    expect(snoozeChoices(parseCalendarDate('2026-11-22'), TODAY)).toEqual([
      { label: 'Tomorrow', until: '2026-11-25' },
      { label: 'In 3 days', until: '2026-11-27' },
      { label: 'In a week', until: '2026-12-01' },
    ]);
  });

  it('counts from the due date for a job that is not due yet', () => {
    expect(snoozeChoices(parseCalendarDate('2026-11-27'), TODAY)).toEqual([
      { label: 'A day later', until: '2026-11-28' },
      { label: '3 days later', until: '2026-11-30' },
      { label: 'A week later', until: '2026-12-04' },
    ]);
  });
});
