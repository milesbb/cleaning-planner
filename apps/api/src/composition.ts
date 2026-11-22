import { CognitoIdentityProviderClient } from '@aws-sdk/client-cognito-identity-provider';
import type { AppServices } from './app';
import { randomUUID } from 'node:crypto';
import { createHouseholdRepository } from './data/household-repository';
import { createMembershipRepository } from './data/membership-repository';
import { createProfileRepository } from './data/profile-repository';
import { connectToTable } from './data/table';
import { createCognitoIdentityReader } from './identity/cognito-identity';
import { createHouseholdService } from './services/household-service';
import { createProfileService } from './services/profile-service';

export function createServices(environment: NodeJS.ProcessEnv): AppServices {
  const table = connectToTable(environment);
  const memberships = createMembershipRepository(table);
  const identity = createCognitoIdentityReader(new CognitoIdentityProviderClient({}));
  const profileStore = createProfileRepository(table, memberships);
  return {
    profiles: createProfileService(profileStore, identity),
    households: createHouseholdService({
      store: createHouseholdRepository(table),
      memberships,
      profiles: profileStore,
      now: () => new Date().toISOString(),
      newId: randomUUID,
    }),
    memberships,
  };
}
