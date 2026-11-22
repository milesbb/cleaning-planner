import type { Member } from '@cleaning-planner/contracts/household';
import { describe, expect, it, vi } from 'vitest';
import type { Membership } from '../middlewares/membership';
import { createMemberService } from './member-service';
import type { MemberStore } from './member-service';

const SAM_OWNS: Membership = { householdId: 'home-1', userId: 'user-sam', role: 'owner' };

const MEMBERS: Member[] = [
  { userId: 'user-sam', name: 'Sam', colour: 'blue', role: 'owner' },
  { userId: 'user-alex', name: 'Alex', colour: 'pink', role: 'member' },
];

function fakeStore(): MemberStore {
  return {
    listMembers: vi.fn(() => Promise.resolve(MEMBERS)),
    handOver: vi.fn(() => Promise.resolve()),
    removeMember: vi.fn(() => Promise.resolve()),
  };
}

describe('member service', () => {
  it('lists the members of a home', async () => {
    await expect(createMemberService(fakeStore()).listMembers('home-1')).resolves.toEqual(MEMBERS);
  });

  it('hands the home over when the owner makes someone else the owner', async () => {
    const store = fakeStore();
    await createMemberService(store).changeRole(SAM_OWNS, 'user-alex', 'owner');
    expect(store.handOver).toHaveBeenCalledWith('home-1', 'user-sam', 'user-alex');
  });

  it('does nothing when the owner is made owner again, or a member stays a member', async () => {
    const store = fakeStore();
    const service = createMemberService(store);
    await expect(service.changeRole(SAM_OWNS, 'user-sam', 'owner')).resolves.toEqual(MEMBERS);
    await service.changeRole(SAM_OWNS, 'user-alex', 'member');
    expect(store.handOver).not.toHaveBeenCalled();
  });

  it('stops the owner making themselves a plain member without a new owner', async () => {
    await expect(
      createMemberService(fakeStore()).changeRole(SAM_OWNS, 'user-sam', 'member'),
    ).rejects.toThrow('Make someone else the owner first');
  });

  it('refuses to hand over to someone outside the home', async () => {
    const store = fakeStore();
    await expect(
      createMemberService(store).changeRole(SAM_OWNS, 'user-stranger', 'owner'),
    ).rejects.toThrow("That person isn't a member of this home");
    expect(store.handOver).not.toHaveBeenCalled();
  });

  it('removes a member', async () => {
    const store = fakeStore();
    await createMemberService(store).removeMember(SAM_OWNS, 'user-alex');
    expect(store.removeMember).toHaveBeenCalledWith('home-1', 'user-alex');
  });

  it('stops the owner removing themselves', async () => {
    const store = fakeStore();
    await expect(createMemberService(store).removeMember(SAM_OWNS, 'user-sam')).rejects.toThrow(
      "You can't remove yourself",
    );
    expect(store.removeMember).not.toHaveBeenCalled();
  });

  it('says so when removing someone who is not a member', async () => {
    await expect(
      createMemberService(fakeStore()).removeMember(SAM_OWNS, 'user-stranger'),
    ).rejects.toThrow("That person isn't a member of this home");
  });
});
