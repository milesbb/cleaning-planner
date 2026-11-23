import { describe, expect, it } from 'vitest';
import { buildBoard } from './board.ts';
import type { Board, Placement } from './board.ts';
import { issue } from './test-issues.ts';

function placementOf(board: Board, issueNumber: number): Placement | undefined {
  return board.entries.find((entry) => entry.issue.number === issueNumber)?.placement;
}

describe('buildBoard', () => {
  it('can start an issue whose lanes are free and that waits for nothing', () => {
    const board = buildBoard([issue(1, { labels: ['lane: settings'] })]);
    expect(placementOf(board, 1)).toEqual({ kind: 'startNow' });
  });

  it('shows claimed and reviewed work as in flight', () => {
    const board = buildBoard([
      issue(1, { labels: ['lane: settings', 'status: in progress'] }),
      issue(2, { labels: ['lane: job', 'status: in review'] }),
    ]);
    expect(placementOf(board, 1)).toEqual({ kind: 'inFlight' });
    expect(placementOf(board, 2)).toEqual({ kind: 'inFlight' });
  });

  it('holds back an issue that shares a lane with work in flight', () => {
    const board = buildBoard([
      issue(1, { labels: ['lane: settings', 'status: in progress'] }),
      issue(2, { labels: ['lane: settings', 'lane: ui-kit'] }),
    ]);
    expect(placementOf(board, 2)).toEqual({
      kind: 'waitingForLane',
      clashes: [{ lane: 'settings', heldBy: 1 }],
    });
  });

  it('lets issues in different lanes run side by side', () => {
    const board = buildBoard([
      issue(1, { labels: ['lane: settings', 'status: in progress'] }),
      issue(2, { labels: ['lane: job'] }),
    ]);
    expect(placementOf(board, 2)).toEqual({ kind: 'startNow' });
  });

  it('holds back everything while an everything-lane issue is in flight', () => {
    const board = buildBoard([
      issue(1, { labels: ['lane: everything', 'status: in progress'] }),
      issue(2, { labels: ['lane: job'] }),
    ]);
    expect(placementOf(board, 2)).toEqual({
      kind: 'waitingForLane',
      clashes: [{ lane: 'everything', heldBy: 1 }],
    });
  });

  it('holds back an everything-lane issue while anything is in flight', () => {
    const board = buildBoard([
      issue(1, { labels: ['lane: job', 'status: in progress'] }),
      issue(2, { labels: ['lane: everything'] }),
    ]);
    expect(placementOf(board, 2)).toEqual({
      kind: 'waitingForLane',
      clashes: [{ lane: 'job', heldBy: 1 }],
    });
  });

  it('blocks an issue until the issues it depends on are closed', () => {
    const board = buildBoard([
      issue(60, { labels: ['lane: pwa'] }),
      issue(64, { labels: ['lane: settings'], dependsOn: '#60 and #62' }),
    ]);
    expect(placementOf(board, 64)).toEqual({ kind: 'blocked', waitsFor: [60] });
  });

  it('treats a dependency that is no longer open as done', () => {
    const board = buildBoard([issue(64, { labels: ['lane: settings'], dependsOn: '#60' })]);
    expect(placementOf(board, 64)).toEqual({ kind: 'startNow' });
  });

  it('keeps owner actions, decisions and later work out of the start list', () => {
    const board = buildBoard([
      issue(1, { labels: ['owner action'] }),
      issue(2, { labels: ['lane: settings', 'status: needs decision'] }),
      issue(3, { labels: ['lane: ui-kit', 'later'] }),
    ]);
    expect(placementOf(board, 1)).toEqual({ kind: 'ownerAction' });
    expect(placementOf(board, 2)).toEqual({ kind: 'needsDecision' });
    expect(placementOf(board, 3)).toEqual({ kind: 'later' });
  });

  it('treats an issue with no lane as touching everything, and says so', () => {
    const board = buildBoard([
      issue(1, { labels: ['lane: job', 'status: in progress'] }),
      issue(2),
    ]);
    expect(placementOf(board, 2)).toEqual({
      kind: 'waitingForLane',
      clashes: [{ lane: 'job', heldBy: 1 }],
    });
    expect(board.problems).toContainEqual({
      issueNumber: 2,
      message: 'has no lane label, so it is treated as touching everything',
    });
  });

  it('reports two pieces of work in flight in the same lane', () => {
    const board = buildBoard([
      issue(1, { labels: ['lane: job', 'status: in progress'] }),
      issue(2, { labels: ['lane: job', 'status: in review'] }),
    ]);
    expect(board.problems).toContainEqual({
      issueNumber: 2,
      message: 'is in flight in lane job, which #1 already holds',
    });
  });

  it('does not ask owner actions for a lane', () => {
    expect(buildBoard([issue(1, { labels: ['owner action'] })]).problems).toEqual([]);
  });
});
