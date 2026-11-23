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
    <ul aria-label="Rooms" className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3">
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
    <div className="grid gap-3 sm:grid-cols-2">
      <AddRoomButton householdId={home.householdId} roomNames={rooms.map((room) => room.name)} />
      {rooms.length > 1 ? (
        <Button variant="secondary" onClick={onReorder}>
          Reorder rooms
        </Button>
      ) : null}
    </div>
  );
}

function HomeOverview({ home, onReorder }: RoomActionsProps): ReactNode {
  const { members, myUserId, today } = home.sources;
  return (
    <>
      <RoomTiles home={home} />
      <RoomActions home={home} onReorder={onReorder} />
      <RecentActivity householdId={home.householdId} people={{ members, myUserId, today }} />
    </>
  );
}

function HomeContent({ home }: { home: ReadyRooms }): ReactNode {
  const [isReordering, setIsReordering] = useState(false);
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
      {isReordering ? (
        <ReorderRooms
          householdId={home.householdId}
          rooms={[...rooms].sort((first, second) => first.order - second.order)}
          onDone={() => {
            setIsReordering(false);
          }}
        />
      ) : (
        <HomeOverview
          home={home}
          onReorder={() => {
            setIsReordering(true);
          }}
        />
      )}
    </>
  );
}

export function HomeScreen(): ReactNode {
  const home = useRoomSources();
  const hasNoHome = home.kind === 'noHome';
  useStartAHomeWhenHomeless(hasNoHome);
  return (
    <AppShell activeTab="home">
      {home.kind === 'ready' && <HomeContent home={home} />}
      {home.kind === 'failed' && (
        <ScreenProblem title="Home" message={home.message} retry={home.retry} />
      )}
      {(home.kind === 'loading' || hasNoHome) && <ScreenLoading>Getting your rooms…</ScreenLoading>}
    </AppShell>
  );
}
