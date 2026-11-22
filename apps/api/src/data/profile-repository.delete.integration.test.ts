import { PutCommand } from '@aws-sdk/lib-dynamodb';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { partitionItemKeys } from './home-items';
import { createMembershipRepository } from './membership-repository';
import { createProfileRepository } from './profile-repository';
import { Keys } from './table';
import { testTable } from './test-table';

const { table, create, remove } = testTable();
const profiles = createProfileRepository(table, createMembershipRepository(table));

beforeAll(async () => {
  await create();
  await profiles.createProfile({
    id: 'user-sam',
    name: 'Sam',
    email: 'sam@example.com',
    colour: 'blue',
  });
  await profiles.createProfile({
    id: 'user-alex',
    name: 'Alex',
    email: 'alex@example.com',
    colour: 'pink',
  });
  await table.client.send(
    new PutCommand({
      TableName: table.name,
      Item: { pk: Keys.user('user-sam'), sk: 'PUSH#device-1', kind: 'webPush' },
    }),
  );
});
afterAll(remove);

describe('deleting a profile (DynamoDB Local)', () => {
  it('removes everything stored under the person, and nobody else’s', async () => {
    await profiles.deleteProfile('user-sam');
    await expect(partitionItemKeys(table, Keys.user('user-sam'))).resolves.toEqual([]);
    await expect(profiles.getProfile('user-alex')).resolves.toMatchObject({ name: 'Alex' });
  });
});
