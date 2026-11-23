import { describe, expect, it } from 'vitest';
import { movedRoomIds, positionsToSave } from './room-order';

const IDS = ['room-kitchen', 'room-living', 'room-bed'];

describe('movedRoomIds', () => {
  it('swaps a room with the one above it', () => {
    expect(movedRoomIds(IDS, 'room-living', 'up')).toEqual([
      'room-living',
      'room-kitchen',
      'room-bed',
    ]);
  });

  it('swaps a room with the one below it', () => {
    expect(movedRoomIds(IDS, 'room-living', 'down')).toEqual([
      'room-kitchen',
      'room-bed',
      'room-living',
    ]);
  });

  it.each([
    ['the first room up', 'room-kitchen', 'up'],
    ['the last room down', 'room-bed', 'down'],
    ['a room that is not there', 'room-gone', 'up'],
  ] as const)('leaves the order alone when moving %s', (_case, roomId, direction) => {
    expect(movedRoomIds(IDS, roomId, direction)).toEqual(IDS);
  });
});

describe('positionsToSave', () => {
  const ROOMS = [
    { id: 'room-kitchen', order: 0, version: 3 },
    { id: 'room-living', order: 1, version: 1 },
    { id: 'room-bed', order: 2, version: 2 },
  ];

  it('sends only the rooms whose place changed, each with its version', () => {
    expect(positionsToSave(ROOMS, ['room-living', 'room-kitchen', 'room-bed'])).toEqual([
      { roomId: 'room-living', order: 0, version: 1 },
      { roomId: 'room-kitchen', order: 1, version: 3 },
    ]);
  });

  it('sends nothing when nothing moved', () => {
    expect(positionsToSave(ROOMS, IDS)).toEqual([]);
  });

  it('numbers rooms from the top, tidying gaps left by removed rooms', () => {
    const withGaps = [
      { id: 'room-kitchen', order: 0, version: 1 },
      { id: 'room-bed', order: 4, version: 1 },
    ];
    expect(positionsToSave(withGaps, ['room-bed', 'room-kitchen'])).toEqual([
      { roomId: 'room-bed', order: 0, version: 1 },
      { roomId: 'room-kitchen', order: 1, version: 1 },
    ]);
  });
});
