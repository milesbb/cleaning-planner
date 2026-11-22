import type { Member } from '@cleaning-planner/contracts/household';
import request from 'supertest';
import { describe, expect, it, vi } from 'vitest';
import type { Membership, MembershipReader } from '../middlewares/membership';
import type { MemberService } from '../services/member-service';
import { CLAIMS_HEADER, signedInAs, testApp } from '../test-support/test-app';

const MEMBERS: Member[] = [
  { userId: 'user-sam', name: 'Sam', colour: 'blue', role: 'owner' },
  { userId: 'user-alex', name: 'Alex', colour: 'pink', role: 'member' },
];

const MEMBERSHIPS: Record<string, Membership> = {
  'home-1/user-sam': { householdId: 'home-1', userId: 'user-sam', role: 'owner' },
  'home-1/user-alex': { householdId: 'home-1', userId: 'user-alex', role: 'member' },
};

const memberships: MembershipReader = {
  findMembership: (householdId, userId) =>
    Promise.resolve(MEMBERSHIPS[`${householdId}/${userId}`] ?? null),
};

function memberService(): MemberService {
  return {
    listMembers: vi.fn(() => Promise.resolve(MEMBERS)),
    changeRole: vi.fn(() => Promise.resolve(MEMBERS)),
    removeMember: vi.fn(() => Promise.resolve()),
  };
}

type Method = 'get' | 'patch' | 'delete';

function callAs(
  members: MemberService,
  method: Method,
  path: string,
  userId: string,
): request.Test {
  const agent = request(testApp({ members, memberships }));
  return agent[method](path).set(CLAIMS_HEADER, signedInAs(userId));
}

const MEMBER_ROUTES = [
  ['get', '/v1/households/home-1/members'],
  ['patch', '/v1/households/home-1/members/user-alex'],
  ['delete', '/v1/households/home-1/members/user-alex'],
] as const;

describe('/v1/households/:householdId/members', () => {
  it.each(MEMBER_ROUTES)(
    '%s %s gives someone outside the home a 403 and reads or writes nothing',
    async (method, path) => {
      const members = memberService();
      const response = await callAs(members, method, path, 'user-stranger').send({ role: 'owner' });
      expect(response.status).toBe(403);
      Object.values(members).forEach((serviceCall) => {
        expect(serviceCall).not.toHaveBeenCalled();
      });
    },
  );

  it('lists the members for any member', async () => {
    const response = await callAs(
      memberService(),
      'get',
      '/v1/households/home-1/members',
      'user-alex',
    );
    expect(response.status).toBe(200);
    expect(response.body).toEqual(MEMBERS);
  });

  it('lets only the owner change roles', async () => {
    const members = memberService();
    const path = '/v1/households/home-1/members/user-sam';
    const asMember = await callAs(members, 'patch', path, 'user-alex').send({ role: 'member' });
    expect(asMember.status).toBe(403);
    const asOwner = await callAs(
      members,
      'patch',
      '/v1/households/home-1/members/user-alex',
      'user-sam',
    ).send({ role: 'owner' });
    expect(asOwner.status).toBe(200);
    expect(members.changeRole).toHaveBeenCalledWith(
      MEMBERSHIPS['home-1/user-sam'],
      'user-alex',
      'owner',
    );
  });

  it('checks the new role', async () => {
    const members = memberService();
    const response = await callAs(
      members,
      'patch',
      '/v1/households/home-1/members/user-alex',
      'user-sam',
    ).send({ role: 'admin' });
    expect(response.status).toBe(400);
    expect(members.changeRole).not.toHaveBeenCalled();
  });

  it('lets only the owner remove someone', async () => {
    const members = memberService();
    const path = '/v1/households/home-1/members/user-sam';
    expect((await callAs(members, 'delete', path, 'user-alex')).status).toBe(403);
    const asOwner = await callAs(
      members,
      'delete',
      '/v1/households/home-1/members/user-alex',
      'user-sam',
    );
    expect(asOwner.status).toBe(204);
    expect(members.removeMember).toHaveBeenCalledWith(MEMBERSHIPS['home-1/user-sam'], 'user-alex');
  });

  it('rejects a member id that cannot exist', async () => {
    const response = await callAs(
      memberService(),
      'delete',
      '/v1/households/home-1/members/not%20an%20id',
      'user-sam',
    );
    expect(response.status).toBe(400);
  });
});
