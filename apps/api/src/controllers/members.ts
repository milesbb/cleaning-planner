import { updateMemberRequestSchema } from '@cleaning-planner/contracts/household';
import { recordIdSchema } from '@cleaning-planner/contracts/primitives';
import { Router } from 'express';
import type { Request } from 'express';
import { membershipOf, requireMember, requireOwner } from '../middlewares/membership';
import type { MembershipReader } from '../middlewares/membership';
import type { MemberService } from '../services/member-service';
import { HttpStatus } from '../utils/http-status';
import { parseOrThrow } from '../utils/validation';

function memberIdOf(request: Request): string {
  return parseOrThrow(recordIdSchema, request.params.userId);
}

export function membersRouter(members: MemberService, memberships: MembershipReader): Router {
  const router = Router({ mergeParams: true });
  router.get('/', requireMember(memberships), async (_request, response) => {
    response.json(await members.listMembers(membershipOf(response).householdId));
  });
  router.patch('/:userId', requireOwner(memberships), async (request, response) => {
    const { role } = parseOrThrow(updateMemberRequestSchema, request.body);
    response.json(await members.changeRole(membershipOf(response), memberIdOf(request), role));
  });
  router.delete('/:userId', requireOwner(memberships), async (request, response) => {
    await members.removeMember(membershipOf(response), memberIdOf(request));
    response.status(HttpStatus.noContent).end();
  });
  return router;
}
