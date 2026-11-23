import type { Page } from '@playwright/test';
import { fakeApi } from './fake-backend';
import { calendarDay, DAY_MS, HOME_PATH } from './fake-home-state';
import type { SavedJob } from './fake-jobs';

// Sam wiped the hob yesterday; anything ticked off since shows above it,
// done today by Alex.
function samsHob(): object {
  return {
    jobId: 'job-hob',
    jobName: 'Wipe the hob',
    outcome: 'done',
    completedOn: calendarDay(-1),
    completedBy: 'user-sam',
    doneAt: new Date(Date.now() - DAY_MS).toISOString(),
  };
}

function jobNameOf(jobId: string, jobs: readonly SavedJob[]): string {
  const name = jobs.find((job) => job.id === jobId)?.name;
  return typeof name === 'string' ? name : jobId;
}

function ticked(jobId: string, jobs: readonly SavedJob[]): object {
  return {
    jobId,
    jobName: jobNameOf(jobId, jobs),
    outcome: 'done',
    completedOn: calendarDay(0),
    completedBy: 'user-alex',
    doneAt: new Date().toISOString(),
  };
}

export async function fakeActivity(
  page: Page,
  doneJobIds: ReadonlySet<string>,
  jobs: readonly SavedJob[],
): Promise<void> {
  await fakeApi(page, `${HOME_PATH}/activity*`, (request) => {
    const limit = Number(new URL(request.url()).searchParams.get('limit') ?? '20');
    const latestFirst = [...doneJobIds].reverse().map((jobId) => ticked(jobId, jobs));
    return { body: [...latestFirst, samsHob()].slice(0, limit) };
  });
}
