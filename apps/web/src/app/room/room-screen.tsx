'use client';

import type { Room } from '@cleaning-planner/contracts/room';
import type { ReactNode } from 'react';
import { JobRow } from '@/components/jobs/job-row';
import { AppShell } from '@/components/shell/app-shell';
import { PageHeader } from '@/components/shell/page-header';
import {
  ScreenLoading,
  ScreenProblem,
  useStartAHomeWhenHomeless,
} from '@/components/shell/screen-states';
import { PlusIcon } from '@/components/icons/interface-icons';
import { ButtonLink } from '@/components/ui/button';
import { jobHref } from '@/lib/home/job-href';
import { jobsInRoom } from '@/lib/home/room-jobs';
import { useRoomSources } from '@/lib/home/use-room-sources';
import type { RoomSourcesState } from '@/lib/home/use-room-sources';
import { countOf } from '@/lib/rooms';
import { useRecordId } from '@/lib/use-record-id';
import { EditRoomButton } from './edit-room-button';
import { BACK_HOME, RoomNotFound } from './room-not-found';

type ReadyRooms = Extract<RoomSourcesState, { kind: 'ready' }>;

interface RoomJobListProps {
  room: Room;
  jobs: ReturnType<typeof jobsInRoom>;
}

function RoomJobList({ room, jobs }: RoomJobListProps): ReactNode {
  if (jobs.length === 0) return <p className="text-[1.0625rem]">No jobs in this room yet.</p>;
  return (
    <ul aria-label={`Jobs in ${room.name}`} className="flex flex-col gap-2.5">
      {jobs.map((job) => (
        <li key={job.jobId}>
          <JobRow
            name={job.name}
            room={room.type}
            icon={job.icon}
            meta={job.meta}
            href={jobHref(job.jobId)}
            status={
              job.lateBy === undefined
                ? { kind: 'scheduled' }
                : { kind: 'scheduled', lateBy: job.lateBy }
            }
          />
        </li>
      ))}
    </ul>
  );
}

function RoomContent({ home, roomId }: { home: ReadyRooms; roomId: string }): ReactNode {
  const room = home.sources.rooms.find((candidate) => candidate.id === roomId);
  if (room === undefined) return <RoomNotFound />;
  const jobs = jobsInRoom(home.sources, roomId);
  return (
    <>
      <PageHeader
        title={room.name}
        subtitle={countOf(jobs.length, 'job')}
        leading={BACK_HOME}
        action={
          <EditRoomButton householdId={home.householdId} room={room} jobCount={jobs.length} />
        }
      />
      <ButtonLink href={`/room/add?id=${encodeURIComponent(room.id)}`} variant="dashed">
        <PlusIcon />
        Add a job
      </ButtonLink>
      <RoomJobList room={room} jobs={jobs} />
    </>
  );
}

export function RoomScreen(): ReactNode {
  const home = useRoomSources();
  const roomId = useRecordId();
  const hasNoHome = home.kind === 'noHome';
  useStartAHomeWhenHomeless(hasNoHome);
  return (
    <AppShell activeTab="home">
      {home.kind === 'ready' && roomId === null && <RoomNotFound />}
      {home.kind === 'ready' && typeof roomId === 'string' && (
        <RoomContent home={home} roomId={roomId} />
      )}
      {home.kind === 'failed' && (
        <ScreenProblem title="Room" message={home.message} retry={home.retry} />
      )}
      {(home.kind === 'loading' || hasNoHome || roomId === undefined) && (
        <ScreenLoading>Getting the room…</ScreenLoading>
      )}
    </AppShell>
  );
}
