import type { AgendaResponse } from '@cleaning-planner/contracts/agenda';
import { addInterval, compareDates } from '@cleaning-planner/schedule/calendar-date';
import type { CalendarDate } from '@cleaning-planner/schedule/calendar-date';
import { formatDayHeading } from '@/lib/format-date';

// Moving a job on Week is a snooze: it can only go to a day after both today
// and the day it's due, as the API's createSnooze requires.

const ONE_DAY = { value: 1, unit: 'day' } as const;

export interface MoveChoice {
  day: CalendarDate;
  label: string;
}

interface MoveWindow {
  dueDate: CalendarDate;
  today: CalendarDate;
  lastDay: CalendarDate;
}

export interface JobMove {
  jobId: string;
  from: CalendarDate;
  until: CalendarDate;
}

type DueItem = AgendaResponse['late'][number];

function laterOf(first: CalendarDate, second: CalendarDate): CalendarDate {
  return compareDates(first, second) >= 0 ? first : second;
}

export function moveChoices({ dueDate, today, lastDay }: MoveWindow): MoveChoice[] {
  const choices: MoveChoice[] = [];
  let day = addInterval(laterOf(dueDate, today), ONE_DAY);
  while (compareDates(day, lastDay) <= 0) {
    choices.push({ day, label: formatDayHeading(day) });
    day = addInterval(day, ONE_DAY);
  }
  return choices;
}

function isMovedItem(item: DueItem, move: JobMove): boolean {
  return item.jobId === move.jobId && item.dueDate === move.from;
}

// The week as it will look once the API agrees, so a move shows at once.
export function withJobMoved(agenda: AgendaResponse, move: JobMove): AgendaResponse {
  const movedItem = [...agenda.late, ...agenda.days.flatMap((day) => day.due)].find((item) =>
    isMovedItem(item, move),
  );
  const keep = (items: readonly DueItem[]): DueItem[] =>
    items.filter((item) => !isMovedItem(item, move));
  return {
    late: keep(agenda.late),
    days: agenda.days.map((day) => {
      const due = keep(day.due);
      if (day.date !== move.until || movedItem === undefined) return { ...day, due };
      return {
        ...day,
        due: [...due, { ...movedItem, dueDate: move.until, status: 'later' }],
      };
    }),
  };
}
