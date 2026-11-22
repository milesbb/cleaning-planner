import type { JobIconKey } from '@cleaning-planner/schedule/library/types';
import Link from 'next/link';
import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { CheckIcon, ChevronRightIcon } from '../icons/interface-icons';
import { Badge } from '../ui/badge';
import { IconTile } from './icon-tile';

type DayJobState = 'toDo' | 'done' | 'late';

interface DayJob {
  name: string;
  icon: JobIconKey;
  state: DayJobState;
}

interface DayRowProps {
  weekday: string;
  dayOfMonth: number;
  jobs: readonly DayJob[];
  isToday?: boolean;
  href?: string;
}

const STATE_LABELS: Record<DayJobState, string> = {
  toDo: 'to do',
  done: 'done',
  late: 'late',
};

const ROW_CLASSES =
  'flex min-h-14 items-center gap-3 px-3 py-2.5 text-ink no-underline focus-visible:outline-3 focus-visible:-outline-offset-4 focus-visible:outline-ink';

function DayJobTile({ job }: { job: DayJob }): ReactNode {
  return (
    <span role="img" aria-label={`${job.name}, ${STATE_LABELS[job.state]}`}>
      {job.state === 'done' ? (
        <span className="flex size-8.5 items-center justify-center rounded-[0.5625rem] border-2 border-ink bg-done">
          <CheckIcon size={20} strokeWidth={3} />
        </span>
      ) : (
        <IconTile
          icon={job.icon}
          size="small"
          colourClass={job.state === 'late' ? 'bg-late' : 'bg-card'}
        />
      )}
    </span>
  );
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

function DayContent({ weekday, dayOfMonth, jobs, isToday }: Omit<DayRowProps, 'href'>): ReactNode {
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
              <DayJobTile key={`${job.name}-${String(position)}`} job={job} />
            ))}
          </span>
          <DayProgress jobs={jobs} />
        </>
      )}
    </>
  );
}

export function DayRow({ href, ...day }: DayRowProps): ReactNode {
  const classes = cn(ROW_CLASSES, { 'bg-kitchen': day.isToday === true });
  if (href === undefined)
    return (
      <div className={classes}>
        <DayContent {...day} />
      </div>
    );
  return (
    <Link href={href} aria-current={day.isToday === true ? 'date' : undefined} className={classes}>
      <DayContent {...day} />
      <ChevronRightIcon size={20} />
    </Link>
  );
}
