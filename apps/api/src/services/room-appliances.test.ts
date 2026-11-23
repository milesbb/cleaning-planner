import type { Job } from '@cleaning-planner/contracts/job';
import type { Room } from '@cleaning-planner/contracts/room';
import { parseCalendarDate } from '@cleaning-planner/schedule/calendar-date';
import { describe, expect, it } from 'vitest';
import { appliancesForRoomType, applianceChanges, roomWithItsAppliances } from './room-appliances';

const KITCHEN: Room = {
  id: 'room-kitchen',
  type: 'kitchen',
  name: 'Kitchen',
  order: 0,
  appliances: [],
  version: 1,
};

function job(id: string, libraryId: string | null, roomId = 'room-kitchen'): Job {
  return {
    id,
    roomId,
    libraryId,
    name: id,
    icon: 'oven',
    schedule: { type: 'floating', every: { value: 1, unit: 'week' } },
    startDate: parseCalendarDate('2026-11-01'),
    assignment: { kind: 'anyone' },
    snooze: null,
    effortMinutes: 10,
    version: 1,
  };
}

let nextId = 0;
const newId = (): string => `id-${String((nextId += 1))}`;

describe('appliancesForRoomType', () => {
  it('offers the appliances the library has jobs for in that kind of room', () => {
    expect(appliancesForRoomType('kitchen')).toEqual([
      'dishwasher',
      'oven',
      'extractorHood',
      'kettle',
      'microwave',
    ]);
    expect(appliancesForRoomType('laundry')).toEqual(['washingMachine', 'tumbleDryer']);
    expect(appliancesForRoomType('wholeHome')).toEqual(['carpet', 'hardFloor']);
  });

  it('offers none for rooms whose jobs need nothing', () => {
    expect(appliancesForRoomType('bedroom')).toEqual([]);
  });
});

describe('roomWithItsAppliances', () => {
  it("counts an appliance one of the room's jobs needs, as for rooms made in setup", () => {
    const jobs = [job('job-oven', 'kitchen.oven'), job('job-bins', null)];
    expect(roomWithItsAppliances(KITCHEN, jobs).appliances).toEqual(['oven']);
  });

  it('keeps saved appliances, in the library order, without repeats', () => {
    const room: Room = { ...KITCHEN, appliances: ['kettle', 'oven'] };
    expect(roomWithItsAppliances(room, [job('job-oven', 'kitchen.oven')]).appliances).toEqual([
      'oven',
      'kettle',
    ]);
  });

  it("ignores other rooms' jobs", () => {
    const jobs = [job('job-washer', 'laundry.door-seal', 'room-laundry')];
    expect(roomWithItsAppliances(KITCHEN, jobs).appliances).toEqual([]);
  });
});

describe('applianceChanges', () => {
  const TODAY = parseCalendarDate('2026-11-24');

  it("adds the library jobs a newly ticked appliance needs, from today, that the room doesn't have", () => {
    const changes = applianceChanges({
      room: KITCHEN,
      roomJobs: [job('job-oven', 'kitchen.oven')],
      requested: ['oven', 'dishwasher'],
      today: TODAY,
      newId,
    });
    expect(changes.jobsToAdd.map((added) => added.libraryId).sort()).toEqual([
      'kitchen.dishwasher-arms-seal',
      'kitchen.dishwasher-filter',
      'kitchen.dishwasher-hot-wash',
    ]);
    expect(changes.jobsToAdd.every((added) => added.roomId === 'room-kitchen')).toBe(true);
    expect(changes.jobsToAdd.every((added) => added.startDate >= TODAY)).toBe(true);
    expect(changes.jobIdsToRemove).toEqual([]);
  });

  it("removes the jobs that need an appliance that's unticked, renamed or not", () => {
    const changes = applianceChanges({
      room: { ...KITCHEN, appliances: ['oven', 'kettle'] },
      roomJobs: [
        job('job-oven', 'kitchen.oven'),
        job('job-kettle', 'kitchen.descale-kettle'),
        job('job-bins', null),
      ],
      requested: ['kettle'],
      today: TODAY,
      newId,
    });
    expect(changes.jobIdsToRemove).toEqual(['job-oven']);
    expect(changes.jobsToAdd).toEqual([]);
  });

  it('changes nothing when the appliances are the same', () => {
    expect(
      applianceChanges({
        room: KITCHEN,
        roomJobs: [job('job-oven', 'kitchen.oven')],
        requested: ['oven'],
        today: TODAY,
        newId,
      }),
    ).toEqual({ jobsToAdd: [], jobIdsToRemove: [] });
  });

  it("refuses an appliance that doesn't belong in that kind of room", () => {
    expect(() =>
      applianceChanges({
        room: KITCHEN,
        roomJobs: [],
        requested: ['tumbleDryer'],
        today: TODAY,
        newId,
      }),
    ).toThrow(
      expect.objectContaining({
        statusCode: 400,
        fields: { appliances: 'Pick appliances that belong in this room' },
      }),
    );
  });
});
