import { apiErrorSchema } from '@cleaning-planner/contracts/api-error';
import express, { type Express } from 'express';
import request from 'supertest';
import { describe, expect, it, vi } from 'vitest';
import { Errors } from '../utils/errors';
import { logger } from '../utils/logging';
import { errorHandler } from './error-handler';

function appThatThrows(error: Error): Express {
  const app = express();
  app.use(express.json());
  app.post('/boom', () => {
    throw error;
  });
  app.use(errorHandler);
  return app;
}

describe('errorHandler', () => {
  it('sends an application error as the shared error body', async () => {
    const response = await request(
      appThatThrows(Errors.badRequest('Check the highlighted fields', { name: 'Enter a name' })),
    ).post('/boom');
    expect(response.status).toBe(400);
    expect(response.body).toEqual({
      error: {
        code: 'badRequest',
        message: 'Check the highlighted fields',
        fields: { name: 'Enter a name' },
      },
    });
    expect(apiErrorSchema.safeParse(response.body).success).toBe(true);
  });

  it.each([
    [Errors.unauthorised(), 401, 'unauthorised'],
    [Errors.forbidden(), 403, 'forbidden'],
    [Errors.notFound(), 404, 'notFound'],
    [Errors.conflict('Someone else changed this'), 409, 'conflict'],
  ])('sends %s with status %d', async (error, status, code) => {
    const response = await request(appThatThrows(error)).post('/boom');
    expect(response.status).toBe(status);
    expect(response.body).toMatchObject({ error: { code } });
  });

  it('turns malformed JSON into a 400', async () => {
    const response = await request(appThatThrows(new Error('never reached')))
      .post('/boom')
      .set('Content-Type', 'application/json')
      .send('{"broken":');
    expect(response.status).toBe(400);
    expect(response.body).toEqual({
      error: { code: 'badRequest', message: 'Malformed JSON body' },
    });
  });

  it('hides unexpected errors behind a generic 500 and logs them', async () => {
    const errorLogSpy = vi.spyOn(logger, 'error').mockImplementation(() => undefined);
    const response = await request(appThatThrows(new Error('database password leaked'))).post(
      '/boom',
    );
    expect(response.status).toBe(500);
    expect(response.body).toEqual({
      error: { code: 'internal', message: 'Something went wrong. Try again.' },
    });
    expect(errorLogSpy).toHaveBeenCalledWith('Unhandled error', {
      error: 'database password leaked',
    });
  });
});
