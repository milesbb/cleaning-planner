import type { HouseholdSummary } from '@cleaning-planner/contracts/household';
import type { DeleteAccountRequest, OwnedHomeChoice } from '@cleaning-planner/contracts/profile';
import type { MembershipRepository } from '../data/membership-repository';
import { Errors } from '../utils/errors';
import type { HouseholdStore } from './household-service';
import type { MemberStore } from './member-service';
import type { ReminderService } from './reminder-service';

export interface AccountRemover {
  deleteIdentity: (accessToken: string) => Promise<void>;
}

export interface ProfileRemover {
  deleteProfile: (userId: string) => Promise<void>;
}

export interface AccountService {
  deleteAccount: (
    userId: string,
    accessToken: string,
    request: DeleteAccountRequest,
  ) => Promise<void>;
}

export interface AccountDependencies {
  homes: Pick<MembershipRepository, 'listHomesOf'>;
  members: Pick<MemberStore, 'listMembers' | 'handOver'>;
  households: Pick<HouseholdStore, 'deleteHousehold' | 'removeMember'>;
  reminders: Pick<ReminderService, 'removeSchedules'>;
  profiles: ProfileRemover;
  identity: AccountRemover;
}

type HomeStep =
  | { kind: 'leave'; householdId: string }
  | { kind: 'handOver'; householdId: string; newOwnerId: string }
  | { kind: 'delete'; householdId: string };

const NOT_DELETED = 'Check the highlighted fields';

function checkChoicesAreForOwnedHomes(
  homes: readonly HouseholdSummary[],
  choices: readonly OwnedHomeChoice[],
): void {
  const ownedIds = new Set(homes.filter((home) => home.role === 'owner').map((home) => home.id));
  if (choices.some((choice) => !ownedIds.has(choice.householdId))) {
    throw Errors.badRequest(NOT_DELETED, { ownedHomes: 'You can only choose for homes you own' });
  }
}

async function stepFor(
  { members }: AccountDependencies,
  userId: string,
  home: HouseholdSummary,
  choice: OwnedHomeChoice | undefined,
): Promise<HomeStep> {
  if (home.role !== 'owner') return { kind: 'leave', householdId: home.id };
  const others = (await members.listMembers(home.id)).filter((member) => member.userId !== userId);
  if (others.length === 0 || choice?.action === 'delete') {
    return { kind: 'delete', householdId: home.id };
  }
  if (choice === undefined) {
    throw Errors.conflict(`Choose who looks after ${home.name}, or delete it`);
  }
  if (!others.some((member) => member.userId === choice.newOwnerId)) {
    throw Errors.badRequest(NOT_DELETED, { ownedHomes: 'Hand over to someone who lives there' });
  }
  return { kind: 'handOver', householdId: home.id, newOwnerId: choice.newOwnerId };
}

async function takeStep(
  { members, households }: AccountDependencies,
  userId: string,
  step: HomeStep,
): Promise<void> {
  if (step.kind === 'delete') {
    await households.deleteHousehold(step.householdId);
    return;
  }
  if (step.kind === 'handOver') await members.handOver(step.householdId, userId, step.newOwnerId);
  await households.removeMember(step.householdId, userId);
}

async function deleteAccount(
  dependencies: AccountDependencies,
  userId: string,
  accessToken: string,
  { ownedHomes }: DeleteAccountRequest,
): Promise<void> {
  const homes = await dependencies.homes.listHomesOf(userId);
  checkChoicesAreForOwnedHomes(homes, ownedHomes);
  const steps = await Promise.all(
    homes.map((home) =>
      stepFor(
        dependencies,
        userId,
        home,
        ownedHomes.find((choice) => choice.householdId === home.id),
      ),
    ),
  );
  for (const step of steps) await takeStep(dependencies, userId, step);
  await dependencies.reminders.removeSchedules(userId);
  await dependencies.profiles.deleteProfile(userId);
  await dependencies.identity.deleteIdentity(accessToken);
}

export function createAccountService(dependencies: AccountDependencies): AccountService {
  return {
    deleteAccount: (userId, accessToken, request) =>
      deleteAccount(dependencies, userId, accessToken, request),
  };
}
