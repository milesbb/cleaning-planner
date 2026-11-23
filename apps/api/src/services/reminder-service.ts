import type { ReminderEvent, ReminderSettings } from '@cleaning-planner/contracts/reminders';
import { Errors } from '../utils/errors';
import type { AttemptStore } from './invite-service';
import { reminderTimingFor } from './reminder-timing';
import type { ReminderTiming, ScheduledReminder } from './reminder-timing';

export type { ReminderTiming, ScheduledReminder } from './reminder-timing';

export interface ReminderStore {
  getSettings: (userId: string) => Promise<ReminderSettings | null>;
  saveSettings: (userId: string, settings: ReminderSettings) => Promise<void>;
}

export interface ReminderScheduler {
  saveSchedule: (
    userId: string,
    reminder: ScheduledReminder,
    timing: ReminderTiming,
  ) => Promise<void>;
  deleteSchedule: (userId: string, reminder: ScheduledReminder) => Promise<void>;
}

export interface ReminderTrigger {
  sendNow: (event: ReminderEvent) => Promise<void>;
}

export interface ReminderService {
  getReminders: (userId: string) => Promise<ReminderSettings>;
  saveReminders: (userId: string, settings: ReminderSettings) => Promise<ReminderSettings>;
  sendTestReminder: (userId: string) => Promise<void>;
  removeSchedules: (userId: string) => Promise<void>;
}

export interface ReminderDependencies {
  store: ReminderStore;
  scheduler: ReminderScheduler;
  trigger: ReminderTrigger;
  attempts: AttemptStore;
  now: () => string;
}

export const DEFAULT_REMINDER_SETTINGS: ReminderSettings = {
  timeZone: 'UTC',
  daily: { isOn: false, time: '08:00' },
  weekly: { isOn: false, day: 'sunday', time: '18:00' },
  onlyMyJobs: false,
  alsoByEmail: false,
};

const SCHEDULED_REMINDERS: readonly ScheduledReminder[] = ['daily', 'weekly'];
const TOO_MANY_TESTS = "You've sent a lot of test reminders. Try again in an hour.";

function testReminderGuard(userId: string): string {
  return `test-reminder#${userId}`;
}

async function syncSchedule(
  scheduler: ReminderScheduler,
  userId: string,
  settings: ReminderSettings,
  reminder: ScheduledReminder,
): Promise<void> {
  if (settings[reminder].isOn) {
    await scheduler.saveSchedule(userId, reminder, reminderTimingFor(settings, reminder));
    return;
  }
  await scheduler.deleteSchedule(userId, reminder);
}

// Settings are saved first, so a failed schedule change is put right by saving again.
async function saveReminders(
  { store, scheduler }: ReminderDependencies,
  userId: string,
  settings: ReminderSettings,
): Promise<ReminderSettings> {
  await store.saveSettings(userId, settings);
  for (const reminder of SCHEDULED_REMINDERS) {
    await syncSchedule(scheduler, userId, settings, reminder);
  }
  return settings;
}

async function sendTestReminder(
  { attempts, trigger, now }: ReminderDependencies,
  userId: string,
): Promise<void> {
  const guardKeys = [testReminderGuard(userId)];
  const sentAt = now();
  if (await attempts.isLockedOut(guardKeys, sentAt)) throw Errors.tooManyRequests(TOO_MANY_TESTS);
  await attempts.recordFailure(guardKeys, sentAt);
  await trigger.sendNow({ userId, reminder: 'test' });
}

export function createReminderService(dependencies: ReminderDependencies): ReminderService {
  return {
    getReminders: async (userId): Promise<ReminderSettings> =>
      (await dependencies.store.getSettings(userId)) ?? DEFAULT_REMINDER_SETTINGS,
    saveReminders: (userId, settings) => saveReminders(dependencies, userId, settings),
    sendTestReminder: (userId) => sendTestReminder(dependencies, userId),
    removeSchedules: async (userId): Promise<void> => {
      for (const reminder of SCHEDULED_REMINDERS) {
        await dependencies.scheduler.deleteSchedule(userId, reminder);
      }
    },
  };
}
