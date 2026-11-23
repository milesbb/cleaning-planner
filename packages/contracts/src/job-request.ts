import { findLibraryJob } from '@cleaning-planner/schedule/library/job-library';
import { effortMinutesSchema, jobIconSchema, jobNameSchema } from './job';
import { calendarDateSchema, recordIdSchema } from './primitives';
import { assignmentSchema, scheduleSchema } from './schedule';
import { z } from './zod';

// Adding a job: a library id must name a job that's in the library today.
// Kept apart from job.ts so screens that only read jobs don't bundle the library.
export const libraryJobIdSchema = z
  .string()
  .check(z.refine((id) => findLibraryJob(id) !== undefined, 'Pick a job from the library'));

export const createJobRequestSchema = z.strictObject({
  roomId: recordIdSchema,
  libraryId: z.optional(libraryJobIdSchema),
  name: jobNameSchema,
  icon: jobIconSchema,
  schedule: scheduleSchema,
  startDate: z.optional(calendarDateSchema),
  assignment: assignmentSchema,
  effortMinutes: effortMinutesSchema,
});

export type CreateJobRequest = z.infer<typeof createJobRequestSchema>;
