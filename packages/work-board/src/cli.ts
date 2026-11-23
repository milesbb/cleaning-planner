import { buildBoard } from './board.ts';
import type { Board } from './board.ts';
import { boardText } from './board-text.ts';
import { reasonNotToClaim } from './claim.ts';
import { changeLabels, commentOn, readOpenIssues } from './github.ts';
import { lanesOf, STATUS } from './issues.ts';
import { labelChangesFor } from './label-sync.ts';

const USAGE = `Usage (from the repo root):
  npm run work:board                                  show what's in flight, what can start and what's blocked
  npm run work:board -- --sync-labels                 set status: ready / status: blocked from the dependencies
  npm run work:board -- claim <issue> <who> <branch>  take an issue that can start now
  npm run work:board -- review <issue>                say its PR is open
  npm run work:board -- unclaim <issue>               give an issue back without finishing it`;

function print(text: string): void {
  process.stdout.write(`${text}\n`);
}

function stop(text: string): never {
  process.stderr.write(`${text}\n`);
  process.exit(1);
}

function currentBoard(): Board {
  return buildBoard(readOpenIssues());
}

function labelsOf(board: Board, issueNumber: number): readonly string[] {
  return board.entries.find((entry) => entry.issue.number === issueNumber)?.issue.labels ?? [];
}

function present(labels: readonly string[], wanted: readonly string[]): string[] {
  return wanted.filter((label) => labels.includes(label));
}

function syncLabels(): void {
  for (const change of labelChangesFor(currentBoard())) {
    changeLabels(change.issueNumber, change.add === null ? [] : [change.add], change.remove);
    print(`#${String(change.issueNumber)}: now ${change.add ?? 'without a ready/blocked label'}`);
  }
}

function lostTheRace(issueNumber: number): string | null {
  const clash = currentBoard().problems.find(
    (problem) => problem.issueNumber === issueNumber && problem.message.startsWith('is in flight'),
  );
  return clash?.message ?? null;
}

function claim(issueNumber: number, claimant: string, branch: string): void {
  const board = currentBoard();
  const reason = reasonNotToClaim(board, issueNumber);
  if (reason !== null) stop(`Can't claim: ${reason}`);
  const labels = labelsOf(board, issueNumber);
  changeLabels(issueNumber, [STATUS.inProgress], present(labels, [STATUS.ready, STATUS.blocked]));
  const clash = lostTheRace(issueNumber);
  if (clash !== null) {
    changeLabels(issueNumber, [STATUS.ready], [STATUS.inProgress]);
    stop(`Someone claimed a clashing issue at the same moment: #${String(issueNumber)} ${clash}.`);
  }
  const lanes = lanesOf({ number: issueNumber, title: '', body: '', labels }).join(', ');
  commentOn(issueNumber, `Claimed by ${claimant} on \`${branch}\`. Lanes held: ${lanes}.`);
  print(`Claimed #${String(issueNumber)}. Lanes held: ${lanes}.`);
}

function markInReview(issueNumber: number): void {
  changeLabels(issueNumber, [STATUS.inReview], [STATUS.inProgress]);
  print(`#${String(issueNumber)} is in review; its lanes stay held until it merges.`);
}

function unclaim(issueNumber: number): void {
  const labels = labelsOf(currentBoard(), issueNumber);
  changeLabels(issueNumber, [STATUS.ready], present(labels, [STATUS.inProgress, STATUS.inReview]));
  commentOn(issueNumber, 'Given back unfinished; anyone can claim it again.');
  print(`#${String(issueNumber)} is free again.`);
}

function issueNumberFrom(text: string | undefined): number {
  const issueNumber = Number(text?.replace('#', ''));
  if (!Number.isInteger(issueNumber) || issueNumber <= 0) stop(USAGE);
  return issueNumber;
}

function runCommand(command: string, details: readonly (string | undefined)[]): void {
  const [issueText, claimant, branch] = details;
  if (command === 'claim' && claimant !== undefined && branch !== undefined) {
    claim(issueNumberFrom(issueText), claimant, branch);
  } else if (command === 'review') {
    markInReview(issueNumberFrom(issueText));
  } else if (command === 'unclaim') {
    unclaim(issueNumberFrom(issueText));
  } else {
    stop(USAGE);
  }
}

function run(args: readonly string[]): void {
  const [command, ...details] = args;
  if (command === undefined || command === '--sync-labels') {
    if (command === '--sync-labels') syncLabels();
    print(boardText(currentBoard()));
    return;
  }
  runCommand(command, details);
}

run(process.argv.slice(2));
