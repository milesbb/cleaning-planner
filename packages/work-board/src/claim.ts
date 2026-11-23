import type { Board, LaneClash, Placement } from './board.ts';

export function issueList(numbers: readonly number[]): string {
  return numbers.map((issueNumber) => `#${String(issueNumber)}`).join(', ');
}

export function clashText(clashes: readonly LaneClash[]): string {
  return clashes
    .map((clash) => `lane ${clash.lane} is held by #${String(clash.heldBy)}`)
    .join(', ');
}

function reasonFor(placement: Placement): string | null {
  switch (placement.kind) {
    case 'startNow':
      return null;
    case 'inFlight':
      return 'is already in flight.';
    case 'waitingForLane':
      return `would clash: ${clashText(placement.clashes)}.`;
    case 'blocked':
      return `waits for ${issueList(placement.waitsFor)} to be merged.`;
    case 'ownerAction':
      return 'is for the owner to do.';
    case 'needsDecision':
      return 'needs a decision from the owner first.';
    case 'later':
      return 'is planned for later.';
  }
}

export function reasonNotToClaim(board: Board, issueNumber: number): string | null {
  const entry = board.entries.find((candidate) => candidate.issue.number === issueNumber);
  if (entry === undefined) return `#${String(issueNumber)} is not an open issue.`;
  const reason = reasonFor(entry.placement);
  return reason === null ? null : `#${String(issueNumber)} ${reason}`;
}
