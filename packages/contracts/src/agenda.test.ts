import type { Agenda } from '@cleaning-planner/schedule/agenda';
import type { DueStatus } from '@cleaning-planner/schedule/due-status';
import { describe, expect, expectTypeOf, it } from 'vitest';
import { DUE_STATUSES, agendaQuerySchema, agendaSchema } from './agenda';
import { describeContract, fieldErrorsFor } from './test-support';
import type { z } from './zod';

describeContract('agendaQuerySchema', agendaQuerySchema, {
  valid: { from: '2026-11-23', to: '2026-11-29', person: 'user-1' },
  requiredField: 'from',
  wrongType: { field: 'to', value: 'Sunday' },
});

describeContract('agendaSchema', agendaSchema, {
  valid: {
    late: [{ jobId: 'job-1', dueDate: '2026-11-20', status: 'late', assignee: 'user-2' }],
    days: [
      {
        date: '2026-11-23',
        due: [{ jobId: 'job-2', dueDate: '2026-11-23', status: 'today', assignee: null }],
        done: [{ jobId: 'job-3', completedOn: '2026-11-23', completedBy: 'user-1' }],
      },
    ],
  },
  requiredField: 'late',
  wrongType: { field: 'days', value: {} },
});

describe('agendaSchema', () => {
  it('matches the agenda the schedule engine builds', () => {
    expectTypeOf<z.infer<typeof agendaSchema>>().toExtend<Agenda>();
    expectTypeOf<DueStatus>().toExtend<(typeof DUE_STATUSES)[number]>();
  });
});

describe('agendaQuerySchema', () => {
  it('needs the range to end on or after its start', () => {
    expect(fieldErrorsFor(agendaQuerySchema, { from: '2026-11-23', to: '2026-11-22' })).toEqual({
      to: 'End on or after the start',
    });
  });

  it('allows a single day', () => {
    expect(agendaQuerySchema.parse({ from: '2026-11-23', to: '2026-11-23' })).toEqual({
      from: '2026-11-23',
      to: '2026-11-23',
    });
  });

  it('allows up to 62 days and no more', () => {
    expect(agendaQuerySchema.safeParse({ from: '2026-11-01', to: '2027-01-01' }).success).toBe(
      true,
    );
    expect(fieldErrorsFor(agendaQuerySchema, { from: '2026-11-01', to: '2027-01-02' })).toEqual({
      to: 'Ask for at most 62 days at a time',
    });
  });
});
