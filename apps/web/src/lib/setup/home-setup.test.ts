import { createHouseholdRequestSchema } from '@cleaning-planner/contracts/household';
import { describe, expect, it } from 'vitest';
import {
  DEFAULT_HOME_SETUP,
  createHouseholdRequestFor,
  homeTimeZone,
  roomsError,
} from './home-setup';
import type { HomeSetup } from './home-setup';

const NO_ROOMS: HomeSetup['roomCounts'] = {
  kitchen: 0,
  laundry: 0,
  bathroom: 0,
  bedroom: 0,
  livingRoom: 0,
  hallway: 0,
  office: 0,
  outdoor: 0,
};

describe('the default setup', () => {
  it('starts from a typical small home', () => {
    expect(DEFAULT_HOME_SETUP.roomCounts).toEqual({
      ...NO_ROOMS,
      kitchen: 1,
      bathroom: 1,
      bedroom: 1,
      livingRoom: 1,
    });
    expect(DEFAULT_HOME_SETUP.weekStartsOn).toBe('monday');
  });

  it('already makes a request the API accepts', () => {
    const request = createHouseholdRequestFor(DEFAULT_HOME_SETUP, 'Europe/London');
    expect(createHouseholdRequestSchema.safeParse(request).success).toBe(true);
  });
});

describe('createHouseholdRequestFor', () => {
  it('names each room, numbering the second bathroom and bedroom onwards', () => {
    const setup: HomeSetup = {
      ...DEFAULT_HOME_SETUP,
      homeName: '  Our flat ',
      roomCounts: { ...NO_ROOMS, kitchen: 1, bathroom: 2, bedroom: 3 },
    };
    expect(createHouseholdRequestFor(setup, 'Europe/London')).toEqual({
      name: 'Our flat',
      timeZone: 'Europe/London',
      weekStartsOn: 'monday',
      rooms: [
        { type: 'kitchen', name: 'Kitchen' },
        { type: 'bathroom', name: 'Bathroom' },
        { type: 'bathroom', name: 'Bathroom 2' },
        { type: 'bedroom', name: 'Bedroom' },
        { type: 'bedroom', name: 'Bedroom 2' },
        { type: 'bedroom', name: 'Bedroom 3' },
      ],
      features: setup.features,
    });
  });

  it('sends the appliances and floors for the whole home, and the chosen week start', () => {
    const setup: HomeSetup = {
      ...DEFAULT_HOME_SETUP,
      features: ['dishwasher', 'carpet'],
      weekStartsOn: 'sunday',
    };
    expect(createHouseholdRequestFor(setup, 'Australia/Sydney')).toMatchObject({
      features: ['dishwasher', 'carpet'],
      weekStartsOn: 'sunday',
    });
  });

  it('uses every room name the people who live there would recognise', () => {
    const everyRoom = createHouseholdRequestFor(
      {
        ...DEFAULT_HOME_SETUP,
        roomCounts: {
          kitchen: 1,
          laundry: 1,
          bathroom: 1,
          bedroom: 1,
          livingRoom: 1,
          hallway: 1,
          office: 1,
          outdoor: 1,
        },
      },
      'Europe/London',
    );
    expect(everyRoom.rooms.map((room) => room.name)).toEqual([
      'Kitchen',
      'Laundry',
      'Bathroom',
      'Bedroom',
      'Living room',
      'Hallway',
      'Office',
      'Outdoor',
    ]);
  });
});

describe('roomsError', () => {
  it('asks for at least one room', () => {
    expect(roomsError(NO_ROOMS)).toBe('Pick at least one room');
    expect(roomsError({ ...NO_ROOMS, office: 1 })).toBeUndefined();
  });
});

describe('homeTimeZone', () => {
  it('uses the time zone the device is set to', () => {
    expect(homeTimeZone(() => 'Pacific/Auckland')).toBe('Pacific/Auckland');
  });

  it('falls back to UTC when the device gives no usable time zone', () => {
    expect(homeTimeZone(() => 'Not/AZone')).toBe('UTC');
    expect(homeTimeZone(() => undefined)).toBe('UTC');
  });
});
