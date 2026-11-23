'use client';

import type { CompletionRecord } from '@cleaning-planner/contracts/completion';
import type { CalendarDate } from '@cleaning-planner/schedule/calendar-date';
import type { ReactNode } from 'react';
import { FormAlert, FormStatus } from '@/components/account/account-screen';
import { IconTile } from '@/components/jobs/icon-tile';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { formatShortDate } from '@/lib/format-date';
import type { JobDetails } from '@/lib/home/job-details';
import { ROOM_APPEARANCE } from '@/lib/rooms';
import { earlierDayRange } from '@/lib/home/job-done-earlier';
import { AssigneeSheet } from './assignee-sheet';
import { DoneEarlierSheet } from './done-earlier-sheet';
import { JobFact } from './job-fact';
import { JobHistory } from './job-history';
import { JobRoomFact, JobTimeFact } from './job-time-room';
import { RemoveJobSheet } from './remove-job-sheet';
import { RenameJobSheet } from './rename-job-sheet';
import { ScheduleSheet } from './schedule-sheet';
import { SnoozeSheet } from './snooze-sheet';
import { useProgressChange } from './use-job-actions';
import type { JobAddress, ProgressActions, ProgressChange } from './use-job-actions';

function savedText(change: ProgressChange): string {
  if (change.kind === 'done') return 'Marked as done';
  if (change.kind === 'doneEarlier') return `Marked as done on ${formatShortDate(change.on)}`;
  if (change.kind === 'skipped') return 'Skipped this time';
  return `Snoozed until ${formatShortDate(change.until)}`;
}

interface JobDueCardProps {
  details: JobDetails;
  address: JobAddress;
  today: CalendarDate;
}

function DueSummary({ details }: { details: JobDetails }): ReactNode {
  return (
    <div className="flex items-center gap-3">
      <IconTile icon={details.icon} colourClass={ROOM_APPEARANCE[details.roomType].colourClass} />
      <div className="flex flex-col gap-1">
        <p className="text-[1.0625rem] font-bold">{details.when}</p>
        {details.lateBy === undefined ? null : (
          <Badge tone="late" className="self-start text-xs">
            {details.lateBy}
          </Badge>
        )}
      </div>
    </div>
  );
}

interface ProgressButtonsProps {
  nextDue: CalendarDate | null;
  lastDoneOn: CalendarDate | null;
  today: CalendarDate;
  progress: ProgressActions;
}

function DoneEarlierChoice({
  lastDoneOn,
  today,
  progress,
}: Omit<ProgressButtonsProps, 'nextDue'>): ReactNode {
  const range = earlierDayRange(today, lastDoneOn);
  if (range === null) return null;
  return (
    <DoneEarlierSheet
      today={today}
      range={range}
      isBusy={progress.isPending}
      onDone={(on) => {
        progress.record({ kind: 'doneEarlier', on });
      }}
    />
  );
}

function ProgressButtons({
  nextDue,
  lastDoneOn,
  today,
  progress,
}: ProgressButtonsProps): ReactNode {
  const record = (change: ProgressChange) => (): void => {
    progress.record(change);
  };
  return (
    <div className="flex flex-col gap-3">
      <Button disabled={progress.isPending} onClick={record({ kind: 'done', today })}>
        Mark as done
      </Button>
      <DoneEarlierChoice lastDoneOn={lastDoneOn} today={today} progress={progress} />
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1 2xl:grid-cols-2">
        <Button
          variant="secondary"
          disabled={progress.isPending}
          onClick={record({ kind: 'skipped', today })}
        >
          Skip this time
        </Button>
        {nextDue === null ? null : (
          <SnoozeSheet
            nextDue={nextDue}
            today={today}
            isBusy={progress.isPending}
            onSnooze={(until) => {
              progress.record({ kind: 'snooze', until });
            }}
          />
        )}
      </div>
    </div>
  );
}

export function JobDueCard({ details, address, today }: JobDueCardProps): ReactNode {
  const progress = useProgressChange(address);
  return (
    <Card className="flex flex-col gap-4">
      <DueSummary details={details} />
      <ProgressButtons
        nextDue={details.nextDue}
        lastDoneOn={details.lastDoneOn}
        today={today}
        progress={progress}
      />
      {progress.error === null ? null : <FormAlert>{progress.error.message}</FormAlert>}
      {progress.saved === null ? null : <FormStatus>{savedText(progress.saved)}</FormStatus>}
    </Card>
  );
}

interface JobAboutProps {
  details: JobDetails;
  address: JobAddress;
  describeCompletion: (completion: CompletionRecord) => string;
}

export function JobAbout({ details, address, describeCompletion }: JobAboutProps): ReactNode {
  return (
    <div className="flex flex-col gap-5">
      <JobFact title="How often">
        <p className="text-[1.0625rem] font-bold">{details.howOften}</p>
        {details.recommendation === null ? null : <p>{details.recommendation}</p>}
        <ScheduleSheet details={details} address={address} />
      </JobFact>
      <JobFact title="Who does it">
        <p className="text-[1.0625rem]">{details.whoFor}</p>
        <AssigneeSheet details={details} address={address} />
      </JobFact>
      <JobTimeFact details={details} address={address} />
      <JobRoomFact details={details} address={address} />
      <JobHistory address={address} lastDone={details.lastDone} describe={describeCompletion} />
      {details.why === null ? null : (
        <JobFact title="Why it matters">
          <p className="text-[1.0625rem]">{details.why}</p>
        </JobFact>
      )}
      {details.howTo.length === 0 ? null : (
        <JobFact title="How to do it">
          <ol className="flex list-decimal flex-col gap-1.5 pl-6 text-[1.0625rem]">
            {details.howTo.map((step) => (
              <li key={step}>{step}</li>
            ))}
          </ol>
        </JobFact>
      )}
    </div>
  );
}

export function JobManagement({
  details,
  address,
}: {
  details: JobDetails;
  address: JobAddress;
}): ReactNode {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <RenameJobSheet details={details} address={address} />
      <RemoveJobSheet details={details} address={address} />
    </div>
  );
}
