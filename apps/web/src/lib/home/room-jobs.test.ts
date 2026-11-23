import { jobProgressSchema } from '@cleaning-planner/contracts/completion';
import { jobSchema } from '@cleaning-planner/contracts/job';
import { z } from '@cleaning-planner/contracts/zod';
import { describe, expect, it } from 'vitest';
import { TODAY_FIXTURE } from '@/app/today/today-fixture';
import { jobsInRoom, summariseRooms } from './room-jobs';
import type { RoomSources } from './room-jobs';

function progress(jobId: string, nextDueDate: string): unknown {
  return { jobId, nextDueDate, snooze: null, latestCompletion: null };
}

const SOURCES: RoomSources = {
  rooms: TODAY_FIXTURE.rooms,
  jobs: [
    ...TODAY_FIXTURE.jobs,
    jobSchema.parse({
      ...TODAY_FIXTURE.jobs[0],
      id: 'job-fridge',
      name: 'Clean the fridge',
      icon: 'fridge',
      schedule: { type: 'fixed', on: { kind: 'monthDay', day: 1 } },
      assignment: { kind: 'member', memberId: 'user-sam' },
    }),
    jobSchema.parse({
      ...TODAY_FIXTURE.jobs[0],
      id: 'job-floor',
      name: 'Mop the floor',
      icon: 'mop',
      assignment: { kind: 'takeTurns' },
    }),
  ],
  progress: z
    .array(jobProgressSchema)
    .parse([
      progress('job-oven', '2026-11-22'),
      progress('job-hob', '2026-11-24'),
      progress('job-bins', '2026-11-25'),
      progress('job-fridge', '2026-12-01'),
      progress('job-floor', '2027-02-20'),
      progress('job-vacuum', '2026-11-24'),
      progress('job-bed', '2026-11-28'),
    ]),
  members: TODAY_FIXTURE.members,
  myUserId: 'user-alex',
  today: TODAY_FIXTURE.today,
};

describe('summariseRooms', () => {
  it('lists the rooms in order with their job and late counts', () => {
    expect(summariseRooms(SOURCES)).toEqual([
      { id: 'room-kitchen', type: 'kitchen', name: 'Kitchen', jobCount: 5, lateCount: 1 },
      { id: 'room-living', type: 'livingRoom', name: 'Living room', jobCount: 1, lateCount: 0 },
      { id: 'room-bed', type: 'bedroom', name: 'Bedroom', jobCount: 1, lateCount: 0 },
    ]);
  });
});

describe('jobsInRoom', () => {
  const kitchen = jobsInRoom(SOURCES, 'room-kitchen');

  it('lists the soonest due first, however far ahead', () => {
    expect(kitchen.map((job) => job.name)).toEqual([
      'Clean the oven',
      'Wipe the hob',
      'Empty the bins',
      'Clean the fridge',
      'Mop the floor',
    ]);
  });

  it('says how often, who and when for each job', () => {
    expect(kitchen.map((job) => job.meta)).toEqual([
      'Weekly · Anyone · was due 22 November',
      'Weekly · Anyone · due today',
      'Weekly · Anyone · due tomorrow',
      'Monthly on the 1st · Sam · next 1 December',
      'Weekly · Take turns · next 20 February',
    ]);
  });

  it('marks a late job with how late it is', () => {
    expect(kitchen[0]?.lateBy).toBe('2 days late');
    expect(kitchen[1]?.lateBy).toBeUndefined();
  });

  it('puts a job with no known due date last', () => {
    const withoutProgress = jobsInRoom({ ...SOURCES, progress: [] }, 'room-bed');
    expect(withoutProgress[0]?.meta).toBe('Weekly · Anyone · not scheduled');
  });
});
