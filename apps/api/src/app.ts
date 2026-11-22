import express, { type Express } from 'express';
import { healthRouter } from './controllers/health';
import { householdsRouter } from './controllers/households';
import { householdInvitesRouter, invitesRouter } from './controllers/invites';
import { jobProgressRouter } from './controllers/job-progress';
import { jobsRouter } from './controllers/jobs';
import { membersRouter } from './controllers/members';
import { meRouter } from './controllers/me';
import { roomsRouter } from './controllers/rooms';
import { errorHandler } from './middlewares/error-handler';
import type { MembershipReader } from './middlewares/membership';
import { signedInUser } from './middlewares/signed-in-user';
import type { ClaimsReader } from './middlewares/signed-in-user';
import type { SourceIpReader } from './middlewares/source-ip';
import type { HouseholdService } from './services/household-service';
import type { InviteService } from './services/invite-service';
import type { JobProgressService } from './services/job-progress-service';
import type { JobService } from './services/job-service';
import type { MemberService } from './services/member-service';
import type { ProfileService } from './services/profile-service';
import type { RoomService } from './services/room-service';
import { Errors } from './utils/errors';

const MAX_JSON_BODY_SIZE = '100kb';

export interface AppServices {
  profiles: ProfileService;
  households: HouseholdService;
  members: MemberService;
  invites: InviteService;
  rooms: RoomService;
  jobs: JobService;
  progress: JobProgressService;
  memberships: MembershipReader;
}

export interface AppConfig {
  version: string;
  readClaims: ClaimsReader;
  readSourceIp: SourceIpReader;
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
    '/v1/households/:householdId/invites',
    householdInvitesRouter(config.services.invites, config.services.memberships),
  );
  app.use(
    '/v1/households/:householdId/rooms',
    roomsRouter(config.services.rooms, config.services.memberships),
  );
  app.use(
    '/v1/households/:householdId/jobs/:jobId',
    jobProgressRouter(config.services.progress, config.services.memberships),
  );
  app.use(
    '/v1/households/:householdId/jobs',
    jobsRouter(config.services.jobs, config.services.memberships),
  );
  app.use('/v1/invites', invitesRouter(config.services.invites, config.readSourceIp));
  app.use(
    '/v1/households/:householdId/members',
    membersRouter(config.services.members, config.services.memberships),
  );
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
