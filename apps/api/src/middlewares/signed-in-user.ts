import { recordIdSchema } from '@cleaning-planner/contracts/primitives';
import { z } from '@cleaning-planner/contracts/zod';
import { getCurrentInvoke } from '@codegenie/serverless-express';
import type { Request, RequestHandler, Response } from 'express';
import { Errors } from '../utils/errors';

export type ClaimsReader = (request: Request) => unknown;

export interface SignedInUser {
  userId: string;
}

const accessTokenClaimsSchema = z.object({
  sub: recordIdSchema,
  token_use: z.literal('access'),
});

const signedInUserSchema = z.object({ userId: recordIdSchema });

export const readApiGatewayClaims: ClaimsReader = () => {
  const invoke: unknown = getCurrentInvoke();
  return z
    .object({
      event: z.object({
        requestContext: z.object({
          authorizer: z.object({ jwt: z.object({ claims: z.unknown() }) }),
        }),
      }),
    })
    .safeParse(invoke).data?.event.requestContext.authorizer.jwt.claims;
};

export function signedInUser(readClaims: ClaimsReader): RequestHandler {
  return (request, response, next) => {
    const claims = accessTokenClaimsSchema.safeParse(readClaims(request));
    if (!claims.success) {
      next(Errors.unauthorised());
      return;
    }
    const user: SignedInUser = { userId: claims.data.sub };
    response.locals.signedInUser = user;
    next();
  };
}

export function signedInUserOf(response: Pick<Response, 'locals'>): SignedInUser {
  const user = signedInUserSchema.safeParse(response.locals.signedInUser);
  if (!user.success) throw Errors.unauthorised();
  return user.data;
}
