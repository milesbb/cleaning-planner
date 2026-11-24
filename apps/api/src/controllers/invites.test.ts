import request from 'supertest';
import { describe, expect, it, vi } from 'vitest';
import type { Membership, MembershipReader } from '../middlewares/membership';
import type { InviteService } from '../services/invite-service';
import type { ProfileService } from '../services/profile-service';
import {
  ACCESS_TOKEN,
  BEARER_ACCESS_TOKEN,
  profilesThatCreateOnFirstRead,
} from '../test-support/profiles';
import { CLAIMS_HEADER, SOURCE_IP_HEADER, signedInAs, testApp } from '../test-support/test-app';
import { Errors } from '../utils/errors';

const SAM_IN_HOME: Membership = { householdId: 'home-1', userId: 'user-sam', role: 'owner' };

const memberships: MembershipReader = {
  findMembership: (householdId, userId) =>
    Promise.resolve(householdId === 'home-1' && userId === 'user-sam' ? SAM_IN_HOME : null),
};

const PREVIEW = {
  householdName: 'Our flat',
  invitedByName: 'Sam',
  memberCount: 1,
  expiresAt: '2026-11-30T09:00:00.000Z',
  isMember: false,
};

function inviteService(): InviteService {
  return {
    createInvite: vi.fn(() =>
      Promise.resolve({ code: '7K3M9QZA', expiresAt: '2026-11-30T09:00:00.000Z' }),
    ),
    previewInvite: vi.fn(() => Promise.resolve(PREVIEW)),
    acceptInvite: vi.fn(() =>
      Promise.resolve({ id: 'home-1', name: 'Our flat', role: 'member' as const }),
    ),
  };
}

function appWith(
  invites: InviteService,
  profiles: ProfileService = profilesThatCreateOnFirstRead(),
): ReturnType<typeof testApp> {
  return testApp({ invites, memberships, profiles });
}

describe('POST /v1/households/:householdId/invites', () => {
  it('makes a new code for a member and answers 201', async () => {
    const invites = inviteService();
    const response = await request(appWith(invites))
      .post('/v1/households/home-1/invites')
      .set(CLAIMS_HEADER, signedInAs('user-sam'));
    expect(response.status).toBe(201);
    expect(response.body).toEqual({ code: '7K3M9QZA', expiresAt: '2026-11-30T09:00:00.000Z' });
    expect(invites.createInvite).toHaveBeenCalledWith(SAM_IN_HOME);
  });

  it('gives someone outside the home a 403 and makes nothing', async () => {
    const invites = inviteService();
    const response = await request(appWith(invites))
      .post('/v1/households/home-1/invites')
      .set(CLAIMS_HEADER, signedInAs('user-stranger'));
    expect(response.status).toBe(403);
    expect(invites.createInvite).not.toHaveBeenCalled();
  });
});

describe('/v1/invites/:code', () => {
  it('previews an invite, tidying a typed code and passing the caller’s address', async () => {
    const invites = inviteService();
    const response = await request(appWith(invites))
      .get('/v1/invites/7k3m9qza')
      .set(CLAIMS_HEADER, signedInAs('user-alex'))
      .set(SOURCE_IP_HEADER, '203.0.113.7');
    expect(response.status).toBe(200);
    expect(response.body).toEqual(PREVIEW);
    expect(invites.previewInvite).toHaveBeenCalledWith('7K3M9QZA', {
      userId: 'user-alex',
      sourceIp: '203.0.113.7',
    });
  });

  it('accepts an invite and returns the home', async () => {
    const invites = inviteService();
    const response = await request(appWith(invites))
      .post('/v1/invites/7K3M9QZA/accept')
      .set(CLAIMS_HEADER, signedInAs('user-alex'))
      .set('Authorization', BEARER_ACCESS_TOKEN);
    expect(response.status).toBe(200);
    expect(response.body).toEqual({ id: 'home-1', name: 'Our flat', role: 'member' });
  });

  it('sets up the profile of someone who has just signed up before they join', async () => {
    const invites = inviteService();
    const profiles = profilesThatCreateOnFirstRead();
    await request(appWith(invites, profiles))
      .post('/v1/invites/7K3M9QZA/accept')
      .set(CLAIMS_HEADER, signedInAs('user-alex'))
      .set('Authorization', BEARER_ACCESS_TOKEN);
    expect(profiles.getMyProfile).toHaveBeenCalledWith('user-alex', ACCESS_TOKEN);
    expect(vi.mocked(profiles.getMyProfile).mock.invocationCallOrder[0]).toBeLessThan(
      vi.mocked(invites.acceptInvite).mock.invocationCallOrder[0] ?? 0,
    );
  });

  it('turns away a code that cannot exist without looking it up', async () => {
    const invites = inviteService();
    const response = await request(appWith(invites))
      .get('/v1/invites/not-a-code')
      .set(CLAIMS_HEADER, signedInAs('user-alex'));
    expect(response.status).toBe(400);
    expect(invites.previewInvite).not.toHaveBeenCalled();
  });

  it.each([
    [Errors.gone('That invite has expired. Ask for a new one.'), 410],
    [Errors.notFound("That invite code isn't valid. Ask for a new one."), 404],
    [Errors.tooManyRequests('Too many wrong codes. Try again in an hour.'), 429],
  ])('answers %s with %d', async (error, status) => {
    const invites = inviteService();
    vi.mocked(invites.acceptInvite).mockRejectedValue(error);
    const response = await request(appWith(invites))
      .post('/v1/invites/7K3M9QZA/accept')
      .set(CLAIMS_HEADER, signedInAs('user-alex'))
      .set('Authorization', BEARER_ACCESS_TOKEN);
    expect(response.status).toBe(status);
  });

  it('needs a signed-in user', async () => {
    const response = await request(appWith(inviteService())).get('/v1/invites/7K3M9QZA');
    expect(response.status).toBe(401);
  });
});
