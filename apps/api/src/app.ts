import express, { type Express } from 'express';
import { healthRouter } from './controllers/health';
import { errorHandler } from './middlewares/error-handler';
import { Errors } from './utils/errors';

export interface AppConfig {
  version: string;
}

export function createApp(config: AppConfig): Express {
  const app = express();
  app.disable('x-powered-by');
  app.use(express.json({ limit: '100kb' }));
  app.use('/v1/health', healthRouter(config.version));
  app.use((_request, _response, next) => {
    next(Errors.notFound());
  });
  app.use(errorHandler);
  return app;
}
