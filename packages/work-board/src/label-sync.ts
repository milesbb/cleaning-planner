import type { Board, BoardEntry } from './board.ts';
import { STATUS } from './issues.ts';

export interface LabelChange {
  issueNumber: number;
  add: string | null;
  remove: string[];
}

const DERIVED_STATUSES: readonly string[] = [STATUS.ready, STATUS.blocked];

function wantedStatusOf(entry: BoardEntry): string | null {
  switch (entry.placement.kind) {
    case 'startNow':
    case 'waitingForLane':
      return STATUS.ready;
    case 'blocked':
      return STATUS.blocked;
    default:
      return null;
  }
}

function changeFor(entry: BoardEntry): LabelChange | null {
  const wanted = wantedStatusOf(entry);
  const remove = entry.issue.labels.filter(
    (label) => DERIVED_STATUSES.includes(label) && label !== wanted,
  );
  const add = wanted !== null && !entry.issue.labels.includes(wanted) ? wanted : null;
  if (add === null && remove.length === 0) return null;
  return { issueNumber: entry.issue.number, add, remove };
}

export function labelChangesFor(board: Board): LabelChange[] {
  return board.entries
    .filter((entry) => entry.placement.kind !== 'inFlight')
    .flatMap((entry) => {
      const change = changeFor(entry);
      return change === null ? [] : [change];
    });
}
