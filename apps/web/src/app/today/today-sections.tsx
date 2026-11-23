'use client';

import type { Member } from '@cleaning-planner/contracts/household';
import type { ReactNode } from 'react';
import { ArtFrame } from '@/components/art/art-frame';
import { JobRow } from '@/components/jobs/job-row';
import { SectionHeading } from '@/components/ui/section-heading';
import type { DoneJob, LateJob, TodayJob } from './today-view';
import type { JobProgress } from './use-job-progress';

function assigneeProps(job: TodayJob): { assignee?: Member } {
  return job.assignee === null ? {} : { assignee: job.assignee };
}

interface JobListProps {
  title: string;
  children: ReactNode;
}

function JobList({ title, children }: JobListProps): ReactNode {
  return (
    <section aria-label={title} className="flex flex-col gap-2.5">
      <SectionHeading>{title}</SectionHeading>
      {children}
    </section>
  );
}

interface DueListProps {
  title: string;
  jobs: readonly (TodayJob | LateJob)[];
  progress: JobProgress;
}

export function DueList({ title, jobs, progress }: DueListProps): ReactNode {
  if (jobs.length === 0) return null;
  return (
    <JobList title={title}>
      {jobs.map((job) => (
        <JobRow
          key={job.jobId}
          name={job.name}
          room={job.room}
          icon={job.icon}
          meta={job.meta}
          {...assigneeProps(job)}
          status={{
            kind: 'due',
            ...('lateBy' in job ? { lateBy: job.lateBy } : {}),
            onDone: () => {
              progress.markDone(job.jobId);
            },
          }}
        />
      ))}
    </JobList>
  );
}

export function DoneList({
  jobs,
  progress,
}: {
  jobs: readonly DoneJob[];
  progress: JobProgress;
}): ReactNode {
  if (jobs.length === 0) return null;
  return (
    <JobList title="Done today">
      {jobs.map((job) => (
        <JobRow
          key={job.jobId}
          name={job.name}
          room={job.room}
          icon={job.icon}
          meta={job.meta}
          status={{
            kind: 'done',
            doneBy: job.doneBy,
            onUndo: () => {
              progress.undo(job.jobId);
            },
          }}
        />
      ))}
    </JobList>
  );
}

export function TomorrowList({ jobs }: { jobs: readonly TodayJob[] }): ReactNode {
  if (jobs.length === 0) return null;
  return (
    <JobList title="Tomorrow">
      {jobs.map((job) => (
        <JobRow
          key={job.jobId}
          name={job.name}
          room={job.room}
          icon={job.icon}
          meta={job.meta}
          {...assigneeProps(job)}
          status={{ kind: 'upcoming' }}
        />
      ))}
    </JobList>
  );
}

export function AllDone({ firstTomorrow }: { firstTomorrow: TodayJob | undefined }): ReactNode {
  return (
    <section aria-label="All done" className="flex flex-col gap-3">
      <ArtFrame artKey="allDone" alt="" className="max-w-md" />
      <h2 className="font-display text-2xl font-extrabold">All done for today</h2>
      <p className="text-[1.0625rem] leading-relaxed">
        {firstTomorrow === undefined
          ? 'Nothing is due tomorrow either.'
          : `First up tomorrow: ${firstTomorrow.name}.`}
      </p>
    </section>
  );
}
