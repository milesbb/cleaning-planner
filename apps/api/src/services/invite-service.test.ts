import type { Household } from '@cleaning-planner/contracts/household';
import type { Profile } from '@cleaning-planner/contracts/profile';
import { describe, expect, it, vi } from 'vitest';
import type { Mock } from 'vitest';
import type { NewMember } from '../data/membership-repository';
import type { Membership } from '../middlewares/membership';
import { createInviteService } from './invite-service';
import type { AttemptStore, Invite, InviteStore } from './invite-service';

const NOW = '2026-11-23T09:00:00.000Z';
const FLAT: Household = {
  id: 'home-1',
  name: 'Our flat',
  timeZone: 'Europe/London',
  weekStartsOn: 'monday',
  ownerId: 'user-sam',
  version: 1,
};
const SAM_OWNS: Membership = { householdId: 'home-1', userId: 'user-sam', role: 'owner' };
const PROFILES: Record<string, Profile> = {
  'user-sam': { id: 'user-sam', name: 'Sam', email: 'sam@example.com', colour: 'blue' },
  'user-alex': { id: 'user-alex', name: 'Alex', email: 'alex@example.com', colour: 'pink' },
};
const LIVE_INVITE: Invite = {
  code: '7K3M9QZA',
  householdId: 'home-1',
  invitedBy: 'user-sam',
  invitedByName: 'Sam',
  expiresAt: '2026-11-30T09:00:00.000Z',
};
const ALEX = { userId: 'user-alex', sourceIp: '203.0.113.7' };

interface Fakes {
  invites: InviteStore & { saved: Invite[] };
  attempts: AttemptStore;
  addMember: Mock<(member: NewMember) => Promise<void>>;
}

function serviceWith(
  invite: Invite | null,
  { lockedOut = false, alreadyMember = false } = {},
): { service: ReturnType<typeof createInviteService>; fakes: Fakes } {
  const saved: Invite[] = [];
  const fakes: Fakes = {
    invites: {
      saved,
      replaceInvite: vi.fn((newInvite: Invite) => {
        saved.push(newInvite);
        return Promise.resolve();
      }),
      findInvite: vi.fn(() => Promise.resolve(invite)),
    },
    attempts: {
      isLockedOut: vi.fn(() => Promise.resolve(lockedOut)),
      recordFailure: vi.fn(() => Promise.resolve()),
    },
    addMember: vi.fn((_member: NewMember) => Promise.resolve()),
  };
  const service = createInviteService({
    invites: fakes.invites,
    attempts: fakes.attempts,
    households: { getHousehold: (id) => Promise.resolve(id === 'home-1' ? FLAT : null) },
    members: { listMembers: () => Promise.resolve([]) },
    memberships: {
      findMembership: (householdId, userId) =>
        Promise.resolve(alreadyMember ? { householdId, userId, role: 'member' as const } : null),
      addMember: fakes.addMember,
    },
    profiles: { getProfile: (userId) => Promise.resolve(PROFILES[userId] ?? null) },
    now: () => NOW,
    newCode: () => 'NEWC0DE1',
  });
  return { service, fakes };
}

describe('invite service', () => {
  it('makes a new code that lasts 7 days and names who invited', async () => {
    const { service, fakes } = serviceWith(null);
    await expect(service.createInvite(SAM_OWNS)).resolves.toEqual({
      code: 'NEWC0DE1',
      expiresAt: '2026-11-30T09:00:00.000Z',
    });
    expect(fakes.invites.saved).toEqual([
      { ...LIVE_INVITE, code: 'NEWC0DE1', expiresAt: '2026-11-30T09:00:00.000Z' },
    ]);
  });

  it('previews a live invite without joining', async () => {
    const { service, fakes } = serviceWith(LIVE_INVITE);
    await expect(service.previewInvite('7K3M9QZA', ALEX)).resolves.toEqual({
      householdName: 'Our flat',
      invitedByName: 'Sam',
      memberCount: 0,
      expiresAt: LIVE_INVITE.expiresAt,
    });
    expect(fakes.addMember).not.toHaveBeenCalled();
  });

  it('joins the home as a member with the person’s name and colour', async () => {
    const { service, fakes } = serviceWith(LIVE_INVITE);
    await expect(service.acceptInvite('7K3M9QZA', ALEX)).resolves.toEqual({
      id: 'home-1',
      name: 'Our flat',
      role: 'member',
    });
    expect(fakes.addMember).toHaveBeenCalledWith({
      householdId: 'home-1',
      householdName: 'Our flat',
      userId: 'user-alex',
      name: 'Alex',
      colour: 'pink',
      role: 'member',
    });
  });

  it('just returns the home when the person is already a member', async () => {
    const { service, fakes } = serviceWith(LIVE_INVITE, { alreadyMember: true });
    await expect(service.acceptInvite('7K3M9QZA', ALEX)).resolves.toMatchObject({ id: 'home-1' });
    expect(fakes.addMember).not.toHaveBeenCalled();
  });

  it('counts a wrong or replaced code against the account and the address', async () => {
    const { service, fakes } = serviceWith(null);
    await expect(service.previewInvite('WRONGC0D', ALEX)).rejects.toThrow(
      "That invite code isn't valid",
    );
    expect(fakes.attempts.recordFailure).toHaveBeenCalledWith(
      ['account:user-alex', 'ip:203.0.113.7'],
      NOW,
    );
  });

  it('treats a code for a deleted home as wrong', async () => {
    const { service } = serviceWith({ ...LIVE_INVITE, householdId: 'home-gone' });
    await expect(service.acceptInvite('7K3M9QZA', ALEX)).rejects.toThrow(
      "That invite code isn't valid",
    );
  });

  it('says an old code has expired', async () => {
    const { service } = serviceWith({ ...LIVE_INVITE, expiresAt: '2026-11-23T08:59:59.000Z' });
    await expect(service.acceptInvite('7K3M9QZA', ALEX)).rejects.toThrow('That invite has expired');
  });

  it('locks out after too many wrong codes, before looking the code up', async () => {
    const { service, fakes } = serviceWith(LIVE_INVITE, { lockedOut: true });
    await expect(service.acceptInvite('7K3M9QZA', ALEX)).rejects.toThrow('Too many wrong codes');
    expect(fakes.invites.findInvite).not.toHaveBeenCalled();
  });

  it('guards by account alone when the address is unknown', async () => {
    const { service, fakes } = serviceWith(null);
    await expect(
      service.previewInvite('WRONGC0D', { userId: 'user-alex', sourceIp: undefined }),
    ).rejects.toThrow();
    expect(fakes.attempts.recordFailure).toHaveBeenCalledWith(['account:user-alex'], NOW);
  });

  it('needs a profile to invite or to join', async () => {
    const { service } = serviceWith(LIVE_INVITE);
    await expect(
      service.createInvite({ householdId: 'home-1', userId: 'user-nobody', role: 'member' }),
    ).rejects.toThrow('Open the app again');
    await expect(
      service.acceptInvite('7K3M9QZA', { userId: 'user-nobody', sourceIp: undefined }),
    ).rejects.toThrow('Open the app again');
  });
});
