'use client';

import { useState } from 'react';
import type { ReactNode } from 'react';
import { PlusIcon } from '@/components/icons/interface-icons';
import { JobRow } from '@/components/jobs/job-row';
import { HomeSwitcher } from '@/components/shell/home-switcher';
import { PageHeader } from '@/components/shell/page-header';
import { IconButton } from '@/components/ui/icon-button';
import { SectionHeading } from '@/components/ui/section-heading';

const HOMES = [
  { id: 'home-1', name: 'Our flat' },
  { id: 'home-2', name: "Mum's house" },
];

const DEMO_HREF = '/dev/shell';

export function ShellDemo(): ReactNode {
  const [currentHomeId, setCurrentHomeId] = useState('home-1');
  return (
    <>
      <PageHeader
        title="Today"
        subtitle="Sunday 22 November · about 45 min"
        leading={
          <HomeSwitcher homes={HOMES} currentHomeId={currentHomeId} onSwitch={setCurrentHomeId} />
        }
        action={<IconButton label="Add a job" icon={<PlusIcon />} tone="solid" />}
      />
      <section aria-label="Today's jobs" className="flex flex-col gap-2.5">
        <SectionHeading>Today</SectionHeading>
        <JobRow
          name="Vacuum the living room"
          room="livingRoom"
          icon="vacuum"
          meta="Living room · You · 15 min"
          href={DEMO_HREF}
          status={{ kind: 'due', onDone: () => undefined }}
        />
        <JobRow
          name="Wipe the washer door seal"
          room="laundry"
          icon="washer"
          meta="Laundry · Anyone · 5 min"
          href={DEMO_HREF}
          status={{ kind: 'due', onDone: () => undefined }}
        />
      </section>
    </>
  );
}
