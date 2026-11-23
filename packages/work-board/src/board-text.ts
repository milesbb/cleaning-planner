import type { Board, BoardEntry, Placement } from './board.ts';
import { clashText, issueList } from './claim.ts';
import { sizeOf, STATUS } from './issues.ts';
import { labelChangesFor } from './label-sync.ts';

const SECTIONS: readonly { kind: Placement['kind']; heading: string }[] = [
  { kind: 'inFlight', heading: 'IN FLIGHT' },
  { kind: 'startNow', heading: 'START NOW' },
  { kind: 'waitingForLane', heading: 'READY, BUT WOULD CLASH WITH WORK IN FLIGHT' },
  { kind: 'blocked', heading: 'BLOCKED' },
  { kind: 'needsDecision', heading: 'NEEDS A DECISION FROM THE OWNER' },
  { kind: 'ownerAction', heading: 'WAITING ON THE OWNER' },
  { kind: 'later', heading: 'LATER' },
];

function noteFor(entry: BoardEntry): string {
  const { placement } = entry;
  if (placement.kind === 'waitingForLane') return ` (${clashText(placement.clashes)})`;
  if (placement.kind === 'blocked') return ` (waits for ${issueList(placement.waitsFor)})`;
  if (placement.kind === 'inFlight') {
    return entry.issue.labels.includes(STATUS.inReview) ? ' (in review)' : ' (in progress)';
  }
  return '';
}

function entryLine(entry: BoardEntry): string {
  const lanes = entry.lanes.length > 0 ? ` [${entry.lanes.join(', ')}]` : '';
  const size = sizeOf(entry.issue);
  const sizeText = size === null ? '' : ` ${size}`;
  return `  #${String(entry.issue.number)} ${entry.issue.title}${lanes}${sizeText}${noteFor(entry)}`;
}

function sectionText(heading: string, lines: readonly string[]): string | null {
  if (lines.length === 0) return null;
  return `${heading} (${String(lines.length)})\n${lines.join('\n')}`;
}

function labelNote(board: Board): string | null {
  const outOfDate = labelChangesFor(board).length;
  if (outOfDate === 0) return null;
  const labels = outOfDate === 1 ? 'status label is' : 'status labels are';
  return `${String(outOfDate)} ${labels} out of date: run \`npm run work:board -- --sync-labels\`.`;
}

export function boardText(board: Board): string {
  const sections = SECTIONS.map(({ kind, heading }) =>
    sectionText(
      heading,
      board.entries.filter((entry) => entry.placement.kind === kind).map(entryLine),
    ),
  );
  const problems = sectionText(
    'PROBLEMS',
    board.problems.map((problem) => `  #${String(problem.issueNumber)} ${problem.message}`),
  );
  return [...sections, problems, labelNote(board)].filter((part) => part !== null).join('\n\n');
}
