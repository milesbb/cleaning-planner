import { describe, expect, it } from 'vitest';
import { approximateDays } from '../interval';
import {
  findLibraryJob,
  HOME_FEATURES,
  JOB_ICON_KEYS,
  JOB_LIBRARY,
  recommendationText,
  ROOM_TYPES,
  suggestJobs,
} from './job-library';
import type { LibraryJob } from './types';

function defaultIntervalDays(job: LibraryJob): number {
  if (job.defaultSchedule.type === 'floating') return approximateDays(job.defaultSchedule.every);
  return approximateDays({ value: 1, unit: 'month' });
}

describe('the job library', () => {
  it('has unique ids', () => {
    const ids = JOB_LIBRARY.map((job) => job.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  const jobsById = JOB_LIBRARY.map((job): [string, LibraryJob] => [job.id, job]);

  it.each(jobsById)('%s is complete and sensible', (_, job) => {
    expect(job.id.startsWith(`${job.room}.`)).toBe(true);
    expect(job.name.trim()).not.toBe('');
    expect(ROOM_TYPES).toContain(job.room);
    expect(JOB_ICON_KEYS).toContain(job.icon);
    expect(job.effortMinutes).toBeGreaterThan(0);
    expect(job.howTo.length).toBeGreaterThan(0);
    expect(job.howTo.every((step) => step.trim().length > 0)).toBe(true);
    expect(job.why.trim()).not.toBe('');
    expect(job.sources.every((source) => /^https:\/\/[a-z0-9.-]+\.[a-z]+\/\S+$/.test(source))).toBe(
      true,
    );
    if (job.needs !== undefined) expect(HOME_FEATURES).toContain(job.needs);
    const shortest = approximateDays(job.recommendedRange.shortest);
    const longest = approximateDays(job.recommendedRange.longest);
    expect(shortest).toBeLessThanOrEqual(longest);
    expect(defaultIntervalDays(job)).toBeGreaterThanOrEqual(shortest);
    expect(defaultIntervalDays(job)).toBeLessThanOrEqual(longest);
  });

  it('finds a job by id', () => {
    expect(findLibraryJob('laundry.door-seal')?.name).toBe('Wipe the washer door seal');
    expect(findLibraryJob('kitchen.not-a-job')).toBeUndefined();
  });
});

describe('suggestJobs', () => {
  it('suggests jobs for the rooms and appliances a home has', () => {
    const suggested = suggestJobs(['kitchen'], ['dishwasher']).map((job) => job.id);
    expect(suggested).toContain('kitchen.dishwasher-filter');
    expect(suggested).toContain('kitchen.fridge-wipe');
  });

  it('leaves out jobs for appliances the home does not have', () => {
    const suggested = suggestJobs(['kitchen'], []).map((job) => job.id);
    expect(suggested).not.toContain('kitchen.dishwasher-filter');
  });

  it('leaves out rooms the home does not have', () => {
    const suggested = suggestJobs(['kitchen'], ['washingMachine']);
    expect(suggested.some((job) => job.room === 'laundry')).toBe(false);
  });

  it('always includes whole-home jobs, filtered by floors', () => {
    const carpetOnly = suggestJobs([], ['carpet']).map((job) => job.id);
    expect(carpetOnly).toContain('wholeHome.vacuum');
    expect(carpetOnly).toContain('wholeHome.smoke-alarms');
    expect(carpetOnly).not.toContain('wholeHome.mop');
  });
});

describe('recommendationText', () => {
  it('describes a range', () => {
    expect(
      recommendationText({
        shortest: { value: 1, unit: 'week' },
        longest: { value: 2, unit: 'week' },
      }),
    ).toBe('Most homes do this weekly to fortnightly.');
  });

  it('describes a single recommendation', () => {
    expect(
      recommendationText({
        shortest: { value: 1, unit: 'month' },
        longest: { value: 1, unit: 'month' },
      }),
    ).toBe('Most homes do this monthly.');
  });
});
