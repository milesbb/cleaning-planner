import { DeleteUserCommand } from '@aws-sdk/client-cognito-identity-provider';
import type { HouseholdSummary, Member } from '@cleaning-planner/contracts/household';
import request from 'supertest';
import { describe, expect, it, vi } from 'vitest';
import { createCognitoAccountRemover } from '../identity/cognito-identity';
import { createAccountService } from '../services/account-service';
import { CLAIMS_HEADER, signedInAs, testApp } from '../test-support/test-app';

const HOMES: HouseholdSummary[] = [
  { id: 'home-shared', name: 'Our flat', role: 'owner' },
  { id: 'home-solo', name: 'Beach hut', role: 'owner' },
];
const MEMBERS: Record<string, Member[]> = {
  'home-shared': [
    { userId: 'user-sam', name: 'Sam', colour: 'blue', role: 'owner' },
    { userId: 'user-alex', name: 'Alex', colour: 'pink', role: 'member' },
  ],
  'home-solo': [{ userId: 'user-sam', name: 'Sam', colour: 'blue', role: 'owner' }],
};

function appWithCognito(): {
  app: ReturnType<typeof testApp>;
  steps: string[];
  cognito: { send: ReturnType<typeof vi.fn> };
} {
  const steps: string[] = [];
  const step =
    (name: string) =>
    (...args: string[]): Promise<void> => {
      steps.push([name, ...args].join(' '));
      return Promise.resolve();
    };
  const cognito = {
    send: vi.fn((command: unknown) => {
      steps.push(command instanceof DeleteUserCommand ? 'cognito DeleteUser' : 'cognito other');
      return Promise.resolve({});
    }),
  };
  const accounts = createAccountService({
    homes: { listHomesOf: () => Promise.resolve(HOMES) },
    members: {
      listMembers: (householdId) => Promise.resolve(MEMBERS[householdId] ?? []),
      handOver: step('handOver'),
    },
    households: { deleteHousehold: step('deleteHousehold'), removeMember: step('removeMember') },
    reminders: { removeSchedules: step('removeSchedules') },
    profiles: { deleteProfile: step('deleteProfile') },
    identity: createCognitoAccountRemover(cognito),
  });
  return { app: testApp({ accounts }), steps, cognito };
}

function deleteMe(app: ReturnType<typeof testApp>, body: object): request.Test {
  return request(app)
    .delete('/v1/me')
    .set(CLAIMS_HEADER, signedInAs('user-sam'))
    .set('Authorization', 'Bearer the-access-token')
    .send(body);
}

describe('DELETE /v1/me', () => {
  it('needs a signed-in user', async () => {
    const { app, cognito } = appWithCognito();
    const response = await request(app).delete('/v1/me').send({ ownedHomes: [] });
    expect(response.status).toBe(401);
    expect(cognito.send).not.toHaveBeenCalled();
  });

  it('is blocked with 409 when a shared home has no hand-over, deleting nothing', async () => {
    const { app, steps } = appWithCognito();
    const response = await deleteMe(app, { ownedHomes: [] });
    expect(response.status).toBe(409);
    expect(steps).toEqual([]);
  });

  it('hands over, deletes the solo home and removes the sign-in last', async () => {
    const { app, steps } = appWithCognito();
    const response = await deleteMe(app, {
      ownedHomes: [{ householdId: 'home-shared', action: 'handOver', newOwnerId: 'user-alex' }],
    });
    expect(response.status).toBe(204);
    expect(steps).toEqual([
      'handOver home-shared user-sam user-alex',
      'removeMember home-shared user-sam',
      'deleteHousehold home-solo',
      'removeSchedules user-sam',
      'deleteProfile user-sam',
      'cognito DeleteUser',
    ]);
  });

  it('turns away a body it does not understand', async () => {
    const { app, steps } = appWithCognito();
    const response = await deleteMe(app, { ownedHomes: [{ householdId: 'home-shared' }] });
    expect(response.status).toBe(400);
    expect(steps).toEqual([]);
  });
});
