import { GetCommand, QueryCommand } from '@aws-sdk/lib-dynamodb';
import type { Household } from '@cleaning-planner/contracts/household';
import { parseCalendarDate } from '@cleaning-planner/schedule/calendar-date';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { planHome } from '../services/home-plan';
import type { NewHome } from '../services/household-service';
import { putInBatches } from './batch-write';
import { createHouseholdRepository } from './household-repository';
import { createMembershipRepository } from './membership-repository';
import { Keys } from './table';
import { testTable } from './test-table';
import { putItem, transact } from './transactions';

const { table, create, remove } = testTable();
const households = createHouseholdRepository(table);
const memberships = createMembershipRepository(table);

function newHome(householdId: string): NewHome {
  let next = 0;
  const household: Household = {
    id: householdId,
    name: 'Our flat',
    timeZone: 'Europe/London',
    weekStartsOn: 'monday',
    ownerId: 'user-sam',
    version: 1,
  };
  const plan = planHome(
    { rooms: [{ type: 'kitchen', name: 'Kitchen', appliances: ['dishwasher'] }], features: [] },
    parseCalendarDate('2026-11-23'),
    () => `${householdId}-item-${String((next += 1))}`,
  );
  return { household, owner: { userId: 'user-sam', name: 'Sam', colour: 'blue' }, plan };
}

async function itemsOf(householdId: string): Promise<number> {
  const { Count = 0 } = await table.client.send(
    new QueryCommand({
      TableName: table.name,
      KeyConditionExpression: 'pk = :home',
      ExpressionAttributeValues: { ':home': Keys.household(householdId) },
      Select: 'COUNT',
    }),
  );
  return Count;
}

beforeAll(create);
afterAll(remove);

describe('household repository (DynamoDB Local)', () => {
  it('writes the home, its owner, rooms and jobs', async () => {
    const home = newHome('home-flat');
    await households.createHome(home);
    await expect(households.getHousehold('home-flat')).resolves.toEqual(home.household);
    await expect(memberships.findMembership('home-flat', 'user-sam')).resolves.toMatchObject({
      role: 'owner',
    });
    await expect(memberships.listHomesOf('user-sam')).resolves.toEqual([
      { id: 'home-flat', name: 'Our flat', role: 'owner' },
    ]);
    const expected = 2 + home.plan.rooms.length + home.plan.jobs.length;
    await expect(itemsOf('home-flat')).resolves.toBe(expected);
  });

  it('refuses to create the same home twice', async () => {
    await expect(households.createHome(newHome('home-flat'))).rejects.toThrow(
      'That home already exists',
    );
  });

  it('has nothing for a home that does not exist', async () => {
    await expect(households.getHousehold('home-none')).resolves.toBeNull();
  });

  it("renames the home and every member's copy of its name, bumping the version", async () => {
    await memberships.addMember({
      householdId: 'home-flat',
      householdName: 'Our flat',
      userId: 'user-alex',
      name: 'Alex',
      colour: 'pink',
      role: 'member',
    });
    await expect(
      households.updateHousehold('home-flat', { name: 'The flat', version: 1 }),
    ).resolves.toMatchObject({ name: 'The flat', version: 2 });
    await expect(memberships.listHomesOf('user-alex')).resolves.toEqual([
      { id: 'home-flat', name: 'The flat', role: 'member' },
    ]);
  });

  it('changes settings other than the name without touching members', async () => {
    await expect(
      households.updateHousehold('home-flat', { weekStartsOn: 'sunday', version: 2 }),
    ).resolves.toMatchObject({ weekStartsOn: 'sunday', name: 'The flat', version: 3 });
  });

  it('refuses an update based on an old version', async () => {
    await expect(
      households.updateHousehold('home-flat', { name: 'Stale', version: 1 }),
    ).rejects.toThrow('Someone else changed this home. Reload and try again.');
  });

  it('lets a member leave, removing both sides', async () => {
    await households.removeMember('home-flat', 'user-alex');
    await expect(memberships.findMembership('home-flat', 'user-alex')).resolves.toBeNull();
    await expect(memberships.listHomesOf('user-alex')).resolves.toEqual([]);
  });

  it('refuses to remove someone who is not a member', async () => {
    await expect(households.removeMember('home-flat', 'user-alex')).rejects.toThrow(
      "You're not a member of this home",
    );
  });

  it('deletes the home, every item in it and every member’s link to it', async () => {
    await households.deleteHousehold('home-flat');
    await expect(households.getHousehold('home-flat')).resolves.toBeNull();
    await expect(memberships.listHomesOf('user-sam')).resolves.toEqual([]);
    await expect(itemsOf('home-flat')).resolves.toBe(0);
  });

  it('refuses to delete a home that is already gone', async () => {
    await expect(households.deleteHousehold('home-flat')).rejects.toThrow(
      'This home has already been deleted',
    );
  });

  it('writes and deletes more items than one batch holds', async () => {
    const items = Array.from({ length: 60 }, (_, index) => ({
      pk: Keys.household('home-big'),
      sk: Keys.room(`room-${String(index)}`),
    }));
    await putInBatches(table, items);
    await expect(itemsOf('home-big')).resolves.toBe(60);
    const { Item } = await table.client.send(
      new GetCommand({ TableName: table.name, Key: items[59] ?? {} }),
    );
    expect(Item).toBeDefined();
  });

  it('passes on errors that are not about a condition, such as a missing table', async () => {
    const broken = createHouseholdRepository({ ...table, name: 'no-such-table' });
    await expect(broken.createHome(newHome('home-x'))).rejects.toMatchObject({
      name: 'ResourceNotFoundException',
    });
  });
});

describe('transactions (DynamoDB Local)', () => {
  it('refuses more items than one transaction can hold', async () => {
    const tooMany = Array.from({ length: 101 }, (_, index) =>
      putItem(table, { pk: 'too-many', sk: String(index) }),
    );
    await expect(transact(table, tooMany, 'never shown')).rejects.toThrow(
      'That changes too many things at once',
    );
  });

  it('passes on failures that are not about a condition', async () => {
    const missingTable = { ...table, name: 'no-such-table' };
    await expect(
      transact(missingTable, [putItem(missingTable, { pk: 'a', sk: 'b' })], 'never shown'),
    ).rejects.toMatchObject({ name: 'ResourceNotFoundException' });
  });
});
