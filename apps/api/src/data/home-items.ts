import { QueryCommand } from '@aws-sdk/lib-dynamodb';
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
