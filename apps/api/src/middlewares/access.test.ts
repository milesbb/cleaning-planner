import { profileSchema } from '@cleaning-planner/contracts/profile';
import express, { type Express, type RequestHandler } from 'express';
import request from 'supertest';
import { describe, expect, it, vi } from 'vitest';
import { parseOrThrow } from '../utils/validation';
import { errorHandler } from './error-handler';
import { requireMember, requireOwner } from './membership';
import type { Membership, MembershipReader } from './membership';
import { signedInUser, signedInUserOf } from './signed-in-user';
import type { ClaimsReader } from './signed-in-user';

const CLAIMS_HEADER = 'x-test-claims';

const readTestClaims: ClaimsReader = (incoming) => {
  const header = incoming.header(CLAIMS_HEADER);
  if (header === undefined) return undefined;
  const claims: unknown = JSON.parse(header);
  return claims;
};

const SAM = { sub: 'user-sam', token_use: 'access' };
const ALEX = { sub: 'user-alex', token_use: 'access' };

const MEMBERSHIPS: Record<string, Membership> = {
  'home-1/user-sam': { householdId: 'home-1', userId: 'user-sam', role: 'owner' },
  'home-1/user-alex': { householdId: 'home-1', userId: 'user-alex', role: 'member' },
};

function membershipReader(): MembershipReader & { calls: number } {
  const reader = {
    calls: 0,
    findMembership: (householdId: string, userId: string): Promise<Membership | null> => {
      reader.calls += 1;
      return Promise.resolve(MEMBERSHIPS[`${householdId}/${userId}`] ?? null);
    },
  };
  return reader;
}

function appWith(...handlers: RequestHandler[]): Express {
  const app = express();
  app.use(express.json());
  app.use(signedInUser(readTestClaims));
  app.post('/households/:householdId/thing', ...handlers, (_incoming, response) => {
    response.json({ userId: signedInUserOf(response).userId, ...response.locals });
  });
  app.use(errorHandler);
  return app;
}

function asUser(claims: object): (test: request.Test) => void {
  return (test) => {
    test.set(CLAIMS_HEADER, JSON.stringify(claims));
  };
}

describe('signedInUser', () => {
  it('turns away a request with no token claims', async () => {
    const response = await request(appWith()).post('/households/home-1/thing');
    expect(response.status).toBe(401);
    expect(response.body).toMatchObject({ error: { code: 'unauthorised' } });
  });

  it('turns away an ID token, which is not for calling the API', async () => {
    const response = await request(appWith())
      .post('/households/home-1/thing')
      .use(asUser({ ...SAM, token_use: 'id' }));
    expect(response.status).toBe(401);
  });

  it('turns away claims with an unusable user id', async () => {
    const response = await request(appWith())
      .post('/households/home-1/thing')
      .use(asUser({ ...SAM, sub: 'user sam; drop' }));
    expect(response.status).toBe(401);
  });

  it('makes the signed-in user available to later handlers', async () => {
    const response = await request(appWith()).post('/households/home-1/thing').use(asUser(SAM));
    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({ userId: 'user-sam' });
  });

  it('refuses to hand out a user when the middleware has not run', () => {
    expect(() => signedInUserOf({ locals: {} })).toThrow('Sign in to continue');
  });
});

describe('requireMember', () => {
  it('lets a member through and loads their membership once', async () => {
    const reader = membershipReader();
    const response = await request(appWith(requireMember(reader)))
      .post('/households/home-1/thing')
      .use(asUser(ALEX));
    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({ membership: { role: 'member' } });
    expect(reader.calls).toBe(1);
  });

  it('gives someone outside the home a 403', async () => {
    const response = await request(appWith(requireMember(membershipReader())))
      .post('/households/home-1/thing')
      .use(asUser({ sub: 'user-stranger', token_use: 'access' }));
    expect(response.status).toBe(403);
    expect(response.body).toMatchObject({ error: { code: 'forbidden' } });
  });

  it('gives a 404 for a home id that cannot exist, without looking it up', async () => {
    const reader = membershipReader();
    const response = await request(appWith(requireMember(reader)))
      .post('/households/home%201/thing')
      .use(asUser(SAM));
    expect(response.status).toBe(404);
    expect(reader.calls).toBe(0);
  });
});

describe('requireOwner', () => {
  it('lets the owner through', async () => {
    const response = await request(appWith(requireOwner(membershipReader())))
      .post('/households/home-1/thing')
      .use(asUser(SAM));
    expect(response.status).toBe(200);
  });

  it('gives a member who is not the owner a 403', async () => {
    const response = await request(appWith(requireOwner(membershipReader())))
      .post('/households/home-1/thing')
      .use(asUser(ALEX));
    expect(response.status).toBe(403);
    expect(response.body).toMatchObject({
      error: { message: 'Only the owner of this home can do that' },
    });
  });

  it('gives someone outside the home a 403 too', async () => {
    const response = await request(appWith(requireOwner(membershipReader())))
      .post('/households/home-1/thing')
      .use(asUser({ sub: 'user-stranger', token_use: 'access' }));
    expect(response.status).toBe(403);
  });
});

describe('parseOrThrow', () => {
  it('returns the parsed value', () => {
    const profile = { id: 'user-1', name: ' Sam ', email: 'SAM@example.com', colour: 'blue' };
    expect(parseOrThrow(profileSchema, profile)).toEqual({
      id: 'user-1',
      name: 'Sam',
      email: 'sam@example.com',
      colour: 'blue',
    });
  });

  it('answers bad input with a 400 and one readable message per field', async () => {
    const app = express();
    app.use(express.json());
    app.post('/profile', (incoming, response) => {
      response.json(parseOrThrow(profileSchema, incoming.body));
    });
    app.use(errorHandler);
    const response = await request(app)
      .post('/profile')
      .send({ id: 'user-1', name: '', email: 'nope', colour: 'blue', isAdmin: true });
    expect(response.status).toBe(400);
    expect(response.body).toEqual({
      error: {
        code: 'badRequest',
        message: 'Check the highlighted fields',
        fields: {
          request: 'Unrecognized key: "isAdmin"',
          name: 'Enter a name',
          email: 'Enter an email address like name@example.com',
        },
      },
    });
  });

  it('is never reached for a valid request, so no error is logged', () => {
    const spy = vi.fn();
    expect(() => {
      parseOrThrow(profileSchema, {});
      spy();
    }).toThrow('Check the highlighted fields');
    expect(spy).not.toHaveBeenCalled();
  });
});
