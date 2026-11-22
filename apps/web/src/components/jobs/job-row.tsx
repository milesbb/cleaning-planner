import type { JobIconKey, RoomType } from '@cleaning-planner/schedule/library/types';
import Link from 'next/link';
import type { ReactNode } from 'react';
import { ROOM_APPEARANCE } from '@/lib/rooms';
import { cn } from '@/lib/utils';
import { CheckIcon } from '../icons/interface-icons';
import { Avatar } from '../ui/avatar';
import type { PersonColour } from '../ui/avatar';
import { Badge } from '../ui/badge';
import { IconTile } from './icon-tile';

type JobRowStatus =
  | { kind: 'due'; lateBy?: string; onDone: () => void }
  | { kind: 'done'; doneBy: string; doneAt: string; nextDue?: string; onUndo: () => void }
  | { kind: 'upcoming' };

interface Assignee {
  name: string;
  colour: PersonColour;
}

interface JobRowProps {
  name: string;
  room: RoomType;
  icon: JobIconKey;
  meta: string;
  href: string;
  assignee?: Assignee;
  status: JobRowStatus;
}

const ROW_CLASSES: Record<JobRowStatus['kind'], string> = {
  due: 'bg-card shadow-hard',
  done: 'bg-done-soft',
  upcoming: 'border-dashed bg-card',
};

const ROW_BUTTON_CLASSES =
  'flex size-11.5 shrink-0 items-center justify-center rounded-control border-2 border-ink text-ink transition-transform motion-reduce:transition-none focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-ink active:translate-x-0.5 active:translate-y-0.5';

function metaLine(meta: string, status: JobRowStatus): string {
  if (status.kind !== 'done') return meta;
  const doneLine = `Done by ${status.doneBy} at ${status.doneAt}`;
  return status.nextDue === undefined ? doneLine : `${doneLine} · next ${status.nextDue}`;
}

interface JobSummaryProps {
  name: string;
  room: RoomType;
  icon: JobIconKey;
  meta: string;
  assignee: Assignee | undefined;
  status: JobRowStatus;
}

function JobSummary({ name, room, icon, meta, assignee, status }: JobSummaryProps): ReactNode {
  return (
    <>
      <IconTile icon={icon} colourClass={ROOM_APPEARANCE[room].colourClass}>
        {assignee === undefined ? null : (
          <Avatar
            name={assignee.name}
            colour={assignee.colour}
            size="small"
            className="absolute -right-2 -bottom-2"
          />
        )}
      </IconTile>
      <span className="flex min-w-0 flex-col gap-0.5">
        <span
          className={cn('text-[1.0625rem] font-bold break-words', {
            'line-through': status.kind === 'done',
          })}
        >
          {name}
        </span>
        <span className="text-sm">{metaLine(meta, status)}</span>
        {status.kind === 'due' && status.lateBy !== undefined ? (
          <Badge tone="late" className="self-start text-xs">
            {status.lateBy}
          </Badge>
        ) : null}
      </span>
    </>
  );
}

function RowAction({ name, status }: { name: string; status: JobRowStatus }): ReactNode {
  if (status.kind === 'upcoming') return null;
  if (status.kind === 'done') {
    return (
      <button
        type="button"
        aria-label={`Undo ${name}`}
        onClick={status.onUndo}
        className={cn(ROW_BUTTON_CLASSES, 'bg-done')}
      >
        <CheckIcon strokeWidth={3} />
      </button>
    );
  }
  return (
    <button
      type="button"
      aria-label={`Mark ${name} as done`}
      onClick={status.onDone}
      className={cn(ROW_BUTTON_CLASSES, 'bg-card')}
    >
      <CheckIcon strokeWidth={3} />
    </button>
  );
}

export function JobRow({ href, assignee, ...summary }: JobRowProps): ReactNode {
  const { name, status } = summary;
  const summaryContent = <JobSummary {...summary} assignee={assignee} />;
  return (
    <div
      className={cn(
        'flex items-center gap-3 rounded-card border-2 border-ink p-3 text-ink',
        ROW_CLASSES[status.kind],
      )}
    >
      {status.kind === 'done' ? (
        <div className="flex min-w-0 grow items-center gap-3">{summaryContent}</div>
      ) : (
        <Link
          href={href}
          className="flex min-w-0 grow items-center gap-3 rounded-control text-ink no-underline focus-visible:outline-3 focus-visible:outline-offset-4 focus-visible:outline-ink"
        >
          {summaryContent}
        </Link>
      )}
      <RowAction name={name} status={status} />
    </div>
  );
}
