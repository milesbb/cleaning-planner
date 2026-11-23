import { approximateDays, describeInterval } from '../interval';
import type { Interval } from '../types';
import type { RecommendedRange } from './types';

// How often the library recommends doing a job, kept apart from the library's
// text so screens can use it without loading every job.

export function recommendationText({ shortest, longest }: RecommendedRange): string {
  const shortestText = describeInterval(shortest);
  const longestText = describeInterval(longest);
  const range = shortestText === longestText ? shortestText : `${shortestText} to ${longestText}`;
  return `Most homes do this ${range}.`;
}

export function isRecommendedInterval(interval: Interval, range: RecommendedRange): boolean {
  const intervalDays = approximateDays(interval);
  return (
    intervalDays >= approximateDays(range.shortest) &&
    intervalDays <= approximateDays(range.longest)
  );
}
