import { JOB_LIBRARY } from '@cleaning-planner/schedule/library/job-library';
import { ROOM_TYPES } from '@cleaning-planner/schedule/library/keys';
import type { HomeFeature, RoomType } from '@cleaning-planner/schedule/library/types';
import { describe, expect, it } from 'vitest';
import { applianceChoicesFor, appliancesInRoom } from './appliances';

function libraryAppliancesFor(roomType: RoomType): HomeFeature[] {
  const needed = JOB_LIBRARY.filter((job) => job.room === roomType).flatMap((job) =>
    job.needs === undefined ? [] : [job.needs],
  );
  return [...new Set(needed)];
}

describe('appliancesInRoom', () => {
  it.each(ROOM_TYPES)(
    'offers exactly the appliances the library has jobs for in a %s',
    (roomType) => {
      expect(appliancesInRoom(roomType)).toEqual(libraryAppliancesFor(roomType));
    },
  );
});

describe('applianceChoicesFor', () => {
  it('labels each appliance', () => {
    expect(applianceChoicesFor('laundry')).toEqual([
      { value: 'washingMachine', label: 'Washing machine' },
      { value: 'tumbleDryer', label: 'Tumble dryer' },
    ]);
  });

  it('offers nothing for rooms whose jobs need no appliance', () => {
    expect(applianceChoicesFor('bedroom')).toEqual([]);
  });
});
