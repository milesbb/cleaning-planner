'use client';

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
import { countOf } from '@/lib/rooms';
import { AddRoomSheet } from './add-room-sheet';

type ReadyRooms = Extract<RoomSourcesState, { kind: 'ready' }>;

function HomeContent({ home }: { home: ReadyRooms }): ReactNode {
  const rooms = summariseRooms(home.sources);
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
      <AddRoomSheet householdId={home.householdId} roomNames={rooms.map((room) => room.name)} />
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
