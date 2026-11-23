import { describe, expect, it } from 'vitest';
import { NO_ADVICE } from './job-advice';
import { adviceFor } from './library-advice';

describe('adviceFor', () => {
  it('gives a library job’s recommendation, why and how-to', () => {
    expect(adviceFor('kitchen.oven')).toEqual({
      recommendation: 'Most homes do this every 3 months to every 6 months.',
      recommendedRange: {
        shortest: { value: 3, unit: 'month' },
        longest: { value: 6, unit: 'month' },
      },
      recommendedSchedule: { type: 'floating', every: { value: 3, unit: 'month' } },
      why: 'Burnt-on grease smokes, smells and can affect how food tastes.',
      howTo: [
        'Take out the racks and soak them in hot soapy water.',
        'Spread a paste of bicarbonate of soda and water inside and leave it overnight.',
        'Wipe it out with a damp cloth and rinse.',
      ],
    });
  });

  it.each([
    ['a job someone made up', null],
    ['a library job that has since been retired', 'kitchen.retired-job'],
  ])('has no advice for %s', (_case, libraryId) => {
    expect(adviceFor(libraryId)).toEqual(NO_ADVICE);
  });
});
