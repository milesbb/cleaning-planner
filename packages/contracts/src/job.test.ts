import type { Completion } from '@cleaning-planner/schedule/types';
import { describe, expect, expectTypeOf, it } from 'vitest';
import {
  completionSchema,
  createCompletionRequestSchema,
  snoozeJobRequestSchema,
} from './completion';
import { createJobRequestSchema, jobSchema, updateJobRequestSchema } from './job';
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

describe('job contracts', () => {
  it('give the schedule engine what it needs to work out due dates', () => {
    expectTypeOf<z.infer<typeof completionSchema>>().toExtend<Completion>();
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
