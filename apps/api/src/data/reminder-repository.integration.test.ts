import type { ReminderSettings } from '@cleaning-planner/contracts/reminders';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createReminderRepository } from './reminder-repository';
import { testTable } from './test-table';

const { table, create, remove } = testTable();
const reminders = createReminderRepository(table);

const SETTINGS: ReminderSettings = {
  timeZone: 'Europe/London',
  daily: { isOn: true, time: '08:00' },
  weekly: { isOn: false, day: 'sunday', time: '18:30' },
  onlyMyJobs: true,
  alsoByEmail: false,
};

beforeAll(create);
afterAll(remove);

describe('reminder repository (DynamoDB Local)', () => {
  it('has no settings until the person saves some', async () => {
    await expect(reminders.getSettings('user-sam')).resolves.toBeNull();
  });

  it('saves the settings and reads them back', async () => {
    await reminders.saveSettings('user-sam', SETTINGS);
    await expect(reminders.getSettings('user-sam')).resolves.toEqual(SETTINGS);
  });

  it('replaces the settings on the next save', async () => {
    const changed: ReminderSettings = { ...SETTINGS, weekly: { ...SETTINGS.weekly, isOn: true } };
    await reminders.saveSettings('user-sam', changed);
    await expect(reminders.getSettings('user-sam')).resolves.toEqual(changed);
  });

  it("keeps each person's settings apart", async () => {
    await expect(reminders.getSettings('user-alex')).resolves.toBeNull();
  });
});
