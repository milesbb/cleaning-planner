import type { Interval, IntervalUnit } from './types';

const APPROXIMATE_DAYS_PER_UNIT: Record<IntervalUnit, number> = { day: 1, week: 7, month: 30 };
const SINGLE_INTERVAL_NAMES: Record<IntervalUnit, string> = {
  day: 'daily',
  week: 'weekly',
  month: 'monthly',
};
const FORTNIGHT_IN_WEEKS = 2;

export function approximateDays(interval: Interval): number {
  return interval.value * APPROXIMATE_DAYS_PER_UNIT[interval.unit];
}

export function describeInterval({ value, unit }: Interval): string {
  if (value === 1) return SINGLE_INTERVAL_NAMES[unit];
  if (unit === 'week' && value === FORTNIGHT_IN_WEEKS) return 'fortnightly';
  return `every ${String(value)} ${unit}s`;
}
