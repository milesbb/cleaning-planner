import type { Member } from '@cleaning-planner/contracts/household';
import type { Assignment } from '@cleaning-planner/schedule/types';
import { personLabel } from './job-wording';

// "Who does it" as radio choices: anyone, one person, or taking turns.

export interface AssigneeChoice {
  value: string;
  label: string;
}

const MEMBER_PREFIX = 'member:';

export function choiceFor(assignment: Assignment): string {
  if (assignment.kind === 'member') return `${MEMBER_PREFIX}${assignment.memberId}`;
  return assignment.kind;
}

export function assignmentFor(choice: string): Assignment {
  if (choice.startsWith(MEMBER_PREFIX)) {
    return { kind: 'member', memberId: choice.slice(MEMBER_PREFIX.length) };
  }
  return choice === 'takeTurns' ? { kind: 'takeTurns' } : { kind: 'anyone' };
}

export function assigneeChoices(members: readonly Member[], myUserId: string): AssigneeChoice[] {
  const meFirst = [...members].sort(
    (first, second) => Number(second.userId === myUserId) - Number(first.userId === myUserId),
  );
  const people = meFirst.map((member) => ({
    value: choiceFor({ kind: 'member', memberId: member.userId }),
    label: personLabel(members, myUserId, member.userId),
  }));
  const turns = members.length > 1 ? [{ value: 'takeTurns', label: 'Take turns' }] : [];
  return [{ value: 'anyone', label: 'Anyone' }, ...people, ...turns];
}
