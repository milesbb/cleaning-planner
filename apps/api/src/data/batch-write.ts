import { BatchWriteCommand } from '@aws-sdk/lib-dynamodb';
import type { BatchWriteCommandOutput } from '@aws-sdk/lib-dynamodb';
import { retryUntilEmpty } from './retry';
import type { Table } from './table';

export type WriteRequest =
  | { PutRequest: { Item: Record<string, unknown> } }
  | { DeleteRequest: { Key: Record<string, unknown> } };

const ITEMS_PER_BATCH = 25;

function chunksOf<Item>(items: readonly Item[], size: number): Item[][] {
  return Array.from({ length: Math.ceil(items.length / size) }, (_, index) =>
    items.slice(index * size, (index + 1) * size),
  );
}

export function unprocessedRequests(
  { UnprocessedItems }: Pick<BatchWriteCommandOutput, 'UnprocessedItems'>,
  tableName: string,
): WriteRequest[] {
  return (UnprocessedItems?.[tableName] ?? []).flatMap((request): WriteRequest[] => {
    if (request.PutRequest?.Item !== undefined) {
      return [{ PutRequest: { Item: request.PutRequest.Item } }];
    }
    if (request.DeleteRequest?.Key !== undefined) {
      return [{ DeleteRequest: { Key: request.DeleteRequest.Key } }];
    }
    return [];
  });
}

async function writeAll(table: Table, requests: readonly WriteRequest[]): Promise<void> {
  for (const batch of chunksOf(requests, ITEMS_PER_BATCH)) {
    await retryUntilEmpty(batch, async (pending) => {
      const response = await table.client.send(
        new BatchWriteCommand({ RequestItems: { [table.name]: pending } }),
      );
      return unprocessedRequests(response, table.name);
    });
  }
}

export function putInBatches(
  table: Table,
  items: readonly Record<string, unknown>[],
): Promise<void> {
  return writeAll(
    table,
    items.map((Item) => ({ PutRequest: { Item } })),
  );
}

export function deleteInBatches(
  table: Table,
  keys: readonly Record<string, unknown>[],
): Promise<void> {
  return writeAll(
    table,
    keys.map((Key) => ({ DeleteRequest: { Key } })),
  );
}
