import type { JobIconKey } from '@cleaning-planner/schedule/library/types';
import Link from 'next/link';
import type { ButtonHTMLAttributes, DragEvent, HTMLAttributes, ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { CheckIcon, ChevronRightIcon } from '../icons/interface-icons';
import { Badge } from '../ui/badge';
import { IconTile } from './icon-tile';

type DayJobState = 'toDo' | 'done' | 'late';

export interface JobDrag {
  onStart: () => void;
  onEnd: () => void;
}

interface DayJob {
  name: string;
  icon: JobIconKey;
  state: DayJobState;
  effortMinutes: number;
  // Given when the job can be moved to another day; the tile becomes a button.
  onMove?: () => void;
  // Given as well where a mouse can drag the job to another day.
  drag?: JobDrag;
}

const MINUTES_PER_HOUR = 60;

interface DayRowProps {
  weekday: string;
  dayOfMonth: number;
  jobs: readonly DayJob[];
  isToday?: boolean;
  href?: string;
  // Given while a job is being dragged and this day can take it.
  onDrop?: () => void;
}

const STATE_LABELS: Record<DayJobState, string> = {
  toDo: 'to do',
  done: 'done',
  late: 'late',
};

const ROW_CLASSES =
  'flex min-h-14 items-center gap-3 px-3 py-2.5 text-ink no-underline focus-visible:outline-3 focus-visible:-outline-offset-4 focus-visible:outline-ink';

function DayJobPicture({ job }: { job: DayJob }): ReactNode {
  if (job.state === 'done') {
    return (
      <span className="flex size-8.5 items-center justify-center rounded-[0.5625rem] border-2 border-ink bg-done">
        <CheckIcon size={20} strokeWidth={3} />
      </span>
    );
  }
  return (
    <IconTile
      icon={job.icon}
      size="small"
      colourClass={job.state === 'late' ? 'bg-late' : 'bg-card'}
    />
  );
}

function dragProps(job: DayJob): ButtonHTMLAttributes<HTMLButtonElement> {
  const { drag } = job;
  if (drag === undefined) return {};
  return {
    draggable: true,
    onDragStart: (event): void => {
      event.dataTransfer.effectAllowed = 'move';
      // Firefox only starts a drag that carries some data.
      event.dataTransfer.setData('text/plain', job.name);
      drag.onStart();
    },
    onDragEnd: drag.onEnd,
  };
}

function DayJobTile({ job, canTap }: { job: DayJob; canTap: boolean }): ReactNode {
  const name = `${job.name}, ${STATE_LABELS[job.state]}`;
  if (!canTap || job.onMove === undefined) {
    return (
      <span role="img" aria-label={name}>
        <DayJobPicture job={job} />
      </span>
    );
  }
  return (
    <button
      type="button"
      aria-label={`Move ${name}`}
      onClick={job.onMove}
      {...dragProps(job)}
      className="flex size-11 items-center justify-center rounded-control focus-visible:outline-3 focus-visible:outline-ink"
    >
      <DayJobPicture job={job} />
    </button>
  );
}

// "about 1 hr 30 min": short enough for a day row on a small phone.
function loadText(minutes: number): string {
  const hours = Math.floor(minutes / MINUTES_PER_HOUR);
  const leftOver = minutes % MINUTES_PER_HOUR;
  const parts = [
    ...(hours > 0 ? [`${String(hours)} hr`] : []),
    ...(leftOver > 0 ? [`${String(leftOver)} min`] : []),
  ];
  return `about ${parts.join(' ')}`;
}

// Busy days stay calm: how long is said in words, never shown in warning colours.
function DayLoad({ jobs }: { jobs: readonly DayJob[] }): ReactNode {
  const minutesLeft = jobs
    .filter((job) => job.state !== 'done')
    .reduce((total, job) => total + job.effortMinutes, 0);
  if (minutesLeft === 0) return null;
  return <span className="text-xs">{loadText(minutesLeft)}</span>;
}

function DayProgress({ jobs }: { jobs: readonly DayJob[] }): ReactNode {
  const lateCount = jobs.filter((job) => job.state === 'late').length;
  if (lateCount > 0) {
    return (
      <Badge tone="late" className="text-xs">
        {`${String(lateCount)} late`}
      </Badge>
    );
  }
  const doneCount = jobs.filter((job) => job.state === 'done').length;
  return (
    <span className="text-sm font-bold">{`${String(doneCount)} of ${String(jobs.length)}`}</span>
  );
}

function dropProps(onDrop: (() => void) | undefined): HTMLAttributes<HTMLDivElement> {
  if (onDrop === undefined) return {};
  const takeMove = (event: DragEvent<HTMLDivElement>): void => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  };
  return {
    onDragOver: takeMove,
    onDragEnter: takeMove,
    onDrop: (event): void => {
      event.preventDefault();
      onDrop();
    },
  };
}

interface DayContentProps extends Omit<DayRowProps, 'href' | 'onDrop'> {
  canTapJobs: boolean;
}

function DayContent({
  weekday,
  dayOfMonth,
  jobs,
  isToday,
  canTapJobs,
}: DayContentProps): ReactNode {
  return (
    <>
      <span className="flex w-11 shrink-0 flex-col items-center">
        <span className="text-xs font-bold uppercase">{isToday === true ? 'Today' : weekday}</span>{' '}
        <span className="font-display text-[1.375rem] font-extrabold">{dayOfMonth}</span>
      </span>
      {jobs.length === 0 ? (
        <span className="grow text-[0.9375rem]">Nothing planned</span>
      ) : (
        <>
          <span className="flex grow flex-wrap gap-1.5">
            {jobs.map((job, position) => (
              <DayJobTile key={`${job.name}-${String(position)}`} job={job} canTap={canTapJobs} />
            ))}
          </span>
          <span className="flex shrink-0 flex-col items-end gap-0.5 text-right">
            <DayProgress jobs={jobs} />
            <DayLoad jobs={jobs} />
          </span>
        </>
      )}
    </>
  );
}

export function DayRow({ href, onDrop, ...day }: DayRowProps): ReactNode {
  const classes = cn(ROW_CLASSES, {
    'bg-kitchen': day.isToday === true,
    'outline-3 -outline-offset-4 outline-ink outline-dashed': onDrop !== undefined,
  });
  if (href === undefined)
    return (
      <div className={classes} {...dropProps(onDrop)}>
        <DayContent {...day} canTapJobs />
      </div>
    );
  return (
    <Link href={href} aria-current={day.isToday === true ? 'date' : undefined} className={classes}>
      <DayContent {...day} canTapJobs={false} />
      <ChevronRightIcon size={20} />
    </Link>
  );
}
