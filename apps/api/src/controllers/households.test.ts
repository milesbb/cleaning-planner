import type { Household } from '@cleaning-planner/contracts/household';
import request from 'supertest';
import { describe, expect, it, vi } from 'vitest';
import type { Membership, MembershipReader } from '../middlewares/membership';
import type { HouseholdService } from '../services/household-service';
import type { ProfileService } from '../services/profile-service';
import {
  ACCESS_TOKEN,
  BEARER_ACCESS_TOKEN,
  profilesThatCreateOnFirstRead,
} from '../test-support/profiles';
import { CLAIMS_HEADER, signedInAs, testApp } from '../test-support/test-app';
import { Errors } from '../utils/errors';

const FLAT: Household = {
  id: 'home-1',
  name: 'Our flat',
  timeZone: 'Europe/London',
  weekStartsOn: 'monday',
  ownerId: 'user-sam',
  version: 1,
};

const MEMBERSHIPS: Record<string, Membership> = {
  'home-1/user-sam': { householdId: 'home-1', userId: 'user-sam', role: 'owner' },
  'home-1/user-alex': { householdId: 'home-1', userId: 'user-alex', role: 'member' },
};

const memberships: MembershipReader = {
  findMembership: (householdId, userId) =>
    Promise.resolve(MEMBERSHIPS[`${householdId}/${userId}`] ?? null),
};

function householdService(): HouseholdService {
  return {
    createHome: vi.fn(() => Promise.resolve(FLAT)),
    listHomes: vi.fn(() =>
      Promise.resolve([{ id: 'home-1', name: 'Our flat', role: 'owner' as const }]),
    ),
    getHome: vi.fn(() => Promise.resolve(FLAT)),
    updateHome: vi.fn(() => Promise.resolve({ ...FLAT, name: 'The flat', version: 2 })),
    deleteHome: vi.fn(() => Promise.resolve()),
    leaveHome: vi.fn(() => Promise.resolve()),
  };
}

function appWith(
  households: HouseholdService,
  profiles: ProfileService = profilesThatCreateOnFirstRead(),
): ReturnType<typeof testApp> {
  return testApp({ households, memberships, profiles });
}

type Method = 'get' | 'post' | 'patch' | 'delete';

function callAs(
  app: ReturnType<typeof testApp>,
  method: Method,
  path: string,
  userId: string,
): request.Test {
  const agent = request(app);
  return agent[method](path).set(CLAIMS_HEADER, signedInAs(userId));
}

const NEW_HOME = {
  name: 'Our flat',
  timeZone: 'Europe/London',
  weekStartsOn: 'monday',
  rooms: [{ type: 'kitchen', name: 'Kitchen' }],
  features: [],
};

const HOME_ROUTES = [
  ['get', '/v1/households/home-1'],
  ['patch', '/v1/households/home-1'],
  ['delete', '/v1/households/home-1'],
  ['post', '/v1/households/home-1/leave'],
] as const;

