import {
  createHouseholdRequestSchema,
  updateHouseholdRequestSchema,
} from '@cleaning-planner/contracts/household';
import { Router } from 'express';
import { ensureProfile } from '../middlewares/ensure-profile';
import type { ProfileReader } from '../middlewares/ensure-profile';
import { membershipOf, requireMember, requireOwner } from '../middlewares/membership';
import type { MembershipReader } from '../middlewares/membership';
import { signedInUserOf } from '../middlewares/signed-in-user';
import type { HouseholdService } from '../services/household-service';
import { HttpStatus } from '../utils/http-status';
import { parseOrThrow } from '../utils/validation';

export function householdsRouter(
  households: HouseholdService,
  memberships: MembershipReader,
  profiles: ProfileReader,
): Router {
  const router = Router();
  router.get('/', async (_request, response) => {
    response.json(await households.listHomes(signedInUserOf(response).userId));
  });
  router.post('/', ensureProfile(profiles), async (request, response) => {
    const home = parseOrThrow(createHouseholdRequestSchema, request.body);
    const household = await households.createHome(signedInUserOf(response).userId, home);
    response.status(HttpStatus.created).json(household);
  });
  router.get('/:householdId', requireMember(memberships), async (_request, response) => {
    response.json(await households.getHome(membershipOf(response).householdId));
  });
  router.patch('/:householdId', requireOwner(memberships), async (request, response) => {
    const changes = parseOrThrow(updateHouseholdRequestSchema, request.body);
    response.json(await households.updateHome(membershipOf(response).householdId, changes));
  });
  router.delete('/:householdId', requireOwner(memberships), async (_request, response) => {
    await households.deleteHome(membershipOf(response).householdId);
    response.status(HttpStatus.noContent).end();
  });
  router.post('/:householdId/leave', requireMember(memberships), async (_request, response) => {
    await households.leaveHome(membershipOf(response));
    response.status(HttpStatus.noContent).end();
  });
  return router;
}
