import { describe, expect, it } from 'vitest';
import { buildBoard } from './board.ts';
import { labelChangesFor } from './label-sync.ts';
import { issue } from './test-issues.ts';

describe('labelChangesFor', () => {
  it('marks startable and lane-waiting issues as ready', () => {
    const board = buildBoard([
      issue(1, { labels: ['lane: job', 'status: in progress'] }),
      issue(2, { labels: ['lane: job', 'status: blocked'] }),
      issue(3, { labels: ['lane: settings'] }),
    ]);
    expect(labelChangesFor(board)).toEqual([
      { issueNumber: 2, add: 'status: ready', remove: ['status: blocked'] },
      { issueNumber: 3, add: 'status: ready', remove: [] },
    ]);
  });

  it('marks an issue with open dependencies as blocked', () => {
    const board = buildBoard([
      issue(1, { labels: ['lane: pwa', 'status: ready'] }),
      issue(2, { labels: ['lane: settings', 'status: ready'], dependsOn: '#1' }),
    ]);
    expect(labelChangesFor(board)).toEqual([
      { issueNumber: 2, add: 'status: blocked', remove: ['status: ready'] },
    ]);
  });

  it('takes ready and blocked off owner actions, decisions and later work', () => {
    const board = buildBoard([
      issue(1, { labels: ['owner action', 'status: ready'] }),
      issue(2, { labels: ['lane: job', 'status: needs decision', 'status: blocked'] }),
      issue(3, { labels: ['lane: job', 'later'] }),
    ]);
    expect(labelChangesFor(board)).toEqual([
      { issueNumber: 1, add: null, remove: ['status: ready'] },
      { issueNumber: 2, add: null, remove: ['status: blocked'] },
    ]);
  });

  it('leaves work in flight and correctly labelled issues alone', () => {
    const board = buildBoard([
      issue(1, { labels: ['lane: job', 'status: in progress'] }),
      issue(2, { labels: ['lane: settings', 'status: ready'] }),
    ]);
    expect(labelChangesFor(board)).toEqual([]);
  });
});
