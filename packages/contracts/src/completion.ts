import {
  calendarDateSchema,
  idempotencyKeySchema,
  instantSchema,
  recordIdSchema,
} from './primitives';
import { snoozeSchema } from './schedule';
import { z } from './zod';

export const COMPLETION_OUTCOMES = ['done', 'skipped'] as const;

export const createCompletionRequestSchema = z.strictObject({
  outcome: z.enum(COMPLETION_OUTCOMES),
  completedOn: calendarDateSchema,
  idempotencyKey: idempotencyKeySchema,
});

export const completionSchema = z.strictObject({
  jobId: recordIdSchema,
  outcome: z.enum(COMPLETION_OUTCOMES),
  completedOn: calendarDateSchema,
  completedBy: recordIdSchema,
  doneAt: instantSchema,
});

export const snoozeJobRequestSchema = z.strictObject({
  until: calendarDateSchema,
  idempotencyKey: idempotencyKeySchema,
});

export const undoCompletionRequestSchema = z.strictObject({
  idempotencyKey: idempotencyKeySchema,
});

export const jobProgressSchema = z.strictObject({
  jobId: recordIdSchema,
  nextDueDate: calendarDateSchema,
  snooze: z.nullable(snoozeSchema),
  latestCompletion: z.nullable(completionSchema),
});

export type CreateCompletionRequest = z.infer<typeof createCompletionRequestSchema>;
export type CompletionRecord = z.infer<typeof completionSchema>;
export type SnoozeJobRequest = z.infer<typeof snoozeJobRequestSchema>;
export type UndoCompletionRequest = z.infer<typeof undoCompletionRequestSchema>;
export type JobProgress = z.infer<typeof jobProgressSchema>;
