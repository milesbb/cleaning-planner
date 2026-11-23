import type { Interval, Schedule, Weekday } from '@cleaning-planner/schedule/types';

// The "How often" form keeps every kind's choices, so switching between kinds
// doesn't lose what was picked; only the chosen kind is saved.

export type RepeatKind = 'afterDone' | 'weekdays' | 'monthDay';

export type MonthDay = number | 'last';

export interface ScheduleDraft {
  kind: RepeatKind;
  every: Interval;
  weekdays: readonly Weekday[];
  monthDay: MonthDay;
}

const DEFAULT_DRAFT: ScheduleDraft = {
  kind: 'afterDone',
  every: { value: 1, unit: 'week' },
  weekdays: ['monday'],
  monthDay: 1,
};

export function draftFrom(schedule: Schedule): ScheduleDraft {
  if (schedule.type === 'floating') return { ...DEFAULT_DRAFT, every: schedule.every };
  if (schedule.on.kind === 'weekdays') {
    return { ...DEFAULT_DRAFT, kind: 'weekdays', weekdays: schedule.on.weekdays };
  }
  return { ...DEFAULT_DRAFT, kind: 'monthDay', monthDay: schedule.on.day };
}

export function scheduleFrom(draft: ScheduleDraft): Schedule {
  if (draft.kind === 'afterDone') return { type: 'floating', every: draft.every };
  if (draft.kind === 'weekdays') {
    return { type: 'fixed', on: { kind: 'weekdays', weekdays: draft.weekdays } };
  }
  return { type: 'fixed', on: { kind: 'monthDay', day: draft.monthDay } };
}
