import { displayNameSchema, instantSchema } from './primitives';
import { z } from './zod';

export const INVITE_CODE_ALPHABET = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';
export const INVITE_CODE_LENGTH = 8;
const INVITE_CODE_PATTERN = /^[0-9A-HJKMNP-TV-Z]{8}$/;

export const inviteCodeSchema = z
  .string()
  .check(
    z.trim(),
    z.toUpperCase(),
    z.regex(INVITE_CODE_PATTERN, 'Enter the 8-character code from your invite'),
  );

export const createInviteResponseSchema = z.strictObject({
  code: inviteCodeSchema,
  expiresAt: instantSchema,
});

export const invitePreviewSchema = z.strictObject({
  householdName: displayNameSchema,
  invitedByName: displayNameSchema,
  memberCount: z.int().check(z.minimum(1)),
  expiresAt: instantSchema,
});

export type InviteCode = z.infer<typeof inviteCodeSchema>;
export type CreateInviteResponse = z.infer<typeof createInviteResponseSchema>;
export type InvitePreview = z.infer<typeof invitePreviewSchema>;
