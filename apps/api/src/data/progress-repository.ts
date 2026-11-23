import { activityEntrySchema } from '@cleaning-planner/contracts/activity';
import type { ActivityEntry } from '@cleaning-planner/contracts/activity';
import { completionSchema, jobProgressSchema } from '@cleaning-planner/contracts/completion';
import type { CompletionRecord, JobProgress } from '@cleaning-planner/contracts/completion';
import type { Job } from '@cleaning-planner/contracts/job';
import { z } from '@cleaning-planner/contracts/zod';
import type { Snooze } from '@cleaning-planner/schedule/types';
import type { ActivityStore } from '../services/activity-service';
import type { HomeCompletionStore } from '../services/agenda-service';
import type { ProgressStore, RequestRecord, RequestRef } from '../services/job-progress-service';
import { findHomeItem, homeItemKey, homeItems, latestHomeItems } from './home-items';
import { Keys } from './table';
import type { Table } from './table';
import { deleteIfPresent, deleteItem, putItem, transact, versionedUpdate } from './transactions';
import type { TransactItem } from './transactions';

const MILLISECONDS_PER_SECOND = 1000;
const ALREADY_SAVED = 'That was already saved';
const JOB_CHANGED = 'Someone else changed this job. Reload and try again.';

const storedCompletionSchema = z.object(completionSchema.shape);
const storedRequestSchema = z.object({ result: jobProgressSchema });
const storedActivitySchema = z.object(activityEntrySchema.shape);

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

function activityKey(householdId: string, completion: CompletionRecord): Record<string, string> {
  return homeItemKey(householdId, Keys.activity(completion.doneAt, completion.jobId));
}

// The completion, and the home's activity entry that keeps the job's name.
function recordCompletion(
  table: Table,
  householdId: string,
  entry: ActivityEntry,
  request: RequestRecord,
): TransactItem[] {
  const completion = storedCompletionSchema.parse(entry);
  return [
    putItem(table, { ...completionKey(householdId, completion), ...completion }),
    putItem(table, { ...activityKey(householdId, completion), ...entry }),
    rememberRequest(table, householdId, request),
  ];
}

// Completions saved before activity entries existed have none to delete.
function forgetCompletion(
  table: Table,
  householdId: string,
  completion: CompletionRecord,
  request: RequestRecord,
): TransactItem[] {
  return [
    deleteItem(table, completionKey(householdId, completion)),
    deleteIfPresent(table, activityKey(householdId, completion)),
    rememberRequest(table, householdId, request),
  ];
}

async function latestActivity(
  table: Table,
  householdId: string,
  limit: number,
): Promise<ActivityEntry[]> {
  const items = await latestHomeItems(table, householdId, { prefix: Keys.activityPrefix, limit });
  return items.map((item) => storedActivitySchema.parse(item));
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

export function createProgressRepository(
  table: Table,
): ProgressStore & HomeCompletionStore & ActivityStore {
  return {
    listCompletions: (householdId, jobId) =>
      completionsWith(table, householdId, Keys.donePrefix(jobId)),
    listHomeCompletions: (householdId) => completionsWith(table, householdId, Keys.allDonePrefix),
    addCompletion: (householdId, entry, request) =>
      transact(table, recordCompletion(table, householdId, entry, request), ALREADY_SAVED),
    removeCompletion: (householdId, completion, request) =>
      transact(table, forgetCompletion(table, householdId, completion, request), ALREADY_SAVED),
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
    listActivity: (householdId, limit) => latestActivity(table, householdId, limit),
  };
}
