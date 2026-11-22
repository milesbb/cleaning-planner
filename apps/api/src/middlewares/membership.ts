import type { HouseholdRole } from '@cleaning-planner/contracts/household';
import { householdRoleSchema } from '@cleaning-planner/contracts/household';
import { recordIdSchema } from '@cleaning-planner/contracts/primitives';
import { z } from '@cleaning-planner/contracts/zod';
import type { Request, RequestHandler, Response } from 'express';
import { Errors } from '../utils/errors';
import { signedInUserOf } from './signed-in-user';

export interface Membership {
  householdId: string;
  userId: string;
  role: HouseholdRole;
}

export interface MembershipReader {
  findMembership: (householdId: string, userId: string) => Promise<Membership | null>;
}

async function loadMembership(
  memberships: MembershipReader,
  request: Request,
  response: Response,
): Promise<Membership> {
  const householdId = recordIdSchema.safeParse(request.params.householdId);
  if (!householdId.success) throw Errors.notFound('No such home');
  const membership = await memberships.findMembership(
    householdId.data,
    signedInUserOf(response).userId,
  );
  if (membership === null) throw Errors.forbidden("You're not a member of this home");
  response.locals.membership = membership;
  return membership;
}

const membershipSchema = z.object({
  householdId: recordIdSchema,
  userId: recordIdSchema,
  role: householdRoleSchema,
});

export function membershipOf(response: Pick<Response, 'locals'>): Membership {
  const membership = membershipSchema.safeParse(response.locals.membership);
  if (!membership.success) throw Errors.forbidden("You're not a member of this home");
  return membership.data;
}

export function requireMember(memberships: MembershipReader): RequestHandler {
  return async (request, response, next) => {
    await loadMembership(memberships, request, response);
    next();
  };
}

export function requireOwner(memberships: MembershipReader): RequestHandler {
  return async (request, response, next) => {
    const membership = await loadMembership(memberships, request, response);
    if (membership.role !== 'owner') {
      throw Errors.forbidden('Only the owner of this home can do that');
    }
    next();
  };
}
