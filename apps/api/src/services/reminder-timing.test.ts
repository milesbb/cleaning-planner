import type { ReminderSettings } from '@cleaning-planner/contracts/reminders';
import { describe, expect, it } from 'vitest';
import { reminderTimingFor } from './reminder-timing';

const SETTINGS: ReminderSettings = {
  timeZone: 'Australia/Sydney',
  daily: { isOn: true, time: '08:05' },
  weekly: { isOn: true, day: 'sunday', time: '18:30' },
  onlyMyJobs: false,
  alsoByEmail: false,
};

describe('reminderTimingFor', () => {
  it("runs the daily reminder every day at its time, in the person's time zone", () => {
    expect(reminderTimingFor(SETTINGS, 'daily')).toEqual({
      expression: 'cron(5 8 * * ? *)',
      timeZone: 'Australia/Sydney',
    });
  });

  it('runs the weekly reminder on its day at its time', () => {
    expect(reminderTimingFor(SETTINGS, 'weekly')).toEqual({
      expression: 'cron(30 18 ? * SUN *)',
      timeZone: 'Australia/Sydney',
    });
  });

  it.each([
    ['monday', 'MON'],
    ['tuesday', 'TUE'],
    ['wednesday', 'WED'],
    ['thursday', 'THU'],
    ['friday', 'FRI'],
    ['saturday', 'SAT'],
  ] as const)('names %s as %s', (day, cronDay) => {
    const timing = reminderTimingFor(
      { ...SETTINGS, weekly: { isOn: true, day, time: '00:00' } },
      'weekly',
    );
    expect(timing.expression).toBe(`cron(0 0 ? * ${cronDay} *)`);
  });
});
