import type { Assignment, Completion } from './types';

function lastDoneByCurrentMember(
  completions: readonly Completion[],
  memberIds: readonly string[],
): string | null {
  const doneByCurrentMembers = completions
    .filter((completion) => completion.outcome === 'done')
    .filter((completion) => memberIds.includes(completion.completedBy))
    .sort((first, second) => second.completedOn.localeCompare(first.completedOn));
  return doneByCurrentMembers[0]?.completedBy ?? null;
}

function nextInTurn(
  completions: readonly Completion[],
  memberIds: readonly string[],
): string | null {
  const lastMember = lastDoneByCurrentMember(completions, memberIds);
  const nextIndex =
    lastMember === null ? 0 : (memberIds.indexOf(lastMember) + 1) % memberIds.length;
  return memberIds[nextIndex] ?? null;
}

export function whoseTurn(
  assignment: Assignment,
  completions: readonly Completion[],
  memberIds: readonly string[],
): string | null {
  if (assignment.kind === 'anyone') return null;
  if (assignment.kind === 'member') {
    return memberIds.includes(assignment.memberId) ? assignment.memberId : null;
  }
  return nextInTurn(completions, memberIds);
}
