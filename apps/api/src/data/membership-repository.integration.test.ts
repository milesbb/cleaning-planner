import { GetCommand, PutCommand } from '@aws-sdk/lib-dynamodb';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createMembershipRepository } from './membership-repository';
import type { NewMember } from './membership-repository';
import { Keys } from './table';
import { testTable } from './test-table';

const { table, create, remove } = testTable();
const memberships = createMembershipRepository(table);

const SAM_OWNS_THE_FLAT: NewMember = {
  householdId: 'home-flat',
  householdName: 'Our flat',
  userId: 'user-sam',
  name: 'Sam',
  colour: 'blue',
  role: 'owner',
};

beforeAll(create);
afterAll(remove);

describe('membership repository (DynamoDB Local)', () => {
  it('writes both sides of a membership and reads it back', async () => {
    await memberships.addMember(SAM_OWNS_THE_FLAT);
    await expect(memberships.findMembership('home-flat', 'user-sam')).resolves.toEqual({
      householdId: 'home-flat',
      userId: 'user-sam',
      role: 'owner',
    });
  });

  it('finds nothing for someone outside the home', async () => {
    await expect(memberships.findMembership('home-flat', 'user-stranger')).resolves.toBeNull();
  });

  it("lists a person's homes with one query", async () => {
    await memberships.addMember({
      ...SAM_OWNS_THE_FLAT,
      householdId: 'home-mum',
      householdName: "Mum's house",
      role: 'member',
    });
    await expect(memberships.listHomesOf('user-sam')).resolves.toEqual([
      { id: 'home-flat', name: 'Our flat', role: 'owner' },
      { id: 'home-mum', name: "Mum's house", role: 'member' },
    ]);
  });

  it('refuses to add the same member twice', async () => {
    await expect(memberships.addMember(SAM_OWNS_THE_FLAT)).rejects.toThrow(
      "You're already a member of this home",
    );
  });

  it('writes neither side when one side already exists', async () => {
    await table.client.send(
      new PutCommand({
        TableName: table.name,
        Item: { pk: Keys.user('user-alex'), sk: Keys.household('home-flat'), id: 'home-flat' },
      }),
    );
    await expect(
      memberships.addMember({ ...SAM_OWNS_THE_FLAT, userId: 'user-alex', role: 'member' }),
    ).rejects.toThrow("You're already a member of this home");
    const { Item } = await table.client.send(
      new GetCommand({
        TableName: table.name,
        Key: { pk: Keys.household('home-flat'), sk: Keys.member('user-alex') },
      }),
    );
    expect(Item).toBeUndefined();
  });
});
