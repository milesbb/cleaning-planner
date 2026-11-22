export type IntervalUnit = 'day' | 'week' | 'month';

export interface Interval {
  value: number;
  unit: IntervalUnit;
}

export interface FloatingSchedule {
  type: 'floating';
  every: Interval;
}

export type Weekday =
  'sunday' | 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday';

export interface WeekdaysRule {
  kind: 'weekdays';
  weekdays: readonly Weekday[];
}

export interface MonthDayRule {
  kind: 'monthDay';
  day: number | 'last';
}

export type FixedRule = WeekdaysRule | MonthDayRule;

export interface FixedSchedule {
  type: 'fixed';
  on: FixedRule;
}

export type Schedule = FloatingSchedule | FixedSchedule;
