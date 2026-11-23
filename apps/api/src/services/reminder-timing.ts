import type { Weekday } from '@cleaning-planner/schedule/types';
import type { ReminderSettings } from '@cleaning-planner/contracts/reminders';

export type ScheduledReminder = 'daily' | 'weekly';

export interface ReminderTiming {
  expression: string;
  timeZone: string;
}

const CRON_DAYS: Record<Weekday, string> = {
  sunday: 'SUN',
  monday: 'MON',
  tuesday: 'TUE',
  wednesday: 'WED',
  thursday: 'THU',
  friday: 'FRI',
  saturday: 'SAT',
};

function hoursAndMinutes(time: string): { hours: number; minutes: number } {
  const [hours = 0, minutes = 0] = time.split(':').map(Number);
  return { hours, minutes };
}

// EventBridge Scheduler cron: minutes hours day-of-month month day-of-week year.
function cronExpression(settings: ReminderSettings, reminder: ScheduledReminder): string {
  const { hours, minutes } = hoursAndMinutes(settings[reminder].time);
  const atTime = `${String(minutes)} ${String(hours)}`;
  if (reminder === 'daily') return `cron(${atTime} * * ? *)`;
  return `cron(${atTime} ? * ${CRON_DAYS[settings.weekly.day]} *)`;
}

export function reminderTimingFor(
  settings: ReminderSettings,
  reminder: ScheduledReminder,
): ReminderTiming {
  return { expression: cronExpression(settings, reminder), timeZone: settings.timeZone };
}
