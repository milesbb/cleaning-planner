import {
  deleteAccountRequestSchema,
  refreshEmailRequestSchema,
  updateProfileRequestSchema,
} from '@cleaning-planner/contracts/profile';
import { Router } from 'express';
import { accessTokenOf } from '../middlewares/access-token';
import { signedInUserOf } from '../middlewares/signed-in-user';
import type { AccountService } from '../services/account-service';
import type { ProfileService } from '../services/profile-service';
import { HttpStatus } from '../utils/http-status';
import { parseOrThrow } from '../utils/validation';

export function meRouter(profiles: ProfileService, accounts: AccountService): Router {
  const router = Router();
  router.get('/', async (request, response) => {
    const { userId } = signedInUserOf(response);
    response.json(await profiles.getMyProfile(userId, accessTokenOf(request)));
  });
  router.patch('/', async (request, response) => {
    const { userId } = signedInUserOf(response);
    const changes = parseOrThrow(updateProfileRequestSchema, request.body);
    response.json(await profiles.updateMyProfile(userId, changes));
  });
  router.post('/email', async (request, response) => {
    const { userId } = signedInUserOf(response);
    parseOrThrow(refreshEmailRequestSchema, request.body);
    response.json(await profiles.refreshMyEmail(userId, accessTokenOf(request)));
  });
  router.delete('/', async (request, response) => {
    const { userId } = signedInUserOf(response);
    const choices = parseOrThrow(deleteAccountRequestSchema, request.body);
    await accounts.deleteAccount(userId, accessTokenOf(request), choices);
    response.status(HttpStatus.noContent).end();
  });
  return router;
}
