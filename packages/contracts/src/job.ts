import { JOB_ICON_KEYS } from '@cleaning-planner/schedule/library/keys';
import { calendarDateSchema, recordIdSchema, versionSchema } from './primitives';
import { assignmentSchema, scheduleSchema, snoozeSchema } from './schedule';
import { NOTHING_TO_CHANGE, hasAChange } from './updates';
import { z } from './zod';

const MAX_JOB_NAME_LENGTH = 80;
const MAX_EFFORT_MINUTES = 480;

export const jobNameSchema = z
  .string()
  .check(
    z.trim(),
    z.minLength(1, 'Enter a name for the job'),
    z.maxLength(MAX_JOB_NAME_LENGTH, `Keep it to ${String(MAX_JOB_NAME_LENGTH)} characters`),
  );

export const effortMinutesSchema = z
  .int()
  .check(
    z.minimum(1, 'Allow at least a minute'),
    z.maximum(MAX_EFFORT_MINUTES, 'Allow at most 8 hours'),
  );

export const jobIconSchema = z.enum(JOB_ICON_KEYS);

const LIBRARY_JOB_ID_PATTERN = /^[a-z][A-Za-z]*\.[a-z0-9]+(?:-[a-z0-9]+)*$/;

// A saved job keeps its library id even if that library job is later renamed
// or retired, so a stored job only needs the id's shape. New jobs are checked
// against the library itself (job-request.ts).
const libraryJobReferenceSchema = z
  .string()
  .check(z.regex(LIBRARY_JOB_ID_PATTERN, 'That isn’t a library job id'));

export const jobSchema = z.strictObject({
  id: recordIdSchema,
  roomId: recordIdSchema,
  libraryId: z.nullable(libraryJobReferenceSchema),
  name: jobNameSchema,
  icon: jobIconSchema,
  schedule: scheduleSchema,
  startDate: calendarDateSchema,
  assignment: assignmentSchema,
  snooze: z.nullable(snoozeSchema),
  effortMinutes: effortMinutesSchema,
  version: versionSchema,
});

export const updateJobRequestSchema = z
  .strictObject({
    roomId: z.optional(recordIdSchema),
    name: z.optional(jobNameSchema),
    icon: z.optional(jobIconSchema),
    schedule: z.optional(scheduleSchema),
    assignment: z.optional(assignmentSchema),
    effortMinutes: z.optional(effortMinutesSchema),
    version: versionSchema,
  })
  .check(z.refine(hasAChange, NOTHING_TO_CHANGE));

export type Job = z.infer<typeof jobSchema>;
export type UpdateJobRequest = z.infer<typeof updateJobRequestSchema>;
