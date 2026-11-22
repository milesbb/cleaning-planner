import { apiErrorSchema } from '@cleaning-planner/contracts/api-error';
import type { Profile } from '@cleaning-planner/contracts/profile';
import request from 'supertest';
import { describe, expect, it, vi } from 'vitest';
import type { ProfileService } from '../services/profile-service';
import { CLAIMS_HEADER, signedInAs, testApp } from '../test-support/test-app';

const SAM: Profile = { id: 'user-sam', name: 'Sam', email: 'sam@example.com', colour: 'blue' };

function profileService(): ProfileService {
  return {
    getMyProfile: vi.fn(() => Promise.resolve(SAM)),
    updateMyProfile: vi.fn((_userId: string, changes: object) =>
      Promise.resolve({ ...SAM, ...changes }),
    ),
  };
}

function appWith(profiles: ProfileService): ReturnType<typeof testApp> {
  return testApp({ profiles });
}

const SIGNED_IN_AS_SAM = signedInAs('user-sam');

describe('GET /v1/me', () => {
  it('needs a signed-in user', async () => {
    const response = await request(appWith(profileService())).get('/v1/me');
    expect(response.status).toBe(401);
  });

  it("returns the signed-in person's profile, passing on their access token", async () => {
    const profiles = profileService();
    const response = await request(appWith(profiles))
      .get('/v1/me')
      .set(CLAIMS_HEADER, SIGNED_IN_AS_SAM)
      .set('Authorization', 'Bearer the-access-token');
    expect(response.status).toBe(200);
    expect(response.body).toEqual(SAM);
    expect(profiles.getMyProfile).toHaveBeenCalledWith('user-sam', 'the-access-token');
  });

  it('needs the access token itself to set up a new profile', async () => {
    const response = await request(appWith(profileService()))
      .get('/v1/me')
      .set(CLAIMS_HEADER, SIGNED_IN_AS_SAM);
    expect(response.status).toBe(401);
  });
});

describe('PATCH /v1/me', () => {
  it('changes the name and colour of the signed-in person only', async () => {
    const profiles = profileService();
    const response = await request(appWith(profiles))
      .patch('/v1/me')
      .set(CLAIMS_HEADER, SIGNED_IN_AS_SAM)
      .send({ name: '  Sammy ', colour: 'teal' });
    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({ name: 'Sammy', colour: 'teal' });
    expect(profiles.updateMyProfile).toHaveBeenCalledWith('user-sam', {
      name: 'Sammy',
      colour: 'teal',
    });
  });

  it("refuses an attempt to change someone else's profile or email", async () => {
    const profiles = profileService();
    const response = await request(appWith(profiles))
      .patch('/v1/me')
      .set(CLAIMS_HEADER, SIGNED_IN_AS_SAM)
      .send({ id: 'user-alex', email: 'evil@example.com', name: 'Alex' });
    expect(response.status).toBe(400);
    expect(profiles.updateMyProfile).not.toHaveBeenCalled();
  });

  it('checks the name length and the colour', async () => {
    const response = await request(appWith(profileService()))
      .patch('/v1/me')
      .set(CLAIMS_HEADER, SIGNED_IN_AS_SAM)
      .send({ name: 'x'.repeat(51), colour: 'purple' });
    expect(response.status).toBe(400);
    const fields = apiErrorSchema.parse(response.body).error.fields;
    expect(fields).toMatchObject({ name: 'Keep it to 50 characters' });
    expect(fields).toHaveProperty('colour');
  });
});
