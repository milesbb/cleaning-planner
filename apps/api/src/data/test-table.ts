import {
  CreateTableCommand,
  DeleteTableCommand,
  waitUntilTableExists,
} from '@aws-sdk/client-dynamodb';
import { randomUUID } from 'node:crypto';
import { connectToTable, createDynamoClient } from './table';
import type { Table } from './table';

const TABLE_READY_SECONDS = 30;

export interface TestTable {
  table: Table;
  create: () => Promise<void>;
  remove: () => Promise<void>;
}

export function testTable(): TestTable {
  const endpoint = process.env.DYNAMODB_ENDPOINT;
  const table = connectToTable({ TABLE_NAME: `test-${randomUUID()}`, DYNAMODB_ENDPOINT: endpoint });
  const admin = createDynamoClient(endpoint);
  return {
    table,
    create: async (): Promise<void> => {
      await admin.send(
        new CreateTableCommand({
          TableName: table.name,
          BillingMode: 'PAY_PER_REQUEST',
          AttributeDefinitions: [
            { AttributeName: 'pk', AttributeType: 'S' },
            { AttributeName: 'sk', AttributeType: 'S' },
          ],
          KeySchema: [
            { AttributeName: 'pk', KeyType: 'HASH' },
            { AttributeName: 'sk', KeyType: 'RANGE' },
          ],
        }),
      );
      await waitUntilTableExists(
        { client: admin, maxWaitTime: TABLE_READY_SECONDS },
        { TableName: table.name },
      );
    },
    remove: async (): Promise<void> => {
      await admin.send(new DeleteTableCommand({ TableName: table.name }));
    },
  };
}
