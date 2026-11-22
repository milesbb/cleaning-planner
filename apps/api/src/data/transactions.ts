import { TransactWriteCommand } from '@aws-sdk/lib-dynamodb';
import { Errors } from '../utils/errors';
import { isConditionFailure } from './conditions';
import type { Table } from './table';

const MAX_ITEMS_PER_TRANSACTION = 100;
const NOT_ALREADY_THERE = 'attribute_not_exists(pk)';
const MUST_EXIST = 'attribute_exists(pk)';

type ItemKey = Record<string, string>;
export type TransactItem = NonNullable<
  ConstructorParameters<typeof TransactWriteCommand>[0]['TransactItems']
>[number];

interface UpdateParts {
  key: ItemKey;
  fields: object;
  condition?: string;
  conditionValues?: Record<string, unknown>;
}

export function putItem(table: Table, Item: Record<string, unknown>): TransactItem {
  return { Put: { TableName: table.name, Item, ConditionExpression: NOT_ALREADY_THERE } };
}

export function overwriteItem(table: Table, Item: Record<string, unknown>): TransactItem {
  return { Put: { TableName: table.name, Item } };
}

export function deleteIfPresent(table: Table, Key: ItemKey): TransactItem {
  return { Delete: { TableName: table.name, Key } };
}

export function deleteItem(table: Table, Key: ItemKey): TransactItem {
  return { Delete: { TableName: table.name, Key, ConditionExpression: MUST_EXIST } };
}

export function updateItem(table: Table, parts: UpdateParts): TransactItem {
  const entries = Object.entries(parts.fields).filter(([, value]) => value !== undefined);
  return {
    Update: {
      TableName: table.name,
      Key: parts.key,
      UpdateExpression: `SET ${entries.map(([field]) => `#${field} = :${field}`).join(', ')}`,
      ConditionExpression: parts.condition ?? MUST_EXIST,
      ExpressionAttributeNames: Object.fromEntries(entries.map(([field]) => [`#${field}`, field])),
      ExpressionAttributeValues: {
        ...Object.fromEntries(entries.map(([field, value]) => [`:${field}`, value])),
        ...parts.conditionValues,
      },
    },
  };
}

export async function transact(
  table: Table,
  items: TransactItem[],
  conflictMessage: string,
): Promise<void> {
  if (items.length > MAX_ITEMS_PER_TRANSACTION) {
    throw Errors.conflict('That changes too many things at once');
  }
  try {
    await table.client.send(new TransactWriteCommand({ TransactItems: items }));
  } catch (error) {
    if (isConditionFailure(error)) throw Errors.conflict(conflictMessage);
    throw error;
  }
}

interface VersionedFields {
  version: number;
  [field: string]: unknown;
}

interface VersionedChange {
  key: ItemKey;
  changes: VersionedFields;
  conflictMessage: string;
}

export function versionedUpdate(
  table: Table,
  key: ItemKey,
  { version, ...fields }: VersionedFields,
): TransactItem {
  return updateItem(table, {
    key,
    fields: { ...fields, version: version + 1 },
    condition: '#version = :expectedVersion',
    conditionValues: { ':expectedVersion': version },
  });
}

export async function updateIfUnchanged(
  table: Table,
  { key, changes, conflictMessage }: VersionedChange,
): Promise<void> {
  await transact(table, [versionedUpdate(table, key, changes)], conflictMessage);
}
