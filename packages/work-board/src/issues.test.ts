import { describe, expect, it } from 'vitest';
import { dependenciesOf, isInFlight, lanesOf, sizeOf } from './issues.ts';
import { issue } from './test-issues.ts';

describe('lanesOf', () => {
  it('reads every lane label without its prefix', () => {
    const settingsWork = issue(1, { labels: ['area: web', 'lane: settings', 'lane: ui-kit'] });
    expect(lanesOf(settingsWork)).toEqual(['settings', 'ui-kit']);
  });

  it('is empty when the issue has no lane', () => {
    expect(lanesOf(issue(1, { labels: ['area: web'] }))).toEqual([]);
  });
});

describe('dependenciesOf', () => {
  it('reads every issue number on the Depends on line', () => {
    expect(dependenciesOf(issue(1, { dependsOn: '#60, #62 and #65' }))).toEqual([60, 62, 65]);
  });

  it('is empty when the issue depends on nothing', () => {
    expect(dependenciesOf(issue(1))).toEqual([]);
  });

  it('ignores issue numbers mentioned elsewhere in the body', () => {
    const mentionsOthers: ReturnType<typeof issue> = {
      ...issue(1),
      body: 'See #12 for background.\n\n**Depends on:** #5\n\nLater: #40',
    };
    expect(dependenciesOf(mentionsOthers)).toEqual([5]);
  });

  it('is empty when there is no Depends on line', () => {
    expect(dependenciesOf({ ...issue(1), body: 'Just a note about #3.' })).toEqual([]);
  });
});

describe('isInFlight', () => {
  it('is true for work in progress or in review', () => {
    expect(isInFlight(issue(1, { labels: ['status: in progress'] }))).toBe(true);
    expect(isInFlight(issue(2, { labels: ['status: in review'] }))).toBe(true);
  });

  it('is false for work that has not started', () => {
    expect(isInFlight(issue(1, { labels: ['status: ready'] }))).toBe(false);
  });
});

describe('sizeOf', () => {
  it('reads the size label', () => {
    expect(sizeOf(issue(1, { labels: ['size: M'] }))).toBe('M');
  });

  it('is null without one', () => {
    expect(sizeOf(issue(1))).toBeNull();
  });
});
