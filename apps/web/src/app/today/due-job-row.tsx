'use client';

import { lazy } from 'react';
import type { ReactNode } from 'react';
import { MoreIcon, SkipIcon, SnoozeIcon } from '@/components/icons/interface-icons';
import { JobRow } from '@/components/jobs/job-row';
import { SwipeActions } from '@/components/jobs/swipe-actions';
import { IconButton } from '@/components/ui/icon-button';
import { jobHref } from '@/lib/home/job-href';
import { LazySheet } from '@/lib/lazy-sheet';
import type { LateJob, TodayJob } from './today-view';
import type { JobProgress } from './use-job-progress';

const JobChoicesSheet = lazy(async () => ({
  default: (await import('./job-choices-sheet')).JobChoicesSheet,
}));

const ACTION_ICON_SIZE = 20;

interface DueJobRowProps {
  job: TodayJob | LateJob;
  progress: JobProgress;
}

interface JobChoices {
  snoozeADay: () => void;
  skip: () => void;
}

function MoreButton({ job, choices }: { job: TodayJob; choices: JobChoices }): ReactNode {
  return (
    <LazySheet
      trigger={(triggerProps) => (
        <IconButton label={`More for ${job.name}`} icon={<MoreIcon />} {...triggerProps} />
      )}
      sheet={(opening) => (
        <JobChoicesSheet
          {...opening}
          jobName={job.name}
          onSnoozeADay={choices.snoozeADay}
          onSkip={choices.skip}
        />
      )}
    />
  );
}

// A job still to do: tick it, or put it off by swiping on touch or with More.
export function DueJobRow({ job, progress }: DueJobRowProps): ReactNode {
  const choices: JobChoices = {
    snoozeADay: () => {
      progress.snoozeADay(job.jobId);
    },
    skip: () => {
      progress.skip(job.jobId);
    },
  };
  return (
    <SwipeActions
      actions={[
        {
          label: 'Snooze a day',
          icon: <SnoozeIcon size={ACTION_ICON_SIZE} />,
          onSelect: choices.snoozeADay,
        },
        { label: 'Skip', icon: <SkipIcon size={ACTION_ICON_SIZE} />, onSelect: choices.skip },
      ]}
    >
      <JobRow
        name={job.name}
        room={job.room}
        icon={job.icon}
        meta={job.meta}
        href={jobHref(job.jobId)}
        {...(job.assignee === null ? {} : { assignee: job.assignee })}
        more={<MoreButton job={job} choices={choices} />}
        status={{
          kind: 'due',
          ...('lateBy' in job ? { lateBy: job.lateBy } : {}),
          onDone: () => {
            progress.markDone(job.jobId);
          },
        }}
      />
    </SwipeActions>
  );
}
