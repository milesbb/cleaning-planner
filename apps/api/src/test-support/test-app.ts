import type { Express, Request } from 'express';
import { createApp } from '../app';
import type { AppServices } from '../app';

export const CLAIMS_HEADER = 'x-test-claims';
export const SOURCE_IP_HEADER = 'x-test-source-ip';

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
  invites: { createInvite: notUsed, previewInvite: notUsed, acceptInvite: notUsed },
  rooms: { listRooms: notUsed, addRoom: notUsed, updateRoom: notUsed, deleteRoom: notUsed },
  jobs: {
    listJobs: notUsed,
    getJob: notUsed,
    addJob: notUsed,
    updateJob: notUsed,
    deleteJob: notUsed,
  },
  progress: { completeJob: notUsed, undoLatest: notUsed, snoozeJob: notUsed },
  history: { listHistory: notUsed },
  agenda: { getAgenda: notUsed, listProgress: notUsed },
  accounts: { deleteAccount: notUsed },
  memberships: { findMembership: notUsed },
};

export function testApp(services: Partial<AppServices> = {}): Express {
  return createApp({
    version: 'test-sha',
    readClaims: readTestClaims,
    readSourceIp: (request) => request.header(SOURCE_IP_HEADER),
    services: { ...UNUSED_SERVICES, ...services },
  });
}
