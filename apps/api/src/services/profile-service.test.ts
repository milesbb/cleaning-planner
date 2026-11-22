import type { Profile } from '@cleaning-planner/contracts/profile';
import { describe, expect, it, vi } from 'vitest';
import { createProfileService, defaultColourFor } from './profile-service';
import type { IdentityReader, ProfileStore } from './profile-service';

const SAM: Profile = { id: 'user-sam', name: 'Sam', email: 'sam@example.com', colour: 'blue' };

function storeWith(existing: Profile | null): ProfileStore {
  return {
    getProfile: vi.fn(() => Promise.resolve(existing)),
    createProfile: vi.fn((profile: Profile) => Promise.resolve(profile)),
    updateProfile: vi.fn((userId: string, changes: object) =>
      Promise.resolve({ ...SAM, id: userId, ...changes }),
    ),
  };
}

const identity: IdentityReader = {
  readIdentity: vi.fn(() => Promise.resolve({ email: 'sam@example.com', name: 'Sam' })),
};

describe('profile service', () => {
  it('returns an existing profile without asking Cognito', async () => {
    const reader: IdentityReader = { readIdentity: vi.fn() };
    const service = createProfileService(storeWith(SAM), reader);
    await expect(service.getMyProfile('user-sam', 'access-token')).resolves.toEqual(SAM);
    expect(reader.readIdentity).not.toHaveBeenCalled();
  });

  it('creates the profile on the first call from what Cognito knows', async () => {
    const store = storeWith(null);
    const service = createProfileService(store, identity);
    const profile = await service.getMyProfile('user-sam', 'access-token');
    expect(identity.readIdentity).toHaveBeenCalledWith('access-token');
    expect(store.createProfile).toHaveBeenCalledWith({
      id: 'user-sam',
      name: 'Sam',
      email: 'sam@example.com',
      colour: defaultColourFor('user-sam'),
    });
    expect(profile.email).toBe('sam@example.com');
  });

  it('changes only the signed-in person', async () => {
    const store = storeWith(SAM);
    const service = createProfileService(store, identity);
    await service.updateMyProfile('user-sam', { colour: 'pink' });
    expect(store.updateProfile).toHaveBeenCalledWith('user-sam', { colour: 'pink' });
  });
});

describe('defaultColourFor', () => {
  it('gives the same person the same colour every time', () => {
    expect(defaultColourFor('user-sam')).toBe(defaultColourFor('user-sam'));
  });

  it('spreads people across the colours', () => {
    const colours = new Set(['a', 'b', 'c', 'd', 'e', 'f'].map((id) => defaultColourFor(id)));
    expect(colours.size).toBeGreaterThan(2);
  });
});
