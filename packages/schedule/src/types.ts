export type IntervalUnit = 'day' | 'week' | 'month';

export interface Interval {
  value: number;
  unit: IntervalUnit;
}

export interface FloatingSchedule {
  type: 'floating';
  every: Interval;
}
