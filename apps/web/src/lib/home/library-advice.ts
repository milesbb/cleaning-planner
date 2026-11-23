import { findLibraryJob } from '@cleaning-planner/schedule/library/job-library';
import { recommendationText } from '@cleaning-planner/schedule/library/recommended-range';
import { NO_ADVICE } from './job-advice';
import type { JobAdvice } from './job-advice';

// Loaded with import() by useLibraryAdvice: it brings the whole job library.
export function adviceFor(libraryId: string | null): JobAdvice {
  const libraryJob = libraryId === null ? undefined : findLibraryJob(libraryId);
  if (libraryJob === undefined) return NO_ADVICE;
  return {
    recommendation: recommendationText(libraryJob.recommendedRange),
    recommendedRange: libraryJob.recommendedRange,
    recommendedSchedule: libraryJob.defaultSchedule,
    why: libraryJob.why,
    howTo: libraryJob.howTo,
  };
}
