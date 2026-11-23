import type { ReminderSettings } from '@cleaning-planner/contracts/reminders';
import { describe, expect, it, vi } from 'vitest';
import { AppError } from '../utils/errors';
import { DEFAULT_REMINDER_SETTINGS, createReminderService } from './reminder-service';
import type { ReminderDependencies } from './reminder-service';

const NOW = '2026-11-23T09:15:00.000Z';

const SETTINGS: ReminderSettings = {
  timeZone: 'Europe/London',
  daily: { isOn: true, time: '08:00' },
  weekly: { isOn: false, day: 'sunday', time: '18:30' },
  onlyMyJobs: true,
  alsoByEmail: false,
};

function fakes(
  saved: ReminderSettings | null = null,
  isLockedOut = false,
): {
  dependencies: ReminderDependencies;
  calls: string[];
} {
  const calls: string[] = [];
  return {
    calls,
    dependencies: {
      store: {
        getSettings: vi.fn(() => Promise.resolve(saved)),
        saveSettings: vi.fn((userId: string) => {
          calls.push(`saveSettings ${userId}`);
          return Promise.resolve();
        }),
      },
      scheduler: {
        saveSchedule: vi.fn((userId: string, reminder: string) => {
          calls.push(`saveSchedule ${userId} ${reminder}`);
          return Promise.resolve();
        }),
        deleteSchedule: vi.fn((userId: string, reminder: string) => {
          calls.push(`deleteSchedule ${userId} ${reminder}`);
          return Promise.resolve();
        }),
      },
      trigger: {
        sendNow: vi.fn((event: object) => {
          calls.push(`sendNow ${JSON.stringify(event)}`);
          return Promise.resolve();
        }),
      },
      attempts: {
        isLockedOut: vi.fn(() => Promise.resolve(isLockedOut)),
        recordFailure: vi.fn((keys: readonly string[]) => {
          calls.push(`count ${keys.join(' ')}`);
          return Promise.resolve();
        }),
      },
      now: () => NOW,
    },
  };
}

describe('reminder settings', () => {
  it('starts with both reminders off until the person saves them', async () => {
    const { dependencies } = fakes();
    await expect(createReminderService(dependencies).getReminders('user-sam')).resolves.toEqual(
      DEFAULT_REMINDER_SETTINGS,
    );
    expect(DEFAULT_REMINDER_SETTINGS.daily.isOn).toBe(false);
    expect(DEFAULT_REMINDER_SETTINGS.weekly.isOn).toBe(false);
  });

  it('returns what the person saved', async () => {
    const { dependencies } = fakes(SETTINGS);
    await expect(createReminderService(dependencies).getReminders('user-sam')).resolves.toEqual(
      SETTINGS,
    );
  });

  it('saves the settings, then schedules the reminders that are on and stops the rest', async () => {
    const { dependencies, calls } = fakes();
    const saved = await createReminderService(dependencies).saveReminders('user-sam', SETTINGS);
    expect(saved).toEqual(SETTINGS);
    expect(dependencies.store.saveSettings).toHaveBeenCalledWith('user-sam', SETTINGS);
    expect(calls).toEqual([
      'saveSettings user-sam',
      'saveSchedule user-sam daily',
      'deleteSchedule user-sam weekly',
    ]);
    expect(dependencies.scheduler.saveSchedule).toHaveBeenCalledWith('user-sam', 'daily', {
      expression: 'cron(0 8 * * ? *)',
      timeZone: 'Europe/London',
    });
  });

  it('schedules the weekly reminder on its day when it is on', async () => {
    const { dependencies } = fakes();
    await createReminderService(dependencies).saveReminders('user-sam', {
      ...SETTINGS,
      daily: { isOn: false, time: '08:00' },
      weekly: { isOn: true, day: 'friday', time: '17:45' },
    });
    expect(dependencies.scheduler.saveSchedule).toHaveBeenCalledWith('user-sam', 'weekly', {
      expression: 'cron(45 17 ? * FRI *)',
      timeZone: 'Europe/London',
    });
    expect(dependencies.scheduler.deleteSchedule).toHaveBeenCalledWith('user-sam', 'daily');
  });

  it("removes both of the person's schedules", async () => {
    const { dependencies, calls } = fakes();
    await createReminderService(dependencies).removeSchedules('user-sam');
    expect(calls).toEqual(['deleteSchedule user-sam daily', 'deleteSchedule user-sam weekly']);
  });
});

describe('test reminders', () => {
  it("asks notify to send a test reminder to the signed-in person's own devices", async () => {
    const { dependencies, calls } = fakes();
    await createReminderService(dependencies).sendTestReminder('user-sam');
    expect(calls).toEqual([
      'count test-reminder#user-sam',
      `sendNow ${JSON.stringify({ userId: 'user-sam', reminder: 'test' })}`,
    ]);
    expect(dependencies.attempts.isLockedOut).toHaveBeenCalledWith(['test-reminder#user-sam'], NOW);
  });

  it('stops sending after too many in an hour', async () => {
    const { dependencies, calls } = fakes(null, true);
    const attempt = createReminderService(dependencies).sendTestReminder('user-sam');
    await expect(attempt).rejects.toBeInstanceOf(AppError);
    await expect(attempt).rejects.toMatchObject({ statusCode: 429 });
    expect(calls).toEqual([]);
  });
});
