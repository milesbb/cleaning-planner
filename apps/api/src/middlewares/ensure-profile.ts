import type { RequestHandler } from 'express';
import type { ProfileService } from '../services/profile-service';
import { accessTokenOf } from './access-token';
import { signedInUserOf } from './signed-in-user';

export type ProfileReader = Pick<ProfileService, 'getMyProfile'>;

export function ensureProfile(profiles: ProfileReader): RequestHandler {
  return async (request, response, next) => {
    await profiles.getMyProfile(signedInUserOf(response).userId, accessTokenOf(request));
    next();
  };
}
