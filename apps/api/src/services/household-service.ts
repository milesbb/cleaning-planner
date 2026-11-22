import type {
  CreateHouseholdRequest,
  Household,
  HouseholdSummary,
  UpdateHouseholdRequest,
} from '@cleaning-planner/contracts/household';
import type { PersonColour } from '@cleaning-planner/contracts/primitives';
import { calendarDateInTimeZone } from '@cleaning-planner/schedule/time-zone';
import type { Membership } from '../middlewares/membership';
import { Errors } from '../utils/errors';
import { planHome } from './home-plan';
import type { HomePlan } from './home-plan';
import type { ProfileStore } from './profile-service';

interface HomeOwner {
  userId: string;
  name: string;
  colour: PersonColour;
}

export interface NewHome {
  household: Household;
  owner: HomeOwner;
  plan: HomePlan;
}

export interface HouseholdStore {
  createHome: (home: NewHome) => Promise<void>;
  getHousehold: (householdId: string) => Promise<Household | null>;
  updateHousehold: (householdId: string, changes: UpdateHouseholdRequest) => Promise<Household>;
  deleteHousehold: (householdId: string) => Promise<void>;
  removeMember: (householdId: string, userId: string) => Promise<void>;
}

export interface HouseholdService {
  createHome: (userId: string, request: CreateHouseholdRequest) => Promise<Household>;
  listHomes: (userId: string) => Promise<HouseholdSummary[]>;
  getHome: (householdId: string) => Promise<Household>;
  updateHome: (householdId: string, changes: UpdateHouseholdRequest) => Promise<Household>;
  deleteHome: (householdId: string) => Promise<void>;
  leaveHome: (membership: Membership) => Promise<void>;
}

interface HouseholdServiceDependencies {
  store: HouseholdStore;
  memberships: { listHomesOf: (userId: string) => Promise<HouseholdSummary[]> };
  profiles: Pick<ProfileStore, 'getProfile'>;
  now: () => string;
  newId: () => string;
}

async function createHome(
  dependencies: HouseholdServiceDependencies,
  userId: string,
  request: CreateHouseholdRequest,
): Promise<Household> {
  const profile = await dependencies.profiles.getProfile(userId);
  if (profile === null) throw Errors.conflict('Open the app again to set up your profile');
  const household: Household = {
    id: dependencies.newId(),
    name: request.name,
    timeZone: request.timeZone,
    weekStartsOn: request.weekStartsOn,
    ownerId: userId,
    version: 1,
  };
  const today = calendarDateInTimeZone(dependencies.now(), request.timeZone);
  await dependencies.store.createHome({
    household,
    owner: { userId, name: profile.name, colour: profile.colour },
    plan: planHome(request, today, dependencies.newId),
  });
  return household;
}

export function createHouseholdService(
  dependencies: HouseholdServiceDependencies,
): HouseholdService {
  const { store } = dependencies;
  return {
    createHome: (userId, request) => createHome(dependencies, userId, request),
    listHomes: (userId) => dependencies.memberships.listHomesOf(userId),
    getHome: async (householdId): Promise<Household> => {
      const household = await store.getHousehold(householdId);
      if (household === null) throw Errors.notFound('No such home');
      return household;
    },
    updateHome: (householdId, changes) => store.updateHousehold(householdId, changes),
    deleteHome: (householdId) => store.deleteHousehold(householdId),
    leaveHome: async ({ householdId, userId, role }): Promise<void> => {
      if (role === 'owner') {
        throw Errors.conflict('You own this home. Make someone else the owner before you leave.');
      }
      await store.removeMember(householdId, userId);
    },
  };
}
