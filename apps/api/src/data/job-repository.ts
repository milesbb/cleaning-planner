import { jobSchema } from '@cleaning-planner/contracts/job';
import type { Job, UpdateJobRequest } from '@cleaning-planner/contracts/job';
import { z } from '@cleaning-planner/contracts/zod';
import type { JobStore } from '../services/job-service';
import { Errors } from '../utils/errors';
import { deleteInBatches } from './batch-write';
import { findHomeItem, homeItemKey, homeItemKeys, homeItems } from './home-items';
import { Keys } from './table';
import type { Table } from './table';
import { deleteItem, putItem, transact, updateIfUnchanged } from './transactions';

const JOB_CHANGED = 'Someone else changed this job. Reload and try again.';

const storedJobSchema = z.object(jobSchema.shape);

async function listJobs(table: Table, householdId: string): Promise<Job[]> {
  const items = await homeItems(table, householdId, { prefix: Keys.jobPrefix });
  return items.map((item) => storedJobSchema.parse(item));
}

async function findJob(table: Table, householdId: string, jobId: string): Promise<Job | null> {
  const item = await findHomeItem(table, householdId, Keys.job(jobId));
  return item === undefined ? null : storedJobSchema.parse(item);
}

async function requireJob(table: Table, householdId: string, jobId: string): Promise<Job> {
  const job = await findJob(table, householdId, jobId);
  if (job === null) throw Errors.notFound('No such job');
  return job;
}

async function addJob(table: Table, householdId: string, job: Job): Promise<void> {
  await transact(
    table,
    [putItem(table, { ...homeItemKey(householdId, Keys.job(job.id)), ...job })],
    'That job already exists',
  );
}

async function updateJob(
  table: Table,
  householdId: string,
  jobId: string,
  changes: UpdateJobRequest,
): Promise<Job> {
  await requireJob(table, householdId, jobId);
  await updateIfUnchanged(table, {
    key: homeItemKey(householdId, Keys.job(jobId)),
    changes,
    conflictMessage: JOB_CHANGED,
  });
  return requireJob(table, householdId, jobId);
}

async function deleteJob(table: Table, householdId: string, jobId: string): Promise<void> {
  await requireJob(table, householdId, jobId);
  const history = await homeItemKeys(table, householdId, Keys.donePrefix(jobId));
  await transact(
    table,
    [deleteItem(table, homeItemKey(householdId, Keys.job(jobId)))],
    JOB_CHANGED,
  );
  await deleteInBatches(table, history);
}

export function createJobRepository(table: Table): JobStore {
  return {
    listJobs: (householdId) => listJobs(table, householdId),
    findJob: (householdId, jobId) => findJob(table, householdId, jobId),
    addJob: (householdId, job) => addJob(table, householdId, job),
    updateJob: (householdId, jobId, changes) => updateJob(table, householdId, jobId, changes),
    deleteJob: (householdId, jobId) => deleteJob(table, householdId, jobId),
  };
}
