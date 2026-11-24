import { inviteCodeSchema } from '@cleaning-planner/contracts/invite';
import { Router } from 'express';
import type { Request, Response } from 'express';
import { ensureProfile } from '../middlewares/ensure-profile';
import type { ProfileReader } from '../middlewares/ensure-profile';
import { membershipOf, requireMember } from '../middlewares/membership';
import type { MembershipReader } from '../middlewares/membership';
import { signedInUserOf } from '../middlewares/signed-in-user';
import type { SourceIpReader } from '../middlewares/source-ip';
import type { InviteCaller, InviteService } from '../services/invite-service';
import { HttpStatus } from '../utils/http-status';
import { parseOrThrow } from '../utils/validation';

export function householdInvitesRouter(
  invites: InviteService,
  memberships: MembershipReader,
): Router {
  const router = Router({ mergeParams: true });
  router.post('/', requireMember(memberships), async (_request, response) => {
    response.status(HttpStatus.created).json(await invites.createInvite(membershipOf(response)));
  });
  return router;
}

export function invitesRouter(
  invites: InviteService,
  readSourceIp: SourceIpReader,
  profiles: ProfileReader,
): Router {
  const router = Router();
  const codeAndCaller = (request: Request, response: Response): [string, InviteCaller] => [
    parseOrThrow(inviteCodeSchema, request.params.code),
    { userId: signedInUserOf(response).userId, sourceIp: readSourceIp(request) },
  ];
  router.get('/:code', async (request, response) => {
    response.json(await invites.previewInvite(...codeAndCaller(request, response)));
  });
  router.post('/:code/accept', ensureProfile(profiles), async (request, response) => {
    response.json(await invites.acceptInvite(...codeAndCaller(request, response)));
  });
  return router;
}
