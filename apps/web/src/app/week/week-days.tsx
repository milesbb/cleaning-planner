'use client';

import { addInterval } from '@cleaning-planner/schedule/calendar-date';
import type { CalendarDate } from '@cleaning-planner/schedule/calendar-date';
import { useState } from 'react';
import type { ReactNode } from 'react';
import { FormAlert } from '@/components/account/account-screen';
import { DayRow } from '@/components/jobs/day-row';
import { Card } from '@/components/ui/card';
import { MoveJobSheet } from './move-job-sheet';
import type { JobToMove } from './move-job-sheet';
import { useMoveJob } from './use-move-job';
import type { WeekJob, WeekRange, WeekView } from './week-view';

const ONE_WEEK = { value: 1, unit: 'week' } as const;

interface WeekDaysProps {
  householdId: string;
  today: CalendarDate;
  range: WeekRange;
  view: WeekView;
}

function withMove(job: WeekJob, pick: (job: JobToMove) => void): WeekJob & { onMove?: () => void } {
  const { movableFrom } = job;
  if (movableFrom === null) return job;
  return {
    ...job,
    onMove: (): void => {
      pick({ jobId: job.jobId, name: job.name, dueDate: movableFrom });
    },
  };
}

// The week's days. Tapping a job that can move offers the later days of this
// week and the next; the move shows at once and is put back if it fails.
export function WeekDays({ householdId, today, range, view }: WeekDaysProps): ReactNode {
  const [jobToMove, setJobToMove] = useState<JobToMove | null>(null);
  const moving = useMoveJob({ householdId, range });
  return (
    <>
      {moving.failure === null ? null : <FormAlert>{moving.failure}</FormAlert>}
      <Card raised={false} className="divide-y-2 divide-ink overflow-hidden p-0">
        <ol aria-label="Days" className="divide-y-2 divide-ink">
          {view.days.map((day) => (
            <li key={day.date}>
              <DayRow
                weekday={day.weekday}
                dayOfMonth={day.dayOfMonth}
                jobs={day.jobs.map((job) => withMove(job, setJobToMove))}
                isToday={day.isToday}
              />
            </li>
          ))}
        </ol>
      </Card>
      <MoveJobSheet
        job={jobToMove}
        today={today}
        lastDay={addInterval(range.to, ONE_WEEK)}
        onClose={() => {
          setJobToMove(null);
        }}
        onMove={(until) => {
          if (jobToMove !== null) {
            moving.move({ jobId: jobToMove.jobId, from: jobToMove.dueDate, until });
          }
          setJobToMove(null);
        }}
      />
    </>
  );
}
