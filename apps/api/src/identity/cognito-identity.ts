import {
  DeleteUserCommand,
  GetUserCommand,
  NotAuthorizedException,
} from '@aws-sdk/client-cognito-identity-provider';
import { displayNameSchema, emailSchema } from '@cleaning-planner/contracts/primitives';
import { z } from '@cleaning-planner/contracts/zod';
import type { AccountRemover } from '../services/account-service';
import type { Identity, IdentityReader } from '../services/profile-service';
import { Errors } from '../utils/errors';

interface CognitoClient {
  send: (command: GetUserCommand | DeleteUserCommand) => Promise<unknown>;
}

const getUserResponseSchema = z.object({
  UserAttributes: z.array(z.object({ Name: z.string(), Value: z.optional(z.string()) })),
});

const identitySchema = z.object({ email: emailSchema, name: displayNameSchema });
const COGNITO_TRUE = 'true';

async function sendWithToken(
  client: CognitoClient,
  command: GetUserCommand | DeleteUserCommand,
): Promise<unknown> {
  try {
    return await client.send(command);
  } catch (error) {
    if (error instanceof NotAuthorizedException) throw Errors.unauthorised();
    throw error;
  }
}

export function createCognitoIdentityReader(client: CognitoClient): IdentityReader {
  return {
    readIdentity: async (accessToken): Promise<Identity> => {
      const { UserAttributes } = getUserResponseSchema.parse(
        await sendWithToken(client, new GetUserCommand({ AccessToken: accessToken })),
      );
      const attributes = Object.fromEntries(
        UserAttributes.map((attribute) => [attribute.Name, attribute.Value]),
      );
      const { email, name } = identitySchema.parse({
        email: attributes.email,
        name: attributes.name,
      });
      return { email, name, isEmailVerified: attributes.email_verified === COGNITO_TRUE };
    },
  };
}

export function createCognitoAccountRemover(client: CognitoClient): AccountRemover {
  return {
    deleteIdentity: async (accessToken): Promise<void> => {
      await sendWithToken(client, new DeleteUserCommand({ AccessToken: accessToken }));
    },
  };
}
