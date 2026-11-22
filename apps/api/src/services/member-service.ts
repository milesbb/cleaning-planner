import type { HouseholdRole, Member } from '@cleaning-planner/contracts/household';
import type { Membership } from '../middlewares/membership';
import { Errors } from '../utils/errors';

export interface MemberStore {
  listMembers: (householdId: string) => Promise<Member[]>;
  handOver: (householdId: string, fromUserId: string, toUserId: string) => Promise<void>;
  removeMember: (householdId: string, userId: string) => Promise<void>;
}

export interface MemberService {
  listMembers: (householdId: string) => Promise<Member[]>;
  changeRole: (owner: Membership, userId: string, role: HouseholdRole) => Promise<Member[]>;
  removeMember: (owner: Membership, userId: string) => Promise<void>;
}

async function requireMember(
  store: MemberStore,
  householdId: string,
  userId: string,
): Promise<void> {
  const members = await store.listMembers(householdId);
  if (!members.some((member) => member.userId === userId)) {
    throw Errors.notFound("That person isn't a member of this home");
  }
}

async function changeRole(
  store: MemberStore,
  owner: Membership,
  userId: string,
  role: HouseholdRole,
): Promise<Member[]> {
  const isOwnerThemselves = userId === owner.userId;
  if (role === 'member' && isOwnerThemselves) {
    throw Errors.conflict('Make someone else the owner first; you become a member automatically.');
  }
  if (role === 'owner' && !isOwnerThemselves) {
    await requireMember(store, owner.householdId, userId);
    await store.handOver(owner.householdId, owner.userId, userId);
  }
  return store.listMembers(owner.householdId);
}

export function createMemberService(store: MemberStore): MemberService {
  return {
    listMembers: (householdId) => store.listMembers(householdId),
    changeRole: (owner, userId, role) => changeRole(store, owner, userId, role),
    removeMember: async (owner, userId): Promise<void> => {
      if (userId === owner.userId) {
        throw Errors.conflict("You can't remove yourself. Hand the home over, then leave.");
      }
      await requireMember(store, owner.householdId, userId);
      await store.removeMember(owner.householdId, userId);
    },
  };
}
