import {
  displayNameSchema,
  personColourSchema,
  recordIdSchema,
  timeZoneSchema,
  versionSchema,
  weekdaySchema,
} from './primitives';
import { appliancesSchema, newRoomSchema } from './room';
import { NOTHING_TO_CHANGE, hasAChange } from './updates';
import { z } from './zod';

const MAX_ROOMS_PER_HOME = 30;

export const HOUSEHOLD_ROLES = ['owner', 'member'] as const;
export const householdRoleSchema = z.enum(HOUSEHOLD_ROLES);

export const householdSummarySchema = z.strictObject({
  id: recordIdSchema,
  name: displayNameSchema,
  role: householdRoleSchema,
});

export const householdSchema = z.strictObject({
  id: recordIdSchema,
  name: displayNameSchema,
  timeZone: timeZoneSchema,
  weekStartsOn: weekdaySchema,
  ownerId: recordIdSchema,
  version: versionSchema,
});

export const createHouseholdRequestSchema = z.strictObject({
  name: displayNameSchema,
  timeZone: timeZoneSchema,
  weekStartsOn: weekdaySchema,
  rooms: z
    .array(newRoomSchema)
    .check(
      z.minLength(1, 'Add at least one room'),
      z.maxLength(MAX_ROOMS_PER_HOME, `A home can have up to ${String(MAX_ROOMS_PER_HOME)} rooms`),
    ),
  features: appliancesSchema,
});

export const updateHouseholdRequestSchema = z
  .strictObject({
    name: z.optional(displayNameSchema),
    timeZone: z.optional(timeZoneSchema),
    weekStartsOn: z.optional(weekdaySchema),
    version: versionSchema,
  })
  .check(z.refine(hasAChange, NOTHING_TO_CHANGE));

export const memberSchema = z.strictObject({
  userId: recordIdSchema,
  name: displayNameSchema,
  colour: personColourSchema,
  role: householdRoleSchema,
});

export const updateMemberRequestSchema = z.strictObject({ role: householdRoleSchema });

export type HouseholdRole = z.infer<typeof householdRoleSchema>;
export type HouseholdSummary = z.infer<typeof householdSummarySchema>;
export type Household = z.infer<typeof householdSchema>;
export type CreateHouseholdRequest = z.infer<typeof createHouseholdRequestSchema>;
export type UpdateHouseholdRequest = z.infer<typeof updateHouseholdRequestSchema>;
export type Member = z.infer<typeof memberSchema>;
export type UpdateMemberRequest = z.infer<typeof updateMemberRequestSchema>;
