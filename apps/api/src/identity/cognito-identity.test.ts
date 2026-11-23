import {
  DeleteUserCommand,
  GetUserCommand,
  NotAuthorizedException,
} from '@aws-sdk/client-cognito-identity-provider';
import { describe, expect, it, vi } from 'vitest';
import type { Mock } from 'vitest';
import { createCognitoAccountRemover, createCognitoIdentityReader } from './cognito-identity';

type Send = (command: GetUserCommand | DeleteUserCommand) => Promise<unknown>;

function clientReturning(attributes: { Name: string; Value: string }[]): { send: Mock<Send> } {
  return { send: vi.fn<Send>(() => Promise.resolve({ UserAttributes: attributes })) };
}

describe('Cognito identity reader', () => {
  it("reads the person's verified email and name with their own access token", async () => {
    const client = clientReturning([
      { Name: 'email', Value: 'Sam@Example.com' },
      { Name: 'email_verified', Value: 'true' },
      { Name: 'name', Value: 'Sam' },
      { Name: 'sub', Value: 'user-sam' },
    ]);
    const reader = createCognitoIdentityReader(client);
    await expect(reader.readIdentity('the-access-token')).resolves.toEqual({
      email: 'sam@example.com',
      name: 'Sam',
      isEmailVerified: true,
    });
    const [command] = client.send.mock.calls[0] ?? [];
    expect(command).toBeInstanceOf(GetUserCommand);
    expect(command).toMatchObject({ input: { AccessToken: 'the-access-token' } });
  });

  it.each([
    { case: 'Cognito says it is not', attributes: [{ Name: 'email_verified', Value: 'false' }] },
    { case: 'Cognito does not say', attributes: [] },
  ])('treats the email as unverified when $case', async ({ attributes }) => {
    const client = clientReturning([
      { Name: 'email', Value: 'sam@new.example.com' },
      { Name: 'name', Value: 'Sam' },
      ...attributes,
    ]);
    await expect(createCognitoIdentityReader(client).readIdentity('token')).resolves.toMatchObject({
      isEmailVerified: false,
    });
  });

  it('treats a rejected token as signed out', async () => {
    const client = {
      send: vi.fn<Send>(() =>
        Promise.reject(
          new NotAuthorizedException({ message: 'Access Token has expired', $metadata: {} }),
        ),
      ),
    };
    await expect(createCognitoIdentityReader(client).readIdentity('old-token')).rejects.toThrow(
      'Sign in to continue',
    );
  });

  it('fails loudly when Cognito leaves out the email or name', async () => {
    const reader = createCognitoIdentityReader(clientReturning([{ Name: 'name', Value: 'Sam' }]));
    await expect(reader.readIdentity('the-access-token')).rejects.toThrow();
  });

  it('passes on any other failure', async () => {
    const client = { send: vi.fn<Send>(() => Promise.reject(new Error('network down'))) };
    await expect(createCognitoIdentityReader(client).readIdentity('token')).rejects.toThrow(
      'network down',
    );
  });
});

describe('Cognito account remover', () => {
  it('deletes the person’s own sign-in with their access token, needing no IAM permission', async () => {
    const client = { send: vi.fn<Send>(() => Promise.resolve({})) };
    await createCognitoAccountRemover(client).deleteIdentity('the-access-token');
    const [command] = client.send.mock.calls[0] ?? [];
    expect(command).toBeInstanceOf(DeleteUserCommand);
    expect(command).toMatchObject({ input: { AccessToken: 'the-access-token' } });
  });

  it('treats a rejected token as signed out', async () => {
    const client = {
      send: vi.fn<Send>(() =>
        Promise.reject(
          new NotAuthorizedException({ message: 'Access Token has been revoked', $metadata: {} }),
        ),
      ),
    };
    await expect(createCognitoAccountRemover(client).deleteIdentity('old-token')).rejects.toThrow(
      'Sign in to continue',
    );
  });
});
