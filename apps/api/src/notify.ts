import { reminderEventSchema } from '@cleaning-planner/contracts/reminders';
import type { NotifySummary } from './services/notify-service';
import { createNotify } from './notify-composition';
import { logger } from './utils/logging';

const notify = createNotify(process.env);

// Notify's entry point (`notify.handler`), run by a reminder schedule or a test.
export async function handler(event: unknown): Promise<NotifySummary> {
  const reminder = reminderEventSchema.parse(event);
  const summary = await notify.sendReminder(reminder);
  logger.info('Reminder handled', { reminder: reminder.reminder, ...summary });
  return summary;
}
