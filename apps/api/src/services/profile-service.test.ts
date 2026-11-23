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
    updateEmail: vi.fn((userId: string, email: string) =>
      Promise.resolve({ ...SAM, id: userId, email }),
    ),
  };
}

function identityWith(email: string, isEmailVerified: boolean): IdentityReader {
  return { readIdentity: vi.fn(() => Promise.resolve({ email, name: 'Sam', isEmailVerified })) };
}

const identity = identityWith('sam@example.com', true);

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

describe('refreshing my email from Cognito', () => {
  it('saves a new email once Cognito has verified it', async () => {
    const store = storeWith(SAM);
    const reader = identityWith('sam@new.example.com', true);
    const service = createProfileService(store, reader);
    await expect(service.refreshMyEmail('user-sam', 'access-token')).resolves.toEqual({
      ...SAM,
      email: 'sam@new.example.com',
    });
    expect(reader.readIdentity).toHaveBeenCalledWith('access-token');
    expect(store.updateEmail).toHaveBeenCalledWith('user-sam', 'sam@new.example.com');
  });

  it('keeps the old email while the new one is unverified', async () => {
    const store = storeWith(SAM);
    const service = createProfileService(store, identityWith('sam@new.example.com', false));
    await expect(service.refreshMyEmail('user-sam', 'access-token')).resolves.toEqual(SAM);
    expect(store.updateEmail).not.toHaveBeenCalled();
  });

  it('changes nothing when the email is the same', async () => {
    const store = storeWith(SAM);
    const service = createProfileService(store, identity);
    await expect(service.refreshMyEmail('user-sam', 'access-token')).resolves.toEqual(SAM);
    expect(store.updateEmail).not.toHaveBeenCalled();
  });

  it('sets up the profile first if this is the first call', async () => {
    const store = storeWith(null);
    const service = createProfileService(store, identity);
    await expect(service.refreshMyEmail('user-sam', 'access-token')).resolves.toMatchObject({
      email: 'sam@example.com',
    });
    expect(store.createProfile).toHaveBeenCalled();
    expect(store.updateEmail).not.toHaveBeenCalled();
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
