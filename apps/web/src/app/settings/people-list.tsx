import type { Member } from '@cleaning-planner/contracts/household';
import type { ReactNode } from 'react';
import { Avatar } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';

interface PeopleListProps {
  members: readonly Member[];
  myUserId: string;
}

// Everyone in a home, you marked "(you)" and the owner marked.
export function PeopleList({ members, myUserId }: PeopleListProps): ReactNode {
  return (
    <ul aria-label="People" className="flex flex-col gap-3">
      {members.map((member) => (
        <li key={member.userId} className="flex items-center gap-3">
          <Avatar name={member.name} colour={member.colour} />
          <span className="font-bold break-words">
            {member.userId === myUserId ? `${member.name} (you)` : member.name}
          </span>
          {member.role === 'owner' ? <Badge tone="owner">Owner</Badge> : null}
        </li>
      ))}
    </ul>
  );
}
