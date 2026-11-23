'use client';

import type { CalendarDate } from '@cleaning-planner/schedule/calendar-date';
import { useState } from 'react';
import type { JobDrag } from '@/components/jobs/day-row';
import { moveChoices } from './move-job';
import type { JobMove } from './move-job';
import type { JobToMove } from './move-job-sheet';
import { useCanDragJobs } from './use-can-drag-jobs';

interface JobDragOptions {
  today: CalendarDate;
  lastDay: CalendarDate;
  onMove: (move: JobMove) => void;
}

export interface JobDragging {
  dragFor: (job: JobToMove) => JobDrag | undefined;
  dropFor: (day: CalendarDate) => (() => void) | undefined;
}

// Dragging a job offers the same days as Move to…; only those take the drop.
export function useJobDrag({ today, lastDay, onMove }: JobDragOptions): JobDragging {
  const canDrag = useCanDragJobs();
  const [dragged, setDragged] = useState<JobToMove | null>(null);
  const dropDays =
    dragged === null
      ? []
      : moveChoices({ dueDate: dragged.dueDate, today, lastDay }).map((choice) => choice.day);
  return {
    dragFor: (job): JobDrag | undefined => {
      if (!canDrag) return undefined;
      return {
        onStart: (): void => {
          setDragged(job);
        },
        onEnd: (): void => {
          setDragged(null);
        },
      };
    },
    dropFor: (day): (() => void) | undefined => {
      if (dragged === null || !dropDays.includes(day)) return undefined;
      return (): void => {
        onMove({ jobId: dragged.jobId, from: dragged.dueDate, until: day });
        setDragged(null);
      };
    },
  };
}
