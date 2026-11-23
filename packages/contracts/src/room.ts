import { HOME_FEATURES, ROOM_TYPES } from '@cleaning-planner/schedule/library/keys';
import { displayNameSchema, recordIdSchema, versionSchema } from './primitives';
import { NOTHING_TO_CHANGE, hasAChange, hasNoRepeats } from './updates';
import { z } from './zod';

const MAX_ROOM_ORDER = 99;

export const roomTypeSchema = z.enum(ROOM_TYPES);
export const homeFeatureSchema = z.enum(HOME_FEATURES);

export const appliancesSchema = z
  .array(homeFeatureSchema)
  .check(z.refine(hasNoRepeats, 'List each appliance once'));

const roomOrderSchema = z.int().check(z.minimum(0), z.maximum(MAX_ROOM_ORDER));

export const newRoomSchema = z.strictObject({
  type: roomTypeSchema,
  name: displayNameSchema,
  appliances: z.optional(appliancesSchema),
});

export const roomSchema = z.strictObject({
  id: recordIdSchema,
  type: roomTypeSchema,
  name: displayNameSchema,
  order: roomOrderSchema,
  appliances: appliancesSchema,
  version: versionSchema,
});

export const updateRoomRequestSchema = z
  .strictObject({
    name: z.optional(displayNameSchema),
    order: z.optional(roomOrderSchema),
    appliances: z.optional(appliancesSchema),
    version: versionSchema,
  })
  .check(z.refine(hasAChange, NOTHING_TO_CHANGE));

export type NewRoom = z.infer<typeof newRoomSchema>;
export type Room = z.infer<typeof roomSchema>;
export type UpdateRoomRequest = z.infer<typeof updateRoomRequestSchema>;
