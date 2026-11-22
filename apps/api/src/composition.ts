import { CognitoIdentityProviderClient } from '@aws-sdk/client-cognito-identity-provider';
import type { AppServices } from './app';
import { randomUUID } from 'node:crypto';
import { createAttemptRepository } from './data/attempts-repository';
import { createHouseholdRepository } from './data/household-repository';
import { createInviteRepository } from './data/invite-repository';
import { createMemberRepository } from './data/member-repository';
import { createMembershipRepository } from './data/membership-repository';
import { createProfileRepository } from './data/profile-repository';
import { connectToTable } from './data/table';
import { createCognitoIdentityReader } from './identity/cognito-identity';
import { createHouseholdService } from './services/household-service';
import { generateInviteCode } from './services/invite-code';
import { createInviteService } from './services/invite-service';
import { createMemberService } from './services/member-service';
import { createProfileService } from './services/profile-service';

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
    memberships,
  };
}
