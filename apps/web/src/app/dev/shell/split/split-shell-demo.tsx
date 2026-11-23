'use client';

import type { ReactNode } from 'react';
import { JobRow } from '@/components/jobs/job-row';
import { ChooseAJobHint } from '@/components/shell/choose-a-job-hint';
import { PageHeader } from '@/components/shell/page-header';
import { TwoColumns } from '@/components/shell/two-columns';
import { SectionHeading } from '@/components/ui/section-heading';

const DEMO_HREF = '/dev/shell/split';

const JOBS = [
  { name: 'Vacuum the living room', room: 'livingRoom', icon: 'vacuum', meta: 'You · 15 min' },
  { name: 'Wipe the washer door seal', room: 'laundry', icon: 'washer', meta: 'Anyone · 5 min' },
  { name: 'Change the bed sheets', room: 'bedroom', icon: 'bed', meta: 'Sam · 20 min' },
] as const;

function DemoJobs(): ReactNode {
  return (
    <section aria-label="Jobs" className="flex flex-col gap-2.5">
      <SectionHeading>Coming up</SectionHeading>
      {JOBS.map((job) => (
        <JobRow
          key={job.name}
          name={job.name}
          room={job.room}
          icon={job.icon}
          meta={job.meta}
          href={DEMO_HREF}
          status={{ kind: 'upcoming' }}
        />
      ))}
    </section>
  );
}

export function SplitShellDemo(): ReactNode {
  return (
    <>
      <PageHeader title="This week" subtitle="23 – 29 November · 3 of 12 done" />
      <TwoColumns
        main={<DemoJobs />}
        side={<ChooseAJobHint />}
        sideLabel="Job details"
        sideBelowLaptop="hidden"
      />
    </>
  );
}
