import { GetCommand, PutCommand } from '@aws-sdk/lib-dynamodb';
import { reminderSettingsSchema } from '@cleaning-planner/contracts/reminders';
import type { ReminderSettings } from '@cleaning-planner/contracts/reminders';
import { z } from '@cleaning-planner/contracts/zod';
import type { ReminderStore } from '../services/reminder-service';
import { Keys } from './table';
import type { Table } from './table';

const storedSettingsSchema = z.object(reminderSettingsSchema.shape);

function settingsKey(userId: string): { pk: string; sk: string } {
  return { pk: Keys.user(userId), sk: Keys.reminders };
}

async function getSettings(table: Table, userId: string): Promise<ReminderSettings | null> {
  const { Item } = await table.client.send(
    new GetCommand({ TableName: table.name, Key: settingsKey(userId), ConsistentRead: true }),
  );
  return Item === undefined ? null : storedSettingsSchema.parse(Item);
}

async function saveSettings(
  table: Table,
  userId: string,
  settings: ReminderSettings,
): Promise<void> {
  await table.client.send(
    new PutCommand({ TableName: table.name, Item: { ...settingsKey(userId), ...settings } }),
  );
}

export function createReminderRepository(table: Table): ReminderStore {
  return {
    getSettings: (userId) => getSettings(table, userId),
    saveSettings: (userId, settings) => saveSettings(table, userId, settings),
  };
}
