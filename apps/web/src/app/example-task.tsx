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
      className="rounded-2xl border border-border bg-card p-4 shadow-sm sm:p-5"
    >
      <p className="text-xs font-semibold uppercase tracking-wide text-muted">Example</p>
      <p className="mt-1 text-base font-semibold">Washing machine maintenance wash</p>
      <p className="mt-1 text-sm text-muted">
        Every month · last done {formatLongDate(exampleLastDoneOn)}
      </p>
      <p className="mt-3 inline-flex rounded-full bg-primary-soft px-3 py-1 text-sm font-medium text-primary">
        Next due {formatLongDate(dueDate)}
      </p>
    </section>
  );
}
