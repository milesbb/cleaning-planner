import type { Page } from '@playwright/test';
import { fakeApi } from './fake-backend';

// Alex's place in "Our flat" (home-1): the home list, the home, its people,
// invites, and Alex's own profile. Sam owns the home unless `isOwner` makes
// Alex the owner, who can then change the home and who lives there.

const HOME = '/v1/households/home-1';
const WEEK_MS = 7 * 86_400_000;

export function asObject(value: unknown): object {
  return typeof value === 'object' && value !== null ? value : {};
}

function peopleFor(isOwner: boolean): Record<string, unknown>[] {
  return [
    { userId: 'user-alex', name: 'Alex', colour: 'pink', role: isOwner ? 'owner' : 'member' },
    { userId: 'user-sam', name: 'Sam', colour: 'blue', role: isOwner ? 'member' : 'owner' },
  ];
}

async function fakeProfile(page: Page): Promise<void> {
  const me = { id: 'user-alex', name: 'Alex', email: 'alex@example.com', colour: 'pink' };
  await fakeApi(page, '/v1/me', () => ({ body: me }), { method: 'GET' });
  await fakeApi(
    page,
    '/v1/me',
    (request) => {
      Object.assign(me, asObject(request.postDataJSON()));
      return { body: me };
    },
    { method: 'PATCH' },
  );
}

async function fakePeople(page: Page, isOwner: boolean): Promise<void> {
  const people = peopleFor(isOwner);
  await fakeApi(page, `${HOME}/members`, () => ({ body: people }), { method: 'GET' });
  await fakeApi(
    page,
    `${HOME}/members/*`,
    (request) => {
      const userId = request.url().split('/').pop() ?? '';
      const index = people.findIndex((person) => person.userId === userId);
      if (index >= 0) people.splice(index, 1);
      return { status: 204, body: undefined };
    },
    { method: 'DELETE' },
  );
  await fakeApi(
    page,
    `${HOME}/invites`,
    () => ({
      status: 201,
      body: { code: '7K3M9QZA', expiresAt: new Date(Date.now() + WEEK_MS).toISOString() },
    }),
    { method: 'POST' },
  );
}

async function fakeTheHome(page: Page, isOwner: boolean, onGone: () => void): Promise<void> {
  const home = {
    id: 'home-1',
    name: 'Our flat',
    timeZone: 'UTC',
    weekStartsOn: 'monday',
    ownerId: isOwner ? 'user-alex' : 'user-sam',
    version: 1,
  };
  await fakeApi(page, HOME, () => ({ body: home }), { method: 'GET' });
  await fakeApi(
    page,
    HOME,
    (request) => {
      Object.assign(home, asObject(request.postDataJSON()), { version: home.version + 1 });
      return { body: home };
    },
    { method: 'PATCH' },
  );
  const gone = (): { status: number; body: undefined } => {
    onGone();
    return { status: 204, body: undefined };
  };
  await fakeApi(page, HOME, gone, { method: 'DELETE' });
  await fakeApi(page, `${HOME}/leave`, gone, { method: 'POST' });
}

export async function fakeHousehold(page: Page, { isOwner = false } = {}): Promise<void> {
  const homes = [{ id: 'home-1', name: 'Our flat', role: isOwner ? 'owner' : 'member' }];
  await fakeApi(page, '/v1/households', () => ({ body: homes }));
  await fakeTheHome(page, isOwner, () => {
    homes.length = 0;
  });
  await fakePeople(page, isOwner);
  await fakeProfile(page);
}
