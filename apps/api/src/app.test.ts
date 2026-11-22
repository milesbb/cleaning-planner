import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { createApp } from './app';
import type { ProfileService } from './services/profile-service';

const unusedProfiles: ProfileService = {
  getMyProfile: () => Promise.reject(new Error('not used')),
  updateMyProfile: () => Promise.reject(new Error('not used')),
};

const CLAIMS_HEADER = 'x-test-claims';

const app = createApp({
  version: 'test-sha',
  services: { profiles: unusedProfiles },
  readClaims: (incoming) => {
    const header = incoming.header(CLAIMS_HEADER);
    if (header === undefined) return undefined;
    const claims: unknown = JSON.parse(header);
    return claims;
  },
});

const SIGNED_IN = JSON.stringify({ sub: 'user-sam', token_use: 'access' });

describe('API app', () => {
  it('reports health with the deployed version, without signing in', async () => {
    const response = await request(app).get('/v1/health');
    expect(response.status).toBe(200);
    expect(response.body).toEqual({ status: 'ok', version: 'test-sha' });
  });

  it('needs a signed-in user for everything else under /v1', async () => {
    const response = await request(app).get('/v1/households');
    expect(response.status).toBe(401);
    expect(response.body).toEqual({
      error: { code: 'unauthorised', message: 'Sign in to continue' },
    });
  });

  it('returns a JSON 404 for unknown routes once signed in', async () => {
    const response = await request(app).get('/v1/does-not-exist').set(CLAIMS_HEADER, SIGNED_IN);
    expect(response.status).toBe(404);
    expect(response.body).toEqual({ error: { code: 'notFound', message: 'Not found' } });
  });

  it('rejects malformed JSON bodies with a 400', async () => {
    const response = await request(app)
      .post('/v1/health')
      .set('Content-Type', 'application/json')
      .send('{"broken":');
    expect(response.status).toBe(400);
    expect(response.body).toEqual({
      error: { code: 'badRequest', message: 'Malformed JSON body' },
    });
  });
});
