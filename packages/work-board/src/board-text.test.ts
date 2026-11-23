import { describe, expect, it } from 'vitest';
import { buildBoard } from './board.ts';
import { boardText } from './board-text.ts';
import { issue } from './test-issues.ts';

describe('boardText', () => {
  it('lists each section with its issues, lanes and size', () => {
    const board = buildBoard([
      issue(51, {
        title: 'Your account',
        labels: ['lane: settings', 'status: in progress', 'size: M'],
      }),
      issue(97, { title: 'Legal pages', labels: ['lane: legal-pages', 'size: S'] }),
      issue(53, { title: 'Delete account', labels: ['lane: settings'] }),
      issue(64, { title: 'Reminders', labels: ['lane: settings'], dependsOn: '#97' }),
      issue(85, { title: 'Owner: name', labels: ['owner action'] }),
    ]);
    const text = boardText(board);
    expect(text).toContain('IN FLIGHT (1)\n  #51 Your account [settings] M (in progress)');
    expect(text).toContain('START NOW (1)\n  #97 Legal pages [legal-pages] S');
    expect(text).toContain(
      'READY, BUT WOULD CLASH WITH WORK IN FLIGHT (1)\n  #53 Delete account [settings] (lane settings is held by #51)',
    );
    expect(text).toContain('BLOCKED (1)\n  #64 Reminders [settings] (waits for #97)');
    expect(text).toContain('WAITING ON THE OWNER (1)\n  #85 Owner: name');
  });

  it('says when work in flight has a PR open', () => {
    const board = buildBoard([
      issue(5, { title: 'Pages', labels: ['lane: legal-pages', 'status: in review'] }),
    ]);
    expect(boardText(board)).toContain('#5 Pages [legal-pages] (in review)');
  });

  it('counts several out-of-date labels', () => {
    const board = buildBoard([
      issue(1, { labels: ['lane: job'] }),
      issue(2, { labels: ['lane: settings'] }),
    ]);
    expect(boardText(board)).toContain('2 status labels are out of date');
  });

  it('leaves out empty sections', () => {
    const text = boardText(buildBoard([issue(1, { title: 'Only one', labels: ['lane: job'] })]));
    expect(text).not.toContain('IN FLIGHT');
    expect(text).not.toContain('BLOCKED');
  });

  it('lists problems and how many labels are out of date', () => {
    const board = buildBoard([issue(2, { title: 'No lane', labels: ['status: blocked'] })]);
    const text = boardText(board);
    expect(text).toContain(
      'PROBLEMS (1)\n  #2 has no lane label, so it is treated as touching everything',
    );
    expect(text).toContain(
      '1 status label is out of date: run `npm run work:board -- --sync-labels`.',
    );
  });
});
