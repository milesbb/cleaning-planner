import type { HouseholdSummary, Member } from '@cleaning-planner/contracts/household';
import type { OwnedHomeChoice } from '@cleaning-planner/contracts/profile';

// The value picked for "Delete <home>" among the people who could take it over.
export const DELETE_HOME = 'delete';

export interface OwnedHome {
  home: HouseholdSummary;
  others: readonly Member[];
}

// Each shared home's id, mapped to the new owner's user id or DELETE_HOME.
export type PickedOwners = Readonly<Record<string, string>>;

export type CheckedChoices =
  | { isComplete: true; ownedHomes: OwnedHomeChoice[] }
  | { isComplete: false; errors: Record<string, string> };

export function isShared(owned: OwnedHome): boolean {
  return owned.others.length > 0;
}

function choiceFor(householdId: string, picked: string): OwnedHomeChoice {
  return picked === DELETE_HOME
    ? { householdId, action: 'delete' }
    : { householdId, action: 'handOver', newOwnerId: picked };
}

// Homes nobody else lives in are deleted by the API without asking.
export function checkChoices(
  ownedHomes: readonly OwnedHome[],
  picked: PickedOwners,
): CheckedChoices {
  const shared = ownedHomes.filter(isShared);
  const unchosen = shared.filter(({ home }) => picked[home.id] === undefined);
  if (unchosen.length > 0) {
    const errors = Object.fromEntries(
      unchosen.map(({ home }) => [home.id, `Choose who looks after ${home.name}, or delete it`]),
    );
    return { isComplete: false, errors };
  }
  return {
    isComplete: true,
    ownedHomes: shared.map(({ home }) => choiceFor(home.id, picked[home.id] ?? DELETE_HOME)),
  };
}
