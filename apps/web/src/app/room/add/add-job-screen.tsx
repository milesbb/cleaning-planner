'use client';

import type { Room } from '@cleaning-planner/contracts/room';
import type { LibraryJob } from '@cleaning-planner/schedule/library/types';
import { useState } from 'react';
import type { ReactNode } from 'react';
import { FormAlert } from '@/components/account/account-screen';
import { AppShell } from '@/components/shell/app-shell';
import { BackLink, PageHeader } from '@/components/shell/page-header';
import {
  ScreenLoading,
  ScreenProblem,
  useStartAHomeWhenHomeless,
} from '@/components/shell/screen-states';
import { SegmentedControl } from '@/components/ui/segmented-control';
import { TextField } from '@/components/ui/text-field';
import { useRoomSources } from '@/lib/home/use-room-sources';
import type { RoomSourcesState } from '@/lib/home/use-room-sources';
import { searchLibrary } from '@/lib/jobs/library-search';
import { useJobLibrary } from '@/lib/jobs/use-job-library';
import { useRecordId } from '@/lib/use-record-id';
import { RoomNotFound } from '../room-not-found';
import { MakeYourOwnJob } from './make-your-own-job';
import { LibraryJobList } from './library-job-list';
import { requestForLibraryJob, useAddJob } from './use-add-job';

type ReadyHome = Extract<RoomSourcesState, { kind: 'ready' }>;
type Scope = 'thisRoom' | 'allRooms';

function addedLibraryIdsIn(home: ReadyHome, roomId: string): Set<string> {
  return new Set(
    home.sources.jobs
      .filter((job) => job.roomId === roomId && job.libraryId !== null)
      .map((job) => job.libraryId ?? ''),
  );
}

function scopeChoices(room: Room): { value: Scope; label: string }[] {
  return [
    { value: 'thisRoom', label: `${room.name} jobs` },
    { value: 'allRooms', label: 'All rooms' },
  ];
}

interface LibraryResultsProps {
  home: ReadyHome;
  room: Room;
  found: readonly LibraryJob[];
  query: string;
  addJob: ReturnType<typeof useAddJob>;
}

function LibraryResults({ home, room, found, query, addJob }: LibraryResultsProps): ReactNode {
  if (found.length === 0) {
    return <p className="text-[1.0625rem]">No jobs match “{query.trim()}”.</p>;
  }
  return (
    <LibraryJobList
      jobs={found}
      addedLibraryIds={addedLibraryIdsIn(home, room.id)}
      isAdding={addJob.isPending}
      onAdd={(libraryJob) => {
        addJob.mutate(requestForLibraryJob(room.id, libraryJob));
      }}
    />
  );
}

function LibrarySearch({ home, room }: { home: ReadyHome; room: Room }): ReactNode {
  const [query, setQuery] = useState('');
  const [scope, setScope] = useState<Scope>('thisRoom');
  const addJob = useAddJob(home.householdId);
  const library = useJobLibrary();
  const found =
    library === null ? [] : searchLibrary(library, query, scope === 'thisRoom' ? room.type : null);
  return (
    <>
      <div className="flex flex-col gap-4 sm:max-w-lg">
        <TextField
          label="Search jobs"
          type="search"
          autoComplete="off"
          value={query}
          onChange={(event) => {
            setQuery(event.target.value);
          }}
        />
        <SegmentedControl<Scope>
          label="Show"
          options={scopeChoices(room)}
          value={scope}
          onValueChange={setScope}
        />
      </div>
      {addJob.error === null ? null : <FormAlert>{addJob.error.message}</FormAlert>}
      {library === null ? (
        <p role="status">Getting the job library…</p>
      ) : (
        <LibraryResults home={home} room={room} found={found} query={query} addJob={addJob} />
      )}
    </>
  );
}

function AddJobContent({ home, roomId }: { home: ReadyHome; roomId: string }): ReactNode {
  const room = home.sources.rooms.find((candidate) => candidate.id === roomId);
  if (room === undefined) return <RoomNotFound />;
  return (
    <>
      <PageHeader
        title="Add a job"
        subtitle={room.name}
        leading={
          <BackLink
            href={`/room?id=${encodeURIComponent(room.id)}`}
            label={`Back to ${room.name}`}
          />
        }
      />
      <MakeYourOwnJob householdId={home.householdId} roomId={room.id} />
      <LibrarySearch home={home} room={room} />
    </>
  );
}

export function AddJobScreen(): ReactNode {
  const home = useRoomSources();
  const roomId = useRecordId();
  const hasNoHome = home.kind === 'noHome';
  useStartAHomeWhenHomeless(hasNoHome);
  return (
    <AppShell activeTab="home">
      {home.kind === 'ready' && roomId === null && <RoomNotFound />}
      {home.kind === 'ready' && typeof roomId === 'string' && (
        <AddJobContent home={home} roomId={roomId} />
      )}
      {home.kind === 'failed' && (
        <ScreenProblem title="Add a job" message={home.message} retry={home.retry} />
      )}
      {(home.kind === 'loading' || hasNoHome || roomId === undefined) && (
        <ScreenLoading>Getting the room…</ScreenLoading>
      )}
    </AppShell>
  );
}
