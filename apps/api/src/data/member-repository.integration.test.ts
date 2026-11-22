import { GetCommand, PutCommand } from '@aws-sdk/lib-dynamodb';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createHouseholdRepository } from './household-repository';
import { createMemberRepository } from './member-repository';
import { createMembershipRepository } from './membership-repository';
import { Keys } from './table';
import { testTable } from './test-table';

const { table, create, remove } = testTable();
const members = createMemberRepository(table);
const memberships = createMembershipRepository(table);
const households = createHouseholdRepository(table);

async function jobAssignment(jobId: string): Promise<unknown> {
  const { Item } = await table.client.send(
    new GetCommand({
      TableName: table.name,
      Key: { pk: Keys.household('home-1'), sk: Keys.job(jobId) },
    }),
  );
  return Item?.assignment;
}

async function putJob(jobId: string, assignment: object): Promise<void> {
  await table.client.send(
    new PutCommand({
      TableName: table.name,
      Item: { pk: Keys.household('home-1'), sk: Keys.job(jobId), id: jobId, assignment },
    }),
  );
}

beforeAll(async () => {
  await create();
  await table.client.send(
    new PutCommand({
      TableName: table.name,
      Item: { pk: Keys.household('home-1'), sk: Keys.meta, id: 'home-1', ownerId: 'user-sam' },
    }),
  );
  for (const [userId, name, role] of [
    ['user-sam', 'Sam', 'owner'],
    ['user-alex', 'Alex', 'member'],
    ['user-jo', 'Jo', 'member'],
  ] as const) {
    await memberships.addMember({
      householdId: 'home-1',
      householdName: 'Our flat',
      userId,
      name,
      colour: 'blue',
      role,
    });
  }
});
afterAll(remove);

describe('member repository (DynamoDB Local)', () => {
  it('lists every member of a home', async () => {
    const list = await members.listMembers('home-1');
    expect(list.map((member) => [member.userId, member.role])).toEqual([
      ['user-alex', 'member'],
      ['user-jo', 'member'],
      ['user-sam', 'owner'],
    ]);
  });

  it('hands the home over: new owner, old owner a member, the home records it', async () => {
    await members.handOver('home-1', 'user-sam', 'user-alex');
    await expect(memberships.findMembership('home-1', 'user-alex')).resolves.toMatchObject({
      role: 'owner',
    });
    await expect(memberships.findMembership('home-1', 'user-sam')).resolves.toMatchObject({
      role: 'member',
    });
    await expect(memberships.listHomesOf('user-alex')).resolves.toMatchObject([{ role: 'owner' }]);
    const { Item } = await table.client.send(
      new GetCommand({
        TableName: table.name,
        Key: { pk: Keys.household('home-1'), sk: Keys.meta },
      }),
    );
    expect(Item?.ownerId).toBe('user-alex');
  });

  it('refuses a hand-over from someone who is no longer the owner', async () => {
    await expect(members.handOver('home-1', 'user-sam', 'user-jo')).rejects.toThrow(
      'That person is no longer a member of this home',
    );
  });

  it('removes someone straight away and gives their own jobs to anyone', async () => {
    await putJob('job-jo', { kind: 'member', memberId: 'user-jo' });
    await putJob('job-alex', { kind: 'member', memberId: 'user-alex' });
    await putJob('job-turns', { kind: 'takeTurns' });
    await members.removeMember('home-1', 'user-jo');
    await expect(memberships.findMembership('home-1', 'user-jo')).resolves.toBeNull();
    await expect(memberships.listHomesOf('user-jo')).resolves.toEqual([]);
    await expect(jobAssignment('job-jo')).resolves.toEqual({ kind: 'anyone' });
    await expect(jobAssignment('job-alex')).resolves.toEqual({
      kind: 'member',
      memberId: 'user-alex',
    });
    await expect(jobAssignment('job-turns')).resolves.toEqual({ kind: 'takeTurns' });
  });

  it('refuses to remove someone who already left', async () => {
    await expect(members.removeMember('home-1', 'user-jo')).rejects.toThrow(
      "You're not a member of this home",
    );
  });

  it('reassigns jobs when someone leaves through the home routes too', async () => {
    await putJob('job-sam', { kind: 'member', memberId: 'user-sam' });
    await households.removeMember('home-1', 'user-sam');
    await expect(jobAssignment('job-sam')).resolves.toEqual({ kind: 'anyone' });
  });
});
