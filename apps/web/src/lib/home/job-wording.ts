import type { Member } from '@cleaning-planner/contracts/household';
import type { CalendarDate } from '@cleaning-planner/schedule/calendar-date';

const MILLISECONDS_PER_DAY = 86_400_000;

// The words every job list uses for who a job is for and how late it is.

function daysBetween(earlier: CalendarDate, later: CalendarDate): number {
  return Math.round((Date.parse(later) - Date.parse(earlier)) / MILLISECONDS_PER_DAY);
}

export function lateByText(dueDate: CalendarDate, today: CalendarDate): string {
  const days = daysBetween(dueDate, today);
  return `${String(days)} ${days === 1 ? 'day' : 'days'} late`;
}

export function personLabel(
  members: readonly Member[],
  myUserId: string,
  userId: string | null,
): string {
  if (userId === null) return 'Anyone';
  if (userId === myUserId) return 'You';
  return members.find((member) => member.userId === userId)?.name ?? 'Former member';
}
