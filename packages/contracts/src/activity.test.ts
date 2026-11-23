import { describe, expect, it } from 'vitest';
import { activityEntrySchema, activityQuerySchema } from './activity';
import { describeContract, fieldErrorsFor } from './test-support';

describeContract('activityEntrySchema', activityEntrySchema, {
  valid: {
    jobId: 'job-oven',
    jobName: 'Clean the oven',
    outcome: 'done',
    completedOn: '2026-11-23',
    completedBy: 'user-sam',
    doneAt: '2026-11-23T08:00:00.000Z',
  },
  requiredField: 'jobName',
  wrongType: { field: 'outcome', value: 'maybe' },
});

describe('activityQuerySchema', () => {
  it('lets the limit be left out', () => {
    expect(activityQuerySchema.parse({})).toEqual({});
  });

  it.each(['1', '20', '50'])('accepts a limit of %s', (limit) => {
    expect(activityQuerySchema.parse({ limit })).toEqual({ limit });
  });

  it.each(['0', '51', '2.5', '-1', 'ten', ''])('turns down a limit of "%s"', (limit) => {
    expect(fieldErrorsFor(activityQuerySchema, { limit })).toEqual({
      limit: 'Ask for 1 to 50 entries',
    });
  });

  it('turns down anything else in the query', () => {
    expect(activityQuerySchema.safeParse({ limit: '5', page: '2' }).success).toBe(false);
  });
});
