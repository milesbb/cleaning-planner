import { displayNameSchema, emailSchema, personColourSchema, recordIdSchema } from './primitives';
import { NOTHING_TO_CHANGE, hasAChange } from './updates';
import { z } from './zod';

export const profileSchema = z.strictObject({
  id: recordIdSchema,
  name: displayNameSchema,
  email: emailSchema,
  colour: personColourSchema,
});

export const updateProfileRequestSchema = z
  .strictObject({
    name: z.optional(displayNameSchema),
    colour: z.optional(personColourSchema),
  })
  .check(z.refine(hasAChange, NOTHING_TO_CHANGE));

export type Profile = z.infer<typeof profileSchema>;
export type UpdateProfileRequest = z.infer<typeof updateProfileRequestSchema>;
