'use client';

import Link from 'next/link';
import { useId } from 'react';
import type { ReactNode } from 'react';
import { FormAlert } from '@/components/account/account-screen';
import { IconTile } from '@/components/jobs/icon-tile';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { SectionHeading } from '@/components/ui/section-heading';
import { jobHref } from '@/lib/home/job-href';
import type { ComingUpWeek } from './coming-up-view';
import { useComingUp } from './use-coming-up';
import type { ComingUpState } from './use-coming-up';
import type { WeekRange } from './week-view';

const JOB_LINK_CLASSES =
  'flex min-h-14 items-center gap-3 px-4 py-2 text-ink focus-visible:outline-3 focus-visible:-outline-offset-3 focus-visible:outline-ink';

function WeekAhead({ week }: { week: ComingUpWeek }): ReactNode {
  const headingId = useId();
  return (
    <section aria-labelledby={headingId} className="flex flex-col gap-2">
      <SectionHeading id={headingId} level={3}>
        {week.title}
      </SectionHeading>
      {week.jobs.length === 0 ? (
        <p>Nothing due.</p>
      ) : (
        <Card raised={false} className="overflow-hidden p-0">
          <ul
            aria-label={`Due in the ${week.title.toLowerCase()}`}
            className="divide-y-2 divide-ink"
          >
            {week.jobs.map((job) => (
              <li key={job.jobId}>
                <Link href={jobHref(job.jobId)} className={JOB_LINK_CLASSES}>
                  <IconTile icon={job.icon} colourClass="bg-paper" size="small" />
                  <span className="flex min-w-0 flex-col">
                    <span className="font-bold break-words">{job.name}</span>
                    <span className="text-sm">{job.when}</span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </section>
  );
}

function ComingUpContent({ comingUp }: { comingUp: ComingUpState }): ReactNode {
  if (comingUp.kind === 'loading') return <p role="status">Looking further ahead…</p>;
  if (comingUp.kind === 'failed') {
    return (
      <div className="flex flex-col gap-3">
        <FormAlert>{comingUp.message}</FormAlert>
        <Button variant="secondary" onClick={comingUp.retry}>
          Try again
        </Button>
      </div>
    );
  }
  if (comingUp.weeks.every((week) => week.jobs.length === 0)) {
    return <p>Nothing due in the next four weeks.</p>;
  }
  return comingUp.weeks.map((week) => <WeekAhead key={week.start} week={week} />);
}

export function ComingUpSection({
  householdId,
  week,
}: {
  householdId: string;
  week: WeekRange;
}): ReactNode {
  const headingId = useId();
  const comingUp = useComingUp(householdId, week);
  return (
    <section aria-labelledby={headingId} className="flex flex-col gap-4">
      <SectionHeading id={headingId}>Coming up</SectionHeading>
      <ComingUpContent comingUp={comingUp} />
    </section>
  );
}
