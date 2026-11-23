'use client';

import type { ReactNode } from 'react';
import { FormAlert } from '@/components/account/account-screen';
import { DayRow } from '@/components/jobs/day-row';
import { Button, ButtonLink } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { SectionHeading } from '@/components/ui/section-heading';
import { cn } from '@/lib/utils';
import type { WeekView } from '../week/week-view';
import { useWeekStrip } from './use-week-strip';
import type { WeekStripState } from './use-week-strip';

const WEEK_PATH = '/week';

// Seven 56px rows and their dividers, kept while the week loads or fails so
// nothing below jumps.
const SEVEN_DAYS_HEIGHT = 'min-h-[25.5rem]';

function progressText({ progress }: WeekView): string {
  if (progress.total === 0) return 'Nothing planned';
  return `${String(progress.done)} of ${String(progress.total)} done`;
}

function WeekProgress({ strip }: { strip: WeekStripState }): ReactNode {
  if (strip.kind === 'loading') {
    return (
      <p role="status" className="min-h-6">
        Getting the week…
      </p>
    );
  }
  return <p className="min-h-6">{strip.kind === 'ready' ? progressText(strip.view) : ''}</p>;
}

function WeekDaysCard({ strip }: { strip: WeekStripState }): ReactNode {
  if (strip.kind === 'loading') return <Card raised={false} className={SEVEN_DAYS_HEIGHT} />;
  if (strip.kind === 'failed') {
    return (
      <Card raised={false} className={cn('flex flex-col justify-center gap-3', SEVEN_DAYS_HEIGHT)}>
        <FormAlert>{strip.message}</FormAlert>
        <Button variant="secondary" onClick={strip.retry}>
          Try again
        </Button>
      </Card>
    );
  }
  return (
    <Card raised={false} className="overflow-hidden p-0">
      <ol aria-label="Days" className="divide-y-2 divide-ink">
        {strip.view.days.map((day) => (
          <li key={day.date}>
            <DayRow
              weekday={day.weekday}
              dayOfMonth={day.dayOfMonth}
              jobs={day.jobs}
              isToday={day.isToday}
              href={WEEK_PATH}
            />
          </li>
        ))}
      </ol>
    </Card>
  );
}

// Today's side column on a laptop: this week at a glance, each day opening Week.
export function WeekStrip({ householdId }: { householdId: string }): ReactNode {
  const strip = useWeekStrip(householdId);
  return (
    <div className="flex flex-col gap-3">
      <div>
        <SectionHeading>This week</SectionHeading>
        <WeekProgress strip={strip} />
      </div>
      <WeekDaysCard strip={strip} />
      <ButtonLink href={WEEK_PATH} variant="secondary">
        See the week
      </ButtonLink>
    </div>
  );
}
