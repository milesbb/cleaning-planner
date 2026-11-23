import {
  dependenciesOf,
  EVERY_LANE,
  isInFlight,
  lanesOf,
  LATER,
  OWNER_ACTION,
  STATUS,
} from './issues.ts';
import type { Issue } from './issues.ts';

export interface LaneClash {
  lane: string;
  heldBy: number;
}

export type Placement =
  | { kind: 'inFlight' }
  | { kind: 'startNow' }
  | { kind: 'waitingForLane'; clashes: LaneClash[] }
  | { kind: 'blocked'; waitsFor: number[] }
  | { kind: 'needsDecision' }
  | { kind: 'ownerAction' }
  | { kind: 'later' };

export interface BoardEntry {
  issue: Issue;
  lanes: string[];
  placement: Placement;
}

interface Problem {
  issueNumber: number;
  message: string;
}

export interface Board {
  entries: BoardEntry[];
  problems: Problem[];
}

type LaneHolders = Map<string, number>;

function effectiveLanesOf(issue: Issue): string[] {
  const lanes = lanesOf(issue);
  return lanes.length === 0 ? [EVERY_LANE] : lanes;
}

function needsALane(issue: Issue): boolean {
  return !issue.labels.includes(OWNER_ACTION);
}

function holdLanes(inFlightIssues: readonly Issue[], problems: Problem[]): LaneHolders {
  const holders: LaneHolders = new Map();
  for (const issue of inFlightIssues) {
    for (const lane of effectiveLanesOf(issue)) {
      const holder = holders.get(lane);
      if (holder === undefined) {
        holders.set(lane, issue.number);
      } else {
        problems.push({
          issueNumber: issue.number,
          message: `is in flight in lane ${lane}, which #${String(holder)} already holds`,
        });
      }
    }
  }
  return holders;
}

function clashesFor(lanes: readonly string[], holders: LaneHolders): LaneClash[] {
  const everythingHolder = holders.get(EVERY_LANE);
  if (everythingHolder !== undefined) return [{ lane: EVERY_LANE, heldBy: everythingHolder }];
  if (lanes.includes(EVERY_LANE)) {
    return [...holders].map(([lane, heldBy]) => ({ lane, heldBy }));
  }
  return lanes.flatMap((lane) => {
    const heldBy = holders.get(lane);
    return heldBy === undefined ? [] : [{ lane, heldBy }];
  });
}

function placementOf(
  issue: Issue,
  openNumbers: ReadonlySet<number>,
  holders: LaneHolders,
): Placement {
  if (isInFlight(issue)) return { kind: 'inFlight' };
  if (issue.labels.includes(OWNER_ACTION)) return { kind: 'ownerAction' };
  if (issue.labels.includes(LATER)) return { kind: 'later' };
  if (issue.labels.includes(STATUS.needsDecision)) return { kind: 'needsDecision' };
  const waitsFor = dependenciesOf(issue).filter((dependency) => openNumbers.has(dependency));
  if (waitsFor.length > 0) return { kind: 'blocked', waitsFor };
  const clashes = clashesFor(effectiveLanesOf(issue), holders);
  return clashes.length > 0 ? { kind: 'waitingForLane', clashes } : { kind: 'startNow' };
}

export function buildBoard(openIssues: readonly Issue[]): Board {
  const problems: Problem[] = [];
  const holders = holdLanes(openIssues.filter(isInFlight), problems);
  const openNumbers = new Set(openIssues.map((issue) => issue.number));
  for (const issue of openIssues) {
    if (needsALane(issue) && lanesOf(issue).length === 0) {
      problems.push({
        issueNumber: issue.number,
        message: 'has no lane label, so it is treated as touching everything',
      });
    }
  }
  const entries = openIssues.map((issue) => ({
    issue,
    lanes: lanesOf(issue),
    placement: placementOf(issue, openNumbers, holders),
  }));
  return { entries, problems };
}
