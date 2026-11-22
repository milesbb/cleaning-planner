import { MAX_AGENDA_DAYS } from '@cleaning-planner/schedule/agenda';
import type { DueStatus } from '@cleaning-planner/schedule/due-status';
import { calendarDateSchema, recordIdSchema } from './primitives';
import { z } from './zod';

const MILLISECONDS_PER_DAY = 86_400_000;

export const DUE_STATUSES = [
  'late',
  'today',
  'tomorrow',
  'thisWeek',
  'later',
] as const satisfies readonly DueStatus[];

function daysCovered(from: string, to: string): number {
  return (Date.parse(to) - Date.parse(from)) / MILLISECONDS_PER_DAY + 1;
}

export const agendaQuerySchema = z
  .strictObject({
    from: calendarDateSchema,
    to: calendarDateSchema,
    person: z.optional(recordIdSchema),
  })
  .check(
    z.refine((query) => query.to >= query.from, {
      message: 'End on or after the start',
      path: ['to'],
    }),
    z.refine((query) => daysCovered(query.from, query.to) <= MAX_AGENDA_DAYS, {
      message: `Ask for at most ${String(MAX_AGENDA_DAYS)} days at a time`,
      path: ['to'],
    }),
  );

const dueItemSchema = z.strictObject({
  jobId: recordIdSchema,
  dueDate: calendarDateSchema,
  status: z.enum(DUE_STATUSES),
  assignee: z.nullable(recordIdSchema),
});

const doneItemSchema = z.strictObject({
  jobId: recordIdSchema,
  completedOn: calendarDateSchema,
  completedBy: recordIdSchema,
});

export const agendaSchema = z.strictObject({
  late: z.array(dueItemSchema),
  days: z.array(
    z.strictObject({
      date: calendarDateSchema,
      due: z.array(dueItemSchema),
      done: z.array(doneItemSchema),
    }),
  ),
});

export type AgendaQuery = z.infer<typeof agendaQuerySchema>;
export type AgendaResponse = z.infer<typeof agendaSchema>;
