import express, { type Express, type Router } from 'express';
import { agendaRouter } from './controllers/agenda';
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
import type { AgendaService } from './services/agenda-service';
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
  agenda: AgendaService;
  memberships: MembershipReader;
}

export interface AppConfig {
  version: string;
  readClaims: ClaimsReader;
  readSourceIp: SourceIpReader;
  services: AppServices;
}

const ONE_HOME = '/v1/households/:householdId';

function householdRouters(services: AppServices): [string, Router][] {
  const { memberships } = services;
  return [
    ['/invites', householdInvitesRouter(services.invites, memberships)],
    ['/rooms', roomsRouter(services.rooms, memberships)],
    ['/jobs/:jobId', jobProgressRouter(services.progress, memberships)],
    ['/jobs', jobsRouter(services.jobs, memberships)],
    ['/agenda', agendaRouter(services.agenda, memberships)],
    ['/members', membersRouter(services.members, memberships)],
  ];
}

export function createApp(config: AppConfig): Express {
  const app = express();
  app.disable('x-powered-by');
  app.use(express.json({ limit: MAX_JSON_BODY_SIZE }));
  app.use('/v1/health', healthRouter(config.version));
  app.use('/v1', signedInUser(config.readClaims));
  app.use('/v1/me', meRouter(config.services.profiles));
  app.use('/v1/invites', invitesRouter(config.services.invites, config.readSourceIp));
  for (const [path, router] of householdRouters(config.services)) {
    app.use(`${ONE_HOME}${path}`, router);
  }
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
