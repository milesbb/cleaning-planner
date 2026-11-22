import { GetCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb';
import { z } from '@cleaning-planner/contracts/zod';
import type { AttemptStore } from '../services/invite-service';
import { Keys } from './table';
import type { Table } from './table';

const MAX_WRONG_CODES_PER_HOUR = 10;
const KEEP_FOR_SECONDS = 2 * 60 * 60;
const MILLISECONDS_PER_SECOND = 1000;
const HOUR_PREFIX_LENGTH = 'YYYY-MM-DDTHH'.length;

const storedCountSchema = z.object({ count: z.number() });

function hourOf(now: string): string {
  return now.slice(0, HOUR_PREFIX_LENGTH);
}

async function wrongCodesThisHour(table: Table, guardKey: string, now: string): Promise<number> {
  const { Item } = await table.client.send(
    new GetCommand({
      TableName: table.name,
      Key: { pk: Keys.attempts(guardKey), sk: hourOf(now) },
      ConsistentRead: true,
    }),
  );
  return Item === undefined ? 0 : storedCountSchema.parse(Item).count;
}

async function isLockedOut(
  table: Table,
  guardKeys: readonly string[],
  now: string,
): Promise<boolean> {
  const counts = await Promise.all(guardKeys.map((key) => wrongCodesThisHour(table, key, now)));
  return counts.some((count) => count >= MAX_WRONG_CODES_PER_HOUR);
}

async function recordFailure(
  table: Table,
  guardKeys: readonly string[],
  now: string,
): Promise<void> {
  const expiresAt = Math.floor(Date.parse(now) / MILLISECONDS_PER_SECOND) + KEEP_FOR_SECONDS;
  await Promise.all(
    guardKeys.map((key) =>
      table.client.send(
        new UpdateCommand({
          TableName: table.name,
          Key: { pk: Keys.attempts(key), sk: hourOf(now) },
          UpdateExpression: 'ADD #count :one SET expiresAt = :expiresAt',
          ExpressionAttributeNames: { '#count': 'count' },
          ExpressionAttributeValues: { ':one': 1, ':expiresAt': expiresAt },
        }),
      ),
    ),
  );
}

export function createAttemptRepository(table: Table): AttemptStore {
  return {
    isLockedOut: (guardKeys, now) => isLockedOut(table, guardKeys, now),
    recordFailure: (guardKeys, now) => recordFailure(table, guardKeys, now),
  };
}
