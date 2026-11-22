import { GetCommand, QueryCommand, TransactWriteCommand } from '@aws-sdk/lib-dynamodb';
import { householdSchema } from '@cleaning-planner/contracts/household';
import type { Household, UpdateHouseholdRequest } from '@cleaning-planner/contracts/household';
import { z } from '@cleaning-planner/contracts/zod';
import type { HouseholdStore, NewHome } from '../services/household-service';
import { Errors } from '../utils/errors';
import { deleteInBatches, putInBatches } from './batch-write';
import { isConditionFailure } from './conditions';
import { Keys } from './table';
import type { Table } from './table';

const storedHouseholdSchema = z.object(householdSchema.shape);
const storedKeySchema = z.object({
  pk: z.string(),
  sk: z.string(),
  userId: z.optional(z.string()),
});
const MAX_MEMBERS_PER_TRANSACTION = 98;
const NOT_ALREADY_THERE = 'attribute_not_exists(pk)';
const MUST_EXIST = 'attribute_exists(pk)';

type StoredKey = z.infer<typeof storedKeySchema>;
type ItemKey = Record<string, string>;
type TransactItem = NonNullable<
  ConstructorParameters<typeof TransactWriteCommand>[0]['TransactItems']
>[number];

interface UpdateParts {
  key: ItemKey;
  fields: object;
  condition?: string;
  conditionValues?: Record<string, unknown>;
}

function putItem(table: Table, Item: Record<string, unknown>): TransactItem {
  return { Put: { TableName: table.name, Item, ConditionExpression: NOT_ALREADY_THERE } };
}

function deleteItem(table: Table, Key: ItemKey): TransactItem {
  return { Delete: { TableName: table.name, Key, ConditionExpression: MUST_EXIST } };
}

function updateItem(table: Table, parts: UpdateParts): TransactItem {
  const entries = Object.entries(parts.fields).filter(([, value]) => value !== undefined);
  return {
    Update: {
      TableName: table.name,
      Key: parts.key,
      UpdateExpression: `SET ${entries.map(([field]) => `#${field} = :${field}`).join(', ')}`,
      ConditionExpression: parts.condition ?? MUST_EXIST,
      ExpressionAttributeNames: Object.fromEntries(entries.map(([field]) => [`#${field}`, field])),
      ExpressionAttributeValues: {
        ...Object.fromEntries(entries.map(([field, value]) => [`:${field}`, value])),
        ...parts.conditionValues,
      },
    },
  };
}

async function transact(
  table: Table,
  items: TransactItem[],
  conflictMessage: string,
): Promise<void> {
  try {
    await table.client.send(new TransactWriteCommand({ TransactItems: items }));
  } catch (error) {
    if (isConditionFailure(error)) throw Errors.conflict(conflictMessage);
    throw error;
  }
}

async function createHome(table: Table, { household, owner, plan }: NewHome): Promise<void> {
  const home = Keys.household(household.id);
  await putInBatches(table, [
    ...plan.rooms.map((room) => ({ pk: home, sk: Keys.room(room.id), ...room })),
    ...plan.jobs.map((job) => ({ pk: home, sk: Keys.job(job.id), ...job })),
  ]);
  await transact(
    table,
    [
      putItem(table, { pk: home, sk: Keys.meta, ...household }),
      putItem(table, { pk: home, sk: Keys.member(owner.userId), ...owner, role: 'owner' }),
      putItem(table, {
        pk: Keys.user(owner.userId),
        sk: home,
        id: household.id,
        name: household.name,
        role: 'owner',
      }),
    ],
    'That home already exists',
  );
}

async function getHousehold(table: Table, householdId: string): Promise<Household | null> {
  const { Item } = await table.client.send(
    new GetCommand({
      TableName: table.name,
      Key: { pk: Keys.household(householdId), sk: Keys.meta },
      ConsistentRead: true,
    }),
  );
  return Item === undefined ? null : storedHouseholdSchema.parse(Item);
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

async function homeKeys(table: Table, householdId: string, prefix?: string): Promise<StoredKey[]> {
  const keys: StoredKey[] = [];
  let startKey: Record<string, unknown> | undefined;
  do {
    const page = await table.client.send(
      new QueryCommand({
        TableName: table.name,
        ...keyCondition(householdId, prefix),
        ProjectionExpression: 'pk, sk, userId',
        ConsistentRead: true,
        ExclusiveStartKey: startKey,
      }),
    );
    keys.push(...(page.Items ?? []).map((item) => storedKeySchema.parse(item)));
    startKey = page.LastEvaluatedKey;
  } while (startKey !== undefined);
  return keys;
}

function memberIdsOf(keys: readonly StoredKey[]): string[] {
  const members = keys.filter((key) => key.sk.startsWith(Keys.memberPrefix));
  if (members.length > MAX_MEMBERS_PER_TRANSACTION) {
    throw Errors.conflict('This home has too many members to change at once');
  }
  return members.flatMap((key) => (key.userId === undefined ? [] : [key.userId]));
}

async function requireHousehold(table: Table, householdId: string): Promise<Household> {
  const household = await getHousehold(table, householdId);
  if (household === null) throw Errors.notFound('No such home');
  return household;
}

async function updateHousehold(
  table: Table,
  householdId: string,
  { version, ...changes }: UpdateHouseholdRequest,
): Promise<Household> {
  const home = Keys.household(householdId);
  const renames =
    changes.name === undefined
      ? []
      : memberIdsOf(await homeKeys(table, householdId, Keys.memberPrefix)).map((userId) =>
          updateItem(table, {
            key: { pk: Keys.user(userId), sk: home },
            fields: { name: changes.name },
          }),
        );
  const metaUpdate = updateItem(table, {
    key: { pk: home, sk: Keys.meta },
    fields: { ...changes, version: version + 1 },
    condition: '#version = :expectedVersion',
    conditionValues: { ':expectedVersion': version },
  });
  await transact(
    table,
    [metaUpdate, ...renames],
    'Someone else changed this home. Reload and try again.',
  );
  return requireHousehold(table, householdId);
}

async function deleteHousehold(table: Table, householdId: string): Promise<void> {
  const home = Keys.household(householdId);
  const keys = await homeKeys(table, householdId);
  const hideHome = [
    deleteItem(table, { pk: home, sk: Keys.meta }),
    ...memberIdsOf(keys).map((userId) => deleteItem(table, { pk: Keys.user(userId), sk: home })),
  ];
  await transact(table, hideHome, 'This home has already been deleted');
  const rest = keys.filter((key) => key.sk !== Keys.meta).map(({ pk, sk }) => ({ pk, sk }));
  await deleteInBatches(table, rest);
}

async function removeMember(table: Table, householdId: string, userId: string): Promise<void> {
  const home = Keys.household(householdId);
  await transact(
    table,
    [
      deleteItem(table, { pk: home, sk: Keys.member(userId) }),
      deleteItem(table, { pk: Keys.user(userId), sk: home }),
    ],
    "You're not a member of this home",
  );
}

export function createHouseholdRepository(table: Table): HouseholdStore {
  return {
    createHome: (home) => createHome(table, home),
    getHousehold: (householdId) => getHousehold(table, householdId),
    updateHousehold: (householdId, changes) => updateHousehold(table, householdId, changes),
    deleteHousehold: (householdId) => deleteHousehold(table, householdId),
    removeMember: (householdId, userId) => removeMember(table, householdId, userId),
  };
}
