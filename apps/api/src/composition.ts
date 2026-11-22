import { CognitoIdentityProviderClient } from '@aws-sdk/client-cognito-identity-provider';
import type { AppServices } from './app';
import { randomUUID } from 'node:crypto';
import { createAttemptRepository } from './data/attempts-repository';
import { createHouseholdRepository } from './data/household-repository';
import { createInviteRepository } from './data/invite-repository';
import { createJobRepository } from './data/job-repository';
import { createMemberRepository } from './data/member-repository';
import { createMembershipRepository } from './data/membership-repository';
import { createProfileRepository } from './data/profile-repository';
import { createProgressRepository } from './data/progress-repository';
import { createRoomRepository } from './data/room-repository';
import { connectToTable } from './data/table';
import type { Table } from './data/table';
import { createCognitoIdentityReader } from './identity/cognito-identity';
import type { MembershipReader } from './middlewares/membership';
import { createAgendaService } from './services/agenda-service';
import { createHouseholdService } from './services/household-service';
import type { HouseholdStore } from './services/household-service';
import type { MemberStore } from './services/member-service';
import { generateInviteCode } from './services/invite-code';
import { createInviteService } from './services/invite-service';
import { createJobProgressService } from './services/job-progress-service';
import { createJobService } from './services/job-service';
import { createMemberService } from './services/member-service';
import { createProfileService } from './services/profile-service';
import { createRoomService } from './services/room-service';

interface PlanningStores {
  table: Table;
  householdStore: HouseholdStore;
  memberStore: MemberStore;
  memberships: MembershipReader;
  now: () => string;
}

function createPlanningServices({
  table,
  householdStore,
  memberStore,
  memberships,
  now,
}: PlanningStores): Pick<AppServices, 'rooms' | 'jobs' | 'progress' | 'agenda'> {
  const roomStore = createRoomRepository(table);
  const jobStore = createJobRepository(table);
  const progressStore = createProgressRepository(table);
  return {
    rooms: createRoomService({
      store: roomStore,
      households: householdStore,
      now,
      newId: randomUUID,
    }),
    jobs: createJobService({
      store: jobStore,
      rooms: roomStore,
      households: householdStore,
      memberships,
      now,
      newId: randomUUID,
    }),
    progress: createJobProgressService({
      store: progressStore,
      jobs: jobStore,
      households: householdStore,
      now,
    }),
    agenda: createAgendaService({
      households: householdStore,
      jobs: jobStore,
      members: memberStore,
      completions: progressStore,
      now,
    }),
  };
}

export function createServices(environment: NodeJS.ProcessEnv): AppServices {
  const table = connectToTable(environment);
  const memberships = createMembershipRepository(table);
  const identity = createCognitoIdentityReader(new CognitoIdentityProviderClient({}));
  const profileStore = createProfileRepository(table, memberships);
  const householdStore = createHouseholdRepository(table);
  const memberStore = createMemberRepository(table);
  const now = (): string => new Date().toISOString();
  return {
    profiles: createProfileService(profileStore, identity),
    households: createHouseholdService({
      store: householdStore,
      memberships,
      profiles: profileStore,
      now,
      newId: randomUUID,
    }),
    members: createMemberService(memberStore),
    invites: createInviteService({
      invites: createInviteRepository(table),
      attempts: createAttemptRepository(table),
      households: householdStore,
      members: memberStore,
      memberships,
      profiles: profileStore,
      now,
      newCode: () => generateInviteCode(),
    }),
    ...createPlanningServices({ table, householdStore, memberStore, memberships, now }),
    memberships,
  };
}
