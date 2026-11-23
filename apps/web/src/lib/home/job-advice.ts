import type { RecommendedRange } from '@cleaning-planner/schedule/library/types';
import type { Schedule } from '@cleaning-planner/schedule/types';

// What the job library says about a job. It loads after the screen, so the
// library's text isn't part of any page's first load.

export interface JobAdvice {
  recommendation: string | null;
  recommendedRange: RecommendedRange | null;
  recommendedSchedule: Schedule | null;
  why: string | null;
  howTo: readonly string[];
}

export const NO_ADVICE: JobAdvice = {
  recommendation: null,
  recommendedRange: null,
  recommendedSchedule: null,
  why: null,
  howTo: [],
};
