import type { RoomType } from '@cleaning-planner/schedule/library/types';
import type { StaticImageData } from 'next/image';

export type ArtKey =
  | 'welcomeHero'
  | 'checkEmail'
  | 'newKeys'
  | 'doorOpening'
  | 'movingIn'
  | 'allDone'
  | 'kitchenScene'
  | 'laundryScene'
  | 'bathroomScene'
  | 'bedroomScene'
  | 'livingRoomScene'
  | 'hallwayScene'
  | 'officeScene'
  | 'outdoorScene'
  | 'wholeHomeScene';

export type ArtImages = Partial<Record<ArtKey, StaticImageData>>;

export const ART_STAND_IN_ROOMS: Record<ArtKey, RoomType> = {
  welcomeHero: 'kitchen',
  checkEmail: 'laundry',
  newKeys: 'bedroom',
  doorOpening: 'livingRoom',
  movingIn: 'bathroom',
  allDone: 'livingRoom',
  kitchenScene: 'kitchen',
  laundryScene: 'laundry',
  bathroomScene: 'bathroom',
  bedroomScene: 'bedroom',
  livingRoomScene: 'livingRoom',
  hallwayScene: 'hallway',
  officeScene: 'office',
  outdoorScene: 'outdoor',
  wholeHomeScene: 'wholeHome',
};

export const ART_KEYS = Object.keys(ART_STAND_IN_ROOMS).filter((key): key is ArtKey =>
  Object.hasOwn(ART_STAND_IN_ROOMS, key),
);

export const COMMISSIONED_ART: ArtImages = {};
