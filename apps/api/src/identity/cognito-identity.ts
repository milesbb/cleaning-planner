import { GetUserCommand, NotAuthorizedException } from '@aws-sdk/client-cognito-identity-provider';
import { displayNameSchema, emailSchema } from '@cleaning-planner/contracts/primitives';
import { z } from '@cleaning-planner/contracts/zod';
import type { Identity, IdentityReader } from '../services/profile-service';
import { Errors } from '../utils/errors';

interface CognitoClient {
  send: (command: GetUserCommand) => Promise<unknown>;
}

const getUserResponseSchema = z.object({
  UserAttributes: z.array(z.object({ Name: z.string(), Value: z.optional(z.string()) })),
});

const identitySchema = z.object({ email: emailSchema, name: displayNameSchema });

async function getUser(client: CognitoClient, accessToken: string): Promise<unknown> {
  try {
    return await client.send(new GetUserCommand({ AccessToken: accessToken }));
  } catch (error) {
    if (error instanceof NotAuthorizedException) throw Errors.unauthorised();
    throw error;
  }
}

export function createCognitoIdentityReader(client: CognitoClient): IdentityReader {
  return {
    readIdentity: async (accessToken): Promise<Identity> => {
      const { UserAttributes } = getUserResponseSchema.parse(await getUser(client, accessToken));
      const attributes = Object.fromEntries(
        UserAttributes.map((attribute) => [attribute.Name, attribute.Value]),
      );
      return identitySchema.parse({ email: attributes.email, name: attributes.name });
    },
  };
}
