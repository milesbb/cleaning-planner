import type { HouseholdSummary, Member } from '@cleaning-planner/contracts/household';
import { describe, expect, it, vi } from 'vitest';
import { createAccountService } from './account-service';
import type { AccountDependencies } from './account-service';

const SAM_ID = 'user-sam';
const TOKEN = 'the-access-token';

const HOMES: HouseholdSummary[] = [
  { id: 'home-shared', name: 'Our flat', role: 'owner' },
  { id: 'home-solo', name: 'Beach hut', role: 'owner' },
  { id: 'home-theirs', name: 'Mum’s house', role: 'member' },
];

function member(userId: string, role: Member['role'] = 'member'): Member {
  return { userId, name: userId, colour: 'blue', role };
}

const MEMBERS: Record<string, Member[]> = {
  'home-shared': [member(SAM_ID, 'owner'), member('user-alex')],
  'home-solo': [member(SAM_ID, 'owner')],
  'home-theirs': [member('user-mum', 'owner'), member(SAM_ID)],
};

function fakes(): { dependencies: AccountDependencies; calls: string[] } {
  const calls: string[] = [];
  const record =
    (name: string) =>
    (...args: string[]): Promise<void> => {
      calls.push(`${name} ${args.join(' ')}`);
      return Promise.resolve();
    };
  return {
    calls,
    dependencies: {
      homes: { listHomesOf: () => Promise.resolve(HOMES) },
      members: {
        listMembers: (householdId) => Promise.resolve(MEMBERS[householdId] ?? []),
        handOver: vi.fn(record('handOver')),
      },
      households: {
        deleteHousehold: vi.fn(record('deleteHousehold')),
        removeMember: vi.fn(record('removeMember')),
      },
      profiles: { deleteProfile: vi.fn(record('deleteProfile')) },
      identity: { deleteIdentity: vi.fn(record('deleteIdentity')) },
    },
  };
}

describe('deleting an account', () => {
  it('hands over, deletes solo homes, leaves the rest, then deletes the sign-in last', async () => {
    const { dependencies, calls } = fakes();
    await createAccountService(dependencies).deleteAccount(SAM_ID, TOKEN, {
      ownedHomes: [{ householdId: 'home-shared', action: 'handOver', newOwnerId: 'user-alex' }],
    });
    expect(calls).toEqual([
      'handOver home-shared user-sam user-alex',
      'removeMember home-shared user-sam',
      'deleteHousehold home-solo',
      'removeMember home-theirs user-sam',
      'deleteProfile user-sam',
      `deleteIdentity ${TOKEN}`,
    ]);
  });

  it('deletes a shared home when asked to', async () => {
    const { dependencies, calls } = fakes();
    await createAccountService(dependencies).deleteAccount(SAM_ID, TOKEN, {
      ownedHomes: [{ householdId: 'home-shared', action: 'delete' }],
    });
    expect(calls.slice(0, 2)).toEqual(['deleteHousehold home-shared', 'deleteHousehold home-solo']);
  });

  it('stops with 409, changing nothing, when a shared home has no choice', async () => {
    const { dependencies, calls } = fakes();
    await expect(
      createAccountService(dependencies).deleteAccount(SAM_ID, TOKEN, { ownedHomes: [] }),
    ).rejects.toMatchObject({
      statusCode: 409,
      message: 'Choose who looks after Our flat, or delete it',
    });
    expect(calls).toEqual([]);
  });

  it('only hands over to someone who lives there', async () => {
    const { dependencies, calls } = fakes();
    await expect(
      createAccountService(dependencies).deleteAccount(SAM_ID, TOKEN, {
        ownedHomes: [
          { householdId: 'home-shared', action: 'handOver', newOwnerId: 'user-stranger' },
        ],
      }),
    ).rejects.toMatchObject({
      statusCode: 400,
      fields: { ownedHomes: 'Hand over to someone who lives there' },
    });
    expect(calls).toEqual([]);
  });

  it('refuses a choice for a home the person does not own', async () => {
    const { dependencies, calls } = fakes();
    await expect(
      createAccountService(dependencies).deleteAccount(SAM_ID, TOKEN, {
        ownedHomes: [
          { householdId: 'home-shared', action: 'delete' },
          { householdId: 'home-theirs', action: 'delete' },
        ],
      }),
    ).rejects.toMatchObject({
      statusCode: 400,
      fields: { ownedHomes: 'You can only choose for homes you own' },
    });
    expect(calls).toEqual([]);
  });
});
