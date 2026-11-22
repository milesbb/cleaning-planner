import {
  deleteAccountRequestSchema,
  updateProfileRequestSchema,
} from '@cleaning-planner/contracts/profile';
import { Router } from 'express';
import type { Request } from 'express';
import { signedInUserOf } from '../middlewares/signed-in-user';
import type { AccountService } from '../services/account-service';
import type { ProfileService } from '../services/profile-service';
import { Errors } from '../utils/errors';
import { HttpStatus } from '../utils/http-status';
import { parseOrThrow } from '../utils/validation';

const BEARER_PREFIX = /^Bearer\s+/i;

function accessTokenOf(request: Request): string {
  const token = request.header('authorization')?.replace(BEARER_PREFIX, '').trim();
  if (token === undefined || token === '') throw Errors.unauthorised();
  return token;
}

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
  router.delete('/', async (request, response) => {
    const { userId } = signedInUserOf(response);
    const choices = parseOrThrow(deleteAccountRequestSchema, request.body);
    await accounts.deleteAccount(userId, accessTokenOf(request), choices);
    response.status(HttpStatus.noContent).end();
  });
  return router;
}
