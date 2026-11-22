import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { CLAIMS_HEADER, signedInAs, testApp } from './test-support/test-app';

const app = testApp();
const SIGNED_IN = signedInAs('user-sam');

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
