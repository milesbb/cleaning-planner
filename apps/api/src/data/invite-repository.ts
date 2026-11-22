import { GetCommand } from '@aws-sdk/lib-dynamodb';
import { z } from '@cleaning-planner/contracts/zod';
import type { Invite, InviteStore } from '../services/invite-service';
import { Keys } from './table';
import type { Table } from './table';
import { deleteIfPresent, overwriteItem, putItem, transact } from './transactions';

const MILLISECONDS_PER_SECOND = 1000;

const storedInviteSchema = z.object({
  code: z.string(),
  householdId: z.string(),
  invitedBy: z.string(),
  invitedByName: z.string(),
  expiresAt: z.number(),
});
const currentInviteSchema = z.object({ code: z.string() });

async function getItem(table: Table, pk: string, sk: string): Promise<unknown> {
  const { Item } = await table.client.send(
    new GetCommand({ TableName: table.name, Key: { pk, sk }, ConsistentRead: true }),
  );
  return Item;
}

async function currentCode(table: Table, householdId: string): Promise<string | null> {
  const item = await getItem(table, Keys.household(householdId), Keys.currentInvite);
  return item === undefined ? null : currentInviteSchema.parse(item).code;
}

async function replaceInvite(table: Table, invite: Invite): Promise<void> {
  const oldCode = await currentCode(table, invite.householdId);
  const expiresAtSeconds = Math.floor(Date.parse(invite.expiresAt) / MILLISECONDS_PER_SECOND);
  await transact(
    table,
    [
      overwriteItem(table, {
        pk: Keys.household(invite.householdId),
        sk: Keys.currentInvite,
        code: invite.code,
      }),
      putItem(table, {
        pk: Keys.invite(invite.code),
        sk: Keys.meta,
        ...invite,
        expiresAt: expiresAtSeconds,
      }),
      ...(oldCode === null
        ? []
        : [deleteIfPresent(table, { pk: Keys.invite(oldCode), sk: Keys.meta })]),
    ],
    'That invite code is already in use. Try again.',
  );
}

async function findInvite(table: Table, code: string): Promise<Invite | null> {
  const item = await getItem(table, Keys.invite(code), Keys.meta);
  if (item === undefined) return null;
  const stored = storedInviteSchema.parse(item);
  return {
    ...stored,
    expiresAt: new Date(stored.expiresAt * MILLISECONDS_PER_SECOND).toISOString(),
  };
}

export function createInviteRepository(table: Table): InviteStore {
  return {
    replaceInvite: (invite) => replaceInvite(table, invite),
    findInvite: (code) => findInvite(table, code),
  };
}
