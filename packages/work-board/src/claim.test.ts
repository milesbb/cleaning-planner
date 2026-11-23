import { describe, expect, it } from 'vitest';
import { buildBoard } from './board.ts';
import { reasonNotToClaim } from './claim.ts';
import { issue } from './test-issues.ts';

describe('reasonNotToClaim', () => {
  it('allows an issue that can start now', () => {
    expect(reasonNotToClaim(buildBoard([issue(1, { labels: ['lane: job'] })]), 1)).toBeNull();
  });

  it('refuses an issue that is not open', () => {
    expect(reasonNotToClaim(buildBoard([]), 7)).toBe('#7 is not an open issue.');
  });

  it('refuses work someone already has', () => {
    const board = buildBoard([issue(1, { labels: ['lane: job', 'status: in progress'] })]);
    expect(reasonNotToClaim(board, 1)).toBe('#1 is already in flight.');
  });

  it('names the issue holding a lane it needs', () => {
    const board = buildBoard([
      issue(1, { labels: ['lane: job', 'status: in progress'] }),
      issue(2, { labels: ['lane: job', 'lane: ui-kit'] }),
    ]);
    expect(reasonNotToClaim(board, 2)).toBe('#2 would clash: lane job is held by #1.');
  });

  it('names what a blocked issue waits for', () => {
    const board = buildBoard([
      issue(1, { labels: ['lane: pwa'] }),
      issue(2, { labels: ['lane: job'], dependsOn: '#1' }),
    ]);
    expect(reasonNotToClaim(board, 2)).toBe('#2 waits for #1 to be merged.');
  });

  it('refuses owner actions, decisions and later work', () => {
    const board = buildBoard([
      issue(1, { labels: ['owner action'] }),
      issue(2, { labels: ['lane: job', 'status: needs decision'] }),
      issue(3, { labels: ['lane: job', 'later'] }),
    ]);
    expect(reasonNotToClaim(board, 1)).toBe('#1 is for the owner to do.');
    expect(reasonNotToClaim(board, 2)).toBe('#2 needs a decision from the owner first.');
    expect(reasonNotToClaim(board, 3)).toBe('#3 is planned for later.');
  });
});
