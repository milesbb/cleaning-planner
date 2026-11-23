'use client';

import type { ReactNode } from 'react';
import { AppShell } from '@/components/shell/app-shell';
import { BackLink, PageHeader } from '@/components/shell/page-header';
import {
  ScreenLoading,
  ScreenProblem,
  useStartAHomeWhenHomeless,
} from '@/components/shell/screen-states';
import { ButtonLink } from '@/components/ui/button';
import { jobDetailsOf } from '@/lib/home/job-details';
import { useRoomSources } from '@/lib/home/use-room-sources';
import type { RoomSourcesState } from '@/lib/home/use-room-sources';
import { useRecordId } from '@/lib/use-record-id';
import { JobAbout, JobDueCard, JobManagement } from './job-sections';

type ReadyHome = Extract<RoomSourcesState, { kind: 'ready' }>;

function JobNotFound(): ReactNode {
  return (
    <>
      <PageHeader title="Job not found" leading={<BackLink href="/home" label="Back to Home" />} />
      <p role="alert" className="text-[1.0625rem]">
        That job isn’t in this home any more. It may have been removed.
      </p>
      <ButtonLink href="/home">See all rooms</ButtonLink>
    </>
  );
}

function JobContent({ home, jobId }: { home: ReadyHome; jobId: string }): ReactNode {
  const details = jobDetailsOf(home.sources, jobId);
  if (details === null) return <JobNotFound />;
  const address = { householdId: home.householdId, jobId };
  return (
    <>
      <PageHeader
        title={details.name}
        subtitle={details.roomName}
        leading={<BackLink href={details.roomHref} label={`Back to ${details.roomName}`} />}
      />
      <div className="flex flex-col gap-6 lg:grid lg:grid-cols-2 lg:items-start">
        <JobDueCard details={details} address={address} today={home.sources.today} />
        <JobAbout details={details} address={address} />
      </div>
      <JobManagement details={details} address={address} />
    </>
  );
}

export function JobScreen(): ReactNode {
  const home = useRoomSources();
  const jobId = useRecordId();
  const hasNoHome = home.kind === 'noHome';
  useStartAHomeWhenHomeless(hasNoHome);
  return (
    <AppShell activeTab="home">
      {home.kind === 'ready' && jobId === null && <JobNotFound />}
      {home.kind === 'ready' && typeof jobId === 'string' && (
        <JobContent home={home} jobId={jobId} />
      )}
      {home.kind === 'failed' && (
        <ScreenProblem title="Job" message={home.message} retry={home.retry} />
      )}
      {(home.kind === 'loading' || hasNoHome || jobId === undefined) && (
        <ScreenLoading>Getting the job…</ScreenLoading>
      )}
    </AppShell>
  );
}
