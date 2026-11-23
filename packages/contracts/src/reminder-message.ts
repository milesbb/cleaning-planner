import { z } from './zod';

// The Web Push payload notify sends and the service worker shows.

const MAX_TITLE_LENGTH = 200;
const MAX_BODY_LENGTH = 500;
const MAX_PATH_LENGTH = 2000;
const PATH_WITHIN_THIS_SITE = /^\/(?![/\\])/;

export const reminderMessageSchema = z.strictObject({
  title: z.string().check(z.minLength(1), z.maxLength(MAX_TITLE_LENGTH)),
  body: z.string().check(z.maxLength(MAX_BODY_LENGTH)),
  url: z.optional(z.string().check(z.maxLength(MAX_PATH_LENGTH), z.regex(PATH_WITHIN_THIS_SITE))),
});

export type ReminderMessage = z.infer<typeof reminderMessageSchema>;
