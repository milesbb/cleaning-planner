import { JOB_LIBRARY } from '@cleaning-planner/schedule/library/job-library';
import { describe, expect, it } from 'vitest';
import { searchLibrary } from './library-search';

function idsFound(query: string, roomType: Parameters<typeof searchLibrary>[2]): string[] {
  return searchLibrary(JOB_LIBRARY, query, roomType).map((job) => job.id);
}

describe('searchLibrary', () => {
  it('lists a room’s jobs when nothing is typed', () => {
    expect(idsFound('', 'bathroom')).toEqual([
      'bathroom.weekly-clean',
      'bathroom.shower-head',
      'bathroom.mats-curtain',
    ]);
  });

  it('lists every job in every room when no room is chosen', () => {
    expect(idsFound('  ', null)).toHaveLength(JOB_LIBRARY.length);
  });

  it('matches names whatever the case', () => {
    expect(idsFound('SHEETS', null)).toEqual(['bedroom.sheets']);
  });

  it('matches what the job is for, after the names that match', () => {
    expect(idsFound('limescale', null)).toEqual([
      'kitchen.dishwasher-hot-wash',
      'kitchen.descale-kettle',
      'bathroom.shower-head',
    ]);
    expect(idsFound('descale', null).slice(0, 2)).toEqual([
      'kitchen.descale-kettle',
      'bathroom.shower-head',
    ]);
  });

  it('needs every word to match', () => {
    expect(idsFound('wash duvet', null)).toEqual(['bedroom.pillows-duvet']);
  });

  it('keeps to the chosen room while searching', () => {
    expect(idsFound('limescale', 'bathroom')).toEqual(['bathroom.shower-head']);
  });

  it('finds nothing for words no job uses', () => {
    expect(idsFound('trampoline', null)).toEqual([]);
  });
});
