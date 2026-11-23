import { completionSchema } from './completion';
import { jobNameSchema } from './job';
import { z } from './zod';

export const DEFAULT_ACTIVITY_ENTRIES = 20;
export const MAX_ACTIVITY_ENTRIES = 50;

const WHOLE_NUMBER = /^\d+$/;
const LIMIT_RANGE = `Ask for 1 to ${String(MAX_ACTIVITY_ENTRIES)} entries`;

function isAllowedLimit(limit: string): boolean {
  const entries = Number(limit);
  return WHOLE_NUMBER.test(limit) && entries >= 1 && entries <= MAX_ACTIVITY_ENTRIES;
}

// A query string, so the limit arrives as text.
export const activityQuerySchema = z.strictObject({
  limit: z.optional(z.string().check(z.refine(isAllowedLimit, LIMIT_RANGE))),
});

// A done or skipped job with the job's name at the time, so it still reads
// sensibly after the job is renamed or removed.
export const activityEntrySchema = z.strictObject({
  ...completionSchema.shape,
  jobName: jobNameSchema,
});

export type ActivityQuery = z.infer<typeof activityQuerySchema>;
export type ActivityEntry = z.infer<typeof activityEntrySchema>;
