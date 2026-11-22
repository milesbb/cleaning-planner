import { completionSchema, jobProgressSchema } from '@cleaning-planner/contracts/completion';
import type { CompletionRecord, JobProgress } from '@cleaning-planner/contracts/completion';
import type { Job } from '@cleaning-planner/contracts/job';
import { z } from '@cleaning-planner/contracts/zod';
import type { Snooze } from '@cleaning-planner/schedule/types';
import type { HomeCompletionStore } from '../services/agenda-service';
import type { ProgressStore, RequestRecord, RequestRef } from '../services/job-progress-service';
import { findHomeItem, homeItemKey, homeItems } from './home-items';
import { Keys } from './table';
import type { Table } from './table';
import { deleteItem, putItem, transact, versionedUpdate } from './transactions';
import type { TransactItem } from './transactions';

const MILLISECONDS_PER_SECOND = 1000;
const ALREADY_SAVED = 'That was already saved';
const JOB_CHANGED = 'Someone else changed this job. Reload and try again.';

const storedCompletionSchema = z.object(completionSchema.shape);
const storedRequestSchema = z.object({ result: jobProgressSchema });

function rememberRequest(table: Table, householdId: string, request: RequestRecord): TransactItem {
  return putItem(table, {
    ...homeItemKey(householdId, Keys.request(request.userId, request.key)),
    result: request.result,
    expiresAt: Math.floor(Date.parse(request.expiresAt) / MILLISECONDS_PER_SECOND),
  });
}

function completionKey(householdId: string, completion: CompletionRecord): Record<string, string> {
  return homeItemKey(householdId, Keys.done(completion.jobId, completion.doneAt));
}

async function completionsWith(
  table: Table,
  householdId: string,
  prefix: string,
): Promise<CompletionRecord[]> {
  const items = await homeItems(table, householdId, { prefix });
  return items.map((item) => storedCompletionSchema.parse(item));
}

async function findResult(
  table: Table,
  { householdId, userId, key }: RequestRef,
): Promise<JobProgress | null> {
  const item = await findHomeItem(table, householdId, Keys.request(userId, key));
  return item === undefined ? null : storedRequestSchema.parse(item).result;
}

export function createProgressRepository(table: Table): ProgressStore & HomeCompletionStore {
  return {
    listCompletions: (householdId, jobId) =>
      completionsWith(table, householdId, Keys.donePrefix(jobId)),
    listHomeCompletions: (householdId) => completionsWith(table, householdId, Keys.allDonePrefix),
    addCompletion: (householdId, completion, request) =>
      transact(
        table,
        [
          putItem(table, { ...completionKey(householdId, completion), ...completion }),
          rememberRequest(table, householdId, request),
        ],
        ALREADY_SAVED,
      ),
    removeCompletion: (householdId, completion, request) =>
      transact(
        table,
        [
          deleteItem(table, completionKey(householdId, completion)),
          rememberRequest(table, householdId, request),
        ],
        ALREADY_SAVED,
      ),
    snoozeJob: (householdId: string, job: Job, snooze: Snooze, request) =>
      transact(
        table,
        [
          versionedUpdate(table, homeItemKey(householdId, Keys.job(job.id)), {
            snooze,
            version: job.version,
          }),
          rememberRequest(table, householdId, request),
        ],
        JOB_CHANGED,
      ),
    findResult: (request) => findResult(table, request),
  };
}
