'use client';

import { useState } from 'react';
import type { ReactNode } from 'react';
import { DayRow } from '@/components/jobs/day-row';
import { JobRow } from '@/components/jobs/job-row';
import type { JobRowStatus } from '@/components/jobs/job-row';
import { RoomTile } from '@/components/jobs/room-tile';
import { DemoSection } from './demo-section';

const DEMO_JOB_HREF = '/dev/components';

function useDemoJobStatus(): JobRowStatus {
  const [isDone, setIsDone] = useState(false);
  if (isDone) {
    return {
      kind: 'done',
      doneBy: 'you',
      doneAt: '08:40',
      nextDue: '29 Nov',
      onUndo: (): void => {
        setIsDone(false);
      },
    };
  }
  return {
    kind: 'due',
    onDone: (): void => {
      setIsDone(true);
    },
  };
}

function JobRowsDemo(): ReactNode {
  const vacuumStatus = useDemoJobStatus();
  return (
    <ul className="flex flex-col gap-2.5">
      <li>
        <JobRow
          name="Clean dishwasher filter"
          room="kitchen"
          icon="dishwasher"
          meta="Kitchen · Alex"
          href={DEMO_JOB_HREF}
          assignee={{ name: 'Alex', colour: 'pink' }}
          status={{ kind: 'due', lateBy: '2 days late', onDone: () => undefined }}
        />
      </li>
      <li>
        <JobRow
          name="Vacuum the living room"
          room="livingRoom"
          icon="vacuum"
          meta="Living room · You · 15 min"
          href={DEMO_JOB_HREF}
          assignee={{ name: 'Sam', colour: 'blue' }}
          status={vacuumStatus}
        />
      </li>
      <li>
        <JobRow
          name="Mop the kitchen floor"
          room="kitchen"
          icon="mop"
          meta="Kitchen · Your turn · 15 min"
          href={DEMO_JOB_HREF}
          status={{ kind: 'upcoming' }}
        />
      </li>
    </ul>
  );
}

// Room's rows for repeat-after-done jobs: fresh, and ready for a clean.
function FreshnessRowsDemo(): ReactNode {
  return (
    <ul className="flex flex-col gap-2.5">
      <li>
        <JobRow
          name="Wipe the fridge shelves"
          room="kitchen"
          icon="fridge"
          meta="Every 2 weeks · Anyone · next 4 December"
          href={DEMO_JOB_HREF}
          status={{ kind: 'scheduled' }}
          freshness={{ level: 0.7, label: 'Fresh for about 10 more days' }}
        />
      </li>
      <li>
        <JobRow
          name="Descale the kettle"
          room="kitchen"
          icon="kettle"
          meta="Monthly · Anyone · was due 20 November"
          href={DEMO_JOB_HREF}
          status={{ kind: 'scheduled', lateBy: '2 days late' }}
          freshness={{ level: 0, label: 'Ready for a clean' }}
        />
      </li>
    </ul>
  );
}

function RoomTilesDemo(): ReactNode {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
      <RoomTile room="kitchen" name="Kitchen" jobCount={8} lateCount={1} href={DEMO_JOB_HREF} />
      <RoomTile room="laundry" name="Laundry" jobCount={4} lateCount={0} href={DEMO_JOB_HREF} />
      <RoomTile room="bathroom" name="Bathroom" jobCount={1} lateCount={0} href={DEMO_JOB_HREF} />
    </div>
  );
}

function DayRowsDemo(): ReactNode {
  return (
    <div className="flex flex-col divide-y-2 divide-ink overflow-hidden rounded-card border-2 border-ink bg-card">
      <DayRow
        weekday="Fri"
        dayOfMonth={20}
        jobs={[
          { name: 'Clean dishwasher filter', icon: 'dishwasher', state: 'late' },
          { name: 'Fridge shelves', icon: 'fridge', state: 'done' },
        ]}
      />
      <DayRow weekday="Sat" dayOfMonth={21} jobs={[]} />
      <DayRow
        weekday="Sun"
        dayOfMonth={22}
        isToday
        href={DEMO_JOB_HREF}
        jobs={[
          { name: 'Vacuum the living room', icon: 'vacuum', state: 'toDo' },
          { name: 'Wipe the washer door seal', icon: 'washer', state: 'toDo' },
          { name: 'Change the bed sheets', icon: 'bed', state: 'done' },
        ]}
      />
    </div>
  );
}

export function JobPiecesDemo(): ReactNode {
  return (
    <DemoSection title="Job pieces">
      <JobRowsDemo />
      <FreshnessRowsDemo />
      <RoomTilesDemo />
      <DayRowsDemo />
    </DemoSection>
  );
}
