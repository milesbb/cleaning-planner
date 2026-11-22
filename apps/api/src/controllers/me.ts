import { updateProfileRequestSchema } from '@cleaning-planner/contracts/profile';
import { Router } from 'express';
import type { Request } from 'express';
import { signedInUserOf } from '../middlewares/signed-in-user';
import type { ProfileService } from '../services/profile-service';
import { Errors } from '../utils/errors';
import { parseOrThrow } from '../utils/validation';

const BEARER_PREFIX = /^Bearer\s+/i;

function accessTokenOf(request: Request): string {
  const token = request.header('authorization')?.replace(BEARER_PREFIX, '').trim();
  if (token === undefined || token === '') throw Errors.unauthorised();
  return token;
}

export function meRouter(profiles: ProfileService): Router {
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
  return router;
}
