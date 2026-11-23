import { JOB_ICON_KEYS } from '@cleaning-planner/schedule/library/keys';
import { describe, expect, it } from 'vitest';
import { ROOM_APPEARANCE, countOf } from './rooms';

describe('ROOM_APPEARANCE', () => {
  it.each(Object.entries(ROOM_APPEARANCE))(
    '%s uses a Wall chart colour and a library icon',
    (_, appearance) => {
      expect(appearance.colourClass).toMatch(/^bg-[a-z-]+$/);
      expect(JOB_ICON_KEYS).toContain(appearance.icon);
    },
  );
});

describe('countOf', () => {
  it('uses the singular for one', () => {
    expect(countOf(1, 'job')).toBe('1 job');
  });

  it('uses the plural for none and for many', () => {
    expect(countOf(0, 'job')).toBe('0 jobs');
    expect(countOf(8, 'job')).toBe('8 jobs');
  });

  it('takes an irregular plural', () => {
    expect(countOf(2, 'person', 'people')).toBe('2 people');
  });
});
