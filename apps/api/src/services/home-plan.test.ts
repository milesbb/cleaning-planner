import { findLibraryJob } from '@cleaning-planner/schedule/library/job-library';
import type { CreateHouseholdRequest } from '@cleaning-planner/contracts/household';
import { jobSchema } from '@cleaning-planner/contracts/job';
import { roomSchema } from '@cleaning-planner/contracts/room';
import { parseCalendarDate } from '@cleaning-planner/schedule/calendar-date';
import { describe, expect, it } from 'vitest';
import { planHome } from './home-plan';

const TODAY = parseCalendarDate('2026-11-23');

function sequentialIds(): () => string {
  let next = 0;
  return () => {
    next += 1;
    return `id-${String(next)}`;
  };
}

const FLAT: Pick<CreateHouseholdRequest, 'rooms' | 'features'> = {
  rooms: [
    { type: 'kitchen', name: 'Kitchen', appliances: ['dishwasher'] },
    { type: 'bedroom', name: 'Bedroom' },
  ],
  features: ['washingMachine'],
};

describe('planHome', () => {
  it('keeps the rooms in the order they were given, with a whole-home room added', () => {
    const { rooms } = planHome(FLAT, TODAY, sequentialIds());
    expect(rooms.map((room) => [room.name, room.order])).toEqual([
      ['Kitchen', 0],
      ['Bedroom', 1],
      ['Whole home', 2],
    ]);
    rooms.forEach((room) => {
      expect(roomSchema.safeParse(room).success).toBe(true);
    });
  });

  it('does not add a second whole-home room', () => {
    const { rooms } = planHome(
      { rooms: [{ type: 'wholeHome', name: 'Everywhere' }], features: [] },
      TODAY,
      sequentialIds(),
    );
    expect(rooms.map((room) => room.name)).toEqual(['Everywhere']);
  });

  it('adds library jobs for each room, including ones that need its appliances', () => {
    const { rooms, jobs } = planHome(FLAT, TODAY, sequentialIds());
    const kitchen = rooms[0];
    const kitchenJobs = jobs.filter((job) => job.roomId === kitchen?.id);
    expect(kitchenJobs.length).toBeGreaterThan(0);
    const libraryIds = kitchenJobs.map((job) => job.libraryId ?? '');
    expect(libraryIds.some((libraryId) => findLibraryJob(libraryId)?.needs === 'dishwasher')).toBe(
      true,
    );
  });

  it('leaves out jobs for appliances the home does not have', () => {
    const { jobs } = planHome(
      { rooms: [{ type: 'kitchen', name: 'Kitchen' }], features: [] },
      TODAY,
      sequentialIds(),
    );
    const needs = jobs.map((job) => findLibraryJob(job.libraryId ?? '')?.needs);
    expect(needs).not.toContain('dishwasher');
  });

  it('copies each job from the library and makes valid jobs', () => {
    const { jobs } = planHome(FLAT, TODAY, sequentialIds());
    jobs.forEach((job) => {
      const libraryJob = findLibraryJob(job.libraryId ?? '');
      expect(job).toMatchObject({
        name: libraryJob?.name,
        icon: libraryJob?.icon,
        effortMinutes: libraryJob?.effortMinutes,
        assignment: { kind: 'takeTurns' },
        snooze: null,
        version: 1,
      });
      expect(jobSchema.safeParse(job).success).toBe(true);
    });
  });

  it('spreads first due dates out instead of putting everything on today', () => {
    const { jobs } = planHome(FLAT, TODAY, sequentialIds());
    const startDates = new Set(jobs.map((job) => job.startDate));
    expect(startDates.size).toBeGreaterThan(1);
    jobs.forEach((job) => {
      expect(job.startDate >= TODAY).toBe(true);
    });
  });
});
