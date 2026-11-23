import { describe, expect, it } from 'vitest';
import {
  reminderEventSchema,
  reminderSettingsSchema,
  testReminderRequestSchema,
  timeOfDaySchema,
} from './reminders';
import { describeContract, fieldErrorsFor } from './test-support';

const SETTINGS = {
  timeZone: 'Europe/London',
  daily: { isOn: true, time: '08:00' },
  weekly: { isOn: false, day: 'sunday', time: '18:30' },
  onlyMyJobs: false,
  alsoByEmail: true,
};

describeContract('reminderSettingsSchema', reminderSettingsSchema, {
  valid: SETTINGS,
  requiredField: 'timeZone',
  wrongType: { field: 'onlyMyJobs', value: 'yes' },
});

describe('reminderSettingsSchema', () => {
  it('says which reminder has a bad time', () => {
    expect(
      fieldErrorsFor(reminderSettingsSchema, {
        ...SETTINGS,
        weekly: { ...SETTINGS.weekly, time: '6pm' },
      }),
    ).toEqual({ 'weekly.time': 'Use a time like 08:30' });
  });

  it('needs a day of the week for the weekly reminder', () => {
    expect(
      fieldErrorsFor(reminderSettingsSchema, {
        ...SETTINGS,
        weekly: { isOn: true, day: 'someday', time: '18:30' },
      }),
    ).toHaveProperty(['weekly.day']);
  });
});

describe('timeOfDaySchema', () => {
  it.each(['00:00', '08:05', '12:30', '23:59'])('accepts %s', (time) => {
    expect(timeOfDaySchema.parse(time)).toBe(time);
  });

  it.each(['24:00', '8:00', '08:60', '08:00:00', ''])('rejects %j', (time) => {
    expect(fieldErrorsFor(timeOfDaySchema, time)).toEqual({ request: 'Use a time like 08:30' });
  });
});

describeContract('reminderEventSchema', reminderEventSchema, {
  valid: { userId: 'user-1', reminder: 'daily' },
  requiredField: 'reminder',
  wrongType: { field: 'reminder', value: 'hourly' },
});

describe('testReminderRequestSchema', () => {
  it('takes no body, or an empty one', () => {
    expect(testReminderRequestSchema.safeParse(undefined).success).toBe(true);
    expect(testReminderRequestSchema.safeParse({}).success).toBe(true);
  });

  it('rejects anything in the body', () => {
    expect(testReminderRequestSchema.safeParse({ userId: 'user-2' }).success).toBe(false);
  });
});
