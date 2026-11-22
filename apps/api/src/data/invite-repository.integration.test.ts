import { GetCommand } from '@aws-sdk/lib-dynamodb';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { Invite } from '../services/invite-service';
import { createAttemptRepository } from './attempts-repository';
import { createInviteRepository } from './invite-repository';
import { Keys } from './table';
import { testTable } from './test-table';

const { table, create, remove } = testTable();
const invites = createInviteRepository(table);
const attempts = createAttemptRepository(table);

const FIRST: Invite = {
  code: '7K3M9QZA',
  householdId: 'home-1',
  invitedBy: 'user-sam',
  invitedByName: 'Sam',
  expiresAt: '2026-11-30T09:00:00.000Z',
};
const NOW = '2026-11-23T09:15:00.000Z';
const GUARD_KEYS = ['account:user-alex', 'ip:203.0.113.7'];

beforeAll(create);
afterAll(remove);

describe('invite repository (DynamoDB Local)', () => {
  it('stores a code and finds it again', async () => {
    await invites.replaceInvite(FIRST);
    await expect(invites.findInvite('7K3M9QZA')).resolves.toEqual(FIRST);
  });

  it('keeps the expiry in seconds so DynamoDB can remove it with TTL', async () => {
    const { Item } = await table.client.send(
      new GetCommand({
        TableName: table.name,
        Key: { pk: Keys.invite('7K3M9QZA'), sk: Keys.meta },
      }),
    );
    expect(Item?.expiresAt).toBe(Date.parse(FIRST.expiresAt) / 1000);
  });

  it('stops the old code working when a new one is made', async () => {
    await invites.replaceInvite({ ...FIRST, code: 'NEWC0DE1' });
    await expect(invites.findInvite('7K3M9QZA')).resolves.toBeNull();
    await expect(invites.findInvite('NEWC0DE1')).resolves.toMatchObject({ householdId: 'home-1' });
  });

  it('refuses a code another home already uses', async () => {
    await expect(
      invites.replaceInvite({ ...FIRST, householdId: 'home-2', code: 'NEWC0DE1' }),
    ).rejects.toThrow('That invite code is already in use');
  });

  it('finds nothing for a code that was never made', async () => {
    await expect(invites.findInvite('ZZZZZZZZ')).resolves.toBeNull();
  });
});

describe('attempt repository (DynamoDB Local)', () => {
  it('is not locked out before any wrong codes', async () => {
    await expect(attempts.isLockedOut(GUARD_KEYS, NOW)).resolves.toBe(false);
  });

  it('locks out after ten wrong codes in the same hour', async () => {
    for (let attempt = 0; attempt < 9; attempt += 1) {
      await attempts.recordFailure(GUARD_KEYS, NOW);
    }
    await expect(attempts.isLockedOut(GUARD_KEYS, NOW)).resolves.toBe(false);
    await attempts.recordFailure(GUARD_KEYS, NOW);
    await expect(attempts.isLockedOut(GUARD_KEYS, NOW)).resolves.toBe(true);
  });

  it('locks out an account even when it switches address', async () => {
    await expect(attempts.isLockedOut(['account:user-alex', 'ip:198.51.100.1'], NOW)).resolves.toBe(
      true,
    );
  });

  it('starts counting again the next hour', async () => {
    await expect(attempts.isLockedOut(GUARD_KEYS, '2026-11-23T10:00:00.000Z')).resolves.toBe(false);
  });
});
