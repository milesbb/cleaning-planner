import { z } from '@cleaning-planner/contracts/zod';

const TODAY_PATH = '/today/';
const REMINDER_ICON = '/icons/icon-192.png';
const MAX_TITLE_LENGTH = 200;
const MAX_BODY_LENGTH = 500;
const MAX_PATH_LENGTH = 2000;
const PATH_WITHIN_THIS_SITE = /^\/(?![/\\])/;

const reminderMessageSchema = z.object({
  title: z.string().check(z.minLength(1), z.maxLength(MAX_TITLE_LENGTH)),
  body: z.string().check(z.maxLength(MAX_BODY_LENGTH)),
  url: z.optional(z.unknown()),
});

const notificationDataSchema = z.object({
  url: z.string().check(z.maxLength(MAX_PATH_LENGTH), z.regex(PATH_WITHIN_THIS_SITE)),
});

type ReminderMessage = z.infer<typeof reminderMessageSchema>;

const CALM_REMINDER: ReminderMessage = {
  title: 'Your cleaning plan',
  body: "Open the app to see what's due today.",
};

export interface ReminderNotification {
  title: string;
  options: NotificationOptions & { data: { url: string } };
}

export function appPathFrom(notificationData: unknown): string {
  const parsed = notificationDataSchema.safeParse(notificationData);
  return parsed.success ? parsed.data.url : TODAY_PATH;
}

function jsonFrom(payload: string | null): unknown {
  if (payload === null) return null;
  try {
    return JSON.parse(payload);
  } catch {
    // A garbled reminder still gets the calm default: browsers penalise a push with no notification.
    return null;
  }
}

function reminderMessageFrom(payload: string | null): ReminderMessage {
  const parsed = reminderMessageSchema.safeParse(jsonFrom(payload));
  return parsed.success ? parsed.data : CALM_REMINDER;
}

export function reminderNotificationFor(payload: string | null): ReminderNotification {
  const message = reminderMessageFrom(payload);
  return {
    title: message.title,
    options: {
      body: message.body,
      icon: REMINDER_ICON,
      badge: REMINDER_ICON,
      lang: 'en-GB',
      tag: 'reminder',
      data: { url: appPathFrom({ url: message.url }) },
    },
  };
}
