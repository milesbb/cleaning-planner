import { WEEKDAYS_FROM_SUNDAY } from './calendar-date';
import { describeInterval } from './interval';
import type { MonthDayRule, Schedule, Weekday, WeekdaysRule } from './types';

const ORDINAL_SUFFIXES: Record<number, string> = { 1: 'st', 2: 'nd', 3: 'rd' };
const TEENS_START = 11;
const TEENS_END = 13;
const TEN = 10;

function capitalised(text: string): string {
  return `${text.charAt(0).toUpperCase()}${text.slice(1)}`;
}

function ordinal(day: number): string {
  const isTeen = day % 100 >= TEENS_START && day % 100 <= TEENS_END;
  const suffix = isTeen ? 'th' : (ORDINAL_SUFFIXES[day % TEN] ?? 'th');
  return `${String(day)}${suffix}`;
}

function listed(names: readonly string[]): string {
  if (names.length <= 1) return names.join('');
  return `${names.slice(0, -1).join(', ')} and ${names.at(-1) ?? ''}`;
}

function describeWeekdays({ weekdays }: WeekdaysRule): string {
  const inWeekOrder = [...weekdays].sort(
    (first: Weekday, second: Weekday) =>
      WEEKDAYS_FROM_SUNDAY.indexOf(first) - WEEKDAYS_FROM_SUNDAY.indexOf(second),
  );
  return `Every ${listed(inWeekOrder.map(capitalised))}`;
}

function describeMonthDay({ day }: MonthDayRule): string {
  return `Monthly on the ${day === 'last' ? 'last day' : ordinal(day)}`;
}

// "Weekly", "Every Monday and Thursday", "Monthly on the 1st": how often a job comes round.
export function describeSchedule(schedule: Schedule): string {
  if (schedule.type === 'floating') return capitalised(describeInterval(schedule.every));
  return schedule.on.kind === 'weekdays'
    ? describeWeekdays(schedule.on)
    : describeMonthDay(schedule.on);
}
