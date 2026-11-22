import { BatchWriteCommand } from '@aws-sdk/lib-dynamodb';
import type { Table } from './table';

type WriteRequest =
  | { PutRequest: { Item: Record<string, unknown> } }
  | { DeleteRequest: { Key: Record<string, unknown> } };

const ITEMS_PER_BATCH = 25;
const MAX_ATTEMPTS = 5;
const FIRST_RETRY_DELAY_MS = 50;

function chunksOf<Item>(items: readonly Item[], size: number): Item[][] {
  return Array.from({ length: Math.ceil(items.length / size) }, (_, index) =>
    items.slice(index * size, (index + 1) * size),
  );
}

function wait(milliseconds: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, milliseconds);
  });
}

async function writeBatch(table: Table, requests: WriteRequest[]): Promise<void> {
  let pending = requests;
  for (let attempt = 1; pending.length > 0; attempt += 1) {
    if (attempt > MAX_ATTEMPTS) throw new Error('DynamoDB kept throttling a batch write');
    if (attempt > 1) await wait(FIRST_RETRY_DELAY_MS * 2 ** (attempt - 2));
    const { UnprocessedItems } = await table.client.send(
      new BatchWriteCommand({ RequestItems: { [table.name]: pending } }),
    );
    pending = (UnprocessedItems?.[table.name] ?? []).flatMap((request): WriteRequest[] => {
      if (request.PutRequest?.Item !== undefined) {
        return [{ PutRequest: { Item: request.PutRequest.Item } }];
      }
      if (request.DeleteRequest?.Key !== undefined) {
        return [{ DeleteRequest: { Key: request.DeleteRequest.Key } }];
      }
      return [];
    });
  }
}

export async function putInBatches(
  table: Table,
  items: readonly Record<string, unknown>[],
): Promise<void> {
  for (const batch of chunksOf(items, ITEMS_PER_BATCH)) {
    await writeBatch(
      table,
      batch.map((Item) => ({ PutRequest: { Item } })),
    );
  }
}

export async function deleteInBatches(
  table: Table,
  keys: readonly Record<string, unknown>[],
): Promise<void> {
  for (const batch of chunksOf(keys, ITEMS_PER_BATCH)) {
    await writeBatch(
      table,
      batch.map((Key) => ({ DeleteRequest: { Key } })),
    );
  }
}
