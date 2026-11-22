import type { HouseholdSummary, Member } from '@cleaning-planner/contracts/household';
import type { CreateInviteResponse, InvitePreview } from '@cleaning-planner/contracts/invite';
import type { Membership, MembershipReader } from '../middlewares/membership';
import type { NewMember } from '../data/membership-repository';
import { Errors } from '../utils/errors';
import type { HouseholdStore } from './household-service';
import type { ProfileStore } from './profile-service';

const INVITE_LIFETIME_DAYS = 7;
const MILLISECONDS_PER_DAY = 86_400_000;

export interface Invite {
  code: string;
  householdId: string;
  invitedBy: string;
  invitedByName: string;
  expiresAt: string;
}

export interface InviteStore {
  replaceInvite: (invite: Invite) => Promise<void>;
  findInvite: (code: string) => Promise<Invite | null>;
}

export interface AttemptStore {
  isLockedOut: (guardKeys: readonly string[], now: string) => Promise<boolean>;
  recordFailure: (guardKeys: readonly string[], now: string) => Promise<void>;
}

export interface InviteCaller {
  userId: string;
  sourceIp: string | undefined;
}

export interface InviteService {
  createInvite: (membership: Membership) => Promise<CreateInviteResponse>;
  previewInvite: (code: string, caller: InviteCaller) => Promise<InvitePreview>;
  acceptInvite: (code: string, caller: InviteCaller) => Promise<HouseholdSummary>;
}

interface InviteServiceDependencies {
  invites: InviteStore;
  attempts: AttemptStore;
  households: Pick<HouseholdStore, 'getHousehold'>;
  members: { listMembers: (householdId: string) => Promise<Member[]> };
  memberships: MembershipReader & { addMember: (member: NewMember) => Promise<void> };
  profiles: Pick<ProfileStore, 'getProfile'>;
  now: () => string;
  newCode: () => string;
}

function guardKeysOf({ userId, sourceIp }: InviteCaller): string[] {
  return sourceIp === undefined ? [`account:${userId}`] : [`account:${userId}`, `ip:${sourceIp}`];
}

async function requireProfileName(
  dependencies: InviteServiceDependencies,
  userId: string,
): Promise<{ name: string; colour: NewMember['colour'] }> {
  const profile = await dependencies.profiles.getProfile(userId);
  if (profile === null) throw Errors.conflict('Open the app again to set up your profile');
  return profile;
}

async function validInvite(
  dependencies: InviteServiceDependencies,
  code: string,
  caller: InviteCaller,
): Promise<{ invite: Invite; householdName: string }> {
  const now = dependencies.now();
  const guardKeys = guardKeysOf(caller);
  if (await dependencies.attempts.isLockedOut(guardKeys, now)) {
    throw Errors.tooManyRequests('Too many wrong codes. Try again in an hour.');
  }
  const invite = await dependencies.invites.findInvite(code);
  const household =
    invite === null ? null : await dependencies.households.getHousehold(invite.householdId);
  if (invite === null || household === null) {
    await dependencies.attempts.recordFailure(guardKeys, now);
    throw Errors.notFound("That invite code isn't valid. Ask for a new one.");
  }
  if (invite.expiresAt <= now) throw Errors.gone('That invite has expired. Ask for a new one.');
  return { invite, householdName: household.name };
}

async function createInvite(
  dependencies: InviteServiceDependencies,
  { householdId, userId }: Membership,
): Promise<CreateInviteResponse> {
  const { name } = await requireProfileName(dependencies, userId);
  const expiresAt = new Date(
    Date.parse(dependencies.now()) + INVITE_LIFETIME_DAYS * MILLISECONDS_PER_DAY,
  ).toISOString();
  const invite: Invite = {
    code: dependencies.newCode(),
    householdId,
    invitedBy: userId,
    invitedByName: name,
    expiresAt,
  };
  await dependencies.invites.replaceInvite(invite);
  return { code: invite.code, expiresAt };
}

async function acceptInvite(
  dependencies: InviteServiceDependencies,
  code: string,
  caller: InviteCaller,
): Promise<HouseholdSummary> {
  const { invite, householdName } = await validInvite(dependencies, code, caller);
  const home = { id: invite.householdId, name: householdName };
  const existing = await dependencies.memberships.findMembership(invite.householdId, caller.userId);
  if (existing !== null) return { ...home, role: existing.role };
  const { name, colour } = await requireProfileName(dependencies, caller.userId);
  await dependencies.memberships.addMember({
    householdId: invite.householdId,
    householdName,
    userId: caller.userId,
    name,
    colour,
    role: 'member',
  });
  return { ...home, role: 'member' };
}

export function createInviteService(dependencies: InviteServiceDependencies): InviteService {
  return {
    createInvite: (membership) => createInvite(dependencies, membership),
    previewInvite: async (code, caller): Promise<InvitePreview> => {
      const { invite, householdName } = await validInvite(dependencies, code, caller);
      const members = await dependencies.members.listMembers(invite.householdId);
      return {
        householdName,
        invitedByName: invite.invitedByName,
        memberCount: members.length,
        expiresAt: invite.expiresAt,
      };
    },
    acceptInvite: (code, caller) => acceptInvite(dependencies, code, caller),
  };
}
