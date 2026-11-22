import { TransactionCanceledException } from '@aws-sdk/client-dynamodb';
import { GetCommand, QueryCommand, TransactWriteCommand } from '@aws-sdk/lib-dynamodb';
import { householdRoleSchema, householdSummarySchema } from '@cleaning-planner/contracts/household';
import type { HouseholdRole, HouseholdSummary } from '@cleaning-planner/contracts/household';
import type { PersonColour } from '@cleaning-planner/contracts/primitives';
import { recordIdSchema } from '@cleaning-planner/contracts/primitives';
import { z } from '@cleaning-planner/contracts/zod';
import type { Membership, MembershipReader } from '../middlewares/membership';
import { Errors } from '../utils/errors';
import { Keys } from './table';
import type { Table } from './table';

export interface NewMember {
  householdId: string;
  householdName: string;
  userId: string;
  name: string;
  colour: PersonColour;
  role: HouseholdRole;
}

export interface MembershipRepository extends MembershipReader {
  addMember: (member: NewMember) => Promise<void>;
  listHomesOf: (userId: string) => Promise<HouseholdSummary[]>;
}

const storedMemberSchema = z.object({ userId: recordIdSchema, role: householdRoleSchema });
const storedHomeSchema = z.object(householdSummarySchema.shape);
const NOT_ALREADY_THERE = 'attribute_not_exists(pk)';

function isConditionFailure(error: unknown): boolean {
  return (
    error instanceof TransactionCanceledException &&
    (error.CancellationReasons ?? []).some((reason) => reason.Code === 'ConditionalCheckFailed')
  );
}

function addMemberCommand(table: Table, member: NewMember): TransactWriteCommand {
  return new TransactWriteCommand({
    TransactItems: [
      {
        Put: {
          TableName: table.name,
          Item: {
            pk: Keys.household(member.householdId),
            sk: Keys.member(member.userId),
            userId: member.userId,
            name: member.name,
            colour: member.colour,
            role: member.role,
          },
          ConditionExpression: NOT_ALREADY_THERE,
        },
      },
      {
        Put: {
          TableName: table.name,
          Item: {
            pk: Keys.user(member.userId),
            sk: Keys.household(member.householdId),
            id: member.householdId,
            name: member.householdName,
            role: member.role,
          },
          ConditionExpression: NOT_ALREADY_THERE,
        },
      },
    ],
  });
}

async function addMember(table: Table, member: NewMember): Promise<void> {
  try {
    await table.client.send(addMemberCommand(table, member));
  } catch (error) {
    if (isConditionFailure(error)) throw Errors.conflict("You're already a member of this home");
    throw error;
  }
}

async function findMembership(
  table: Table,
  householdId: string,
  userId: string,
): Promise<Membership | null> {
  const { Item } = await table.client.send(
    new GetCommand({
      TableName: table.name,
      Key: { pk: Keys.household(householdId), sk: Keys.member(userId) },
      ConsistentRead: true,
    }),
  );
  if (Item === undefined) return null;
  const stored = storedMemberSchema.parse(Item);
  return { householdId, userId: stored.userId, role: stored.role };
}

async function listHomesOf(table: Table, userId: string): Promise<HouseholdSummary[]> {
  const { Items = [] } = await table.client.send(
    new QueryCommand({
      TableName: table.name,
      KeyConditionExpression: 'pk = :user AND begins_with(sk, :homes)',
      ExpressionAttributeValues: { ':user': Keys.user(userId), ':homes': Keys.homesOfUser },
    }),
  );
  return Items.map((item) => storedHomeSchema.parse(item));
}

export function createMembershipRepository(table: Table): MembershipRepository {
  return {
    addMember: (member) => addMember(table, member),
    findMembership: (householdId, userId) => findMembership(table, householdId, userId),
    listHomesOf: (userId) => listHomesOf(table, userId),
  };
}
