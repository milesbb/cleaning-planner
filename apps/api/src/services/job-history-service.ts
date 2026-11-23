import type { CompletionRecord } from '@cleaning-planner/contracts/completion';
import { Errors } from '../utils/errors';
import type { ProgressStore } from './job-progress-service';
import type { JobStore } from './job-service';

const MAX_HISTORY_ENTRIES = 50;

export interface JobHistoryService {
  // The job's done and skipped days, newest first.
  listHistory: (householdId: string, jobId: string) => Promise<CompletionRecord[]>;
}

interface JobHistoryDependencies {
  jobs: Pick<JobStore, 'findJob'>;
  completions: Pick<ProgressStore, 'listCompletions'>;
}

async function listHistory(
  { jobs, completions }: JobHistoryDependencies,
  householdId: string,
  jobId: string,
): Promise<CompletionRecord[]> {
  const [job, history] = await Promise.all([
    jobs.findJob(householdId, jobId),
    completions.listCompletions(householdId, jobId),
  ]);
  if (job === null) throw Errors.notFound('No such job');
  return [...history]
    .sort((first, second) => second.doneAt.localeCompare(first.doneAt))
    .slice(0, MAX_HISTORY_ENTRIES);
}

export function createJobHistoryService(dependencies: JobHistoryDependencies): JobHistoryService {
  return {
    listHistory: (householdId, jobId) => listHistory(dependencies, householdId, jobId),
  };
}
