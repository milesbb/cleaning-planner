import { GetCommand, QueryCommand } from '@aws-sdk/lib-dynamodb';
import { z } from '@cleaning-planner/contracts/zod';
import { Keys } from './table';
import type { Table } from './table';

interface HomeItemsQuery {
  prefix?: string;
  projection?: string;
}

function keyCondition(
  pk: string,
  prefix: string | undefined,
): { KeyConditionExpression: string; ExpressionAttributeValues: Record<string, string> } {
  if (prefix === undefined) {
    return { KeyConditionExpression: 'pk = :pk', ExpressionAttributeValues: { ':pk': pk } };
  }
  return {
    KeyConditionExpression: 'pk = :pk AND begins_with(sk, :prefix)',
    ExpressionAttributeValues: { ':pk': pk, ':prefix': prefix },
  };
}

async function partitionItems(
  table: Table,
  pk: string,
  { prefix, projection }: HomeItemsQuery = {},
): Promise<Record<string, unknown>[]> {
  const items: Record<string, unknown>[] = [];
  let startKey: Record<string, unknown> | undefined;
  do {
    const page = await table.client.send(
      new QueryCommand({
        TableName: table.name,
        ...keyCondition(pk, prefix),
        ...(projection === undefined ? {} : { ProjectionExpression: projection }),
        ConsistentRead: true,
        ExclusiveStartKey: startKey,
      }),
    );
    items.push(...(page.Items ?? []));
    startKey = page.LastEvaluatedKey;
  } while (startKey !== undefined);
  return items;
}

export function homeItems(
  table: Table,
  householdId: string,
  query: HomeItemsQuery = {},
): Promise<Record<string, unknown>[]> {
  return partitionItems(table, Keys.household(householdId), query);
}

// The last `limit` items under `prefix`, by sort key, highest first: one query.
export async function latestHomeItems(
  table: Table,
  householdId: string,
  { prefix, limit }: { prefix: string; limit: number },
): Promise<Record<string, unknown>[]> {
  const { Items } = await table.client.send(
    new QueryCommand({
      TableName: table.name,
      ...keyCondition(Keys.household(householdId), prefix),
      ScanIndexForward: false,
      Limit: limit,
      ConsistentRead: true,
    }),
  );
  return Items ?? [];
}

const storedKeySchema = z.object({ pk: z.string(), sk: z.string() });

export type ItemKey = z.infer<typeof storedKeySchema>;

export function homeItemKey(householdId: string, sk: string): ItemKey {
  return { pk: Keys.household(householdId), sk };
}

export async function findHomeItem(
  table: Table,
  householdId: string,
  sk: string,
): Promise<Record<string, unknown> | undefined> {
  const { Item } = await table.client.send(
    new GetCommand({
      TableName: table.name,
      Key: homeItemKey(householdId, sk),
      ConsistentRead: true,
    }),
  );
  return Item;
}

export async function partitionItemKeys(
  table: Table,
  pk: string,
  prefix?: string,
): Promise<ItemKey[]> {
  const items = await partitionItems(table, pk, {
    ...(prefix === undefined ? {} : { prefix }),
    projection: 'pk, sk',
  });
  return items.map((item) => storedKeySchema.parse(item));
}

export function homeItemKeys(
  table: Table,
  householdId: string,
  prefix: string,
): Promise<ItemKey[]> {
  return partitionItemKeys(table, Keys.household(householdId), prefix);
}
