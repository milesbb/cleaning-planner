import type { Profile } from '@cleaning-planner/contracts/profile';
import { vi } from 'vitest';
import type { ProfileService } from '../services/profile-service';

export const ACCESS_TOKEN = 'the-access-token';
export const BEARER_ACCESS_TOKEN = `Bearer ${ACCESS_TOKEN}`;

const NEW_PROFILE: Profile = {
  id: 'user-new',
  name: 'Robin',
  email: 'robin@example.com',
  colour: 'green',
};

export function profilesThatCreateOnFirstRead(): ProfileService {
  return {
    getMyProfile: vi.fn(() => Promise.resolve(NEW_PROFILE)),
    updateMyProfile: vi.fn(() => Promise.resolve(NEW_PROFILE)),
    refreshMyEmail: vi.fn(() => Promise.resolve(NEW_PROFILE)),
  };
}
