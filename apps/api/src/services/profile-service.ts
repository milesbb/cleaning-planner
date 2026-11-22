import type { PersonColour } from '@cleaning-planner/contracts/primitives';
import { PERSON_COLOURS } from '@cleaning-planner/contracts/primitives';
import type { Profile, UpdateProfileRequest } from '@cleaning-planner/contracts/profile';

export interface Identity {
  email: string;
  name: string;
}

export interface IdentityReader {
  readIdentity: (accessToken: string) => Promise<Identity>;
}

export interface ProfileStore {
  getProfile: (userId: string) => Promise<Profile | null>;
  createProfile: (profile: Profile) => Promise<Profile>;
  updateProfile: (userId: string, changes: UpdateProfileRequest) => Promise<Profile>;
}

export interface ProfileService {
  getMyProfile: (userId: string, accessToken: string) => Promise<Profile>;
  updateMyProfile: (userId: string, changes: UpdateProfileRequest) => Promise<Profile>;
}

export function defaultColourFor(userId: string): PersonColour {
  let total = 0;
  for (let position = 0; position < userId.length; position += 1) {
    total += userId.charCodeAt(position);
  }
  return PERSON_COLOURS[total % PERSON_COLOURS.length] ?? 'blue';
}

export function createProfileService(
  store: ProfileStore,
  identity: IdentityReader,
): ProfileService {
  return {
    getMyProfile: async (userId, accessToken): Promise<Profile> => {
      const existing = await store.getProfile(userId);
      if (existing !== null) return existing;
      const { email, name } = await identity.readIdentity(accessToken);
      return store.createProfile({ id: userId, name, email, colour: defaultColourFor(userId) });
    },
    updateMyProfile: (userId, changes) => store.updateProfile(userId, changes),
  };
}
