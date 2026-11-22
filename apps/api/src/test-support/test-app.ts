import type { Express, Request } from 'express';
import { createApp } from '../app';
import type { AppServices } from '../app';

export const CLAIMS_HEADER = 'x-test-claims';

function readTestClaims(request: Request): unknown {
  const header = request.header(CLAIMS_HEADER);
  if (header === undefined) return undefined;
  const claims: unknown = JSON.parse(header);
  return claims;
}

export function signedInAs(userId: string): string {
  return JSON.stringify({ sub: userId, token_use: 'access' });
}

function notUsed(): Promise<never> {
  return Promise.reject(new Error('Not used in this test'));
}

const UNUSED_SERVICES: AppServices = {
  profiles: { getMyProfile: notUsed, updateMyProfile: notUsed },
  households: {
    createHome: notUsed,
    listHomes: notUsed,
    getHome: notUsed,
    updateHome: notUsed,
    deleteHome: notUsed,
    leaveHome: notUsed,
  },
  members: { listMembers: notUsed, changeRole: notUsed, removeMember: notUsed },
  memberships: { findMembership: notUsed },
};

export function testApp(services: Partial<AppServices> = {}): Express {
  return createApp({
    version: 'test-sha',
    readClaims: readTestClaims,
    services: { ...UNUSED_SERVICES, ...services },
  });
}
