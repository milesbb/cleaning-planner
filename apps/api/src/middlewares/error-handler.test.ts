import express, { type Express } from 'express';
import request from 'supertest';
import { describe, expect, it, vi } from 'vitest';
import { Errors } from '../utils/errors';
import { logger } from '../utils/logging';
import { errorHandler } from './error-handler';

function appThatThrows(error: Error): Express {
  const app = express();
  app.get('/boom', () => {
    throw error;
  });
  app.use(errorHandler);
  return app;
}

describe('errorHandler', () => {
  it('uses the status and message of an application error', async () => {
    const response = await request(appThatThrows(Errors.badRequest('Name is required'))).get(
      '/boom',
    );
    expect(response.status).toBe(400);
    expect(response.body).toEqual({ error: 'Name is required' });
  });

  it('hides unexpected errors behind a generic 500 and logs them', async () => {
    const logError = vi.spyOn(logger, 'error').mockImplementation(() => undefined);
    const response = await request(appThatThrows(new Error('database password leaked'))).get(
      '/boom',
    );
    expect(response.status).toBe(500);
    expect(response.body).toEqual({ error: 'Internal server error' });
    expect(logError).toHaveBeenCalledWith('Unhandled error', {
      error: 'database password leaked',
    });
  });
});
