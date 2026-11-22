import { CognitoIdentityProviderClient } from '@aws-sdk/client-cognito-identity-provider';
import type { AppServices } from './app';
import { createMembershipRepository } from './data/membership-repository';
import { createProfileRepository } from './data/profile-repository';
import { connectToTable } from './data/table';
import { createCognitoIdentityReader } from './identity/cognito-identity';
import { createProfileService } from './services/profile-service';

export function createServices(environment: NodeJS.ProcessEnv): AppServices {
  const table = connectToTable(environment);
  const memberships = createMembershipRepository(table);
  const identity = createCognitoIdentityReader(new CognitoIdentityProviderClient({}));
  return {
    profiles: createProfileService(createProfileRepository(table, memberships), identity),
  };
}
