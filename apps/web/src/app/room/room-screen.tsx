'use client';

import { useSyncExternalStore } from 'react';
import type { ReactNode } from 'react';
import { JobRow } from '@/components/jobs/job-row';
import { AppShell } from '@/components/shell/app-shell';
import { BackLink, PageHeader } from '@/components/shell/page-header';
import {
  ScreenLoading,
  ScreenProblem,
  useStartAHomeWhenHomeless,
} from '@/components/shell/screen-states';
import { ButtonLink } from '@/components/ui/button';
import { jobsInRoom } from '@/lib/home/room-jobs';
import { useRoomSources } from '@/lib/home/use-room-sources';
import type { RoomSourcesState } from '@/lib/home/use-room-sources';
import { readRecordId } from '@/lib/record-id';
import { countOf } from '@/lib/rooms';

type ReadyRooms = Extract<RoomSourcesState, { kind: 'ready' }>;

const NEVER_CHANGES = (): (() => void) => () => undefined;
const BACK_HOME = <BackLink href="/home" label="Back to Home" />;

function roomIdInAddress(): string | null {
  return readRecordId(new URLSearchParams(window.location.search));
}

// The room's id from `?id=`: undefined until the browser has read the address.
function useRoomId(): string | null | undefined {
  return useSyncExternalStore(NEVER_CHANGES, roomIdInAddress, () => undefined);
}

function RoomNotFound(): ReactNode {
  return (
    <>
      <PageHeader title="Room not found" leading={BACK_HOME} />
      <p role="alert" className="text-[1.0625rem]">
        That room isn’t in this home any more. It may have been removed.
      </p>
      <ButtonLink href="/home">See all rooms</ButtonLink>
    </>
  );
}

function RoomContent({ home, roomId }: { home: ReadyRooms; roomId: string }): ReactNode {
  const room = home.sources.rooms.find((candidate) => candidate.id === roomId);
  if (room === undefined) return <RoomNotFound />;
  const jobs = jobsInRoom(home.sources, roomId);
  return (
    <>
      <PageHeader title={room.name} subtitle={countOf(jobs.length, 'job')} leading={BACK_HOME} />
      {jobs.length === 0 ? (
        <p className="text-[1.0625rem]">No jobs in this room yet.</p>
      ) : (
        <ul aria-label={`Jobs in ${room.name}`} className="flex flex-col gap-2.5">
          {jobs.map((job) => (
            <li key={job.jobId}>
              <JobRow
                name={job.name}
                room={room.type}
                icon={job.icon}
                meta={job.meta}
                status={
                  job.lateBy === undefined
                    ? { kind: 'scheduled' }
                    : { kind: 'scheduled', lateBy: job.lateBy }
                }
              />
            </li>
          ))}
        </ul>
      )}
    </>
  );
}

export function RoomScreen(): ReactNode {
  const home = useRoomSources();
  const roomId = useRoomId();
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
