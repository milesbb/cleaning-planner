import { parseCalendarDate } from '@cleaning-planner/schedule/calendar-date';
import { nextDueDate } from '@cleaning-planner/schedule/next-due';
import type { FloatingSchedule } from '@cleaning-planner/schedule/types';
import type { ReactNode } from 'react';
import { formatLongDate } from '@/lib/format-date';

const monthlySchedule: FloatingSchedule = { type: 'floating', every: { value: 1, unit: 'month' } };
const exampleLastDoneOn = parseCalendarDate('2026-11-01');

export function ExampleTask(): ReactNode {
  const dueDate = nextDueDate(monthlySchedule, {
    startDate: exampleLastDoneOn,
    lastDoneOn: exampleLastDoneOn,
  });
  return (
    <section
      aria-label="Example task"
      className="rounded-card border-2 border-ink bg-card p-4 shadow-hard sm:p-5"
    >
      <p className="font-display text-xs font-extrabold uppercase tracking-widest">Example</p>
      <p className="mt-1 text-base font-semibold">Washing machine maintenance wash</p>
      <p className="mt-1 text-sm">Every month · last done {formatLongDate(exampleLastDoneOn)}</p>
      <p className="mt-3 inline-flex rounded-full border-2 border-ink bg-kitchen px-3 py-1 text-sm font-bold">
        Next due {formatLongDate(dueDate)}
      </p>
    </section>
  );
}
