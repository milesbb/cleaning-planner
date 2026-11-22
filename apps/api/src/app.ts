import express, { type Express } from 'express';
import { healthRouter } from './controllers/health';
import { householdsRouter } from './controllers/households';
import { meRouter } from './controllers/me';
import { errorHandler } from './middlewares/error-handler';
import type { MembershipReader } from './middlewares/membership';
import { signedInUser } from './middlewares/signed-in-user';
import type { ClaimsReader } from './middlewares/signed-in-user';
import type { HouseholdService } from './services/household-service';
import type { ProfileService } from './services/profile-service';
import { Errors } from './utils/errors';

const MAX_JSON_BODY_SIZE = '100kb';

export interface AppServices {
  profiles: ProfileService;
  households: HouseholdService;
  memberships: MembershipReader;
}

export interface AppConfig {
  version: string;
  readClaims: ClaimsReader;
  services: AppServices;
}

export function createApp(config: AppConfig): Express {
  const app = express();
  app.disable('x-powered-by');
  app.use(express.json({ limit: MAX_JSON_BODY_SIZE }));
  app.use('/v1/health', healthRouter(config.version));
  app.use('/v1', signedInUser(config.readClaims));
  app.use('/v1/me', meRouter(config.services.profiles));
  app.use(
    '/v1/households',
    householdsRouter(config.services.households, config.services.memberships),
  );
  app.use((_request, _response, next) => {
    next(Errors.notFound());
  });
  app.use(errorHandler);
  return app;
}
