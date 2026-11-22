import { GetCommand, QueryCommand } from '@aws-sdk/lib-dynamodb';
import { z } from '@cleaning-planner/contracts/zod';
import { Keys } from './table';
import type { Table } from './table';

interface HomeItemsQuery {
  prefix?: string;
  projection?: string;
}

function keyCondition(
  householdId: string,
  prefix: string | undefined,
): { KeyConditionExpression: string; ExpressionAttributeValues: Record<string, string> } {
  const home = Keys.household(householdId);
  if (prefix === undefined) {
    return { KeyConditionExpression: 'pk = :home', ExpressionAttributeValues: { ':home': home } };
  }
  return {
    KeyConditionExpression: 'pk = :home AND begins_with(sk, :prefix)',
    ExpressionAttributeValues: { ':home': home, ':prefix': prefix },
  };
}

export async function homeItems(
  table: Table,
  householdId: string,
  { prefix, projection }: HomeItemsQuery = {},
): Promise<Record<string, unknown>[]> {
  const items: Record<string, unknown>[] = [];
  let startKey: Record<string, unknown> | undefined;
  do {
    const page = await table.client.send(
      new QueryCommand({
        TableName: table.name,
        ...keyCondition(householdId, prefix),
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

export async function homeItemKeys(
  table: Table,
  householdId: string,
  prefix: string,
): Promise<ItemKey[]> {
  const items = await homeItems(table, householdId, { prefix, projection: 'pk, sk' });
  return items.map((item) => storedKeySchema.parse(item));
}
