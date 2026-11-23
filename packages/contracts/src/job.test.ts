import type { Completion } from '@cleaning-planner/schedule/types';
import { describe, expect, expectTypeOf, it } from 'vitest';
import {
  completionSchema,
  createCompletionRequestSchema,
  jobProgressSchema,
  snoozeJobRequestSchema,
  undoCompletionRequestSchema,
} from './completion';
import { jobSchema, updateJobRequestSchema } from './job';
import { createJobRequestSchema } from './job-request';
import { describeContract, fieldErrorsFor } from './test-support';
import type { z } from './zod';

const WEEKLY = { type: 'floating', every: { value: 1, unit: 'week' } };
const IDEMPOTENCY_KEY = '00000000-0000-4000-8000-000000000001';

const NEW_JOB = {
  roomId: 'room-1',
  name: 'Vacuum the living room',
  icon: 'vacuum',
  schedule: WEEKLY,
  assignment: { kind: 'takeTurns' },
  effortMinutes: 15,
};

describeContract('jobSchema', jobSchema, {
  valid: {
    ...NEW_JOB,
    id: 'job-1',
    libraryId: null,
    startDate: '2026-11-23',
    snooze: null,
    version: 1,
  },
  requiredField: 'schedule',
  wrongType: { field: 'snooze', value: '2026-11-25' },
});

describeContract('createJobRequestSchema', createJobRequestSchema, {
  valid: NEW_JOB,
  requiredField: 'assignment',
  wrongType: { field: 'icon', value: 'rocket' },
});

describeContract('updateJobRequestSchema', updateJobRequestSchema, {
  valid: { schedule: WEEKLY, version: 3 },
  requiredField: 'version',
  wrongType: { field: 'effortMinutes', value: 'quick' },
});

describeContract('createCompletionRequestSchema', createCompletionRequestSchema, {
  valid: { outcome: 'done', completedOn: '2026-11-23', idempotencyKey: IDEMPOTENCY_KEY },
  requiredField: 'idempotencyKey',
  wrongType: { field: 'outcome', value: 'half-done' },
});

describeContract('completionSchema', completionSchema, {
  valid: {
    jobId: 'job-1',
    outcome: 'skipped',
    completedOn: '2026-11-23',
    completedBy: 'user-1',
    doneAt: '2026-11-23T08:40:00Z',
  },
  requiredField: 'completedBy',
  wrongType: { field: 'doneAt', value: 'this morning' },
});

describeContract('snoozeJobRequestSchema', snoozeJobRequestSchema, {
  valid: { until: '2026-11-25', idempotencyKey: IDEMPOTENCY_KEY },
  requiredField: 'until',
  wrongType: { field: 'until', value: 'Friday' },
});

describeContract('undoCompletionRequestSchema', undoCompletionRequestSchema, {
  valid: { idempotencyKey: IDEMPOTENCY_KEY },
  requiredField: 'idempotencyKey',
  wrongType: { field: 'idempotencyKey', value: 'short' },
});

describeContract('jobProgressSchema', jobProgressSchema, {
  valid: {
    jobId: 'job-1',
    nextDueDate: '2026-11-30',
    snooze: null,
    latestCompletion: {
      jobId: 'job-1',
      outcome: 'done',
      completedOn: '2026-11-23',
      completedBy: 'user-1',
      doneAt: '2026-11-23T08:40:00Z',
    },
  },
  requiredField: 'nextDueDate',
  wrongType: { field: 'snooze', value: '2026-11-25' },
});

describe('job contracts', () => {
  it('give the schedule engine what it needs to work out due dates', () => {
    expectTypeOf<z.infer<typeof completionSchema>>().toExtend<Completion>();
  });

  it('keep a saved job whose library entry was renamed or retired', () => {
    const savedJob = {
      ...NEW_JOB,
      id: 'job-1',
      startDate: '2026-11-23',
      snooze: null,
      version: 1,
    };
    expect(jobSchema.safeParse({ ...savedJob, libraryId: 'kitchen.retired-job' }).success).toBe(
      true,
    );
    expect(jobSchema.safeParse({ ...savedJob, libraryId: 'Not an id' }).success).toBe(false);
  });

  it('only accept jobs that exist in the library', () => {
    expect(
      createJobRequestSchema.safeParse({ ...NEW_JOB, libraryId: 'kitchen.dishwasher-filter' })
        .success,
    ).toBe(true);
    expect(
      fieldErrorsFor(createJobRequestSchema, { ...NEW_JOB, libraryId: 'kitchen.unicorn' }),
    ).toEqual({
      libraryId: 'Pick a job from the library',
    });
  });

  it('cap how long a job takes', () => {
    expect(fieldErrorsFor(createJobRequestSchema, { ...NEW_JOB, effortMinutes: 600 })).toEqual({
      effortMinutes: 'Allow at most 8 hours',
    });
  });

  it('point inside the schedule when it is wrong', () => {
    const schedule = { type: 'floating', every: { value: 1, unit: 'fortnight' } };
    expect(Object.keys(fieldErrorsFor(createJobRequestSchema, { ...NEW_JOB, schedule }))).toEqual([
      'schedule.every.unit',
    ]);
  });

  it('need a name with something in it', () => {
    expect(fieldErrorsFor(createJobRequestSchema, { ...NEW_JOB, name: '  ' })).toEqual({
      name: 'Enter a name for the job',
    });
  });
});
