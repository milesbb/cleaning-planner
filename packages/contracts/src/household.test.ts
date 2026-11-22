import { describe, expect, it } from 'vitest';
import {
  createHouseholdRequestSchema,
  householdSchema,
  householdSummarySchema,
  memberSchema,
  updateHouseholdRequestSchema,
  updateMemberRequestSchema,
} from './household';
import { newRoomSchema, roomSchema, updateRoomRequestSchema } from './room';
import { describeContract, fieldErrorsFor } from './test-support';

const NEW_HOME = {
  name: 'Our flat',
  timeZone: 'Europe/London',
  weekStartsOn: 'monday',
  rooms: [{ type: 'kitchen', name: 'Kitchen', appliances: ['dishwasher', 'oven'] }],
  features: ['washingMachine'],
};

describeContract('householdSummarySchema', householdSummarySchema, {
  valid: { id: 'home-1', name: 'Our flat', role: 'owner' },
  requiredField: 'role',
  wrongType: { field: 'role', value: 'admin' },
});

describeContract('householdSchema', householdSchema, {
  valid: {
    id: 'home-1',
    name: 'Our flat',
    timeZone: 'Europe/London',
    weekStartsOn: 'monday',
    ownerId: 'user-1',
    version: 1,
  },
  requiredField: 'timeZone',
  wrongType: { field: 'weekStartsOn', value: 'funday' },
});

describeContract('createHouseholdRequestSchema', createHouseholdRequestSchema, {
  valid: NEW_HOME,
  requiredField: 'rooms',
  wrongType: { field: 'features', value: 'jacuzzi' },
});

describeContract('updateHouseholdRequestSchema', updateHouseholdRequestSchema, {
  valid: { name: 'The flat', version: 2 },
  requiredField: 'version',
  wrongType: { field: 'timeZone', value: 'Somewhere/Else' },
});

describeContract('memberSchema', memberSchema, {
  valid: { userId: 'user-2', name: 'Alex', colour: 'pink', role: 'member' },
  requiredField: 'userId',
  wrongType: { field: 'colour', value: 3 },
});

describeContract('updateMemberRequestSchema', updateMemberRequestSchema, {
  valid: { role: 'owner' },
  requiredField: 'role',
  wrongType: { field: 'role', value: 'boss' },
});

describeContract('newRoomSchema', newRoomSchema, {
  valid: { type: 'bathroom', name: 'Upstairs bathroom' },
  requiredField: 'type',
  wrongType: { field: 'type', value: 'garage' },
});

describeContract('roomSchema', roomSchema, {
  valid: { id: 'room-1', type: 'bedroom', name: 'Bedroom', order: 0, appliances: [], version: 1 },
  requiredField: 'order',
  wrongType: { field: 'order', value: -1 },
});

describeContract('updateRoomRequestSchema', updateRoomRequestSchema, {
  valid: { order: 2, version: 4 },
  requiredField: 'version',
  wrongType: { field: 'appliances', value: 'oven' },
});

describe('createHouseholdRequestSchema', () => {
  it('needs at least one room', () => {
    expect(fieldErrorsFor(createHouseholdRequestSchema, { ...NEW_HOME, rooms: [] })).toEqual({
      rooms: 'Add at least one room',
    });
  });

  it('caps the number of rooms', () => {
    const rooms = Array.from({ length: 31 }, () => ({ type: 'bedroom', name: 'Bedroom' }));
    expect(fieldErrorsFor(createHouseholdRequestSchema, { ...NEW_HOME, rooms })).toEqual({
      rooms: 'A home can have up to 30 rooms',
    });
  });

  it('points at the room that is wrong', () => {
    const rooms = [{ type: 'kitchen', name: '' }];
    expect(fieldErrorsFor(createHouseholdRequestSchema, { ...NEW_HOME, rooms })).toEqual({
      'rooms.0.name': 'Enter a name',
    });
  });
});

describe('update requests', () => {
  it('need a change as well as the version', () => {
    expect(fieldErrorsFor(updateHouseholdRequestSchema, { version: 2 })).toEqual({
      request: 'Change at least one thing',
    });
    expect(fieldErrorsFor(updateRoomRequestSchema, { version: 2 })).toEqual({
      request: 'Change at least one thing',
    });
  });

  it('reject an appliance listed twice', () => {
    expect(
      fieldErrorsFor(updateRoomRequestSchema, { appliances: ['oven', 'oven'], version: 1 }),
    ).toEqual({ appliances: 'List each appliance once' });
  });
});
