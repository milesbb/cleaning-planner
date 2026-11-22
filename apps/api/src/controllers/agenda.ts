import { agendaQuerySchema } from '@cleaning-planner/contracts/agenda';
import { Router } from 'express';
import { membershipOf, requireMember } from '../middlewares/membership';
import type { MembershipReader } from '../middlewares/membership';
import type { AgendaService } from '../services/agenda-service';
import { parseOrThrow } from '../utils/validation';

export function agendaRouter(agenda: AgendaService, memberships: MembershipReader): Router {
  const router = Router({ mergeParams: true });
  router.get('/', requireMember(memberships), async (request, response) => {
    const query = parseOrThrow(agendaQuerySchema, request.query);
    response.json(await agenda.getAgenda(membershipOf(response).householdId, query));
  });
  return router;
}
