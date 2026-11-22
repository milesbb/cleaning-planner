import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { createApp } from './app';

describe('API app', () => {
  const app = createApp({ version: 'test-sha' });

  it('reports health with the deployed version', async () => {
    const response = await request(app).get('/v1/health');
    expect(response.status).toBe(200);
    expect(response.body).toEqual({ status: 'ok', version: 'test-sha' });
  });

  it('returns a JSON 404 for unknown routes', async () => {
    const response = await request(app).get('/v1/does-not-exist');
    expect(response.status).toBe(404);
    expect(response.body).toEqual({ error: 'Not found' });
  });

  it('rejects malformed JSON bodies with a 400', async () => {
    const response = await request(app)
      .post('/v1/health')
      .set('Content-Type', 'application/json')
      .send('{"broken":');
    expect(response.status).toBe(400);
    expect(response.body).toEqual({ error: 'Malformed JSON body' });
  });
});
