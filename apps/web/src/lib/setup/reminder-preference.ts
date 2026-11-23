import { deviceValue } from '../storage/stored-value';
import type { ReminderTime } from './home-setup';

// The reminder time picked during setup, kept on this device until the
// reminder settings (#64) can save it for the person.
const storedReminderTime = deviceValue('cleaning-planner.reminder-time');

export function rememberReminderTime(reminderTime: ReminderTime): void {
  storedReminderTime.remember(reminderTime);
}
