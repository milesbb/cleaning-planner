import { describe, expect, it } from 'vitest';
import { TODAY_FIXTURE } from '@/app/today/today-fixture';
import { assigneeChoices, assignmentFor, choiceFor } from './assignee-choices';

describe('assigneeChoices', () => {
  it('offers anyone, each person (you first) and taking turns', () => {
    expect(assigneeChoices(TODAY_FIXTURE.members, 'user-alex')).toEqual([
      { value: 'anyone', label: 'Anyone' },
      { value: 'member:user-alex', label: 'You' },
      { value: 'member:user-sam', label: 'Sam' },
      { value: 'takeTurns', label: 'Take turns' },
    ]);
  });

  it('leaves out taking turns when there is no one to take turns with', () => {
    const justMe = TODAY_FIXTURE.members.filter((member) => member.userId === 'user-alex');
    expect(assigneeChoices(justMe, 'user-alex').map((choice) => choice.value)).toEqual([
      'anyone',
      'member:user-alex',
    ]);
  });
});

describe('choiceFor and assignmentFor', () => {
  it.each([
    [{ kind: 'anyone' } as const, 'anyone'],
    [{ kind: 'takeTurns' } as const, 'takeTurns'],
    [{ kind: 'member', memberId: 'user-sam' } as const, 'member:user-sam'],
  ])('turns %o into the choice %s and back', (assignment, choice) => {
    expect(choiceFor(assignment)).toBe(choice);
    expect(assignmentFor(choice)).toEqual(assignment);
  });
});
