export interface Issue {
  number: number;
  title: string;
  labels: readonly string[];
  body: string;
}

export const STATUS = {
  ready: 'status: ready',
  blocked: 'status: blocked',
  inProgress: 'status: in progress',
  inReview: 'status: in review',
  needsDecision: 'status: needs decision',
} as const;

export const OWNER_ACTION = 'owner action';
export const LATER = 'later';
export const EVERY_LANE = 'everything';

const LANE_PREFIX = 'lane: ';
const SIZE_PREFIX = 'size: ';
const DEPENDS_ON_LINE = /depends on/i;
const ISSUE_REFERENCE = /#(\d+)/g;

export function lanesOf(issue: Issue): string[] {
  return issue.labels
    .filter((label) => label.startsWith(LANE_PREFIX))
    .map((label) => label.slice(LANE_PREFIX.length));
}

export function dependenciesOf(issue: Issue): number[] {
  const dependsOnLine = issue.body.split('\n').find((line) => DEPENDS_ON_LINE.test(line));
  if (dependsOnLine === undefined) return [];
  return [...dependsOnLine.matchAll(ISSUE_REFERENCE)].map((reference) => Number(reference[1]));
}

export function isInFlight(issue: Issue): boolean {
  return issue.labels.includes(STATUS.inProgress) || issue.labels.includes(STATUS.inReview);
}

export function sizeOf(issue: Issue): string | null {
  const sizeLabel = issue.labels.find((label) => label.startsWith(SIZE_PREFIX));
  return sizeLabel === undefined ? null : sizeLabel.slice(SIZE_PREFIX.length);
}
