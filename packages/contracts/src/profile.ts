import { displayNameSchema, emailSchema, personColourSchema, recordIdSchema } from './primitives';
import { NOTHING_TO_CHANGE, hasAChange, hasNoRepeats } from './updates';
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

export const refreshEmailRequestSchema = z.optional(z.strictObject({}));

const MAX_OWNED_HOMES = 50;

const ownedHomeChoiceSchema = z.discriminatedUnion('action', [
  z.strictObject({
    householdId: recordIdSchema,
    action: z.literal('handOver'),
    newOwnerId: recordIdSchema,
  }),
  z.strictObject({ householdId: recordIdSchema, action: z.literal('delete') }),
]);

export const deleteAccountRequestSchema = z.strictObject({
  ownedHomes: z.array(ownedHomeChoiceSchema).check(
    z.maxLength(MAX_OWNED_HOMES, `Choose for at most ${String(MAX_OWNED_HOMES)} homes`),
    z.refine(
      (choices) => hasNoRepeats(choices.map((choice) => choice.householdId)),
      'Choose once for each home',
    ),
  ),
});

export type Profile = z.infer<typeof profileSchema>;
export type UpdateProfileRequest = z.infer<typeof updateProfileRequestSchema>;
export type OwnedHomeChoice = z.infer<typeof ownedHomeChoiceSchema>;
export type DeleteAccountRequest = z.infer<typeof deleteAccountRequestSchema>;