describe('/v1/households', () => {
  it('lists the signed-in person’s homes', async () => {
    const households = householdService();
    const response = await request(appWith(households))
      .get('/v1/households')
      .set(CLAIMS_HEADER, signedInAs('user-sam'));
    expect(response.status).toBe(200);
    expect(response.body).toEqual([{ id: 'home-1', name: 'Our flat', role: 'owner' }]);
    expect(households.listHomes).toHaveBeenCalledWith('user-sam');
  });

  it('creates a home for the signed-in person and answers 201', async () => {
    const households = householdService();
    const response = await request(appWith(households))
      .post('/v1/households')
      .set(CLAIMS_HEADER, signedInAs('user-sam'))
      .set('Authorization', BEARER_ACCESS_TOKEN)
      .send(NEW_HOME);
    expect(response.status).toBe(201);
    expect(response.body).toEqual(FLAT);
    expect(households.createHome).toHaveBeenCalledWith('user-sam', NEW_HOME);
  });

  it('sets up the profile of someone who has just signed up before creating their first home', async () => {
    const households = householdService();
    const profiles = profilesThatCreateOnFirstRead();
    await request(appWith(households, profiles))
      .post('/v1/households')
      .set(CLAIMS_HEADER, signedInAs('user-sam'))
      .set('Authorization', BEARER_ACCESS_TOKEN)
      .send(NEW_HOME);
    expect(profiles.getMyProfile).toHaveBeenCalledWith('user-sam', ACCESS_TOKEN);
    expect(vi.mocked(profiles.getMyProfile).mock.invocationCallOrder[0]).toBeLessThan(
      vi.mocked(households.createHome).mock.invocationCallOrder[0] ?? 0,
    );
  });

  it('refuses a home with no rooms, or one that names its own owner', async () => {
    const households = householdService();
    const app = appWith(households);
    const noRooms = await request(app)
      .post('/v1/households')
      .set(CLAIMS_HEADER, signedInAs('user-sam'))
      .set('Authorization', BEARER_ACCESS_TOKEN)
      .send({ ...NEW_HOME, rooms: [] });
    const withOwner = await request(app)
      .post('/v1/households')
      .set(CLAIMS_HEADER, signedInAs('user-sam'))
      .set('Authorization', BEARER_ACCESS_TOKEN)
      .send({ ...NEW_HOME, ownerId: 'user-alex' });
    expect([noRooms.status, withOwner.status]).toEqual([400, 400]);
    expect(households.createHome).not.toHaveBeenCalled();
  });

  it.each(HOME_ROUTES)(
    '%s %s gives someone outside the home a 403 and reads or writes nothing',
    async (method, path) => {
      const households = householdService();
      const response = await callAs(appWith(households), method, path, 'user-stranger').send({
        name: 'Mine now',
        version: 1,
      });
      expect(response.status).toBe(403);
      Object.values(households).forEach((serviceCall) => {
        expect(serviceCall).not.toHaveBeenCalled();
      });
    },
  );

  it('lets a member read the home', async () => {
    const response = await request(appWith(householdService()))
      .get('/v1/households/home-1')
      .set(CLAIMS_HEADER, signedInAs('user-alex'));
    expect(response.status).toBe(200);
    expect(response.body).toEqual(FLAT);
  });

  it.each([
    ['patch', { name: 'The flat', version: 1 }],
    ['delete', {}],
  ] as const)('only lets the owner %s the home', async (method, body) => {
    const households = householdService();
    const app = appWith(households);
    const asMember = await callAs(app, method, '/v1/households/home-1', 'user-alex').send(body);
    const asOwner = await callAs(app, method, '/v1/households/home-1', 'user-sam').send(body);
    expect(asMember.status).toBe(403);
    expect(asOwner.status).toBe(method === 'delete' ? 204 : 200);
  });

  it('checks a rename before passing it on', async () => {
    const households = householdService();
    const response = await request(appWith(households))
      .patch('/v1/households/home-1')
      .set(CLAIMS_HEADER, signedInAs('user-sam'))
      .send({ name: 'The flat' });
    expect(response.status).toBe(400);
    expect(households.updateHome).not.toHaveBeenCalled();
  });

  it('lets a member leave with their own membership', async () => {
    const households = householdService();
    const response = await request(appWith(households))
      .post('/v1/households/home-1/leave')
      .set(CLAIMS_HEADER, signedInAs('user-alex'));
    expect(response.status).toBe(204);
    expect(households.leaveHome).toHaveBeenCalledWith(MEMBERSHIPS['home-1/user-alex']);
  });

  it('answers 409 when the owner tries to leave', async () => {
    const households = householdService();
    vi.mocked(households.leaveHome).mockRejectedValue(
      Errors.conflict('You own this home. Make someone else the owner before you leave.'),
    );
    const response = await request(appWith(households))
      .post('/v1/households/home-1/leave')
      .set(CLAIMS_HEADER, signedInAs('user-sam'));
    expect(response.status).toBe(409);
    expect(response.body).toMatchObject({
      error: { message: 'You own this home. Make someone else the owner before you leave.' },
    });
  });
});
