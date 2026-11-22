import { GetCommand } from '@aws-sdk/lib-dynamodb';
import { householdSchema } from '@cleaning-planner/contracts/household';
import type { Household, UpdateHouseholdRequest } from '@cleaning-planner/contracts/household';
import { z } from '@cleaning-planner/contracts/zod';
import type { HouseholdStore, NewHome } from '../services/household-service';
import { Errors } from '../utils/errors';
import { deleteInBatches, putInBatches } from './batch-write';
import { homeItems } from './home-items';
import { Keys } from './table';
import type { Table } from './table';
import { deleteItem, putItem, transact, updateItem } from './transactions';

const storedHouseholdSchema = z.object(householdSchema.shape);
const storedKeySchema = z.object({
  pk: z.string(),
  sk: z.string(),
  userId: z.optional(z.string()),
});
const storedMemberKeySchema = z.object({ userId: z.string() });
const KEYS_ONLY = 'pk, sk, userId';

type StoredKey = z.infer<typeof storedKeySchema>;

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

async function homeKeys(table: Table, householdId: string, prefix?: string): Promise<StoredKey[]> {
  const items = await homeItems(table, householdId, {
    projection: KEYS_ONLY,
    ...(prefix === undefined ? {} : { prefix }),
  });
  return items.map((item) => storedKeySchema.parse(item));
}

function memberIdsOf(keys: readonly StoredKey[]): string[] {
  return keys
    .filter((key) => key.sk.startsWith(Keys.memberPrefix))
    .map((key) => storedMemberKeySchema.parse(key).userId);
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
  const memberIds =
    changes.name === undefined
      ? []
      : memberIdsOf(await homeKeys(table, householdId, Keys.memberPrefix));
  const renames = memberIds.map((userId) =>
    updateItem(table, { key: { pk: Keys.user(userId), sk: home }, fields: { name: changes.name } }),
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
