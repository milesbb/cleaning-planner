'use client';

import { describeSchedule } from '@cleaning-planner/schedule/describe-schedule';
import type { LibraryJob, RoomType } from '@cleaning-planner/schedule/library/types';
import type { ReactNode } from 'react';
import { IconTile } from '@/components/jobs/icon-tile';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ROOM_APPEARANCE } from '@/lib/rooms';

interface LibraryJobListProps {
  jobs: readonly LibraryJob[];
  addedLibraryIds: ReadonlySet<string>;
  isAdding: boolean;
  onAdd: (libraryJob: LibraryJob) => void;
}

function roomColourOf(room: RoomType): string {
  return ROOM_APPEARANCE[room].colourClass;
}

export function LibraryJobList({
  jobs,
  addedLibraryIds,
  isAdding,
  onAdd,
}: LibraryJobListProps): ReactNode {
  return (
    <ul aria-label="Jobs from the library" className="flex flex-col gap-2.5">
      {jobs.map((libraryJob) => (
        <li
          key={libraryJob.id}
          className="flex items-center gap-3 rounded-card border-2 border-ink bg-card p-3"
        >
          <IconTile icon={libraryJob.icon} colourClass={roomColourOf(libraryJob.room)} />
          <span className="flex min-w-0 grow flex-col gap-0.5">
            <span className="font-bold break-words">{libraryJob.name}</span>
            <span className="text-sm">{describeSchedule(libraryJob.defaultSchedule)}</span>
          </span>
          {addedLibraryIds.has(libraryJob.id) ? (
            <Badge tone="done">Added</Badge>
          ) : (
            <Button
              variant="secondary"
              aria-label={`Add ${libraryJob.name}`}
              disabled={isAdding}
              className="min-h-11 shrink-0 px-4 text-base"
              onClick={() => {
                onAdd(libraryJob);
              }}
            >
              Add
            </Button>
          )}
        </li>
      ))}
    </ul>
  );
}
