import type { Interval, Schedule } from '../types';

export function days(value: number): Interval {
  return { value, unit: 'day' };
}

export function weeks(value: number): Interval {
  return { value, unit: 'week' };
}

export function months(value: number): Interval {
  return { value, unit: 'month' };
}

export function every(interval: Interval): Schedule {
  return { type: 'floating', every: interval };
}
