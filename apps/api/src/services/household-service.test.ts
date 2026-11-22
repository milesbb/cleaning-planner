import type { CreateHouseholdRequest, Household } from '@cleaning-planner/contracts/household';
import type { Profile } from '@cleaning-planner/contracts/profile';
import { describe, expect, it, vi } from 'vitest';
import { createHouseholdService } from './household-service';
import type { HouseholdStore, NewHome } from './household-service';

const SAM: Profile = { id: 'user-sam', name: 'Sam', email: 'sam@example.com', colour: 'blue' };

const NEW_FLAT: CreateHouseholdRequest = {
  name: 'Our flat',
  timeZone: 'Australia/Sydney',
  weekStartsOn: 'monday',
  rooms: [{ type: 'kitchen', name: 'Kitchen' }],
  features: [],
};

const FLAT: Household = {
  id: 'home-1',
  name: 'Our flat',
  timeZone: 'Australia/Sydney',
  weekStartsOn: 'monday',
  ownerId: 'user-sam',
  version: 1,
};

function fakeStore(): HouseholdStore & { created: NewHome[] } {
  const created: NewHome[] = [];
  return {
    created,
    createHome: vi.fn((home: NewHome) => {
      created.push(home);
      return Promise.resolve();
    }),
    getHousehold: vi.fn((id: string) => Promise.resolve(id === 'home-1' ? FLAT : null)),
    updateHousehold: vi.fn((_id: string, changes: object) =>
      Promise.resolve({ ...FLAT, ...changes, version: 2 }),
    ),
    deleteHousehold: vi.fn(() => Promise.resolve()),
    removeMember: vi.fn(() => Promise.resolve()),
  };
}

function serviceWith(
  store: HouseholdStore,
  profile: Profile | null = SAM,
): ReturnType<typeof createHouseholdService> {
  let next = 0;
  return createHouseholdService({
    store,
    memberships: {
      listHomesOf: () => Promise.resolve([{ id: 'home-1', name: 'Our flat', role: 'owner' }]),
    },
    profiles: { getProfile: () => Promise.resolve(profile) },
    now: () => '2026-11-22T20:00:00.000Z',
    newId: () => {
      next += 1;
      return `id-${String(next)}`;
    },
  });
}

describe('household service', () => {
  it('creates a home owned by the signed-in person, with a plan, in one go', async () => {
    const store = fakeStore();
    const household = await serviceWith(store).createHome('user-sam', NEW_FLAT);
    expect(household).toMatchObject({ name: 'Our flat', ownerId: 'user-sam', version: 1 });
    const [created] = store.created;
    expect(created?.household).toEqual(household);
    expect(created?.owner).toEqual({ userId: 'user-sam', name: 'Sam', colour: 'blue' });
    expect(created?.plan.rooms.map((room) => room.name)).toEqual(['Kitchen', 'Whole home']);
    expect(created?.plan.jobs.length).toBeGreaterThan(0);
  });

  it("plans from today in the home's own time zone", async () => {
    const store = fakeStore();
    await serviceWith(store).createHome('user-sam', NEW_FLAT);
    const startDates = store.created[0]?.plan.jobs.map((job) => job.startDate) ?? [];
    expect(startDates.every((date) => date >= '2026-11-23')).toBe(true);
  });

  it('needs a profile first, so members get a name and colour', async () => {
    await expect(serviceWith(fakeStore(), null).createHome('user-sam', NEW_FLAT)).rejects.toThrow(
      'Open the app again to set up your profile',
    );
  });

  it("lists the signed-in person's homes", async () => {
    await expect(serviceWith(fakeStore()).listHomes('user-sam')).resolves.toEqual([
      { id: 'home-1', name: 'Our flat', role: 'owner' },
    ]);
  });

  it('reads a home, or says it is not there', async () => {
    const service = serviceWith(fakeStore());
    await expect(service.getHome('home-1')).resolves.toEqual(FLAT);
    await expect(service.getHome('home-gone')).rejects.toThrow('No such home');
  });

  it('passes updates and deletes to the store', async () => {
    const store = fakeStore();
    const service = serviceWith(store);
    await service.updateHome('home-1', { name: 'The flat', version: 1 });
    await service.deleteHome('home-1');
    expect(store.updateHousehold).toHaveBeenCalledWith('home-1', { name: 'The flat', version: 1 });
    expect(store.deleteHousehold).toHaveBeenCalledWith('home-1');
  });

  it('lets a member leave', async () => {
    const store = fakeStore();
    await serviceWith(store).leaveHome({
      householdId: 'home-1',
      userId: 'user-alex',
      role: 'member',
    });
    expect(store.removeMember).toHaveBeenCalledWith('home-1', 'user-alex');
  });

  it('stops the owner leaving without handing the home over', async () => {
    const store = fakeStore();
    await expect(
      serviceWith(store).leaveHome({ householdId: 'home-1', userId: 'user-sam', role: 'owner' }),
    ).rejects.toThrow('Make someone else the owner before you leave');
    expect(store.removeMember).not.toHaveBeenCalled();
  });
});
