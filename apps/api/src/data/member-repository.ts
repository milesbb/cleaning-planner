import { memberSchema } from '@cleaning-planner/contracts/household';
import type { HouseholdRole, Member } from '@cleaning-planner/contracts/household';
import { z } from '@cleaning-planner/contracts/zod';
import type { MemberStore } from '../services/member-service';
import { homeItems } from './home-items';
import { Keys } from './table';
import type { Table } from './table';
import { deleteItem, transact, updateItem } from './transactions';
import type { TransactItem } from './transactions';

const storedMemberSchema = z.object(memberSchema.shape);
const storedAssignmentSchema = z.object({
  sk: z.string(),
  assignment: z.object({ kind: z.string(), memberId: z.optional(z.string()) }),
});

async function listMembers(table: Table, householdId: string): Promise<Member[]> {
  const items = await homeItems(table, householdId, { prefix: Keys.memberPrefix });
  return items.map((item) => storedMemberSchema.parse(item));
}

async function jobsOnlyFor(table: Table, householdId: string, userId: string): Promise<string[]> {
  const jobs = await homeItems(table, householdId, {
    prefix: Keys.jobPrefix,
    projection: 'sk, assignment',
  });
  return jobs
    .map((job) => storedAssignmentSchema.parse(job))
    .filter(({ assignment }) => assignment.kind === 'member' && assignment.memberId === userId)
    .map((job) => job.sk);
}

export async function removeMemberFromHome(
  table: Table,
  householdId: string,
  userId: string,
): Promise<void> {
  const home = Keys.household(householdId);
  const reassignments = (await jobsOnlyFor(table, householdId, userId)).map((jobKey) =>
    updateItem(table, {
      key: { pk: home, sk: jobKey },
      fields: { assignment: { kind: 'anyone' } },
    }),
  );
  await transact(
    table,
    [
      deleteItem(table, { pk: home, sk: Keys.member(userId) }),
      deleteItem(table, { pk: Keys.user(userId), sk: home }),
      ...reassignments,
    ],
    "You're not a member of this home",
  );
}

function setRole(
  table: Table,
  householdId: string,
  userId: string,
  role: HouseholdRole,
): TransactItem[] {
  const home = Keys.household(householdId);
  return [
    updateItem(table, { key: { pk: home, sk: Keys.member(userId) }, fields: { role } }),
    updateItem(table, { key: { pk: Keys.user(userId), sk: home }, fields: { role } }),
  ];
}

async function handOver(
  table: Table,
  householdId: string,
  fromUserId: string,
  toUserId: string,
): Promise<void> {
  const ownerUpdate = updateItem(table, {
    key: { pk: Keys.household(householdId), sk: Keys.meta },
    fields: { ownerId: toUserId },
    condition: '#ownerId = :currentOwner',
    conditionValues: { ':currentOwner': fromUserId },
  });
  await transact(
    table,
    [
      ownerUpdate,
      ...setRole(table, householdId, toUserId, 'owner'),
      ...setRole(table, householdId, fromUserId, 'member'),
    ],
    'That person is no longer a member of this home',
  );
}

export function createMemberRepository(table: Table): MemberStore {
  return {
    listMembers: (householdId) => listMembers(table, householdId),
    handOver: (householdId, fromUserId, toUserId) =>
      handOver(table, householdId, fromUserId, toUserId),
    removeMember: (householdId, userId) => removeMemberFromHome(table, householdId, userId),
  };
}
