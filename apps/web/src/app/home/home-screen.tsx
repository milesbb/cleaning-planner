'use client';

import { useState } from 'react';
import type { ReactNode } from 'react';
import { RoomTile } from '@/components/jobs/room-tile';
import { AppShell } from '@/components/shell/app-shell';
import { HomeSwitcher } from '@/components/shell/home-switcher';
import { PageHeader } from '@/components/shell/page-header';
import {
  ScreenLoading,
  ScreenProblem,
  useStartAHomeWhenHomeless,
} from '@/components/shell/screen-states';
import { TwoColumns } from '@/components/shell/two-columns';
import { summariseRooms } from '@/lib/home/room-jobs';
import { useRoomSources } from '@/lib/home/use-room-sources';
import type { RoomSourcesState } from '@/lib/home/use-room-sources';
import { Button } from '@/components/ui/button';
import { countOf } from '@/lib/rooms';
import { AddRoomButton } from './add-room-button';
import { RecentActivity } from './recent-activity';
import { ReorderRooms } from './reorder-rooms';

type ReadyRooms = Extract<RoomSourcesState, { kind: 'ready' }>;

function RoomTiles({ home }: { home: ReadyRooms }): ReactNode {
  const rooms = summariseRooms(home.sources);
  return (
    <ul
      aria-label="Rooms"
      className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-2 xl:grid-cols-3"
    >
      {rooms.map((room) => (
        <li key={room.id} className="grid">
          <RoomTile
            room={room.type}
            name={room.name}
            jobCount={room.jobCount}
            lateCount={room.lateCount}
            href={`/room?id=${encodeURIComponent(room.id)}`}
          />
        </li>
      ))}
    </ul>
  );
}

interface RoomActionsProps {
  home: ReadyRooms;
  onReorder: () => void;
}

function RoomActions({ home, onReorder }: RoomActionsProps): ReactNode {
  const { rooms } = home.sources;
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
      <AddRoomButton householdId={home.householdId} roomNames={rooms.map((room) => room.name)} />
      {rooms.length > 1 ? (
        <Button variant="secondary" onClick={onReorder}>
          Reorder rooms
        </Button>
      ) : null}
    </div>
  );
}

function RoomsOverview({ home, onReorder }: RoomActionsProps): ReactNode {
  return (
    <>
      <RoomTiles home={home} />
      <RoomActions home={home} onReorder={onReorder} />
    </>
  );
}

function HomeActivity({ home }: { home: ReadyRooms }): ReactNode {
  const { members, myUserId, today } = home.sources;
  return <RecentActivity householdId={home.householdId} people={{ members, myUserId, today }} />;
}

// docs/LAYOUTS.md §4.5: Recently sits beside the rooms on a laptop and under
// them below that, and stays while the rooms are reordered.
function HomeRooms({ home }: { home: ReadyRooms }): ReactNode {
  const [isReordering, setIsReordering] = useState(false);
  const rooms = isReordering ? (
    <ReorderRooms
      householdId={home.householdId}
      rooms={[...home.sources.rooms].sort((first, second) => first.order - second.order)}
      onDone={() => {
        setIsReordering(false);
      }}
    />
  ) : (
    <RoomsOverview
      home={home}
      onReorder={() => {
        setIsReordering(true);
      }}
    />
  );
  return <TwoColumns main={rooms} side={<HomeActivity home={home} />} sideLabel="Activity" />;
}

function HomeContent({ home }: { home: ReadyRooms }): ReactNode {
  const { rooms } = home.sources;
  return (
    <>
      <PageHeader
        title="Home"
        subtitle={`${countOf(rooms.length, 'room')} · ${countOf(home.sources.jobs.length, 'job')}`}
        leading={
          <HomeSwitcher
            homes={home.homes}
            currentHomeId={home.householdId}
            onSwitch={home.switchHome}
          />
        }
      />
      <HomeRooms home={home} />
    </>
  );
}

export function HomeScreen(): ReactNode {
  const home = useRoomSources();
  const hasNoHome = home.kind === 'noHome';
  useStartAHomeWhenHomeless(hasNoHome);
  return (
    <AppShell activeTab="home" layout="split">
      {home.kind === 'ready' && <HomeContent home={home} />}
      {home.kind === 'failed' && (
        <ScreenProblem title="Home" message={home.message} retry={home.retry} />
      )}
      {(home.kind === 'loading' || hasNoHome) && <ScreenLoading>Getting your rooms…</ScreenLoading>}
    </AppShell>
  );
}
